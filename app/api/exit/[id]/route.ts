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

const EXIT_SELECT = `
  *,
  employee:employees!employee_id(
    id, first_name, last_name, emp_id, work_email,
    date_of_joining,
    department:departments!employees_department_id_fkey(id, name),
    designation:designations(id, title)
  )
`

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
      .select(EXIT_SELECT)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Exit process not found' }, { status: 404 })
      console.error('[exit GET id]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
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

    const body = await req.json()
    const { all_clearance_done, fnf_approved, employee_id_to_terminate } = body as {
      all_clearance_done?: boolean
      fnf_approved?: boolean
      employee_id_to_terminate?: string
    }

    // Only update the `status` column which is guaranteed to exist.
    // Clearance details and FnF amounts are persisted client-side via localStorage.
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (fnf_approved) {
      updates.status = 'completed'
    } else if (all_clearance_done) {
      updates.status = 'cleared'
    }

    const { data, error } = await supabaseAdmin
      .from('exit_processes')
      .update(updates)
      .eq('id', id)
      .select(EXIT_SELECT)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Exit process not found' }, { status: 404 })
      console.error('[exit PATCH]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    // If FnF approved, mark employee as terminated
    if (fnf_approved && employee_id_to_terminate) {
      const { error: empErr } = await supabaseAdmin
        .from('employees')
        .update({ status: 'terminated', updated_at: new Date().toISOString() })
        .eq('id', employee_id_to_terminate)
      if (empErr) console.error('[exit PATCH] employee termination update:', empErr.message)
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[exit PATCH catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
