import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { emitEvent } from '@/lib/ecosystem'
import { logAudit } from '@/lib/audit'

const PAYROLL_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr', 'payroll_admin', 'finance_admin']

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { data: run, error: dbErr } = await supabaseAdmin
      .from('payroll_runs')
      .select('*')
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    if (dbErr) {
      console.error('[payroll GET id]', dbErr)
      if (dbErr.code === 'PGRST116') return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
      throw dbErr
    }

    // Summary stats from payslips — scope to org as defense-in-depth
    const { data: payslipStats } = await supabaseAdmin
      .from('payslips')
      .select('*')
      .eq('payroll_run_id', id)
      .eq('org_id', ctx.orgId)

    const stats = {
      payslip_count:    payslipStats?.length ?? 0,
      paid_count:       payslipStats?.filter((p: any) => p.payment_status === 'paid').length ?? 0,
      pending_count:    payslipStats?.filter((p: any) => p.payment_status === 'pending').length ?? 0,
      total_gross:      payslipStats?.reduce((sum: number, p: any) => sum + (p.gross_earnings ?? p.gross_salary ?? 0), 0) ?? 0,
      total_deductions: payslipStats?.reduce((sum: number, p: any) => sum + (p.total_deductions ?? 0), 0) ?? 0,
      total_net:        payslipStats?.reduce((sum: number, p: any) => sum + (p.net_pay ?? p.net_salary ?? 0), 0) ?? 0,
    }

    return NextResponse.json({ data: run, stats })
  } catch (err: unknown) {
    console.error('[payroll GET id catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireRole(PAYROLL_ROLES)
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const { action, notes } = body as { action?: 'approve' | 'mark_paid'; notes?: string }
    if (!action) {
      return NextResponse.json({ error: 'Missing required field: action' }, { status: 400 })
    }

    const { data: current, error: fetchError } = await supabaseAdmin
      .from('payroll_runs')
      .select('id, status')
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    if (fetchError) {
      console.error('[payroll PATCH fetch]', fetchError)
      if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
      throw fetchError
    }

    let updatePayload: Record<string, unknown> = {}

    if (action === 'approve') {
      if (!['processed', 'draft'].includes(current.status)) {
        return NextResponse.json(
          { error: `Cannot approve a run with status '${current.status}'` },
          { status: 422 }
        )
      }
      updatePayload = { status: 'approved' }
      if (notes) updatePayload.remarks = notes
    } else if (action === 'mark_paid') {
      if (current.status !== 'approved') {
        return NextResponse.json(
          { error: `Cannot mark as paid — run must be 'approved' first (current: '${current.status}')` },
          { status: 422 }
        )
      }
      updatePayload = { status: 'paid' }
      if (notes) updatePayload.remarks = notes
    } else {
      return NextResponse.json({ error: `Unknown action '${action}'` }, { status: 400 })
    }

    const { data, error: dbErr } = await supabaseAdmin
      .from('payroll_runs')
      .update(updatePayload)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .select()
      .single()

    if (dbErr) { console.error('[payroll PATCH save]', dbErr); throw dbErr }

    // Ecosystem event + audit (fire-and-forget)
    emitEvent({
      event_type: 'payroll.approved',
      source_platform: 'ihrms',
      org_id: ctx.orgId,
      actor_id: ctx.identityId,
      entity_id: id,
      payload: { payroll_run_id: id, action },
    })
    logAudit({
      org_id: ctx.orgId,
      actor_identity_id: ctx.identityId, actor_membership_id: ctx.membershipId,
      action: action === 'approve' ? 'approved' : 'updated',
      module: 'payroll',
      entity_id: id,
      summary: `Payroll run ${action}`,
    })

    return NextResponse.json({ data })
  } catch (err: unknown) {
    console.error('[payroll PATCH catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
