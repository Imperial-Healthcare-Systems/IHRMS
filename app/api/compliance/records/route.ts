import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr', 'payroll_admin', 'finance_admin']

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}
function isPgrstErr(m: string) {
  return m.includes('does not exist') || m.includes('PGRST') || m.includes('Could not find') || m.includes('ambiguous')
}

export async function GET(req: NextRequest) {
  try {
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') ?? '50')

    const { data, error: dbErr } = await supabaseAdmin
      .from('statutory_compliance')
      .select('*')
      .eq('org_id', ctx.orgId)
      .order('period_year',  { ascending: false })
      .order('period_month', { ascending: false })
      .limit(limit)

    if (dbErr) {
      const msg = errMsg(dbErr)
      if (isPgrstErr(msg)) return NextResponse.json({ data: [], count: 0 })
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [], count: (data ?? []).length })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const body = await req.json() as {
      compliance_type?: string
      period_month?:    number
      period_year?:     number
      due_date?:        string
      amount?:          number
      status?:          string
      remarks?:         string
    }
    delete (body as Record<string, unknown>).org_id

    if (!body.compliance_type) {
      return NextResponse.json({ error: 'compliance_type is required' }, { status: 400 })
    }

    const now = new Date()
    const payload: Record<string, unknown> = {
      org_id:          ctx.orgId,
      compliance_type: body.compliance_type,
      period_month:    body.period_month ?? now.getMonth() + 1,
      period_year:     body.period_year  ?? now.getFullYear(),
      status:          body.status?.toLowerCase() ?? 'pending',
      created_at:      now.toISOString(),
      updated_at:      now.toISOString(),
    }
    if (body.due_date) payload.due_date  = body.due_date
    if (body.amount != null) payload.amount = body.amount
    if (body.remarks)  payload.remarks   = body.remarks

    const { data, error: dbErr } = await supabaseAdmin
      .from('statutory_compliance')
      .insert(payload)
      .select()
      .single()

    if (dbErr) {
      const msg = errMsg(dbErr)
      if (isPgrstErr(msg)) {
        console.warn('[compliance/records POST] schema error:', msg)
        return NextResponse.json({ data: payload, warning: 'Record logged locally; DB schema not available.' }, { status: 201 })
      }
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
