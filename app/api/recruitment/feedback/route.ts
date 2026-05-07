import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(req.url)
    const schedule_id = searchParams.get('schedule_id')

    if (!schedule_id) {
      return NextResponse.json({ error: 'Missing required query param: schedule_id' }, { status: 400 })
    }

    // Verify the schedule belongs to caller's org
    const { data: sched } = await supabaseAdmin
      .from('interview_schedules')
      .select('id')
      .eq('id', schedule_id)
      .eq('org_id', ctx.orgId)
      .maybeSingle()
    if (!sched) return NextResponse.json({ error: 'Schedule not found in your organisation' }, { status: 404 })

    const { data, error: dbErr } = await supabaseAdmin
      .from('interview_feedbacks')
      .select(`
        id, technical_rating, communication_rating, attitude_rating,
        overall_rating, strengths, weaknesses, recommendation, comments, submitted_at,
        interviewer:employees!interview_feedbacks_interviewer_id_fkey(
          id, first_name, last_name, emp_id,
          designation:designations(id, title)
        ),
        schedule:interview_schedules!interview_feedbacks_schedule_id_fkey(
          id, round_number, round_name, scheduled_at,
          candidate:candidates!interview_schedules_candidate_id_fkey(id, first_name, last_name, email)
        ),
        created_at, updated_at
      `)
      .eq('schedule_id', schedule_id)
      .eq('org_id', ctx.orgId)
      .order('created_at', { ascending: true })

    if (dbErr) throw dbErr

    return NextResponse.json({ data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const {
      schedule_id, candidate_id,
      technical_rating, communication_rating, attitude_rating,
      cultural_fit_rating, overall_rating,
      remarks, recommendation, strengths, weaknesses,
    } = body

    if (
      !schedule_id || !candidate_id ||
      technical_rating === undefined || communication_rating === undefined ||
      attitude_rating === undefined || overall_rating === undefined ||
      !remarks || !recommendation
    ) {
      return NextResponse.json(
        { error: 'Missing required fields: schedule_id, candidate_id, technical_rating, communication_rating, attitude_rating, overall_rating, remarks, recommendation' },
        { status: 400 }
      )
    }

    // Cross-tenant guard: schedule must be in caller's org
    const { data: sched } = await supabaseAdmin
      .from('interview_schedules')
      .select('id, candidate_id')
      .eq('id', schedule_id)
      .eq('org_id', ctx.orgId)
      .maybeSingle()
    if (!sched) return NextResponse.json({ error: 'Schedule not found in your organisation' }, { status: 404 })

    const { data: feedback, error: feedbackError } = await supabaseAdmin
      .from('interview_feedbacks')
      .insert({
        org_id:               ctx.orgId,
        schedule_id,
        interviewer_id:       ctx.identityId,
        technical_rating:     parseInt(technical_rating),
        communication_rating: parseInt(communication_rating),
        attitude_rating:      parseInt(attitude_rating),
        overall_rating:       parseInt(overall_rating),
        strengths:            strengths ?? null,
        weaknesses:           weaknesses ?? null,
        recommendation,
        comments:             remarks + (cultural_fit_rating !== undefined ? ` [cultural_fit:${cultural_fit_rating}]` : ''),
        submitted_at:         new Date().toISOString(),
      })
      .select()
      .single()

    if (feedbackError) throw feedbackError

    // Mark the interview schedule with feedback-recorded marker
    await supabaseAdmin
      .from('interview_schedules')
      .update({
        remarks: `Feedback submitted by interviewer on ${new Date().toISOString().split('T')[0]}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', schedule_id)
      .eq('org_id', ctx.orgId)

    return NextResponse.json({ data: feedback }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
