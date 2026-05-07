import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const MAX_OPTIONAL_CLAIMS = 2

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

// GET — fetch this employee's optional holiday claims for the year
export async function GET(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(req.url)
    const year = searchParams.get('year') ?? new Date().getFullYear().toString()

    const { data, error: dbErr } = await supabaseAdmin
      .from('leave_requests')
      .select('id, from_date, to_date, status, reason')
      .eq('org_id', ctx.orgId)
      .eq('employee_id', ctx.identityId)
      .eq('leave_type', 'optional_holiday')
      .gte('from_date', `${year}-01-01`)
      .lte('from_date', `${year}-12-31`)
      .in('status', ['pending', 'approved'])

    if (dbErr) throw dbErr
    return NextResponse.json({ data: data ?? [], remaining: MAX_OPTIONAL_CLAIMS - (data?.length ?? 0) })
  } catch (err: unknown) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

// POST — claim an optional holiday
export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const { holiday_id, holiday_date, holiday_name } = body

    if (!holiday_id || !holiday_date || !holiday_name) {
      return NextResponse.json({ error: 'holiday_id, holiday_date, holiday_name are required' }, { status: 400 })
    }

    const year = holiday_date.slice(0, 4)

    const { data: existing, error: countErr } = await supabaseAdmin
      .from('leave_requests')
      .select('id, reason')
      .eq('org_id', ctx.orgId)
      .eq('employee_id', ctx.identityId)
      .eq('leave_type', 'optional_holiday')
      .gte('from_date', `${year}-01-01`)
      .lte('from_date', `${year}-12-31`)
      .in('status', ['pending', 'approved'])

    if (countErr) throw countErr

    if ((existing?.length ?? 0) >= MAX_OPTIONAL_CLAIMS) {
      return NextResponse.json(
        { error: `You can only claim ${MAX_OPTIONAL_CLAIMS} optional holidays per year. Cancel an existing claim to choose another.` },
        { status: 409 }
      )
    }

    const alreadyClaimed = existing?.some(r => r.reason?.includes(`[holiday:${holiday_id}]`))
    if (alreadyClaimed) {
      return NextResponse.json({ error: 'You have already claimed this holiday.' }, { status: 409 })
    }

    const today = new Date().toISOString().split('T')[0]
    if (holiday_date < today) {
      return NextResponse.json({ error: 'Cannot claim a holiday that has already passed.' }, { status: 400 })
    }

    const { data, error: dbErr } = await supabaseAdmin
      .from('leave_requests')
      .insert({
        org_id:      ctx.orgId,
        employee_id: ctx.identityId,
        leave_type:  'optional_holiday',
        from_date:   holiday_date,
        to_date:     holiday_date,
        total_days:  1,
        reason:      `Optional Holiday: ${holiday_name} [holiday:${holiday_id}]`,
        status:      'approved',
      })
      .select()
      .single()

    if (dbErr) throw dbErr
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

// DELETE — unclaim (only if holiday not yet passed)
export async function DELETE(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { claim_id } = await req.json()
    if (!claim_id) return NextResponse.json({ error: 'claim_id required' }, { status: 400 })

    const { data: claim, error: fetchErr } = await supabaseAdmin
      .from('leave_requests')
      .select('id, employee_id, from_date')
      .eq('id', claim_id)
      .eq('org_id', ctx.orgId)
      .eq('leave_type', 'optional_holiday')
      .single()

    if (fetchErr || !claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
    if (claim.employee_id !== ctx.identityId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const today = new Date().toISOString().split('T')[0]
    if (claim.from_date < today) {
      return NextResponse.json({ error: 'Cannot cancel a holiday that has already passed.' }, { status: 400 })
    }

    const { error: dbErr } = await supabaseAdmin
      .from('leave_requests')
      .delete()
      .eq('id', claim_id)
      .eq('org_id', ctx.orgId)
    if (dbErr) throw dbErr
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
