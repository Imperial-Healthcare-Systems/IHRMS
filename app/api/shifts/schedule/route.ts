import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const SHIFT_MANAGER_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr', 'manager', 'operations_head']

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
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employee_id')
    const isAdminUser = SHIFT_MANAGER_ROLES.includes(ctx.role)

    let query = supabaseAdmin
      .from('shift_schedules')
      .select(`
        id, employee_id, shift_id, effective_from, effective_to, org_id,
        employee:employees!employee_id(id, first_name, last_name, emp_id),
        shift:shifts!shift_id(id, name, start_time, end_time, days)
      `)
      .eq('org_id', ctx.orgId)
      .order('work_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (!isAdminUser) query = query.eq('employee_id', ctx.identityId)
    else if (employeeId) query = query.eq('employee_id', employeeId)

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
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx
    if (!SHIFT_MANAGER_ROLES.includes(ctx.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id
    const { employee_id, shift_id, effective_from, effective_to } = body
    if (!employee_id || !effective_from) {
      return NextResponse.json({ error: 'employee_id and effective_from are required' }, { status: 400 })
    }

    // Cross-tenant guard: employee_id must belong to this org
    {
      const { data: emp } = await supabaseAdmin
        .from('employees').select('id')
        .eq('id', employee_id).eq('org_id', ctx.orgId).maybeSingle()
      if (!emp) return NextResponse.json({ error: 'Employee not found in your organisation' }, { status: 404 })
    }

    // Cross-tenant guard for shift_id
    if (shift_id) {
      const { data: shift } = await supabaseAdmin
        .from('shifts').select('id')
        .eq('id', shift_id).eq('org_id', ctx.orgId).maybeSingle()
      if (!shift) return NextResponse.json({ error: 'Shift not found in your organisation' }, { status: 404 })
    }

    // Best-effort: remove any existing schedule for same employee+date to avoid duplicates
    // Wrapped separately so a schema-cache miss on effective_from doesn't block the insert
    try {
      await supabaseAdmin
        .from('shift_schedules')
        .delete()
        .eq('org_id', ctx.orgId)
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
        org_id:        ctx.orgId,
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
