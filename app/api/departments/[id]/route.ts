import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

function errMsg(err: unknown) {
  return err instanceof Error ? err.message : String(err)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const allowed: Record<string, unknown> = {}
    if (body.name !== undefined)      allowed.name      = String(body.name).trim()
    if (body.code !== undefined)      allowed.code      = String(body.code).trim().toUpperCase()
    if (body.is_active !== undefined) allowed.is_active = Boolean(body.is_active)

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error: dbErr } = await supabaseAdmin
      .from('departments')
      .update(allowed)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .select('id, name, code, is_active, created_at')
      .single()

    if (dbErr) {
      if (dbErr.code === 'PGRST116') return NextResponse.json({ error: 'Department not found' }, { status: 404 })
      throw dbErr
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const { error: dbErr } = await supabaseAdmin
      .from('departments')
      .delete()
      .eq('id', id)
      .eq('org_id', ctx.orgId)

    if (dbErr) throw dbErr
    return NextResponse.json({ message: 'Department deleted' })
  } catch (err: unknown) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
