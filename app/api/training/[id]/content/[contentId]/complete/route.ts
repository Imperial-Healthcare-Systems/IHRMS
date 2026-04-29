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

/**
 * Mark a course content item as completed for the current user.
 * After marking, if every content item in the course is now completed,
 * automatically flip the user's enrollment to status='completed'.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; contentId: string }> }) {
  try {
    const { id: courseId, contentId } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as any)?.id as string
    if (!userId) return NextResponse.json({ error: 'No user id on session' }, { status: 401 })

    // Verify content belongs to this course
    const { data: content, error: cErr } = await supabaseAdmin
      .from('course_content')
      .select('id, course_id')
      .eq('id', contentId)
      .single()
    if (cErr || !content)                  return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    if (content.course_id !== courseId)    return NextResponse.json({ error: 'Course/content mismatch' }, { status: 400 })

    // Upsert progress row (idempotent — re-watching is allowed but doesn't double-count)
    const { error: progErr } = await supabaseAdmin
      .from('course_content_progress')
      .upsert(
        { course_id: courseId, content_id: contentId, employee_id: userId },
        { onConflict: 'content_id,employee_id', ignoreDuplicates: false },
      )
    if (progErr) {
      console.error('[content complete] upsert', progErr)
      return NextResponse.json({ error: errMsg(progErr) }, { status: 500 })
    }

    // Compute progress: total items in course vs items completed by this user
    const [{ count: totalItems }, { count: doneItems }] = await Promise.all([
      supabaseAdmin
        .from('course_content')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', courseId),
      supabaseAdmin
        .from('course_content_progress')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .eq('employee_id', userId),
    ])

    const total      = totalItems ?? 0
    const done       = doneItems  ?? 0
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0
    const allDone    = total > 0 && done >= total

    // Auto-mark enrollment completed when 100%
    if (allDone) {
      // Try `course_id` first, fall back to legacy `programme_id` if column doesn't exist
      let { error: enrollErr } = await supabaseAdmin
        .from('training_enrollments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('employee_id', userId)
      if (enrollErr && enrollErr.code === '42703') {
        const retry = await supabaseAdmin
          .from('training_enrollments')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('programme_id', courseId)
          .eq('employee_id', userId)
        enrollErr = retry.error
      }
      if (enrollErr) console.warn('[content complete] enrollment update non-fatal:', enrollErr.message)
    }

    return NextResponse.json({ success: true, total, done, percentage, course_completed: allDone })
  } catch (err) {
    console.error('[content complete catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
