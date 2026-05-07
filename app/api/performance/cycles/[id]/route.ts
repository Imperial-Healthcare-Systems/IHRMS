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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const { status } = body

    const VALID_STATUSES = ['active', 'completed', 'cancelled']
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
    }

    const { data, error: dbErr } = await supabaseAdmin
      .from('review_cycles')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .select()
      .single()

    if (dbErr) {
      if (dbErr.code === 'PGRST116') return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
      console.error('[cycles PATCH]', dbErr)
      return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[cycles PATCH catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
