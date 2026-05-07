import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { data, error: dbErr } = await supabaseAdmin
      .from('job_requisitions')
      .select(`
        id, title, employment_type, no_of_positions, filled_positions,
        location, min_experience_years, max_experience_years,
        min_ctc, max_ctc, skills_required, job_description,
        status, priority, target_date,
        department:departments!job_requisitions_department_id_fkey(id, name, code),
        designation:designations(id, title),
        raised_by:employees!job_requisitions_raised_by_fkey(id, first_name, last_name, emp_id),
        approved_by:employees!job_requisitions_approved_by_fkey(id, first_name, last_name, emp_id),
        created_at, updated_at
      `)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    if (dbErr) {
      if (dbErr.code === 'PGRST116') return NextResponse.json({ error: 'Requisition not found' }, { status: 404 })
      throw dbErr
    }

    const { count: candidatesCount } = await supabaseAdmin
      .from('candidates')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', ctx.orgId)
      .eq('requisition_id', id)

    const { data: stageCounts } = await supabaseAdmin
      .from('candidates')
      .select('status')
      .eq('org_id', ctx.orgId)
      .eq('requisition_id', id)

    const stageBreakdown: Record<string, number> = {}
    for (const c of stageCounts ?? []) {
      stageBreakdown[c.status] = (stageBreakdown[c.status] ?? 0) + 1
    }

    return NextResponse.json({
      data,
      candidates_count: candidatesCount ?? 0,
      stage_breakdown: stageBreakdown,
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const body = await req.json()
    const { id: _id, created_at: _ca, raised_by: _rb, org_id: _oi, ...updates } = body

    const { data, error: dbErr } = await supabaseAdmin
      .from('job_requisitions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .select()
      .single()

    if (dbErr) {
      if (dbErr.code === 'PGRST116') return NextResponse.json({ error: 'Requisition not found' }, { status: 404 })
      throw dbErr
    }

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

    const { data, error: dbErr } = await supabaseAdmin
      .from('job_requisitions')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .select('id, title, status')
      .single()

    if (dbErr) {
      if (dbErr.code === 'PGRST116') return NextResponse.json({ error: 'Requisition not found' }, { status: 404 })
      throw dbErr
    }

    return NextResponse.json({ data, message: 'Requisition closed successfully' })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
