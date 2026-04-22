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

function getOrgId(session: Awaited<ReturnType<typeof getServerSession<typeof authOptions>>>): string | null {
  return (((session as unknown as Record<string, unknown>)?.user as Record<string, unknown>)?.orgId as string) ?? null
}

function isAdmin(session: Awaited<ReturnType<typeof getServerSession<typeof authOptions>>>): boolean {
  const role = ((session as unknown as Record<string, unknown>)?.user as Record<string, unknown>)?.role as string | undefined
  return ['hr_admin', 'super_admin', 'admin', 'hr'].includes(role ?? '')
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = getOrgId(session)
    if (!orgId) return NextResponse.json({ error: 'No organisation context in session' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('org_settings')
      .select('value, updated_at')
      .eq('org_id', orgId)
      .eq('key', key)
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ data: null })

    return NextResponse.json({ data: data.value })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const orgId = getOrgId(session)
    if (!orgId) return NextResponse.json({ error: 'No organisation context in session' }, { status: 400 })

    const body = await req.json()
    if (body === undefined || body === null) return NextResponse.json({ error: 'value is required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('org_settings')
      .upsert(
        { org_id: orgId, key, value: body, updated_at: new Date().toISOString() },
        { onConflict: 'org_id,key' }
      )
      .select('value, updated_at')
      .single()

    if (error) throw error
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const orgId = getOrgId(session)
    if (!orgId) return NextResponse.json({ error: 'No organisation context in session' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('org_settings')
      .delete()
      .eq('org_id', orgId)
      .eq('key', key)

    if (error) throw error
    return NextResponse.json({ message: 'Setting deleted' })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
