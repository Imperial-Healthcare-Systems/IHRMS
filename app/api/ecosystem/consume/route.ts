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
        // Notify the employee tied to the closed deal.
        const { employee_id, deal_value, deal_name } = payload ?? {}
        if (employee_id) {
          // CRM passes employees.id, but notifications.recipient_id is read as
          // an identities.id by /api/notifications (.eq('recipient_id', ctx.identityId)).
          // Resolve employee → identity so the target user actually sees this.
          const { data: emp, error: lookupErr } = await supabaseAdmin
            .from('employees')
            .select('identity_id')
            .eq('id', employee_id)
            .eq('org_id', org_id)
            .maybeSingle() as { data: { identity_id: string | null } | null; error: { message: string } | null }

          if (lookupErr) {
            console.error('[ecosystem/consume] employee lookup failed:', lookupErr.message, { employee_id, org_id })
          } else if (emp?.identity_id) {
            const { error: insertErr } = await supabaseAdmin.from('notifications').insert({
              org_id,
              recipient_id: emp.identity_id,
              title: 'Deal Closed — Bonus Eligible',
              body: `Deal "${deal_name ?? 'N/A'}" worth ₹${(deal_value ?? 0).toLocaleString('en-IN')} has been closed. Your commission may be processed in the next payroll.`,
              type: 'info',
              is_read: false,
            })
            if (insertErr) {
              console.error('[ecosystem/consume] notification insert FAILED:', insertErr.message, { org_id, recipient_id: emp.identity_id })
            }
          } else {
            console.warn('[ecosystem/consume] employee has no identity_id; skipping notify', { employee_id, org_id })
          }
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

    // Mark the event as processed (org-scoped, so a malicious caller can't flip
    // someone else's tenant rows).
    if (payload?.event_id) {
      const { error: updateErr } = await supabaseAdmin
        .from('ecosystem_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('id', payload.event_id)
        .eq('org_id', org_id)
      if (updateErr) {
        console.error('[ecosystem/consume] ecosystem_events update FAILED:', updateErr.message, { event_id: payload.event_id, org_id })
      }
    }

    return NextResponse.json({ received: true, event_type })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[ecosystem/consume]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
