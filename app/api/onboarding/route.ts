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
        id, first_name, last_name, work_email,
        date_of_joining, probation_end_date, status, avatar_url,
        emp_id,
        department:departments!employees_department_id_fkey(id, name),
        designation:designations(id, title)
      `)
      .eq('status', 'probation')
      .order('date_of_joining', { ascending: false })
      .limit(limit)

    if (empError) {
      const msg = empError.message ?? ''
      if (msg.includes('PGRST') || msg.includes('does not exist') || msg.includes('Could not find')) {
        return NextResponse.json({ data: [], count: 0 })
      }
      console.error('[onboarding GET]', empError)
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json({ data: [], count: 0 })
    }

    const employeeIds = employees.map((e) => e.id)

    // Fetch probation reviews and document counts in parallel
    const [reviewsResult, docsResult] = await Promise.all([
      supabaseAdmin
        .from('probation_reviews')
        .select('id, employee_id, due_date, outcome')
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

    const body = await req.json()
    const { employee_id, step, completed } = body

    if (!employee_id || !step || completed === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: employee_id, step, completed' },
        { status: 400 }
      )
    }

    // Step completions are persisted in localStorage on the client.
    // API just validates the employee exists and acknowledges the request.
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('id', employee_id)
      .maybeSingle()

    if (empError) return NextResponse.json({ error: empError.message }, { status: 500 })
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

    return NextResponse.json({ data: { employee_id, step, completed: Boolean(completed) }, step, completed: Boolean(completed) })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[onboarding POST catch]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
