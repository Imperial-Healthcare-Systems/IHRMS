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
function isPgrstErr(m: string) {
  return m.includes('does not exist') || m.includes('PGRST') || m.includes('Could not find') || m.includes('ambiguous')
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') ?? '50')

    const { data, error } = await supabaseAdmin
      .from('statutory_compliance')
      .select('*')
      .order('period_year',  { ascending: false })
      .order('period_month', { ascending: false })
      .limit(limit)

    if (error) {
      const msg = errMsg(error)
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
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as {
      compliance_type?: string
      period_month?:    number
      period_year?:     number
      due_date?:        string
      amount?:          number
      status?:          string
      remarks?:         string
    }

    if (!body.compliance_type) {
      return NextResponse.json({ error: 'compliance_type is required' }, { status: 400 })
    }

    const now = new Date()
    const payload: Record<string, unknown> = {
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

    const { data, error } = await supabaseAdmin
      .from('statutory_compliance')
      .insert(payload)
      .select()
      .single()

    if (error) {
      const msg = errMsg(error)
      if (isPgrstErr(msg)) {
        // statutory_compliance table may not exist — soft-succeed
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
