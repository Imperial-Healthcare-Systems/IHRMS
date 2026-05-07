import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

function errMsg(err: unknown) {
  return err instanceof Error ? err.message : String(err)
}

export async function GET(_req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { data, error: dbErr } = await supabaseAdmin
      .from('departments')
      .select('id, name, code, is_active, created_at')
      .eq('org_id', ctx.orgId)
      .order('name')

    if (dbErr) {
      if (dbErr.message?.includes('does not exist') || dbErr.code === '42P01') {
        return NextResponse.json({ data: [] })
      }
      throw dbErr
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (err: unknown) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const { name, code } = body
    if (!name?.trim() || !code?.trim()) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 })
    }

    const { data, error: dbErr } = await supabaseAdmin
      .from('departments')
      .insert({
        org_id: ctx.orgId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        is_active: true,
      })
      .select('id, name, code, is_active, created_at')
      .single()

    if (dbErr) throw dbErr
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
