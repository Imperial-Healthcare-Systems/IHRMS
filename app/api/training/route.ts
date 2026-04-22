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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const orgId = (session.user as any)?.orgId as string | null

    let query = supabaseAdmin
      .from('training_courses')
      .select(`
        id, title, description, trainer, start_date, end_date, status, org_id, created_at,
        enrollments:training_enrollments(id, employee_id, status, completed_at)
      `)
      .order('start_date', { ascending: false })

    if (orgId) query = query.eq('org_id', orgId)
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
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { title, description, trainer, start_date, end_date } = body
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

    const orgId = (session.user as any)?.orgId as string | null
    const actorId = (session.user as any)?.id as string

    const { data, error } = await supabaseAdmin
      .from('training_courses')
      .insert({ title, description: description ?? null, trainer: trainer ?? null, start_date: start_date ?? null, end_date: end_date ?? null, status: 'upcoming', org_id: orgId })
      .select()
      .single()

    if (error) throw error

    if (orgId) logAudit({ org_id: orgId, actor_id: actorId, action: 'created', module: 'training', entity_id: data.id, summary: 'Training course created' })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

// PATCH — enroll employee or update course status
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { action, course_id, employee_id, status } = body

    if (action === 'enroll') {
      if (!course_id || !employee_id) {
        return NextResponse.json({ error: 'course_id and employee_id required for enroll' }, { status: 400 })
      }
      const { data, error } = await supabaseAdmin
        .from('training_enrollments')
        .upsert({ programme_id: course_id, employee_id, status: 'enrolled' }, { onConflict: 'programme_id,employee_id' })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ data })
    }

    if (action === 'complete' && course_id && employee_id) {
      const { data, error } = await supabaseAdmin
        .from('training_enrollments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('programme_id', course_id)
        .eq('employee_id', employee_id)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ data })
    }

    if (action === 'update_status' && course_id && status) {
      if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const { data, error } = await supabaseAdmin
        .from('training_courses')
        .update({ status })
        .eq('id', course_id)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
