import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

function isAdmin(session: Awaited<ReturnType<typeof getServerSession<typeof authOptions>>>): boolean {
  const role = ((session as unknown as Record<string, unknown>)?.user as Record<string, unknown>)?.role as string | undefined
  return ['hr_admin', 'super_admin', 'admin', 'hr'].includes(role ?? '')
}

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = (session.user as any)?.orgId as string | null

    let query = supabaseAdmin
      .from('shifts')
      .select('id, name, start_time, end_time, days, is_active, created_at')
      .order('name')

    if (orgId) query = query.eq('org_id', orgId)

    const { data, error } = await query
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
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { name, start_time, end_time, days } = body
    if (!name || !start_time || !end_time) {
      return NextResponse.json({ error: 'name, start_time, end_time are required' }, { status: 400 })
    }

    const orgId = (session.user as any)?.orgId as string | null
    const actorId = (session.user as any)?.id as string

    const { data, error } = await supabaseAdmin
      .from('shifts')
      .insert({ name, start_time, end_time, days: days ?? [], org_id: orgId, is_active: true })
      .select()
      .single()

    if (error) throw error

    if (orgId) logAudit({ org_id: orgId, actor_id: actorId, action: 'created', module: 'shifts', entity_id: data.id, summary: 'Shift template created' })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
