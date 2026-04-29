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

    const buildQuery = (withEnrollments: boolean) => {
      const select = withEnrollments
        ? `id, title, description, trainer, start_date, end_date, status, org_id, created_at,
           enrollments:training_enrollments(id, employee_id, status, completed_at)`
        : 'id, title, description, trainer, start_date, end_date, status, org_id, created_at'
      let q = supabaseAdmin
        .from('training_courses')
        .select(select)
        .order('start_date', { ascending: false })
      if (orgId)  q = q.eq('org_id', orgId)
      if (status) q = q.eq('status', status)
      return q
    }

    // Try with enrollments join first; fall back to plain query if FK hint can't be resolved
    let { data, error } = await buildQuery(true)
    if (error && (error.code === 'PGRST200' || error.code === 'PGRST201')) {
      console.warn('[training GET] enrollments join failed, retrying without it:', error.message)
      const retry = await buildQuery(false)
      data = retry.data; error = retry.error
      // Manually attach enrollments per course on the fallback path
      if (!error && data && data.length > 0) {
        const courseIds = data.map((c: any) => c.id)
        const { data: enrolls } = await supabaseAdmin
          .from('training_enrollments')
          .select('id, employee_id, status, completed_at, course_id')
          .in('course_id', courseIds)
        const byCourse: Record<string, any[]> = {}
        for (const e of enrolls ?? []) {
          const cid = (e as any).course_id as string
          if (!byCourse[cid]) byCourse[cid] = []
          byCourse[cid].push(e)
        }
        data = data.map((c: any) => ({ ...c, enrollments: byCourse[c.id] ?? [] }))
      }
    }
    if (error) {
      console.error('[training GET]', error)
      if (error.code === '42P01') return NextResponse.json({ data: [] })
      if (error.code === '42703') return NextResponse.json({ data: [], schema_warning: error.message })
      throw error
    }
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('[training GET catch]', errMsg(err))
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
      .insert({
        title,
        description: description ?? null,
        trainer:     trainer     ?? null,
        start_date:  start_date  ?? null,
        end_date:    end_date    ?? null,
        status:      'upcoming',
        org_id:      orgId,
        created_by:  actorId,   // pre-existing NOT NULL column
      })
      .select()
      .single()

    if (error) {
      console.error('[training POST]', error)
      return NextResponse.json({ error: error.message, code: error.code, details: error.details, hint: error.hint }, { status: 500 })
    }

    if (orgId) logAudit({ org_id: orgId, actor_id: actorId, action: 'created', module: 'training', entity_id: data.id, summary: 'Training course created' })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[training POST catch]', errMsg(err))
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
      const enrollOrgId = (session.user as any)?.orgId as string | null

      // Try `course_id` first (most common); fall back to `programme_id` legacy schema
      let { data, error } = await supabaseAdmin
        .from('training_enrollments')
        .upsert(
          { course_id, employee_id, status: 'pending', org_id: enrollOrgId },
          { onConflict: 'course_id,employee_id' },
        )
        .select()
        .single()
      if (error && error.code === '42703') {
        const retry = await supabaseAdmin
          .from('training_enrollments')
          .upsert(
            { programme_id: course_id, employee_id, status: 'pending', org_id: enrollOrgId },
            { onConflict: 'programme_id,employee_id' },
          )
          .select()
          .single()
        data = retry.data; error = retry.error
      }
      if (error) {
        console.error('[training PATCH enroll]', error)
        return NextResponse.json({ error: error.message, code: error.code, details: error.details, hint: error.hint }, { status: 500 })
      }
      return NextResponse.json({ data })
    }

    if (action === 'complete' && course_id && employee_id) {
      let { data, error } = await supabaseAdmin
        .from('training_enrollments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('course_id', course_id)
        .eq('employee_id', employee_id)
        .select()
        .single()
      if (error && error.code === '42703') {
        const retry = await supabaseAdmin
          .from('training_enrollments')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('programme_id', course_id)
          .eq('employee_id', employee_id)
          .select()
          .single()
        data = retry.data; error = retry.error
      }
      if (error) {
        console.error('[training PATCH complete]', error)
        return NextResponse.json({ error: error.message, code: error.code, details: error.details, hint: error.hint }, { status: 500 })
      }
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
