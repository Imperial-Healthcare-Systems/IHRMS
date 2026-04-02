import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const schedule_id = searchParams.get('schedule_id')

    if (!schedule_id) {
      return NextResponse.json({ error: 'Missing required query param: schedule_id' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
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
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      schedule_id,
      candidate_id,
      technical_rating,
      communication_rating,
      attitude_rating,
      cultural_fit_rating,
      overall_rating,
      remarks,
      recommendation,
      strengths,
      weaknesses,
    } = body

    if (
      !schedule_id ||
      !candidate_id ||
      technical_rating === undefined ||
      communication_rating === undefined ||
      attitude_rating === undefined ||
      overall_rating === undefined ||
      !remarks ||
      !recommendation
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: schedule_id, candidate_id, technical_rating, communication_rating, attitude_rating, overall_rating, remarks, recommendation',
        },
        { status: 400 }
      )
    }

    const interviewerId = (session.user as any)?.id ?? null

    // Insert feedback
    const { data: feedback, error: feedbackError } = await supabaseAdmin
      .from('interview_feedbacks')
      .insert({
        schedule_id,
        interviewer_id: interviewerId,
        technical_rating: parseInt(technical_rating),
        communication_rating: parseInt(communication_rating),
        attitude_rating: parseInt(attitude_rating),
        // cultural_fit_rating stored in overall if no dedicated column; use attitude field or comments
        overall_rating: parseInt(overall_rating),
        strengths: strengths ?? null,
        weaknesses: weaknesses ?? null,
        recommendation,
        comments: remarks + (cultural_fit_rating !== undefined ? ` [cultural_fit:${cultural_fit_rating}]` : ''),
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (feedbackError) throw feedbackError

    // Mark the interview schedule as completed
    await supabaseAdmin
      .from('interview_schedules')
      .update({ result: 'selected', updated_at: new Date().toISOString() })
      .eq('id', schedule_id)
      .then(() => null)
      .catch(() => null)

    // Also update the interview_schedules result to reflect completion
    // (The schema uses `result` for interview outcome; mark with a remark instead)
    await supabaseAdmin
      .from('interview_schedules')
      .update({
        remarks: `Feedback submitted by interviewer on ${new Date().toISOString().split('T')[0]}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', schedule_id)

    return NextResponse.json({ data: feedback }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
