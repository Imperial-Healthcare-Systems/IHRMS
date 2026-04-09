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
    const status        = searchParams.get('status')
    const department_id = searchParams.get('department_id')
    const priority      = searchParams.get('priority')
    const limit         = Math.min(parseInt(searchParams.get('limit') ?? '50'), 500)
    const offset        = parseInt(searchParams.get('offset') ?? '0')

    let query = supabaseAdmin
      .from('job_requisitions')
      .select(`
        id, title, employment_type, no_of_positions, filled_positions,
        location, min_experience_years, max_experience_years,
        min_ctc, max_ctc, skills_required, job_description,
        status, priority, target_date,
        department:departments(id, name, code),
        designation:designations(id, title),
        raised_by:employees(id, first_name, last_name, emp_id),
        created_at, updated_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status)        query = query.eq('status', status)
    if (department_id) query = query.eq('department_id', department_id)
    if (priority)      query = query.eq('priority', priority)

    const { data, error, count } = await query
    if (error) {
      console.error('[requisitions GET]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [], count, limit, offset })
  } catch (err: unknown) {
    console.error('[requisitions GET] catch:', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      title,
      department_id,
      designation_id,
      location,
      employment_type,
      openings,
      min_experience_years,
      max_experience_years,
      min_ctc,
      max_ctc,
      skills_required,
      job_description,
      priority,
      target_date,
    } = body

    if (!title || !department_id || !location || !employment_type || !openings || min_experience_years === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: title, department_id, location, employment_type, openings, min_experience_years' },
        { status: 400 }
      )
    }

    const postedById = (session.user as any)?.id ?? null

    const { data, error } = await supabaseAdmin
      .from('job_requisitions')
      .insert({
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
        raised_by: postedById,
      })
      .select()
      .single()

    if (error) {
      console.error('[requisitions POST]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    console.error('[requisitions POST] catch:', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
