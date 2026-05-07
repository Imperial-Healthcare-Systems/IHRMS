/**
 * GET /api/billing/plans — public-ish plan catalogue.
 *
 * Auth-gated (so we don't expose pricing in unauthenticated probes), but
 * not org-scoped: every authenticated user sees the same canonical list
 * from `subscription_plans`. Reads exclusively from the table per spec
 * Founding Principle 7 ("subscription_plans is the only pricing source").
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(_req: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('product, tier, price_per_seat_inr, min_seats, ai_credits_included_monthly, trial_requires_card, trial_days, is_active')
      .eq('is_active', true)
      .order('product', { ascending: true })
      .order('price_per_seat_inr', { ascending: true })

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ data: [] })
      console.error('[billing/plans GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('[billing/plans GET catch]', err)
    const message = err instanceof Error ? err.message : 'Failed to load plans'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
