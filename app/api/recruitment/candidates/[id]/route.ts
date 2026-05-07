import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { data, error: dbErr } = await supabaseAdmin
      .from('candidates')
      .select(`
        id, first_name, last_name, email, phone,
        current_company, current_designation, current_ctc, expected_ctc,
        notice_period_days, total_experience, skills, resume_url, linkedin_url,
        source, status, rejection_reason, notes,
        requisition:job_requisitions!candidates_requisition_id_fkey(
          id, title, status,
          department:departments(id, name)
        ),
        referred_by:employees!candidates_referred_by_fkey(id, first_name, last_name, emp_id),
        created_at, updated_at
      `)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    if (dbErr) {
      if (dbErr.code === 'PGRST116') return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
      throw dbErr
    }

    const { data: interviews } = await supabaseAdmin
      .from('interview_schedules')
      .select('id, round_number, round_name, scheduled_at, duration_minutes, mode, result, remarks, created_at')
      .eq('candidate_id', id)
      .eq('org_id', ctx.orgId)
      .order('scheduled_at', { ascending: true })

    return NextResponse.json({ data, interviews: interviews ?? [] })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireAuth()
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const { stage, send_rejection_email, offer_amount, offer_date, ...rest } = body

    const updatePayload: Record<string, unknown> = {
      ...rest,
      updated_at: new Date().toISOString(),
    }

    if (stage) {
      updatePayload.status = stage

      if (stage === 'rejected' && send_rejection_email) {
        updatePayload.rejection_reason = rest.rejection_reason ?? 'Not selected after evaluation'
        updatePayload.notes = '[rejection_email_sent] ' + (rest.notes ?? '')
      }

      if (stage === 'selected' || stage === 'offer') {
        if (offer_amount !== undefined) {
          const offerNote = `[offer_amount:${offer_amount}][offer_date:${offer_date ?? new Date().toISOString().split('T')[0]}]`
          updatePayload.notes = offerNote + (rest.notes ? ' ' + rest.notes : '')
        }
      }
    }

    const { data, error: dbErr } = await supabaseAdmin
      .from('candidates')
      .update(updatePayload)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .select()
      .single()

    if (dbErr) {
      if (dbErr.code === 'PGRST116') return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
      throw dbErr
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
