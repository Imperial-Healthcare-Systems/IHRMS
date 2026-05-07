import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

function errMsg(err: unknown) {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

export async function GET(_req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    // Note: spec Section 11 lists `designations` as tenant-scoped in 102.3,
    // so org_id is NOT NULL — every read must filter.
    const { data, error: dbErr } = await supabaseAdmin
      .from('designations')
      .select('id, title, grade, is_active, created_at')
      .eq('org_id', ctx.orgId)
      .order('title')

    if (dbErr) {
      if (dbErr.message?.includes('does not exist') || dbErr.code === '42P01') {
        return NextResponse.json({ data: [] })
      }
      throw dbErr
    }
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const { title, grade } = body
    if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

    const { data, error: dbErr } = await supabaseAdmin
      .from('designations')
      .insert({
        org_id: ctx.orgId,
        title: title.trim(),
        grade: grade?.trim() ?? null,
      })
      .select('id, title, grade, is_active, created_at')
      .single()

    if (dbErr) throw dbErr
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
