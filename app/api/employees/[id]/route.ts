import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { emitEvent } from '@/lib/ecosystem'
import { logAudit } from '@/lib/audit'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireAuth()
    if (error) return error

    // Try rich query first; fall back to plain select if reporting_manager FK isn't resolvable
    let { data, error: dbErr } = await supabaseAdmin
      .from('employees')
      .select(`
        *,
        department:departments!employees_department_id_fkey(*),
        designation:designations(*),
        reporting_manager:employees!reporting_manager_id(id, first_name, last_name, emp_id)
      `)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    if (dbErr && dbErr.code !== 'PGRST116') {
      console.warn('[employees GET id] rich select failed, falling back:', dbErr.message)
      const fallback = await supabaseAdmin
        .from('employees')
        .select('*, department:departments!employees_department_id_fkey(*), designation:designations(*)')
        .eq('id', id)
        .eq('org_id', ctx.orgId)
        .single()
      data = fallback.data
      dbErr = fallback.error
    }

    if (dbErr) {
      if (dbErr.code === 'PGRST116') return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
      console.error('[employees GET id]', dbErr)
      throw dbErr
    }
    return NextResponse.json({ data })
  } catch (err: unknown) {
    console.error('[employees GET id catch]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireAuth()
    if (error) return error

    const isHrAdmin = HR_ROLES.includes(ctx.role)

    // Self-edit check — needs to match the employee row's identity_id OR fall back
    // to id-equality for legacy sessions where ctx.identityId is the employee.id.
    let isSelfEdit = id === ctx.identityId
    if (!isSelfEdit && !isHrAdmin) {
      const { data: targetEmp } = await supabaseAdmin
        .from('employees')
        .select('identity_id')
        .eq('id', id)
        .eq('org_id', ctx.orgId)
        .maybeSingle()
      isSelfEdit = !!targetEmp && (targetEmp as any).identity_id === ctx.identityId
    }

    if (!isHrAdmin && !isSelfEdit) {
      return NextResponse.json({ error: 'Forbidden — you can only update your own record' }, { status: 403 })
    }

    const body = await req.json()
    // Strip protected + tenant fields
    delete body.emp_id
    delete body.id
    delete body.created_at
    delete body.org_id

    // Non-HR users can only update personal fields
    if (!isHrAdmin) {
      const allowedFields = ['first_name', 'last_name', 'personal_phone', 'work_location', 'date_of_birth', 'gender', 'avatar_url', 'updated_at']
      for (const key of Object.keys(body)) {
        if (!allowedFields.includes(key)) delete body[key]
      }
    }

    const { error: updateErr } = await supabaseAdmin
      .from('employees')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', ctx.orgId)
    if (updateErr) {
      console.error('[employees PATCH update]', updateErr)
      return NextResponse.json({ error: updateErr.message ?? updateErr.details ?? 'Update failed' }, { status: 500 })
    }

    // Re-fetch with joins — try rich query first, fall back to simple select
    let data: Record<string, unknown> | null = null

    const { data: rich } = await supabaseAdmin
      .from('employees')
      .select('*, department:departments!employees_department_id_fkey(id, name, code), designation:designations(id, title)')
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    if (rich) {
      data = rich as Record<string, unknown>
    } else {
      const { data: plain } = await supabaseAdmin
        .from('employees')
        .select('*')
        .eq('id', id)
        .eq('org_id', ctx.orgId)
        .single()
      data = plain as Record<string, unknown> | null
    }

    // Ecosystem event + audit (fire-and-forget)
    emitEvent({
      event_type: 'employee.updated',
      source_platform: 'ihrms',
      org_id: ctx.orgId,
      actor_id: ctx.identityId,
      entity_id: id,
      payload: { employee_id: id, changes: Object.keys(body) },
    })
    logAudit({
      org_id: ctx.orgId,
      actor_identity_id: ctx.identityId, actor_membership_id: ctx.membershipId,
      action: 'updated',
      module: 'employees',
      entity_id: id,
      summary: 'Employee profile updated',
    })

    return NextResponse.json({ data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    // Soft delete — terminate
    const { data, error: dbErr } = await supabaseAdmin
      .from('employees')
      .update({ status: 'terminated', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .select('id, emp_id, status')
      .single()
    if (dbErr) throw dbErr

    logAudit({
      org_id: ctx.orgId,
      actor_identity_id: ctx.identityId, actor_membership_id: ctx.membershipId,
      action: 'deleted',
      module: 'employees',
      entity_id: id,
      summary: 'Employee terminated',
    })

    return NextResponse.json({ data, message: 'Employee terminated successfully' })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
