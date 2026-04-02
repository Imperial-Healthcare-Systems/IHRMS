import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('exit_processes')
      .select(`
        *,
        employee:employees!employee_id(
          id, first_name, last_name, work_email, personal_phone,
          date_of_joining, notice_period_days,
          department:departments(id, name, code),
          designation:designations(id, title)
        ),
        initiated_by_employee:employees!initiated_by(id, first_name, last_name),
        hr_manager:employees!hr_manager_id(id, first_name, last_name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Exit process not found' }, { status: 404 })
      throw error
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = (session.user as any)?.isAdmin
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden — HR Admin required' }, { status: 403 })

    const body = await req.json()
    const {
      clearance_hr,
      clearance_it,
      clearance_finance,
      clearance_manager,
      clearance_admin,
      fnf_amount,
      fnf_paid,
      fnf_paid_date,
      status,
      noc_issued,
      experience_letter_issued,
    } = body

    // Fetch current exit process
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('exit_processes')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Exit process not found' }, { status: 404 })
      throw fetchError
    }

    // Merge clearance checklist
    const existingChecklist = (current.clearance_checklist as Record<string, boolean>) ?? {}
    const updatedChecklist = { ...existingChecklist }

    if (clearance_hr !== undefined) updatedChecklist.hr = clearance_hr
    if (clearance_it !== undefined) updatedChecklist.it = clearance_it
    if (clearance_finance !== undefined) updatedChecklist.finance = clearance_finance
    if (clearance_manager !== undefined) updatedChecklist.manager = clearance_manager
    if (clearance_admin !== undefined) updatedChecklist.admin = clearance_admin

    // Determine auto status transitions
    const allClearanceDone =
      updatedChecklist.hr === true &&
      updatedChecklist.it === true &&
      updatedChecklist.finance === true &&
      updatedChecklist.manager === true &&
      updatedChecklist.admin === true

    const updates: Record<string, unknown> = {
      clearance_checklist: updatedChecklist,
      updated_at: new Date().toISOString(),
    }

    if (fnf_amount !== undefined) updates.fnf_amount = fnf_amount
    if (fnf_paid !== undefined) updates.fnf_paid = fnf_paid
    if (fnf_paid_date !== undefined) updates.fnf_settlement_date = fnf_paid_date
    if (noc_issued !== undefined) updates.noc_issued = noc_issued
    if (experience_letter_issued !== undefined) updates.experience_letter = experience_letter_issued

    // Auto-set status based on clearances and fnf
    if (fnf_paid === true) {
      updates.status = 'completed'
    } else if (allClearanceDone) {
      updates.status = 'cleared'
    } else if (status !== undefined) {
      updates.status = status
    }

    const { data, error } = await supabaseAdmin
      .from('exit_processes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // If FnF paid, update employee to terminated and set last_working_date
    if (fnf_paid === true) {
      const employeeUpdates: Record<string, unknown> = {
        status: 'terminated',
        updated_at: new Date().toISOString(),
      }
      if (current.last_working_day) {
        employeeUpdates.date_of_confirmation = current.last_working_day // use appropriate date field
      }
      await supabaseAdmin
        .from('employees')
        .update(employeeUpdates)
        .eq('id', current.employee_id)
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
