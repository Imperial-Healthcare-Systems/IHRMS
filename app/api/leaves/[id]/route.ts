import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .select(`*, employee:employees(*), level1_approver:employees!level1_approver_id(*), level2_approver:employees!level2_approver_id(*)`)
      .eq('id', id)
      .single()
    if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { action, level, remarks } = body // action: 'approve'|'reject'|'escalate'|'cancel'
    const approverId = (session.user as any)?.id
    const now = new Date().toISOString()

    if (action === 'cancel') {
      const { data, error } = await supabaseAdmin
        .from('leave_requests')
        .update({ status: 'cancelled', updated_at: now })
        .eq('id', id)
        .select().single()
      if (error) throw error
      return NextResponse.json({ data })
    }

    if (action === 'approve' || action === 'reject') {
      const update: Record<string, unknown> = { updated_at: now }
      if (level === 2) {
        update.level2_status = action === 'approve' ? 'approved' : 'rejected'
        update.level2_remarks = remarks
        update.level2_actioned_at = now
        update.status = action === 'approve' ? 'approved' : 'rejected'
      } else {
        update.level1_status = action === 'approve' ? 'approved' : 'rejected'
        update.level1_remarks = remarks
        update.level1_actioned_at = now
        update.status = action === 'approve' ? 'approved' : 'rejected'
      }

      const { data, error } = await supabaseAdmin
        .from('leave_requests')
        .update(update)
        .eq('id', id)
        .select().single()
      if (error) throw error
      return NextResponse.json({ data })
    }

    if (action === 'escalate') {
      const { data, error } = await supabaseAdmin
        .from('leave_requests')
        .update({ status: 'escalated', escalated_at: now, escalation_reason: remarks })
        .eq('id', id)
        .select().single()
      if (error) throw error
      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
