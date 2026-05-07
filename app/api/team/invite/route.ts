/**
 * Send an invitation to join the current org.
 * Per IMPERIAL_TENANT_SPEC v1.0 §6.1.
 *
 * Owner/admin/hr_admin only. Soft-blocks if seat_count would be exceeded
 * unless the caller passes acknowledge_overage:true (Q9 — overage
 * acknowledgement at user-creation moment).
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'node:crypto'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendInvitationEmail } from '@/lib/mailer'
import { logAudit } from '@/lib/audit'

const APP_KIND = (process.env.NEXT_PUBLIC_APP_KIND ?? 'ihrms') as 'ihrms' | 'icrm'

const schema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'hr_admin', 'crm_admin', 'manager', 'member', 'finance', 'viewer']),
  hrms_access: z.boolean().optional().default(true),
  crm_access: z.boolean().optional().default(false),
  acknowledge_overage: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const auth = await requireRole(['owner', 'admin', 'hr_admin', 'crm_admin', 'super_admin'])
  if (auth.error) return auth.error
  const ctx = auth.ctx

  try {
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 })
    }
    const { email, role, hrms_access, crm_access, acknowledge_overage } = parsed.data
    const normalizedEmail = email.trim().toLowerCase()

    // Seat budget check (best-effort — if subscription row is missing we let it through).
    const { data: sub } = await supabaseAdmin
      .from('org_subscriptions')
      .select('seats, product, tier')
      .eq('org_id', ctx.orgId)
      .maybeSingle() as { data: { seats: number; product: string; tier: string } | null }

    const [{ count: activeMemberships }, { count: pendingInvites }] = await Promise.all([
      supabaseAdmin
        .from('memberships')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', ctx.orgId)
        .eq('status', 'active'),
      supabaseAdmin
        .from('org_invitations')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', ctx.orgId)
        .is('accepted_at', null)
        .is('cancelled_at', null),
    ])

    const seatTarget = (activeMemberships ?? 0) + (pendingInvites ?? 0) + 1
    const planLimit  = sub?.seats ?? Number.MAX_SAFE_INTEGER

    if (seatTarget > planLimit) {
      if (!acknowledge_overage) {
        const { data: plan } = await supabaseAdmin
          .from('subscription_plans')
          .select('price_per_seat_inr')
          .eq('product', sub!.product).eq('tier', sub!.tier).maybeSingle() as { data: { price_per_seat_inr: number } | null }

        const overage = (seatTarget - planLimit) * Number(plan?.price_per_seat_inr ?? 0)
        return NextResponse.json({
          requires_overage_confirmation: true,
          current_seats: planLimit,
          seats_after_invite: seatTarget,
          overage_amount_inr: overage,
          message: `This invite would put you ${seatTarget - planLimit} seat(s) over your ${sub!.tier} plan. Approx ₹${overage.toLocaleString('en-IN')} added to next invoice. Confirm to proceed.`,
        }, { status: 402 })
      }

      // Acknowledged — record the overage event so the monthly invoicing
      // cron picks it up and adds it to next month's platform_invoice.
      const { error: overageErr } = await supabaseAdmin.rpc('record_seat_overage', {
        p_org_id: ctx.orgId,
        p_delta_seats: 1,
        p_source: 'manual_create',
        p_acknowledged_by_membership_id: ctx.membershipId,
      })
      if (overageErr) console.warn('[team/invite] record_seat_overage non-fatal:', overageErr.message)
    }

    // Reject duplicates: pending invite OR existing active membership.
    const { data: existingInvite } = await supabaseAdmin
      .from('org_invitations')
      .select('id')
      .eq('org_id', ctx.orgId).eq('email', normalizedEmail)
      .is('accepted_at', null).is('cancelled_at', null)
      .maybeSingle()
    if (existingInvite) {
      return NextResponse.json({ error: 'A pending invitation already exists for this email' }, { status: 409 })
    }

    const { data: existingIdentity } = await supabaseAdmin
      .from('identities').select('id').eq('email', normalizedEmail).maybeSingle() as { data: { id: string } | null }

    if (existingIdentity) {
      const { data: existingMembership } = await supabaseAdmin
        .from('memberships')
        .select('id').eq('identity_id', existingIdentity.id).eq('org_id', ctx.orgId)
        .maybeSingle()
      if (existingMembership) {
        return NextResponse.json({ error: 'This person is already a member' }, { status: 409 })
      }
    }

    const token = crypto.randomBytes(32).toString('base64url')
    const { data: invite, error: insertErr } = await supabaseAdmin
      .from('org_invitations')
      .insert({
        org_id: ctx.orgId,
        email: normalizedEmail,
        role,
        hrms_access,
        crm_access,
        token,
        invited_by: ctx.identityId,
      } as never)
      .select('id, expires_at').single() as { data: { id: string; expires_at: string } | null; error: { message: string } | null }

    if (insertErr || !invite) {
      console.error('[team/invite POST]', insertErr)
      return NextResponse.json({ error: insertErr?.message ?? 'Insert failed' }, { status: 500 })
    }

    const { data: org } = await supabaseAdmin
      .from('organisations').select('name').eq('id', ctx.orgId).maybeSingle() as { data: { name: string } | null }

    const acceptBase = APP_KIND === 'ihrms'
      ? (process.env.IHRMS_BASE_URL ?? 'https://imperialhrms.com')
      : (process.env.ICRM_BASE_URL ?? 'https://imperialcrm.cloud')
    const acceptUrl = `${acceptBase}/invite/accept?token=${token}`

    sendInvitationEmail({
      to: normalizedEmail,
      orgName: org?.name ?? 'your organisation',
      inviterName: ctx.email || 'Imperial admin',
      role,
      acceptUrl,
      expiresAt: invite.expires_at,
      orgId: ctx.orgId,
    }).catch(() => {})

    logAudit({
      org_id: ctx.orgId,
      actor_identity_id: ctx.identityId, actor_membership_id: ctx.membershipId,
      action: 'created',
      module: 'team',
      entity_id: invite.id,
      summary: `Invited ${normalizedEmail} as ${role}`,
    })

    return NextResponse.json({ success: true, invitationId: invite.id, expiresAt: invite.expires_at })
  } catch (err) {
    console.error('[team/invite POST catch]', err)
    const message = err instanceof Error ? err.message : 'Invite failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
