/**
 * Daily billing cron — Phase 4 of IMPERIAL_TENANT_SPEC v1.0 §7.2.
 * Vercel Cron schedule: 02:00 IST every day.
 *
 * Walks each org through the trial → past_due → read_only → export_only
 * → cancelled state machine and emits reminder + deactivation emails.
 * Also resets the monthly AI credit allowance per-org once 30 days have
 * elapsed since the last reset_date (delegates to the
 * `reset_monthly_allowance(uuid)` Postgres function).
 *
 * The cron route runs with no session — it auths via the CRON_SECRET
 * bearer header (same pattern as the existing leave-accrual cron).
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendTrialReminderEmail, sendDeactivationEmail } from '@/lib/mailer'

function authCron(req: NextRequest) {
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
}

type SubRow = {
  id: string
  org_id: string
  trial_ends_at?: string | null
  organisations: { name: string; billing_email: string } | { name: string; billing_email: string }[] | null
}

function pickOrg(o: SubRow['organisations']): { name: string; billing_email: string } | null {
  if (!o) return null
  return Array.isArray(o) ? (o[0] ?? null) : o
}

async function handle(req: NextRequest) {
  if (!authCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()

  // ── 1. Trial reminders 3 / 1 days before expiry ───────────────────────
  let remindersSent = 0
  for (const daysOut of [3, 1]) {
    const target = new Date(now); target.setDate(now.getDate() + daysOut)
    const dayStart = new Date(target.toDateString()).toISOString()
    const dayEnd   = new Date(new Date(target.toDateString()).getTime() + 86400000).toISOString()

    const { data: trials } = await supabaseAdmin
      .from('org_subscriptions')
      .select('org_id, trial_ends_at, organisations(name, billing_email)')
      .eq('status', 'trial')
      .gte('trial_ends_at', dayStart)
      .lt('trial_ends_at', dayEnd) as { data: SubRow[] | null }

    for (const t of trials ?? []) {
      const org = pickOrg(t.organisations)
      if (!org?.billing_email) continue
      await sendTrialReminderEmail({ to: org.billing_email, orgName: org.name, daysLeft: daysOut, orgId: t.org_id })
      remindersSent++
    }
  }

  // ── 2. Trial expired today → past_due (Day 14 in the state machine) ──
  const { data: expiredTrials } = await supabaseAdmin
    .from('org_subscriptions')
    .select('id, org_id, organisations(name, billing_email)')
    .eq('status', 'trial')
    .lt('trial_ends_at', now.toISOString()) as { data: SubRow[] | null }

  for (const t of expiredTrials ?? []) {
    await supabaseAdmin
      .from('org_subscriptions')
      .update({ status: 'past_due', soft_locked_at: now.toISOString() } as never)
      .eq('id', t.id)
    await supabaseAdmin
      .from('organisations')
      .update({ subscription_status: 'past_due' } as never)
      .eq('id', t.org_id)
  }

  // ── 3. past_due > 3 days old → read_only_at set (Day 17) ──────────────
  const threeDaysAgo = new Date(now); threeDaysAgo.setDate(now.getDate() - 3)
  const { data: readOnlyRows } = await supabaseAdmin
    .from('org_subscriptions')
    .update({ read_only_at: now.toISOString() } as never)
    .eq('status', 'past_due')
    .is('read_only_at', null)
    .lt('soft_locked_at', threeDaysAgo.toISOString())
    .select('id')
  const readOnlyTransitions = readOnlyRows?.length ?? 0

  // ── 4. read_only > 4 days → export_only (Day 21) ──────────────────────
  const fourDaysAgo = new Date(now); fourDaysAgo.setDate(now.getDate() - 4)
  const { data: exportOnlyRows } = await supabaseAdmin
    .from('org_subscriptions')
    .update({ export_only_at: now.toISOString() } as never)
    .eq('status', 'past_due')
    .is('export_only_at', null)
    .not('read_only_at', 'is', null)
    .lt('read_only_at', fourDaysAgo.toISOString())
    .select('id')
  const exportOnlyTransitions = exportOnlyRows?.length ?? 0

  // ── 5. export_only > 9 days → cancelled (Day 30, deactivation email) ──
  const nineDaysAgo = new Date(now); nineDaysAgo.setDate(now.getDate() - 9)
  const { data: toDeactivate } = await supabaseAdmin
    .from('org_subscriptions')
    .select('id, org_id, organisations(name, billing_email)')
    .eq('status', 'past_due')
    .not('export_only_at', 'is', null)
    .lt('export_only_at', nineDaysAgo.toISOString()) as { data: SubRow[] | null }

  for (const sub of toDeactivate ?? []) {
    await supabaseAdmin
      .from('org_subscriptions')
      .update({ status: 'cancelled', deactivated_at: now.toISOString() } as never)
      .eq('id', sub.id)
    await supabaseAdmin
      .from('organisations')
      .update({ subscription_status: 'cancelled' } as never)
      .eq('id', sub.org_id)

    const org = pickOrg(sub.organisations)
    if (org?.billing_email) {
      await sendDeactivationEmail({ to: org.billing_email, orgName: org.name, retentionDays: 90, orgId: sub.org_id })
    }
  }

  // ── 6. Hard delete after 90 days deactivated ──────────────────────────
  const ninetyDaysAgo = new Date(now); ninetyDaysAgo.setDate(now.getDate() - 90)
  const { data: toDelete } = await supabaseAdmin
    .from('org_subscriptions')
    .select('org_id')
    .eq('status', 'cancelled')
    .lt('deactivated_at', ninetyDaysAgo.toISOString()) as { data: { org_id: string }[] | null }

  for (const t of toDelete ?? []) {
    // organisations.id has ON DELETE CASCADE on every tenant table, so this
    // wipes the entire org footprint.
    await supabaseAdmin.from('organisations').delete().eq('id', t.org_id)
  }

  // ── 7. Monthly AI allowance reset ─────────────────────────────────────
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]
  const { data: orgsForReset } = await supabaseAdmin
    .from('org_credits')
    .select('org_id')
    .or(`allowance_reset_date.is.null,allowance_reset_date.lte.${thirtyDaysAgo}`) as { data: { org_id: string }[] | null }

  let allowanceResets = 0
  for (const o of orgsForReset ?? []) {
    const { error } = await supabaseAdmin.rpc('reset_monthly_allowance', { p_org_id: o.org_id })
    if (error) console.warn('[cron/billing/daily] reset_monthly_allowance:', error.message)
    else allowanceResets++
  }

  return NextResponse.json({
    ok: true,
    reminders_sent:           remindersSent,
    expired_trials:           expiredTrials?.length ?? 0,
    read_only_transitions:    readOnlyTransitions,
    export_only_transitions:  exportOnlyTransitions,
    deactivated:              toDeactivate?.length ?? 0,
    deleted:                  toDelete?.length ?? 0,
    allowance_resets:         allowanceResets,
  })
}

// Vercel Cron triggers via GET; the spec uses POST. Accept both so manual
// triggers from the dashboard / curl work without surprise.
export async function GET(req: NextRequest)  { return handle(req) }
export async function POST(req: NextRequest) { return handle(req) }
