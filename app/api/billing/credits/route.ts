/**
 * GET /api/billing/credits — AI credit balance + monthly allowance for
 * the caller's org. Drives the credits-meter widget on /settings/billing.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(_req: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const ctx = auth.ctx

  try {
    const { data: credits, error } = await supabaseAdmin
      .from('org_credits')
      .select('allowance_remaining, allowance_carry_over, purchased_balance, balance, allowance_reset_date, last_topup_at, last_consume_at')
      .eq('org_id', ctx.orgId)
      .maybeSingle()

    if (error && error.code !== '42P01') {
      console.error('[billing/credits GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Recent transactions for the activity strip.
    const { data: recent } = await supabaseAdmin
      .from('credit_transactions')
      .select('id, type, amount, balance_after, reference_type, reference_id, notes, created_at')
      .eq('org_id', ctx.orgId)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      credits: credits ?? null,
      recent_transactions: recent ?? [],
    })
  } catch (err) {
    console.error('[billing/credits GET catch]', err)
    const message = err instanceof Error ? err.message : 'Failed to load credits'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
