import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

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
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: run, error } = await supabaseAdmin
      .from('payroll_runs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('[payroll GET id]', error)
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
      throw error
    }

    // Summary stats from payslips (use * to avoid column-name mismatches)
    const { data: payslipStats } = await supabaseAdmin
      .from('payslips')
      .select('*')
      .eq('payroll_run_id', id)

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
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { action, notes } = body as { action?: 'approve' | 'mark_paid'; notes?: string }

    if (!action) {
      return NextResponse.json({ error: 'Missing required field: action' }, { status: 400 })
    }

    const { data: current, error: fetchError } = await supabaseAdmin
      .from('payroll_runs')
      .select('id, status')
      .eq('id', id)
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

    const { data, error } = await supabaseAdmin
      .from('payroll_runs')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) { console.error('[payroll PATCH save]', error); throw error }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    console.error('[payroll PATCH catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
