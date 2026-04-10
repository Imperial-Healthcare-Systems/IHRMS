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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search        = searchParams.get('search')
    const department_id = searchParams.get('department_id')
    const limit         = parseInt(searchParams.get('limit') ?? '100')
    const offset        = parseInt(searchParams.get('offset') ?? '0')

    // Verify payroll run exists
    const { data: run, error: runError } = await supabaseAdmin
      .from('payroll_runs')
      .select('id, month, year, status')
      .eq('id', id)
      .single()

    if (runError) {
      console.error('[payslips GET run]', runError)
      if (runError.code === 'PGRST116') return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
      throw runError
    }

    let query = supabaseAdmin
      .from('payslips')
      .select(`*, employee:employees(id, first_name, last_name, work_email, emp_id)`, { count: 'exact' })
      .eq('payroll_run_id', id)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) { console.error('[payslips GET]', error); throw error }

    let filtered = (data ?? []) as any[]
    if (search) {
      const term = search.toLowerCase()
      filtered = filtered.filter((p: any) => {
        const emp = p.employee
        if (!emp) return false
        return (
          emp.first_name?.toLowerCase().includes(term) ||
          emp.last_name?.toLowerCase().includes(term) ||
          emp.work_email?.toLowerCase().includes(term) ||
          emp.emp_id?.toLowerCase().includes(term)
        )
      })
    }
    if (department_id) {
      filtered = filtered.filter((p: any) => p.employee?.department_id === department_id)
    }

    return NextResponse.json({
      data: filtered,
      count: search || department_id ? filtered.length : count,
      payroll_run: run,
      limit,
      offset,
    })
  } catch (err: unknown) {
    console.error('[payslips GET catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
