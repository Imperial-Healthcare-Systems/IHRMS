import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const HR_OR_MANAGER_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr', 'manager', 'operations_head']

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    let query = supabaseAdmin
      .from('shift_swaps')
      .select(`
        *,
        requester:employees!requester_id(id, first_name, last_name, emp_id),
        target:employees!target_id(id, first_name, last_name, emp_id)
      `)
      .eq('org_id', ctx.orgId)
      .order('created_at', { ascending: false })
      .or(`requester_id.eq.${ctx.identityId},target_id.eq.${ctx.identityId}`)

    if (status) query = query.eq('status', status)

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
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id
    const { target_id, swap_date, reason } = body
    if (!target_id || !swap_date) {
      return NextResponse.json({ error: 'target_id and swap_date are required' }, { status: 400 })
    }

    // Cross-tenant guard: target must belong to same org
    {
      const { data: emp } = await supabaseAdmin
        .from('employees').select('id')
        .eq('id', target_id).eq('org_id', ctx.orgId).maybeSingle()
      if (!emp) return NextResponse.json({ error: 'Employee not found in your organisation' }, { status: 404 })
    }

    const { data, error } = await supabaseAdmin
      .from('shift_swaps')
      .insert({ requester_id: ctx.identityId, target_id, swap_date, reason: reason ?? null, status: 'pending', org_id: ctx.orgId })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx
    if (!HR_OR_MANAGER_ROLES.includes(ctx.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id
    const { id, status } = body
    if (!id || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'id and status (approved|rejected) required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('shift_swaps')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
