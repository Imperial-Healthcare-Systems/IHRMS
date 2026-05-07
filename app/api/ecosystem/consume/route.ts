import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Shared secret for ICRM → IHRMS calls (set ECOSYSTEM_SECRET in env)
const ECOSYSTEM_SECRET = process.env.ECOSYSTEM_SECRET ?? ''

export async function POST(req: NextRequest) {
  try {
    // Validate shared secret
    const authHeader = req.headers.get('authorization') ?? ''
    if (!ECOSYSTEM_SECRET || authHeader !== `Bearer ${ECOSYSTEM_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { event_type, org_id, payload, source } = body

    if (!event_type || !org_id) {
      return NextResponse.json({ error: 'event_type and org_id are required' }, { status: 400 })
    }

    // Handle known inbound ICRM→IHRMS events
    switch (event_type) {
      case 'crm.deal.closed': {
        // Example: notify HR when a deal closes (could trigger commission/bonus flow)
        const { employee_id, deal_value, deal_name } = payload ?? {}
        if (employee_id) {
          void Promise.resolve(
            supabaseAdmin.from('notifications').insert({
              recipient_id: employee_id,
              title: 'Deal Closed — Bonus Eligible',
              body: `Deal "${deal_name ?? 'N/A'}" worth ₹${(deal_value ?? 0).toLocaleString('en-IN')} has been closed. Your commission may be processed in the next payroll.`,
              type: 'info',
              created_at: new Date().toISOString(),
            })
          ).catch(() => {})
        }
        break
      }

      case 'crm.contact.created': {
        // No IHRMS action needed — acknowledge silently
        break
      }

      default:
        // Unknown event type — log and acknowledge (don't reject, for forward compatibility)
        console.info('[ecosystem/consume] Unknown event_type:', event_type)
    }

    // Mark event as processed in ecosystem_events table (if tracked)
    if (payload?.event_id) {
      void Promise.resolve(
        supabaseAdmin
          .from('ecosystem_events')
          .update({ processed: true })
          .eq('id', payload.event_id)
      ).catch(() => {})
    }

    return NextResponse.json({ received: true, event_type })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[ecosystem/consume]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
