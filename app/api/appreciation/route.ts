import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { emitEvent } from '@/lib/ecosystem'
import { logAudit } from '@/lib/audit'

const FULL_ACCESS = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr', 'manager', 'operations_head']

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
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(req.url)
    const limit       = Math.min(parseInt(searchParams.get('limit') ?? '100'), 200)
    const filterEmpId = searchParams.get('employee_id')

    const targetEmpId = FULL_ACCESS.includes(ctx.role) ? (filterEmpId ?? null) : ctx.identityId

    // Use RPC to bypass PostgREST schema cache (legacy reason — kept for compat)
    const { data: rows, error: dbErr } = await supabaseAdmin.rpc('get_appreciations', { p_limit: limit })

    if (dbErr) {
      const msg = errMsg(dbErr)
      if (msg.includes('Could not find') || msg.includes('does not exist') || msg.includes('PGRST')) {
        return NextResponse.json({ data: [], count: 0 })
      }
      console.error('[appreciation GET]', dbErr)
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    // Always filter to caller's org by joining against employees in this org.
    // RPC returns rows from all orgs — we trim down here.
    const allRows = (rows ?? []) as Record<string, unknown>[]
    if (allRows.length === 0) return NextResponse.json({ data: [], count: 0 })

    const employeeIds = [...new Set([
      ...allRows.map(r => r.employee_id as string),
      ...allRows.map(r => r.given_by as string),
    ].filter(Boolean))]

    const { data: emps } = await supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, emp_id, org_id, department:departments!employees_department_id_fkey(id, name)')
      .in('id', employeeIds)
      .eq('org_id', ctx.orgId)

    const empMap = Object.fromEntries((emps ?? []).map((e: Record<string, unknown>) => [e.id, e]))

    // Keep only rows where BOTH the recipient and giver are in caller's org
    const orgRows = allRows.filter(r =>
      empMap[r.employee_id as string] && empMap[r.given_by as string]
    )

    const filteredRows = targetEmpId
      ? orgRows.filter(r => r.employee_id === targetEmpId)
      : orgRows

    if (filteredRows.length === 0) return NextResponse.json({ data: [], count: 0 })

    const enriched = filteredRows.map(r => ({
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
    const { ctx, error } = await requireAuth()
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const { employee_id, category, subject, description, is_public } = body

    if (!employee_id || !category || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: employee_id, category, subject' },
        { status: 400 }
      )
    }

    // Cross-tenant guard
    const { data: emp } = await supabaseAdmin
      .from('employees').select('id')
      .eq('id', employee_id).eq('org_id', ctx.orgId).maybeSingle()
    if (!emp) return NextResponse.json({ error: 'Employee not found in your organisation' }, { status: 404 })

    const { data, error: dbErr } = await supabaseAdmin.rpc('save_appreciation', {
      p_employee_id: employee_id,
      p_given_by:    ctx.identityId,
      p_category:    category,
      p_subject:     subject,
      p_description: description ?? null,
      p_is_public:   is_public ?? true,
    })

    if (dbErr) {
      console.error('[appreciation POST]', dbErr)
      return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })
    }

    emitEvent({
      event_type: 'appreciation.issued',
      source_platform: 'ihrms',
      org_id: ctx.orgId,
      actor_id: ctx.identityId,
      entity_id: employee_id,
      payload: { employee_id, category, subject },
    })
    logAudit({
      org_id: ctx.orgId,
      actor_identity_id: ctx.identityId, actor_membership_id: ctx.membershipId,
      action: 'created',
      module: 'appreciation',
      entity_id: employee_id,
      summary: 'Appreciation issued to employee',
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[appreciation POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
