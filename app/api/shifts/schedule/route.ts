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

function canManageShifts(session: Awaited<ReturnType<typeof getServerSession<typeof authOptions>>>): boolean {
  const role = ((session as unknown as Record<string, unknown>)?.user as Record<string, unknown>)?.role as string | undefined
  return ['hr_admin', 'super_admin', 'admin', 'hr', 'manager', 'operations_head'].includes(role ?? '')
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employee_id')
    const orgId = (session.user as any)?.orgId as string | null
    const userId = (session.user as any)?.id as string
    const isAdminUser = canManageShifts(session)

    let query = supabaseAdmin
      .from('shift_schedules')
      .select(`
        id, employee_id, shift_id, effective_from, effective_to, org_id,
        employee:employees!employee_id(id, first_name, last_name, emp_id),
        shift:shifts!shift_id(id, name, start_time, end_time, days)
      `)
      .order('work_date', { ascending: false })
      .order('created_at', { ascending: false })

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
    if (!canManageShifts(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { employee_id, shift_id, effective_from, effective_to } = body
    if (!employee_id || !effective_from) {
      return NextResponse.json({ error: 'employee_id and effective_from are required' }, { status: 400 })
    }

    const orgId = (session.user as any)?.orgId as string | null

    // Best-effort: remove any existing schedule for same employee+date to avoid duplicates
    // Wrapped separately so a schema-cache miss on effective_from doesn't block the insert
    try {
      await supabaseAdmin
        .from('shift_schedules')
        .delete()
        .eq('employee_id', employee_id)
        .eq('work_date', effective_from)
    } catch (_) { /* non-fatal — column may not exist yet in cache */ }

    const { data, error } = await supabaseAdmin
      .from('shift_schedules')
      .insert({
        employee_id,
        shift_id:      shift_id ?? null,
        work_date:     effective_from,        // pre-existing NOT NULL column
        effective_from,
        effective_to:  effective_to ?? null,
        org_id:        orgId ?? null,
      })
      .select()
      .single()

    if (error) {
      console.error('[shifts/schedule POST] insert error:', error)
      return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 500 })
    }
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
