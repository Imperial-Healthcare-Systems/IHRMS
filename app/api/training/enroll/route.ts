import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getActiveEmployee } from '@/lib/employee-context'

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id
    const { course_id, employee_id } = body

    if (!course_id) return NextResponse.json({ error: 'course_id is required' }, { status: 400 })

    const me = await getActiveEmployee(ctx.identityId, ctx.orgId)
    const enrolleeId = employee_id ?? me?.id ?? null
    if (!enrolleeId) {
      return NextResponse.json({ error: 'You do not have an employee profile in this organisation.' }, { status: 404 })
    }

    // Cross-tenant guards
    {
      const { data: course } = await supabaseAdmin
        .from('training_courses').select('id')
        .eq('id', course_id).eq('org_id', ctx.orgId).maybeSingle()
      if (!course) return NextResponse.json({ error: 'Course not found in your organisation' }, { status: 404 })
    }
    if (enrolleeId !== me?.id) {
      const { data: emp } = await supabaseAdmin
        .from('employees').select('id')
        .eq('id', enrolleeId).eq('org_id', ctx.orgId).maybeSingle()
      if (!emp) return NextResponse.json({ error: 'Employee not found in your organisation' }, { status: 404 })
    }

    const { data, error } = await supabaseAdmin
      .from('training_enrollments')
      .upsert(
        { programme_id: course_id, employee_id: enrolleeId, status: 'enrolled', org_id: ctx.orgId },
        { onConflict: 'programme_id,employee_id' }
      )
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const { searchParams } = new URL(req.url)
    const course_id = searchParams.get('course_id')
    const employee_id = searchParams.get('employee_id')

    if (!course_id) return NextResponse.json({ error: 'course_id is required' }, { status: 400 })

    const me = await getActiveEmployee(ctx.identityId, ctx.orgId)
    const enrolleeId = employee_id ?? me?.id ?? null
    if (!enrolleeId) {
      return NextResponse.json({ error: 'You do not have an employee profile in this organisation.' }, { status: 404 })
    }

    // Cross-tenant guards
    {
      const { data: course } = await supabaseAdmin
        .from('training_courses').select('id')
        .eq('id', course_id).eq('org_id', ctx.orgId).maybeSingle()
      if (!course) return NextResponse.json({ error: 'Course not found in your organisation' }, { status: 404 })
    }
    if (enrolleeId !== me?.id) {
      const { data: emp } = await supabaseAdmin
        .from('employees').select('id')
        .eq('id', enrolleeId).eq('org_id', ctx.orgId).maybeSingle()
      if (!emp) return NextResponse.json({ error: 'Employee not found in your organisation' }, { status: 404 })
    }

    const { error } = await supabaseAdmin
      .from('training_enrollments')
      .delete()
      .eq('org_id', ctx.orgId)
      .eq('programme_id', course_id)
      .eq('employee_id', enrolleeId)

    if (error) throw error
    return NextResponse.json({ message: 'Enrollment removed' })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
