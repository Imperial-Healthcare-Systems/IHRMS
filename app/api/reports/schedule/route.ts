import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

export async function GET(_req: NextRequest) {
  try {
    const auth = await requireRole(HR_ROLES)
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const { data, error } = await supabaseAdmin
      .from('scheduled_reports')
      .select('*')
      .eq('org_id', ctx.orgId)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ data: [] })
      throw error
    }
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(HR_ROLES)
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id
    const { report_type, frequency, recipients, filters } = body

    if (!report_type || !frequency) {
      return NextResponse.json({ error: 'report_type and frequency are required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('scheduled_reports')
      .insert({
        report_type,
        frequency,
        recipients: recipients ?? [],
        filters: filters ?? {},
        is_active: true,
        org_id: ctx.orgId,
        created_by: ctx.identityId,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
