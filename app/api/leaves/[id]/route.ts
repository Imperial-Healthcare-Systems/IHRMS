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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        employee:employees!leave_requests_employee_id_fkey(id, first_name, last_name, emp_id, department_id)
      `)
      .eq('id', id)
      .single()

    if (error) { console.error('[leaves GET id]', error); throw error }
    return NextResponse.json({ data })
  } catch (err: unknown) {
    console.error('[leaves GET id catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { action, remarks } = body // action: 'approve' | 'reject' | 'cancel'
    const approverId = (session.user as any)?.id
    const now = new Date().toISOString()

    if (action === 'cancel') {
      const { data, error } = await supabaseAdmin
        .from('leave_requests')
        .update({ status: 'cancelled', updated_at: now })
        .eq('id', id)
        .select()
        .single()
      if (error) { console.error('[leaves PATCH cancel]', error); throw error }
      return NextResponse.json({ data })
    }

    if (action === 'approve') {
      const { data, error } = await supabaseAdmin
        .from('leave_requests')
        .update({
          status:           'approved',
          approved_by:      approverId,
          approved_at:      now,
          approver_remarks: remarks ?? null,
          updated_at:       now,
        })
        .eq('id', id)
        .select()
        .single()
      if (error) { console.error('[leaves PATCH approve]', error); throw error }
      return NextResponse.json({ data })
    }

    if (action === 'reject') {
      const { data, error } = await supabaseAdmin
        .from('leave_requests')
        .update({
          status:           'rejected',
          approved_by:      approverId,
          approved_at:      now,
          approver_remarks: remarks ?? null,
          updated_at:       now,
        })
        .eq('id', id)
        .select()
        .single()
      if (error) { console.error('[leaves PATCH reject]', error); throw error }
      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: 'Invalid action. Use cancel, approve, or reject' }, { status: 400 })
  } catch (err: unknown) {
    console.error('[leaves PATCH catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
