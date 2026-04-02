import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('job_requisitions')
      .select(`
        id, title, employment_type, no_of_positions, filled_positions,
        location, min_experience_years, max_experience_years,
        min_ctc, max_ctc, skills_required, job_description,
        status, priority, target_date,
        department:departments(id, name, code),
        designation:designations(id, title),
        raised_by:employees!job_requisitions_raised_by_fkey(id, first_name, last_name, emp_id),
        approved_by:employees!job_requisitions_approved_by_fkey(id, first_name, last_name, emp_id),
        created_at, updated_at
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Requisition not found' }, { status: 404 })
      throw error
    }

    // Count candidates for this requisition
    const { count: candidatesCount } = await supabaseAdmin
      .from('candidates')
      .select('*', { count: 'exact', head: true })
      .eq('requisition_id', params.id)

    // Count by stage
    const { data: stageCounts } = await supabaseAdmin
      .from('candidates')
      .select('status')
      .eq('requisition_id', params.id)

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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    // Strip immutable fields
    const { id: _id, created_at: _ca, raised_by: _rb, ...updates } = body

    const { data, error } = await supabaseAdmin
      .from('job_requisitions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Requisition not found' }, { status: 404 })
      throw error
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = (session.user as any)?.isAdmin
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden — HR Admin required' }, { status: 403 })

    const { data, error } = await supabaseAdmin
      .from('job_requisitions')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select('id, title, status')
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Requisition not found' }, { status: 404 })
      throw error
    }

    return NextResponse.json({ data, message: 'Requisition closed successfully' })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
