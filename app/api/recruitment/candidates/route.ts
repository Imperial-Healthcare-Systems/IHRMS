import { NextRequest, NextResponse } from 'next/server'
import { toCurrencyString } from '@/lib/money'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
    const requisition_id = searchParams.get('requisition_id')
    const stage          = searchParams.get('stage')
    const search         = searchParams.get('search')
    const limit          = Math.min(parseInt(searchParams.get('limit') ?? '50'), 500)
    const offset         = parseInt(searchParams.get('offset') ?? '0')

    let query = supabaseAdmin
      .from('candidates')
      .select(`
        id, first_name, last_name, email, phone,
        current_company, current_designation, current_ctc, expected_ctc,
        notice_period_days, total_experience, skills, resume_url, linkedin_url,
        source, status, rejection_reason, notes,
        requisition:job_requisitions(id, title),
        referred_by:employees!referred_by(id, first_name, last_name, emp_id),
        created_at, updated_at
      `, { count: 'exact' })
      .eq('org_id', ctx.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (requisition_id) query = query.eq('requisition_id', requisition_id)
    if (stage)          query = query.eq('status', stage)
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      )
    }

    const { data, error: dbErr, count } = await query
    if (dbErr) {
      console.error('[candidates GET]', dbErr)
      if (dbErr.code === '42703' || dbErr.code === '42P01' || dbErr.code === 'PGRST200') {
        return NextResponse.json({ data: [], count: 0, limit, offset, schema_warning: dbErr.message })
      }
      return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [], count, limit, offset })
  } catch (err: unknown) {
    console.error('[candidates GET] catch:', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const {
      requisition_id,
      name, email, phone,
      resume_url, current_company, current_designation,
      current_ctc, expected_ctc, notice_period_days,
      total_experience_years, skills, source, referral_by,
      linkedin_url, notes,
    } = body

    if (!requisition_id || !name || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: requisition_id, name, email, phone' },
        { status: 400 }
      )
    }

    // Cross-tenant guard: requisition must belong to caller's org
    const { data: req_row } = await supabaseAdmin
      .from('job_requisitions')
      .select('id')
      .eq('id', requisition_id)
      .eq('org_id', ctx.orgId)
      .maybeSingle()
    if (!req_row) return NextResponse.json({ error: 'Requisition not found in your organisation' }, { status: 404 })

    const nameParts  = (name as string).trim().split(' ')
    const first_name = nameParts[0]
    const last_name  = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '-'

    const { data, error: dbErr } = await supabaseAdmin
      .from('candidates')
      .insert({
        org_id: ctx.orgId,
        requisition_id,
        first_name, last_name, email, phone,
        resume_url: resume_url ?? null,
        current_company: current_company ?? null,
        current_designation: current_designation ?? null,
        // CTC is money — use decimal.js string serialisation, not parseFloat.
        current_ctc: current_ctc ? toCurrencyString(current_ctc) : null,
        expected_ctc: expected_ctc ? toCurrencyString(expected_ctc) : null,
        notice_period_days: notice_period_days ? parseInt(notice_period_days) : null,
        total_experience: total_experience_years ? parseFloat(total_experience_years) : null,
        skills: skills ?? null,
        source: source ?? null,
        referred_by: referral_by ?? null,
        linkedin_url: linkedin_url ?? null,
        notes: notes ?? null,
        status: 'applied',
      })
      .select()
      .single()

    if (dbErr) {
      console.error('[candidates POST]', dbErr)
      return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    console.error('[candidates POST] catch:', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
