import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

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
    const status        = searchParams.get('status')
    const department_id = searchParams.get('department_id')
    const priority      = searchParams.get('priority')
    const limit         = Math.min(parseInt(searchParams.get('limit') ?? '50'), 500)
    const offset        = parseInt(searchParams.get('offset') ?? '0')

    const buildQuery = (deptHint: string) => {
      let q = supabaseAdmin
        .from('job_requisitions')
        .select(`
          id, title, employment_type, no_of_positions, filled_positions,
          location, min_experience_years, max_experience_years,
          min_ctc, max_ctc, skills_required, job_description,
          status, priority, target_date,
          department:${deptHint}(id, name, code),
          designation:designations(id, title),
          created_at, updated_at
        `, { count: 'exact' })
        .eq('org_id', ctx.orgId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      if (status)        q = q.eq('status', status)
      if (department_id) q = q.eq('department_id', department_id)
      if (priority)      q = q.eq('priority', priority)
      return q
    }

    let { data, error: dbErr, count } = await buildQuery('departments')
    if (dbErr && dbErr.code === 'PGRST201') {
      console.warn('[requisitions GET] departments ambiguous, retrying with explicit FK')
      const retry = await buildQuery('departments!job_requisitions_department_id_fkey')
      data = retry.data; dbErr = retry.error; count = retry.count
    }
    if (dbErr) {
      console.error('[requisitions GET]', dbErr)
      return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [], count, limit, offset })
  } catch (err: unknown) {
    console.error('[requisitions GET] catch:', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const {
      title, department_id, designation_id, location,
      employment_type, openings,
      min_experience_years, max_experience_years,
      min_ctc, max_ctc, skills_required, job_description,
      priority, target_date,
    } = body

    if (!title || !department_id || !location || !employment_type || !openings || min_experience_years === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: title, department_id, location, employment_type, openings, min_experience_years' },
        { status: 400 }
      )
    }

    // Verify dept belongs to org
    const { data: dept } = await supabaseAdmin
      .from('departments')
      .select('id')
      .eq('id', department_id)
      .eq('org_id', ctx.orgId)
      .maybeSingle()
    if (!dept) return NextResponse.json({ error: 'Department not found in your organisation' }, { status: 404 })

    const { data, error: dbErr } = await supabaseAdmin
      .from('job_requisitions')
      .insert({
        org_id: ctx.orgId,
        title,
        department_id,
        designation_id: designation_id ?? null,
        location,
        employment_type,
        no_of_positions: parseInt(openings),
        filled_positions: 0,
        min_experience_years: parseFloat(min_experience_years),
        max_experience_years: max_experience_years ? parseFloat(max_experience_years) : null,
        min_ctc: min_ctc ? parseFloat(min_ctc) : null,
        max_ctc: max_ctc ? parseFloat(max_ctc) : null,
        skills_required: skills_required ?? null,
        job_description: job_description ?? null,
        status: 'open',
        priority: priority ?? 'medium',
        target_date: target_date ?? null,
        raised_by: ctx.identityId,
      })
      .select()
      .single()

    if (dbErr) {
      console.error('[requisitions POST]', dbErr)
      return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    console.error('[requisitions POST] catch:', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
