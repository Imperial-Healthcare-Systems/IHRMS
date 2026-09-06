/**
 * Step 2 of accepting an invite: verify OTP and provision identity +
 * membership + profile rows.
 * Per IMPERIAL_TENANT_SPEC v1.0 §6.2.
 *
 * After this returns, the invitee should be redirected to /login. They
 * sign in with the same email and the new membership lands them in the
 * inviter's org.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyOtpChallenge } from '@/lib/otp'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const { email, otp, challengeToken, full_name } = await req.json()
    if (!email || !otp || !challengeToken) {
      return NextResponse.json({ error: 'email, otp, challengeToken required' }, { status: 400 })
    }

    const verified = verifyOtpChallenge({ email, otp, challengeToken })
    if (!verified.valid || !verified.payload || verified.payload.kind !== 'invite_accept') {
      return NextResponse.json({ error: verified.error ?? 'Invalid OTP' }, { status: 401 })
    }

    const { invite_id: inviteId } = verified.payload as { invite_id: string }

    const { data: invite } = await supabaseAdmin
      .from('org_invitations')
      .select('*')
      .eq('id', inviteId)
      .is('accepted_at', null)
      .is('cancelled_at', null)
      .maybeSingle() as { data: {
        id: string
        org_id: string
        email: string
        role: string
        hrms_access: boolean
        crm_access: boolean
        invited_by: string
        created_at: string
      } | null }

    if (!invite) return NextResponse.json({ error: 'Invitation already used or cancelled' }, { status: 409 })

    const normalizedEmail = invite.email.trim().toLowerCase()

    // Identity — reuse if exists, otherwise create. full_name is required only
    // when we are creating a new identity for this email.
    let identityId: string
    {
      const { data: existing } = await supabaseAdmin
        .from('identities').select('id').eq('email', normalizedEmail).maybeSingle() as { data: { id: string } | null }

      if (existing) {
        identityId = existing.id
      } else {
        if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
          return NextResponse.json({ error: 'full_name required to create your account' }, { status: 400 })
        }
        const { data: created, error: idErr } = await supabaseAdmin
          .from('identities')
          .insert({
            email: normalizedEmail,
            full_name: full_name.trim(),
            email_verified_at: new Date().toISOString(),
          } as never)
          .select('id').single() as { data: { id: string } | null; error: { message: string } | null }
        if (idErr || !created) {
          return NextResponse.json({ error: idErr?.message ?? 'Identity create failed' }, { status: 500 })
        }
        identityId = created.id

        // Mirror into auth.users sharing the same UUID so auth.uid() = identities.id
        // after the invitee signs in. Idempotent: skip silently on 422 already-exists.
        const { error: authUserErr } = await supabaseAdmin.auth.admin.createUser({
          id: identityId,
          email: normalizedEmail,
          email_confirm: true,
        })
        if (authUserErr && !/already|exists|registered/i.test(authUserErr.message)) {
          console.error('[team/accept/complete] auth.users mirror failed:', authUserErr)
          return NextResponse.json({ error: 'Account provisioning failed', detail: authUserErr.message }, { status: 500 })
        }
      }
    }

    // Defensive: refuse double-accept if the same identity already has a
    // membership in this org (race window between two accept clicks).
    {
      const { data: existingMembership } = await supabaseAdmin
        .from('memberships')
        .select('id')
        .eq('identity_id', identityId)
        .eq('org_id', invite.org_id)
        .maybeSingle() as { data: { id: string } | null }
      if (existingMembership) {
        await supabaseAdmin
          .from('org_invitations')
          .update({ accepted_at: new Date().toISOString() } as never)
          .eq('id', invite.id)
        return NextResponse.json({ success: true, redirectTo: '/login', alreadyMember: true })
      }
    }

    const { data: membership, error: memErr } = await supabaseAdmin
      .from('memberships')
      .insert({
        identity_id: identityId,
        org_id: invite.org_id,
        role: invite.role,
        status: 'active',
        hrms_access: invite.hrms_access,
        crm_access: invite.crm_access,
        invited_by: invite.invited_by,
        invited_at: invite.created_at,
        accepted_at: new Date().toISOString(),
      } as never)
      .select('id').single() as { data: { id: string } | null; error: { message: string } | null }

    if (memErr || !membership) {
      return NextResponse.json({ error: 'Membership create failed', detail: memErr?.message }, { status: 500 })
    }

    await supabaseAdmin
      .from('org_invitations')
      .update({ accepted_at: new Date().toISOString() } as never)
      .eq('id', invite.id)

    // Profile rows — only create what the membership grants.
    const personName = full_name?.trim() || normalizedEmail
    if (invite.hrms_access) {
      const firstName = personName.split(' ')[0] ?? personName
      const lastName  = personName.split(' ').slice(1).join(' ') || '-'
      await supabaseAdmin.from('employees').insert({
        org_id: invite.org_id,
        identity_id: identityId,
        membership_id: membership.id,
        emp_id: `EMP-${Date.now().toString(36).toUpperCase()}`,
        first_name: firstName,
        last_name: lastName,
        work_email: normalizedEmail,
        role: invite.role === 'hr_admin' ? 'hr_admin' : (invite.role === 'manager' ? 'manager' : 'employee'),
        is_admin: ['owner', 'admin', 'hr_admin'].includes(invite.role),
        status: 'active',
        date_of_joining: new Date().toISOString().split('T')[0],
      } as never).then(({ error }) => {
        if (error) console.error('[team/accept/complete] employee INSERT FAILED:', error.message, { org_id: invite.org_id, identity_id: identityId })
      })
    }
    if (invite.crm_access) {
      await supabaseAdmin.from('crm_users').insert({
        org_id: invite.org_id,
        identity_id: identityId,
        membership_id: membership.id,
        email: normalizedEmail,
        full_name: personName,
        role: invite.role === 'crm_admin' ? 'admin' : invite.role,
        is_active: true,
      } as never).then(({ error }) => {
        if (error) console.error('[team/accept/complete] crm_users INSERT FAILED:', error.message, { org_id: invite.org_id, identity_id: identityId })
      })
    }

    logAudit({
      org_id: invite.org_id,
      actor_identity_id: identityId,
      actor_membership_id: membership.id,
      action: 'created',
      module: 'team',
      entity_id: membership.id,
      summary: `${normalizedEmail} accepted invitation as ${invite.role}`,
    })

    return NextResponse.json({ success: true, redirectTo: '/login' })
  } catch (err) {
    console.error('[team/accept/complete POST]', err)
    const message = err instanceof Error ? err.message : 'Accept failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
