/**
 * GET /api/billing/subscription — current subscription + status for the
 * caller's org. Powers the customer-facing /settings/billing page.
 *
 * Read-only. Mutations go through the platform billing cron + webhook.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(_req: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const ctx = auth.ctx

  try {
    // Subscription row (one per org).
    const { data: sub, error: subErr } = await supabaseAdmin
      .from('org_subscriptions')
      .select('id, product, tier, seats, billing_cycle, status, amount_per_month, next_billing_amount_inr, currency, trial_ends_at, soft_locked_at, read_only_at, export_only_at, deactivated_at, created_at, updated_at')
      .eq('org_id', ctx.orgId)
      .maybeSingle()

    if (subErr && subErr.code !== '42P01') {
      console.error('[billing/subscription GET] org_subscriptions:', subErr)
      return NextResponse.json({ error: subErr.message }, { status: 500 })
    }

    // Snapshot fields from the organisation row that customers expect to see.
    const { data: org } = await supabaseAdmin
      .from('organisations')
      .select('id, name, slug, billing_email, gstin, contact_phone, plan_tier, subscription_status, hrms_enabled, crm_enabled, seat_count, trial_ends_at')
      .eq('id', ctx.orgId)
      .maybeSingle()

    // Active membership count — useful for UI to show "5 of 10 seats used".
    const { count: activeMemberships } = await supabaseAdmin
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', ctx.orgId)
      .eq('status', 'active')

    const { count: pendingInvites } = await supabaseAdmin
      .from('org_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', ctx.orgId)
      .is('accepted_at', null)
      .is('cancelled_at', null)

    return NextResponse.json({
      subscription: sub ?? null,
      organisation: org ?? null,
      seats: {
        active_memberships: activeMemberships ?? 0,
        pending_invites:    pendingInvites ?? 0,
        plan_limit:         sub?.seats ?? null,
      },
    })
  } catch (err) {
    console.error('[billing/subscription GET catch]', err)
    const message = err instanceof Error ? err.message : 'Failed to load subscription'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
