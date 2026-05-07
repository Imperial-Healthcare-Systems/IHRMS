import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

export async function GET(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(req.url)
    const year = searchParams.get('year') ?? new Date().getFullYear().toString()

    const { data, error: dbErr } = await supabaseAdmin
      .from('holidays')
      .select('id, name, date, type, description')
      .eq('org_id', ctx.orgId)
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .order('date', { ascending: true })

    if (dbErr) throw dbErr
    return NextResponse.json({ data: data ?? [] })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const { name, date, type, description } = body
    if (!name || !date || !type) {
      return NextResponse.json({ error: 'name, date and type are required' }, { status: 400 })
    }

    const { data, error: dbErr } = await supabaseAdmin
      .from('holidays')
      .insert({
        org_id: ctx.orgId,
        name, date, type,
        description: description ?? null,
      })
      .select()
      .single()

    if (dbErr) throw dbErr
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { error: dbErr } = await supabaseAdmin
      .from('holidays')
      .delete()
      .eq('id', id)
      .eq('org_id', ctx.orgId)
    if (dbErr) throw dbErr
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
