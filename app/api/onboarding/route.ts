import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') ?? '50')

    // Get employees in probation (onboarding status)
    const { data: employees, error: empError } = await supabaseAdmin
      .from('employees')
      .select(`
        id, first_name, last_name, work_email, personal_phone,
        date_of_joining, probation_end_date, status, avatar_url,
        department:departments(id, name),
        designation:designations(id, title),
        manager:employees!manager_id(id, first_name, last_name)
      `)
      .eq('status', 'probation')
      .order('date_of_joining', { ascending: false })
      .limit(limit)

    if (empError) throw empError

    if (!employees || employees.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const employeeIds = employees.map((e) => e.id)

    // Fetch probation reviews and document counts in parallel
    const [reviewsResult, docsResult] = await Promise.all([
      supabaseAdmin
        .from('probation_reviews')
        .select('id, employee_id, due_date, outcome, reviewer_id, review_date, notes')
        .in('employee_id', employeeIds),
      supabaseAdmin
        .from('employee_documents')
        .select('employee_id')
        .in('employee_id', employeeIds),
    ])

    const reviews = reviewsResult.data ?? []
    const docs = docsResult.data ?? []

    // Build lookup maps
    const reviewsByEmployee: Record<string, typeof reviews> = {}
    for (const review of reviews) {
      if (!reviewsByEmployee[review.employee_id]) reviewsByEmployee[review.employee_id] = []
      reviewsByEmployee[review.employee_id].push(review)
    }

    const docCountByEmployee: Record<string, number> = {}
    for (const doc of docs) {
      docCountByEmployee[doc.employee_id] = (docCountByEmployee[doc.employee_id] ?? 0) + 1
    }

    // Define the minimum required onboarding steps to consider onboarding complete
    const REQUIRED_DOCS_COUNT = 3

    const enriched = employees.map((emp) => {
      const empReviews = reviewsByEmployee[emp.id] ?? []
      const docsCount = docCountByEmployee[emp.id] ?? 0

      // Onboarding is considered complete when docs are sufficient and probation review outcome is set
      const hasCompletedReview = empReviews.some((r) => r.outcome && r.outcome !== 'pending')
      const onboarding_complete = docsCount >= REQUIRED_DOCS_COUNT && hasCompletedReview

      return {
        ...emp,
        documents_count: docsCount,
        onboarding_complete,
        probation_reviews: empReviews,
      }
    })

    return NextResponse.json({ data: enriched, count: enriched.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = (session.user as any)?.isAdmin
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden — HR Admin required' }, { status: 403 })

    const body = await req.json()
    const { employee_id, step, completed } = body

    if (!employee_id || !step || completed === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: employee_id, step, completed' },
        { status: 400 }
      )
    }

    // Validate employee exists and is in probation
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, status, first_name, last_name')
      .eq('id', employee_id)
      .single()

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Fetch existing probation review
    const { data: existingReview, error: reviewFetchError } = await supabaseAdmin
      .from('probation_reviews')
      .select('*')
      .eq('employee_id', employee_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (reviewFetchError && reviewFetchError.code !== 'PGRST116') throw reviewFetchError

    // Use notes JSON field to store step completions
    let stepsData: Record<string, { completed: boolean; updated_at: string }> = {}
    if (existingReview?.notes) {
      try {
        stepsData = JSON.parse(existingReview.notes)
      } catch {
        stepsData = {}
      }
    }

    stepsData[step] = {
      completed: Boolean(completed),
      updated_at: new Date().toISOString(),
    }

    let data: unknown
    if (existingReview) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('probation_reviews')
        .update({ notes: JSON.stringify(stepsData) })
        .eq('id', existingReview.id)
        .select()
        .single()
      if (updateError) throw updateError
      data = updated
    } else {
      // Create a new probation review record with steps in notes
      const dueDate = new Date()
      dueDate.setMonth(dueDate.getMonth() + 6)
      const { data: created, error: createError } = await supabaseAdmin
        .from('probation_reviews')
        .insert({
          employee_id,
          due_date: dueDate.toISOString().split('T')[0],
          outcome: 'pending',
          notes: JSON.stringify(stepsData),
        })
        .select()
        .single()
      if (createError) throw createError
      data = created
    }

    return NextResponse.json({ data, step, completed: Boolean(completed) })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
