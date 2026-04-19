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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const limit       = Math.min(parseInt(searchParams.get('limit') ?? '100'), 200)
    const filterEmpId = searchParams.get('employee_id')

    const userRole = (session.user as Record<string, unknown>)?.role as string | undefined
    const userId   = (session.user as Record<string, unknown>)?.id   as string | undefined
    const FULL_ACCESS = ['hr_admin', 'super_admin', 'admin', 'hr', 'manager', 'operations_head']
    const targetEmpId = FULL_ACCESS.includes(userRole ?? '') ? (filterEmpId ?? null) : (userId ?? null)

    // Use RPC to bypass PostgREST schema cache
    const { data: rows, error } = await supabaseAdmin.rpc('get_appreciations', { p_limit: limit })

    if (error) {
      const msg = errMsg(error)
      // Table or function not yet visible — return empty gracefully
      if (msg.includes('Could not find') || msg.includes('does not exist') || msg.includes('PGRST')) {
        return NextResponse.json({ data: [], count: 0 })
      }
      console.error('[appreciation GET]', error)
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    // Filter to own records if not full-access
    const filteredRows = targetEmpId
      ? (rows ?? []).filter((r: Record<string, unknown>) => r.employee_id === targetEmpId)
      : (rows ?? [])

    if (!filteredRows || filteredRows.length === 0) return NextResponse.json({ data: [], count: 0 })

    // Enrich with employee names via employees table
    const employeeIds = [...new Set([
      ...filteredRows.map((r: Record<string, unknown>) => r.employee_id as string),
      ...filteredRows.map((r: Record<string, unknown>) => r.given_by as string),
    ].filter(Boolean))]

    const { data: emps } = await supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, emp_id, department:departments!employees_department_id_fkey(id, name)')
      .in('id', employeeIds)

    const empMap = Object.fromEntries((emps ?? []).map((e: Record<string, unknown>) => [e.id, e]))

    const enriched = filteredRows.map((r: Record<string, unknown>) => ({
      ...r,
      employee: empMap[r.employee_id as string] ?? null,
      given_by: empMap[r.given_by as string] ?? null,
    }))

    return NextResponse.json({ data: enriched, count: enriched.length })
  } catch (err) {
    console.error('[appreciation GET catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sessionUserId = (session.user as Record<string, unknown>)?.id as string | undefined

    const body = await req.json()
    const { employee_id, category, subject, description, is_public } = body

    if (!employee_id || !category || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: employee_id, category, subject' },
        { status: 400 }
      )
    }

    // Use RPC to bypass PostgREST schema cache
    const { data, error } = await supabaseAdmin.rpc('save_appreciation', {
      p_employee_id: employee_id,
      p_given_by:    sessionUserId,
      p_category:    category,
      p_subject:     subject,
      p_description: description ?? null,
      p_is_public:   is_public ?? true,
    })

    if (error) {
      console.error('[appreciation POST]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[appreciation POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
