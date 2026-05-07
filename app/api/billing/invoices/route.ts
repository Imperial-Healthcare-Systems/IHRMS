/**
 * GET /api/billing/invoices — list platform invoices for the caller's org.
 * Tolerant of the platform_invoices table not existing (returns empty
 * list so the customer billing UI renders gracefully on partially
 * provisioned environments).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(_req: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const ctx = auth.ctx

  try {
    const { data, error } = await supabaseAdmin
      .from('platform_invoices')
      .select('id, invoice_number, product, period_start, period_end, subtotal, tax, total, currency, status, paid_at, pdf_url, cashfree_order_id, created_at')
      .eq('org_id', ctx.orgId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      // 42P01 = relation does not exist — table not yet provisioned in this env.
      if (error.code === '42P01') return NextResponse.json({ data: [] })
      console.error('[billing/invoices GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('[billing/invoices GET catch]', err)
    const message = err instanceof Error ? err.message : 'Failed to load invoices'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
