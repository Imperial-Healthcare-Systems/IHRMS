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

function isAdmin(session: Awaited<ReturnType<typeof getServerSession<typeof authOptions>>>): boolean {
  const role = ((session as unknown as Record<string, unknown>)?.user as Record<string, unknown>)?.role as string | undefined
  return ['hr_admin', 'super_admin', 'admin', 'hr'].includes(role ?? '')
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employee_id')
    const orgId = (session.user as any)?.orgId as string | null
    const userId = (session.user as any)?.id as string
    const isAdminUser = isAdmin(session)

    let query = supabaseAdmin
      .from('shift_schedules')
      .select(`
        id, employee_id, shift_id, effective_from, effective_to, org_id,
        employee:employees!employee_id(id, first_name, last_name, emp_id),
        shift:shifts!shift_id(id, name, start_time, end_time, days)
      `)
      .order('effective_from', { ascending: false })

    if (!isAdminUser) query = query.eq('employee_id', userId)
    else if (employeeId) query = query.eq('employee_id', employeeId)
    if (orgId) query = query.eq('org_id', orgId)

    const { data, error } = await query
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ data: [] })
      throw error
    }
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { employee_id, shift_id, effective_from, effective_to } = body
    if (!employee_id || !effective_from) {
      return NextResponse.json({ error: 'employee_id and effective_from are required' }, { status: 400 })
    }

    const orgId = (session.user as any)?.orgId as string | null

    const { data, error } = await supabaseAdmin
      .from('shift_schedules')
      .insert({ employee_id, shift_id: shift_id ?? null, effective_from, effective_to: effective_to ?? null, org_id: orgId })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
