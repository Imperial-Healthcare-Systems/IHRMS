import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)

    let query = supabaseAdmin
      .from('review_cycles')
      .select('*', { count: 'exact' })
      .eq('org_id', ctx.orgId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) query = query.eq('status', status)

    const { data: cycles, error: dbErr, count } = await query
    if (dbErr) {
      const msg = errMsg(dbErr)
      if (msg.includes('does not exist') || msg.includes('PGRST')) {
        return NextResponse.json({ data: [], count: 0 })
      }
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    // Per-cycle review stats — also org-scoped
    const cycleIds = (cycles ?? []).map((c: Record<string, unknown>) => c.id as string)
    const reviewStats: Record<string, { total: number; done: number }> = {}

    if (cycleIds.length > 0) {
      const { data: reviews } = await supabaseAdmin
        .from('performance_reviews')
        .select('cycle_id, status')
        .eq('org_id', ctx.orgId)
        .in('cycle_id', cycleIds)

      for (const r of reviews ?? []) {
        const rec = r as Record<string, unknown>
        const cid = rec.cycle_id as string
        if (!cid) continue
        if (!reviewStats[cid]) reviewStats[cid] = { total: 0, done: 0 }
        reviewStats[cid].total++
        if (['submitted', 'acknowledged', 'completed'].includes(rec.status as string)) {
          reviewStats[cid].done++
        }
      }
    }

    const enriched = (cycles ?? []).map((c: Record<string, unknown>) => ({
      ...c,
      participants: reviewStats[c.id as string]?.total ?? 0,
      completion: reviewStats[c.id as string]?.total
        ? Math.round((reviewStats[c.id as string].done / reviewStats[c.id as string].total) * 100)
        : 0,
    }))

    return NextResponse.json({ data: enriched, count: count ?? 0 })
  } catch (err) {
    console.error('[cycles GET]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const { name, cycle_type, period_from, period_to, due_date, description } = body

    if (!name || !cycle_type || !period_from || !period_to) {
      return NextResponse.json({ error: 'Missing required fields: name, cycle_type, period_from, period_to' }, { status: 400 })
    }

    const VALID_TYPES = ['annual', 'half_yearly', 'quarterly', 'probation', 'pip']
    if (!VALID_TYPES.includes(cycle_type)) {
      return NextResponse.json({ error: `cycle_type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 })
    }

    const { data: cycle, error: dbErr } = await supabaseAdmin
      .from('review_cycles')
      .insert({
        org_id: ctx.orgId,
        name, cycle_type, period_from, period_to,
        due_date: due_date ?? null,
        description: description ?? null,
        status: 'active',
        created_by: ctx.identityId,
      })
      .select()
      .single()

    if (dbErr) {
      console.error('[cycles POST]', dbErr)
      return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })
    }

    // Auto-generate draft performance_reviews for active employees with reporting managers IN THIS ORG
    let participantCount = 0
    try {
      const { data: employees } = await supabaseAdmin
        .from('employees')
        .select('id, reporting_manager_id')
        .eq('org_id', ctx.orgId)
        .eq('status', 'active')
        .not('reporting_manager_id', 'is', null)

      if (employees && employees.length > 0) {
        const reviewRows = employees.map((e: any) => ({
          org_id: ctx.orgId,
          employee_id: e.id,
          reviewer_id: e.reporting_manager_id,
          cycle:       cycle_type,
          cycle_id:    cycle.id,
          review_period_from: period_from,
          review_period_to:   period_to,
          status:      'draft',
          goals:       [],
          kra_scores:  {},
        }))

        const { error: insErr } = await supabaseAdmin
          .from('performance_reviews')
          .insert(reviewRows)

        if (insErr) console.warn('[cycles POST] auto-review insert non-fatal:', insErr.message)
        else participantCount = reviewRows.length
      }
    } catch (autoErr) {
      console.warn('[cycles POST] auto-review generation failed (non-fatal):', autoErr)
    }

    return NextResponse.json({ data: { ...cycle, participants: participantCount, completion: 0 } }, { status: 201 })
  } catch (err) {
    console.error('[cycles POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
