import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { emitEvent } from '@/lib/ecosystem'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('employees')
      .select(`
        *,
        department:departments(*),
        designation:designations(*),
        reporting_manager:employees!manager_id(id, first_name, last_name, emp_id)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
      throw error
    }
    return NextResponse.json({ data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sessionUserId = (session.user as any)?.id as string | undefined
    const sessionRole   = (session.user as any)?.role as string | undefined
    const FULL_ACCESS   = ['hr_admin', 'super_admin', 'admin', 'hr']

    if (!FULL_ACCESS.includes(sessionRole ?? '') && id !== sessionUserId) {
      return NextResponse.json({ error: 'Forbidden — you can only update your own record' }, { status: 403 })
    }

    const body = await req.json()
    // Remove protected fields
    delete body.emp_id
    delete body.id
    delete body.created_at

    // Employees can only update personal fields — prevent role/salary escalation
    if (!FULL_ACCESS.includes(sessionRole ?? '')) {
      const allowedFields = ['first_name', 'last_name', 'personal_phone', 'work_location', 'date_of_birth', 'gender', 'avatar_url', 'updated_at']
      for (const key of Object.keys(body)) {
        if (!allowedFields.includes(key)) delete body[key]
      }
    }

    const { error: updateErr } = await supabaseAdmin
      .from('employees')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (updateErr) {
      console.error('[employees PATCH update]', updateErr)
      return NextResponse.json({ error: updateErr.message ?? updateErr.details ?? 'Update failed' }, { status: 500 })
    }

    // Re-fetch with joins — try rich query first, fall back to simple select
    let data: Record<string, unknown> | null = null

    const { data: rich } = await supabaseAdmin
      .from('employees')
      .select('*, department:departments(id, name, code), designation:designations(id, title)')
      .eq('id', id)
      .single()

    if (rich) {
      data = rich as Record<string, unknown>
    } else {
      // Fallback: plain select
      const { data: plain } = await supabaseAdmin.from('employees').select('*').eq('id', id).single()
      data = plain as Record<string, unknown> | null
    }

    // Ecosystem event + audit (fire-and-forget)
    const orgId = (session.user as any)?.orgId as string | undefined
    if (orgId) {
      emitEvent({ event_type: 'employee.updated', source_platform: 'ihrms', org_id: orgId, actor_id: sessionUserId, entity_id: id, payload: { employee_id: id, changes: Object.keys(body) } })
      logAudit({ org_id: orgId, actor_id: sessionUserId ?? 'unknown', action: 'updated', module: 'employees', entity_id: id, summary: 'Employee profile updated' })
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = (session.user as any)?.isAdmin
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Soft delete
    const { data, error } = await supabaseAdmin
      .from('employees')
      .update({ status: 'terminated', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, emp_id, status')
      .single()
    if (error) throw error
    return NextResponse.json({ data, message: 'Employee terminated successfully' })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
