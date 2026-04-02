import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: run, error } = await supabaseAdmin
      .from('payroll_runs')
      .select(`
        id, month, year, run_date, payment_date, status, remarks,
        total_employees, total_gross, total_deductions, total_net,
        total_employer_pf, total_employer_esic,
        processed_by:employees!payroll_runs_processed_by_fkey(id, first_name, last_name, emp_id),
        approved_by:employees!payroll_runs_approved_by_fkey(id, first_name, last_name, emp_id),
        created_at, updated_at
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
      throw error
    }

    // Summary stats: payslip count and net pay distribution
    const { data: payslipStats } = await supabaseAdmin
      .from('payslips')
      .select('net_pay, total_deductions, gross_earnings, payment_status')
      .eq('payroll_run_id', id)

    const stats = {
      payslip_count: payslipStats?.length ?? 0,
      paid_count: payslipStats?.filter((p) => p.payment_status === 'paid').length ?? 0,
      pending_count: payslipStats?.filter((p) => p.payment_status === 'pending').length ?? 0,
      total_gross: payslipStats?.reduce((sum, p) => sum + (p.gross_earnings ?? 0), 0) ?? 0,
      total_deductions: payslipStats?.reduce((sum, p) => sum + (p.total_deductions ?? 0), 0) ?? 0,
      total_net: payslipStats?.reduce((sum, p) => sum + (p.net_pay ?? 0), 0) ?? 0,
    }

    return NextResponse.json({ data: run, stats })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
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

    // Fetch current run
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('payroll_runs')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
      throw fetchError
    }

    const userId = (session.user as any)?.id ?? null
    let updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (action === 'approve') {
      if (!['processed', 'draft'].includes(current.status)) {
        return NextResponse.json(
          { error: `Cannot approve a run with status '${current.status}'` },
          { status: 422 }
        )
      }
      updatePayload = {
        ...updatePayload,
        status: 'approved',
        approved_by: userId,
        remarks: notes ?? null,
      }
    } else if (action === 'mark_paid') {
      if (current.status !== 'approved') {
        return NextResponse.json(
          { error: `Cannot mark as paid — run must be 'approved' first (current: '${current.status}')` },
          { status: 422 }
        )
      }
      updatePayload = {
        ...updatePayload,
        status: 'paid',
        payment_date: new Date().toISOString().split('T')[0],
        remarks: notes ?? null,
      }
    } else {
      return NextResponse.json({ error: `Unknown action '${action}'` }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('payroll_runs')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
