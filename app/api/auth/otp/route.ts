/**
 * POST /api/auth/otp
 *
 * Supabase-Auth-backed OTP send flow.
 *
 *   1. Rate-limit per email (existing in-memory cooldown).
 *   2. Look up the identity by email and gate on at least one active
 *      HRMS membership (memberships.hrms_access=true, status=active).
 *   3. Mint an OTP via supabaseAdmin.auth.admin.generateLink({ type: 'magiclink' }).
 *      Supabase tracks the pending OTP in auth.flow_state until verifyOtp
 *      consumes it.
 *   4. Email it via the existing branded sendOtpEmail template.
 *
 * The response no longer carries a challengeToken — Supabase tracks the
 * pending OTP, so /api/auth/verify-otp only needs { email, otp }. We keep
 * the legacy-shape fields (challengeToken: '', maskedEmail, expiresInMinutes,
 * message) populated so the login page works unchanged.
 *
 * Email-enumeration prevention: a non-existent / no-HRMS-membership account
 * returns the same success-shape (without sending an email).
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendOtpEmail } from '@/lib/mailer'
import { maskEmail } from '@/lib/otp'

const REQUEST_COOLDOWN_MS = 60_000
const OTP_TTL_MINUTES = 5  // Must match Supabase Auth → Email → OTP expiration (300s)

const globalOtpRequests = globalThis as typeof globalThis & {
  __ihrmsOtpRequestTimestamps?: Map<string, number>
}
const otpRequestTimestamps = globalOtpRequests.__ihrmsOtpRequestTimestamps ?? new Map<string, number>()
globalOtpRequests.__ihrmsOtpRequestTimestamps = otpRequestTimestamps

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getRetryAfterSeconds(email: string) {
  const lastRequestedAt = otpRequestTimestamps.get(email)
  if (!lastRequestedAt) return 0
  const elapsed = Date.now() - lastRequestedAt
  if (elapsed >= REQUEST_COOLDOWN_MS) {
    otpRequestTimestamps.delete(email)
    return 0
  }
  return Math.ceil((REQUEST_COOLDOWN_MS - elapsed) / 1000)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Enter a valid work email address.' }, { status: 400 })
    }

    const retryAfterSeconds = getRetryAfterSeconds(email)
    if (retryAfterSeconds > 0) {
      return NextResponse.json(
        { error: `Please wait ${retryAfterSeconds} seconds before requesting another OTP.` },
        { status: 429 },
      )
    }

    const masked = maskEmail(email)

    // ── 1. Identity gate ───────────────────────────────────────────────
    const { data: identity } = await supabaseAdmin
      .from('identities')
      .select('id, full_name')
      .eq('email', email)
      .maybeSingle() as { data: { id: string; full_name: string | null } | null }

    let displayName: string | null = identity?.full_name ?? null

    let hasHrmsAccess = false
    if (identity) {
      const { count } = await supabaseAdmin
        .from('memberships')
        .select('id', { count: 'exact', head: true })
        .eq('identity_id', identity.id)
        .eq('status', 'active')
        .eq('hrms_access', true)
      hasHrmsAccess = (count ?? 0) > 0
    }

    // Anti-enumeration: silent success when there's no usable HRMS account.
    if (!identity || !hasHrmsAccess) {
      otpRequestTimestamps.set(email, Date.now())
      return NextResponse.json({
        challengeToken: 'supabase',
        expiresInMinutes: OTP_TTL_MINUTES,
        maskedEmail: masked,
        message: `If an HRMS account exists for ${masked}, a 6-digit OTP has been sent.`,
      })
    }

    // Fall back to employees row for the display name when identity didn't have one.
    if (!displayName) {
      const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('first_name, last_name')
        .eq('identity_id', identity.id)
        .maybeSingle() as { data: { first_name: string | null; last_name: string | null } | null }
      if (emp) {
        displayName = [emp.first_name, emp.last_name].filter(Boolean).join(' ') || null
      }
    }

    // ── 2. Mint OTP via Supabase admin API ─────────────────────────────
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })

    if (linkErr || !linkData?.properties?.email_otp) {
      console.error('[auth/otp] generateLink failed:', linkErr)
      // Don't leak misconfiguration: return the same success-shape so probers
      // can't distinguish "user exists but Supabase misconfigured" from
      // "user doesn't exist".
      otpRequestTimestamps.set(email, Date.now())
      return NextResponse.json({
        challengeToken: 'supabase',
        expiresInMinutes: OTP_TTL_MINUTES,
        maskedEmail: masked,
        message: `If an HRMS account exists for ${masked}, a 6-digit OTP has been sent.`,
      })
    }

    const otp = linkData.properties.email_otp

    // ── 3. Email the OTP via our branded template ──────────────────────
    try {
      await sendOtpEmail({
        to: email,
        name: displayName || 'Team Member',
        otp,
        expiresInMinutes: OTP_TTL_MINUTES,
      })
    } catch (mailErr) {
      if (process.env.NODE_ENV !== 'production') {
        console.info(`[IHRMS OTP] ${email}: ${otp}`)
        otpRequestTimestamps.set(email, Date.now())
        return NextResponse.json({
          challengeToken: 'supabase',
          expiresInMinutes: OTP_TTL_MINUTES,
          maskedEmail: masked,
          message: 'SMTP is not configured in development, so the OTP was written to the server log.',
          devOtp: otp,
        })
      }
      throw mailErr
    }

    otpRequestTimestamps.set(email, Date.now())

    return NextResponse.json({
      challengeToken: '',
      expiresInMinutes: OTP_TTL_MINUTES,
      maskedEmail: masked,
      message: `A 6-digit OTP has been sent to ${masked}.`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send OTP right now.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
