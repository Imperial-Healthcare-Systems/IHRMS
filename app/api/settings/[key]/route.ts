import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/session'
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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { data, error: dbErr } = await supabaseAdmin
      .from('org_settings')
      .select('value, updated_at')
      .eq('org_id', ctx.orgId)
      .eq('key', key)
      .maybeSingle()

    if (dbErr) throw dbErr
    if (!data) return NextResponse.json({ data: null })

    return NextResponse.json({ data: data.value })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const body = await req.json()
    if (body === undefined || body === null) return NextResponse.json({ error: 'value is required' }, { status: 400 })

    const { data, error: dbErr } = await supabaseAdmin
      .from('org_settings')
      .upsert(
        { org_id: ctx.orgId, key, value: body, updated_at: new Date().toISOString() },
        { onConflict: 'org_id,key' }
      )
      .select('value, updated_at')
      .single()

    if (dbErr) throw dbErr
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const { error: dbErr } = await supabaseAdmin
      .from('org_settings')
      .delete()
      .eq('org_id', ctx.orgId)
      .eq('key', key)

    if (dbErr) throw dbErr
    return NextResponse.json({ message: 'Setting deleted' })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
