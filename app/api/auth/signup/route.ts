/**
 * Public signup endpoint — Phase 3 of IMPERIAL_TENANT_SPEC v1.0 §5.1.
 *
 * Step 1 of 2: validate the form, persist nothing, send an OTP.
 * Step 2 (signup/complete) consumes the OTP + signed payload to create
 * the identity, organisation, owner membership, and first profile row.
 *
 * No session is required — this is the entry point for brand-new tenants.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createOtpChallenge } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/mailer'

// Free-mail filter for Pro/Enterprise tiers (Q7b in spec).
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'yahoo.co.in', 'outlook.com', 'hotmail.com',
  'rediffmail.com', 'live.com', 'icloud.com', 'proton.me', 'aol.com',
])

const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

const APP_KIND = (process.env.NEXT_PUBLIC_APP_KIND ?? 'ihrms') as 'ihrms' | 'icrm'

const REQUEST_COOLDOWN_MS = 60_000
const globalState = globalThis as typeof globalThis & {
  __ihrmsSignupTimestamps?: Map<string, number>
}
const lastSignupAt = globalState.__ihrmsSignupTimestamps ?? new Map<string, number>()
globalState.__ihrmsSignupTimestamps = lastSignupAt

const signupSchema = z.object({
  org_name: z.string().min(2).max(120),
  full_name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().optional(),
  gstin: z.string().optional(),
  product: z.enum(['ihrms', 'icrm', 'bundle']).optional(),
  tier: z.enum(['starter', 'growth', 'pro', 'enterprise']),
})

export async function POST(req: NextRequest) {
  try {
    const parsed = signupSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
    }
    const { org_name, full_name, email, phone, gstin, tier } = parsed.data
    const product = parsed.data.product ?? APP_KIND

    const normalizedEmail = email.trim().toLowerCase()

    // Throttle by email — 1 attempt / 60s. Same in-memory pattern as the OTP route.
    const last = lastSignupAt.get(normalizedEmail)
    if (last && Date.now() - last < REQUEST_COOLDOWN_MS) {
      const wait = Math.ceil((REQUEST_COOLDOWN_MS - (Date.now() - last)) / 1000)
      return NextResponse.json({ error: `Please wait ${wait}s before requesting another OTP.` }, { status: 429 })
    }

    if (gstin && !GSTIN_REGEX.test(gstin.trim().toUpperCase())) {
      return NextResponse.json({ error: 'Invalid GSTIN format' }, { status: 400 })
    }

    if (tier === 'pro' || tier === 'enterprise') {
      const domain = normalizedEmail.split('@')[1] ?? ''
      if (FREE_EMAIL_DOMAINS.has(domain)) {
        return NextResponse.json({
          error: 'Pro and Enterprise tiers require a company email address',
          suggestion: 'Use Starter or Growth with this email, or sign up with your company email.',
        }, { status: 400 })
      }
    }

    const { data: existingIdentity } = await supabaseAdmin
      .from('identities')
      .select('id, full_name')
      .eq('email', normalizedEmail)
      .maybeSingle() as { data: { id: string; full_name: string | null } | null }

    // Resolve plan — required because amount + min_seats + ai_credits all flow from it.
    const { data: plan } = await supabaseAdmin
      .from('subscription_plans')
      .select('price_per_seat_inr, min_seats, ai_credits_included_monthly')
      .eq('product', product)
      .eq('tier', tier)
      .eq('is_active', true)
      .maybeSingle() as { data: { price_per_seat_inr: number; min_seats: number; ai_credits_included_monthly: number } | null }

    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Reserve a unique slug for the new org. We don't insert anything yet —
    // the slug is recorded in the OTP payload and re-checked at completion.
    const baseSlug = org_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'org'
    let slug = baseSlug
    let suffix = 1
    while (true) {
      const { data: existing } = await supabaseAdmin.from('organisations').select('id').eq('slug', slug).maybeSingle()
      if (!existing) break
      slug = `${baseSlug}-${suffix++}`
      if (suffix > 1000) return NextResponse.json({ error: 'Could not allocate slug' }, { status: 500 })
    }

    const challenge = createOtpChallenge({
      email: normalizedEmail,
      payload: {
        kind: 'signup',
        org_name: org_name.trim(),
        full_name: full_name.trim(),
        phone: phone?.trim() ?? null,
        gstin: gstin?.trim()?.toUpperCase() ?? null,
        product,
        tier,
        min_seats: plan.min_seats,
        slug,
        identity_exists: !!existingIdentity,
      },
    })

    try {
      await sendOtpEmail({
        to: normalizedEmail,
        name: full_name.trim() || 'Founder',
        otp: challenge.otp,
        expiresInMinutes: challenge.expiresInMinutes,
      })
    } catch (mailErr) {
      if (process.env.NODE_ENV !== 'production') {
        console.info(`[IHRMS Signup OTP] ${normalizedEmail}: ${challenge.otp}`)
        lastSignupAt.set(normalizedEmail, Date.now())
        return NextResponse.json({
          challengeToken: challenge.challengeToken,
          expiresInMinutes: challenge.expiresInMinutes,
          message: 'SMTP not configured — OTP printed to server log.',
          devOtp: challenge.otp,
        })
      }
      throw mailErr
    }

    lastSignupAt.set(normalizedEmail, Date.now())
    return NextResponse.json({
      success: true,
      challengeToken: challenge.challengeToken,
      expiresInMinutes: challenge.expiresInMinutes,
    })
  } catch (err) {
    console.error('[auth/signup POST]', err)
    const message = err instanceof Error ? err.message : 'Signup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
