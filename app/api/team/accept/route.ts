/**
 * Step 1 of accepting an invite: trigger an OTP to verify email ownership.
 * Per IMPERIAL_TENANT_SPEC v1.0 §6.2.
 *
 * Public endpoint — no session required (the invitee may not yet have an
 * identity). The token alone is enough to look up the invite, but we
 * gate the actual provisioning behind OTP verification in /accept/complete.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createOtpChallenge } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/mailer'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

    const { data: invite } = await supabaseAdmin
      .from('org_invitations')
      .select(`
        id, org_id, email, role, hrms_access, crm_access, expires_at,
        organisations ( name )
      `)
      .eq('token', token)
      .is('accepted_at', null)
      .is('cancelled_at', null)
      .maybeSingle() as { data: { id: string; org_id: string; email: string; role: string; hrms_access: boolean; crm_access: boolean; expires_at: string; organisations: { name: string } | { name: string }[] | null } | null }

    if (!invite) return NextResponse.json({ error: 'Invitation not found or already used' }, { status: 404 })
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation expired' }, { status: 410 })
    }

    const challenge = createOtpChallenge({
      email: invite.email,
      payload: { kind: 'invite_accept', invite_id: invite.id, token },
    })

    try {
      await sendOtpEmail({
        to: invite.email,
        name: invite.email.split('@')[0] ?? 'there',
        otp: challenge.otp,
        expiresInMinutes: challenge.expiresInMinutes,
      })
    } catch (mailErr) {
      if (process.env.NODE_ENV !== 'production') {
        console.info(`[IHRMS Invite OTP] ${invite.email}: ${challenge.otp}`)
        return NextResponse.json({
          success: true,
          challengeToken: challenge.challengeToken,
          orgName: Array.isArray(invite.organisations) ? invite.organisations[0]?.name : invite.organisations?.name ?? 'an organisation',
          role: invite.role,
          email: invite.email,
          message: 'SMTP not configured — OTP printed to server log.',
          devOtp: challenge.otp,
        })
      }
      throw mailErr
    }

    return NextResponse.json({
      success: true,
      challengeToken: challenge.challengeToken,
      orgName: Array.isArray(invite.organisations) ? invite.organisations[0]?.name : invite.organisations?.name ?? 'an organisation',
      role: invite.role,
      email: invite.email,
    })
  } catch (err) {
    console.error('[team/accept POST]', err)
    const message = err instanceof Error ? err.message : 'Accept request failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
