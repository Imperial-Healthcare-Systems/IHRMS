import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAudit } from '@/lib/audit'

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
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const { data, error } = await supabaseAdmin
      .from('shifts')
      .select('id, name, start_time, end_time, days, is_active, created_at')
      .eq('org_id', ctx.orgId)
      .order('name')

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
    const { name, start_time, end_time, days } = body
    if (!name || !start_time || !end_time) {
      return NextResponse.json({ error: 'name, start_time, end_time are required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('shifts')
      .insert({ name, start_time, end_time, days: days ?? [], org_id: ctx.orgId, is_active: true })
      .select()
      .single()

    if (error) throw error

    logAudit({ org_id: ctx.orgId, actor_identity_id: ctx.identityId, actor_membership_id: ctx.membershipId, action: 'created', module: 'shifts', entity_id: data.id, summary: 'Shift template created' })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
