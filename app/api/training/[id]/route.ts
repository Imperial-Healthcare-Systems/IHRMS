import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

function isAdmin(session: Awaited<ReturnType<typeof getServerSession<typeof authOptions>>>): boolean {
  const role = ((session as unknown as Record<string, unknown>)?.user as Record<string, unknown>)?.role as string | undefined
  return ['hr_admin', 'super_admin', 'admin', 'hr'].includes(role ?? '')
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('training_courses')
      .select(`
        id, title, description, trainer, start_date, end_date, status, org_id, created_at,
        enrollments:training_enrollments(id, employee_id, status, completed_at,
          employee:employees!employee_id(id, first_name, last_name, emp_id))
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      throw error
    }
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { title, description, trainer, start_date, end_date, status } = body

    const updates: Record<string, unknown> = {}
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (trainer !== undefined) updates.trainer = trainer
    if (start_date !== undefined) updates.start_date = start_date
    if (end_date !== undefined) updates.end_date = end_date
    if (status !== undefined) updates.status = status

    const { data, error } = await supabaseAdmin
      .from('training_courses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const orgId = (session.user as any)?.orgId as string | null
    const actorId = (session.user as any)?.id as string
    if (orgId) logAudit({ org_id: orgId, actor_id: actorId, action: 'updated', module: 'training', entity_id: id, summary: 'Training course updated' })

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
