import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAudit } from '@/lib/audit'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

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

    const buildQuery = (withEnrollments: boolean) => {
      const select = withEnrollments
        ? `id, title, description, trainer, start_date, end_date, status, org_id, created_at,
           enrollments:training_enrollments(id, employee_id, status, completed_at)`
        : 'id, title, description, trainer, start_date, end_date, status, org_id, created_at'
      let q = supabaseAdmin
        .from('training_courses')
        .select(select)
        .eq('org_id', ctx.orgId)
        .order('start_date', { ascending: false })
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
          .eq('org_id', ctx.orgId)
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
    const auth = await requireRole(HR_ROLES)
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id
    const { title, description, trainer, start_date, end_date } = body
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('training_courses')
      .insert({
        title,
        description: description ?? null,
        trainer:     trainer     ?? null,
        start_date:  start_date  ?? null,
        end_date:    end_date    ?? null,
        status:      'upcoming',
        org_id:      ctx.orgId,
        created_by:  ctx.identityId,   // pre-existing NOT NULL column
      })
      .select()
      .single()

    if (error) {
      console.error('[training POST]', error)
      return NextResponse.json({ error: error.message, code: error.code, details: error.details, hint: error.hint }, { status: 500 })
    }

    logAudit({ org_id: ctx.orgId, actor_identity_id: ctx.identityId, actor_membership_id: ctx.membershipId, action: 'created', module: 'training', entity_id: data.id, summary: 'Training course created' })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[training POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

// PATCH — enroll employee or update course status
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id
    const { action, course_id, employee_id, status } = body

    // Cross-tenant guards
    if (course_id) {
      const { data: course } = await supabaseAdmin
        .from('training_courses').select('id')
        .eq('id', course_id).eq('org_id', ctx.orgId).maybeSingle()
      if (!course) return NextResponse.json({ error: 'Course not found in your organisation' }, { status: 404 })
    }
    if (employee_id && employee_id !== ctx.identityId) {
      const { data: emp } = await supabaseAdmin
        .from('employees').select('id')
        .eq('id', employee_id).eq('org_id', ctx.orgId).maybeSingle()
      if (!emp) return NextResponse.json({ error: 'Employee not found in your organisation' }, { status: 404 })
    }

    if (action === 'enroll') {
      if (!course_id || !employee_id) {
        return NextResponse.json({ error: 'course_id and employee_id required for enroll' }, { status: 400 })
      }

      // Try `course_id` first (most common); fall back to `programme_id` legacy schema
      let { data, error } = await supabaseAdmin
        .from('training_enrollments')
        .upsert(
          { course_id, employee_id, status: 'pending', org_id: ctx.orgId },
          { onConflict: 'course_id,employee_id' },
        )
        .select()
        .single()
      if (error && error.code === '42703') {
        const retry = await supabaseAdmin
          .from('training_enrollments')
          .upsert(
            { programme_id: course_id, employee_id, status: 'pending', org_id: ctx.orgId },
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
        .eq('org_id', ctx.orgId)
        .eq('course_id', course_id)
        .eq('employee_id', employee_id)
        .select()
        .single()
      if (error && error.code === '42703') {
        const retry = await supabaseAdmin
          .from('training_enrollments')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('org_id', ctx.orgId)
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

      // Also mark every content item as watched, so the Learner Dashboard
      // shows progress 100% in sync with the enrolment status.
      try {
        const { data: contents } = await supabaseAdmin
          .from('course_content')
          .select('id')
          .eq('org_id', ctx.orgId)
          .eq('course_id', course_id)
        const rows = (contents ?? []).map((c: any) => ({
          course_id, content_id: c.id, employee_id, org_id: ctx.orgId,
        }))
        if (rows.length > 0) {
          await supabaseAdmin
            .from('course_content_progress')
            .upsert(rows, { onConflict: 'content_id,employee_id', ignoreDuplicates: true })
        }
      } catch (progressErr) {
        console.warn('[training PATCH complete] content progress backfill non-fatal:', progressErr)
      }

      return NextResponse.json({ data })
    }

    if (action === 'update_status' && course_id && status) {
      if (!HR_ROLES.includes(ctx.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const { data, error } = await supabaseAdmin
        .from('training_courses')
        .update({ status })
        .eq('id', course_id)
        .eq('org_id', ctx.orgId)
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
