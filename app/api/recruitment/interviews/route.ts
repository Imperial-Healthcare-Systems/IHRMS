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
    const candidate_id = searchParams.get('candidate_id')
    const status       = searchParams.get('status')    // maps to result field in schema
    const date_from    = searchParams.get('date_from')
    const date_to      = searchParams.get('date_to')
    const limit        = Math.min(parseInt(searchParams.get('limit') ?? '50'), 500)
    const offset       = parseInt(searchParams.get('offset') ?? '0')

    let query = supabaseAdmin
      .from('interview_schedules')
      .select(`
        id, round_number, round_name, scheduled_at, duration_minutes,
        mode, location, meeting_link, interviewers, result, remarks,
        candidate:candidates!candidate_id(id, first_name, last_name, email, phone, status),
        requisition:job_requisitions!requisition_id(id, title),
        created_at, updated_at
      `, { count: 'exact' })
      .order('scheduled_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (candidate_id) query = query.eq('candidate_id', candidate_id)
    if (status)       query = query.eq('result', status)
    if (date_from)    query = query.gte('scheduled_at', date_from)
    if (date_to)      query = query.lte('scheduled_at', date_to)

    const { data, error, count } = await query
    if (error) {
      console.error('[interviews GET]', error)
      if (error.code === '42703' || error.code === '42P01' || error.code === 'PGRST200') {
        return NextResponse.json({ data: [], count: 0, limit, offset, schema_warning: error.message })
      }
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [], count, limit, offset })
  } catch (err: unknown) {
    console.error('[interviews GET] catch:', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      candidate_id,
      round_number,
      round_type,
      scheduled_at,
      duration_minutes,
      mode,
      interviewers,
      location,
      meeting_link,
      requisition_id,
    } = body

    if (!candidate_id || !round_number || !round_type || !scheduled_at || !duration_minutes || !mode || !interviewers) {
      return NextResponse.json(
        { error: 'Missing required fields: candidate_id, round_number, round_type, scheduled_at, duration_minutes, mode, interviewers' },
        { status: 400 }
      )
    }

    if (!Array.isArray(interviewers) || interviewers.length === 0) {
      return NextResponse.json({ error: 'interviewers must be a non-empty array of employee IDs' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('interview_schedules')
      .insert({
        candidate_id,
        requisition_id: requisition_id ?? null,
        round_number: parseInt(round_number),
        round_name: round_type,
        scheduled_at,
        duration_minutes: parseInt(duration_minutes),
        mode,
        location: location ?? null,
        meeting_link: meeting_link ?? null,
        interviewers,
        result: null,
        remarks: null,
      })
      .select()
      .single()

    if (error) {
      console.error('[interviews POST]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    return NextResponse.json({ data, status: 'scheduled' }, { status: 201 })
  } catch (err: unknown) {
    console.error('[interviews POST] catch:', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, status, scheduled_at, meeting_link, location, remarks } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 })
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (status !== undefined)       updatePayload.result       = status
    if (scheduled_at !== undefined) updatePayload.scheduled_at = scheduled_at
    if (meeting_link !== undefined) updatePayload.meeting_link = meeting_link
    if (location !== undefined)     updatePayload.location     = location
    if (remarks !== undefined)      updatePayload.remarks      = remarks

    const { data, error } = await supabaseAdmin
      .from('interview_schedules')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
      console.error('[interviews PATCH]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    console.error('[interviews PATCH] catch:', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
