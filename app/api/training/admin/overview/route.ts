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

function isHrAdmin(session: Awaited<ReturnType<typeof getServerSession<typeof authOptions>>>): boolean {
  const role = ((session as unknown as Record<string, unknown>)?.user as Record<string, unknown>)?.role as string | undefined
  return ['hr_admin', 'super_admin', 'admin', 'hr'].includes(role ?? '')
}

/**
 * Admin-only: aggregated learner / course tracking for the Training Dashboard.
 * Returns:
 *  - stats:           top-level metrics
 *  - enrollments:     per-learner-per-course rows with computed progress
 *  - courseBreakdown: per-course rollup
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const orgId = (session.user as any)?.orgId as string | null

    // 1. Pull enrollments with employee + course joins
    let enrollQuery = supabaseAdmin
      .from('training_enrollments')
      .select(`
        id, status, enrolled_at, completed_at, course_id, employee_id, score,
        employee:employees!employee_id(
          id, first_name, last_name, emp_id, avatar_url,
          department:departments!employees_department_id_fkey(id, name)
        ),
        course:training_courses!course_id(id, title, status, start_date, end_date)
      `)
      .order('enrolled_at', { ascending: false })

    if (orgId) enrollQuery = enrollQuery.eq('org_id', orgId)

    const initial = await enrollQuery
    let enrollments: any[] | null = initial.data as any
    let enrollErr   = initial.error

    // Fall back without joins if FK hints aren't resolvable
    if (enrollErr && (enrollErr.code === 'PGRST200' || enrollErr.code === 'PGRST201')) {
      console.warn('[training admin] enrollments join failed, retrying without:', enrollErr.message)
      let retryQ = supabaseAdmin
        .from('training_enrollments')
        .select('id, status, enrolled_at, completed_at, course_id, employee_id, score')
        .order('enrolled_at', { ascending: false })
      if (orgId) retryQ = retryQ.eq('org_id', orgId)
      const retry = await retryQ
      enrollments = retry.data as any
      enrollErr   = retry.error
    }
    if (enrollErr) {
      console.error('[training admin overview] enrollments', enrollErr)
      if (enrollErr.code !== '42P01') {
        return NextResponse.json({ error: errMsg(enrollErr) }, { status: 500 })
      }
      enrollments = []
    }

    const enrollList = (enrollments ?? []) as any[]

    // 2. Pull all content rows for the courses involved (so we can compute % per learner)
    const courseIds = Array.from(new Set(enrollList.map(e => e.course_id).filter(Boolean)))
    let contentByCourse = new Map<string, string[]>() // course_id → [content_id]
    if (courseIds.length > 0) {
      const { data: contents } = await supabaseAdmin
        .from('course_content')
        .select('id, course_id')
        .in('course_id', courseIds)
      for (const c of contents ?? []) {
        const cid = (c as any).course_id as string
        const id  = (c as any).id as string
        if (!contentByCourse.has(cid)) contentByCourse.set(cid, [])
        contentByCourse.get(cid)!.push(id)
      }
    }

    // 3. Pull all progress rows for these courses (one query, then bucket in JS)
    const progressByEmpCourse = new Map<string, Set<string>>() // `${empId}|${courseId}` → Set<contentId>
    if (courseIds.length > 0) {
      const { data: progress } = await supabaseAdmin
        .from('course_content_progress')
        .select('employee_id, course_id, content_id')
        .in('course_id', courseIds)
      for (const p of progress ?? []) {
        const key = `${(p as any).employee_id}|${(p as any).course_id}`
        if (!progressByEmpCourse.has(key)) progressByEmpCourse.set(key, new Set())
        progressByEmpCourse.get(key)!.add((p as any).content_id as string)
      }
    }

    // 4. Compute per-enrollment progress rows
    const enrollmentRows = enrollList.map(e => {
      const totalContent = contentByCourse.get(e.course_id)?.length ?? 0
      const doneSet      = progressByEmpCourse.get(`${e.employee_id}|${e.course_id}`) ?? new Set()
      const doneContent  = doneSet.size
      const percentage   = totalContent > 0 ? Math.round((doneContent / totalContent) * 100) : 0
      return {
        id:           e.id,
        employee:     e.employee ?? { id: e.employee_id, first_name: '—', last_name: '', emp_id: '—', department: null },
        course:       e.course   ?? { id: e.course_id,   title: '—', status: 'unknown' },
        status:       e.status,
        enrolled_at:  e.enrolled_at,
        completed_at: e.completed_at,
        score:        e.score,
        progress:     { total: totalContent, done: doneContent, percentage },
      }
    })

    // 5. Per-course rollup
    const courseRollup = new Map<string, {
      course_id: string; title: string; status: string;
      totalContent: number; totalEnrolled: number; completed: number;
      progressSum: number; progressCount: number;
    }>()
    for (const row of enrollmentRows) {
      const cid = row.course.id
      if (!courseRollup.has(cid)) {
        courseRollup.set(cid, {
          course_id:     cid,
          title:         row.course.title,
          status:        row.course.status,
          totalContent:  contentByCourse.get(cid)?.length ?? 0,
          totalEnrolled: 0,
          completed:     0,
          progressSum:   0,
          progressCount: 0,
        })
      }
      const r = courseRollup.get(cid)!
      r.totalEnrolled++
      if (row.status === 'completed' || row.progress.percentage === 100) r.completed++
      r.progressSum   += row.progress.percentage
      r.progressCount += 1
    }
    const courseBreakdown = Array.from(courseRollup.values()).map(r => ({
      course_id:        r.course_id,
      title:            r.title,
      status:           r.status,
      total_content:    r.totalContent,
      total_enrolled:   r.totalEnrolled,
      completed:        r.completed,
      avg_progress:     r.progressCount > 0 ? Math.round(r.progressSum / r.progressCount) : 0,
      completion_rate:  r.totalEnrolled > 0 ? Math.round((r.completed / r.totalEnrolled) * 100) : 0,
    }))

    // 6. Top-level stats
    const totalEnrollments    = enrollmentRows.length
    const completedEnrollments = enrollmentRows.filter(r => r.status === 'completed' || r.progress.percentage === 100).length
    const uniqueLearners      = new Set(enrollmentRows.map(r => r.employee?.id).filter(Boolean)).size
    const avgProgress         = totalEnrollments > 0
      ? Math.round(enrollmentRows.reduce((acc, r) => acc + r.progress.percentage, 0) / totalEnrollments)
      : 0

    return NextResponse.json({
      stats: {
        total_enrollments:     totalEnrollments,
        completed_enrollments: completedEnrollments,
        unique_learners:       uniqueLearners,
        avg_progress:          avgProgress,
        completion_rate:       totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0,
        total_courses:         courseBreakdown.length,
      },
      enrollments:     enrollmentRows,
      course_breakdown: courseBreakdown,
    })
  } catch (err) {
    console.error('[training admin overview]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
