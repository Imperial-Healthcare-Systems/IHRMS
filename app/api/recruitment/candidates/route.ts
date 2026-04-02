import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const requisition_id = searchParams.get('requisition_id')
    const stage          = searchParams.get('stage')
    const search         = searchParams.get('search')
    const limit          = parseInt(searchParams.get('limit') ?? '50')
    const offset         = parseInt(searchParams.get('offset') ?? '0')

    let query = supabaseAdmin
      .from('candidates')
      .select(`
        id, first_name, last_name, email, phone,
        current_company, current_designation, current_ctc, expected_ctc,
        notice_period_days, total_experience, skills, resume_url, linkedin_url,
        source, status, rejection_reason, notes,
        requisition:job_requisitions!candidates_requisition_id_fkey(id, title),
        referred_by:employees!candidates_referred_by_fkey(id, first_name, last_name, emp_id),
        created_at, updated_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    if (requisition_id) query = query.eq('requisition_id', requisition_id)
    if (stage)          query = query.eq('status', stage)
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      )
    }

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({ data, count, limit, offset })
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
      requisition_id,
      name,
      email,
      phone,
      // Optional fields
      resume_url,
      current_company,
      current_designation,
      current_ctc,
      expected_ctc,
      notice_period_days,
      total_experience_years,
      skills,
      source,
      referral_by,
      linkedin_url,
      notes,
    } = body

    if (!requisition_id || !name || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: requisition_id, name, email, phone' },
        { status: 400 }
      )
    }

    // Split name into first/last
    const nameParts  = (name as string).trim().split(' ')
    const first_name = nameParts[0]
    const last_name  = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '-'

    const { data, error } = await supabaseAdmin
      .from('candidates')
      .insert({
        requisition_id,
        first_name,
        last_name,
        email,
        phone,
        resume_url: resume_url ?? null,
        current_company: current_company ?? null,
        current_designation: current_designation ?? null,
        current_ctc: current_ctc ? parseFloat(current_ctc) : null,
        expected_ctc: expected_ctc ? parseFloat(expected_ctc) : null,
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

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
