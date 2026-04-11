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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)

    let query = supabaseAdmin
      .from('review_cycles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) query = query.eq('status', status)

    const { data: cycles, error, count } = await query
    if (error) {
      const msg = errMsg(error)
      if (msg.includes('does not exist') || msg.includes('PGRST')) {
        return NextResponse.json({ data: [], count: 0 })
      }
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    // For each cycle, compute participant count and completion % from performance_reviews
    const cycleIds = (cycles ?? []).map((c: Record<string, unknown>) => c.id as string)
    let reviewStats: Record<string, { total: number; done: number }> = {}

    if (cycleIds.length > 0) {
      const { data: reviews } = await supabaseAdmin
        .from('performance_reviews')
        .select('cycle_id, status')
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
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = (session.user as Record<string, unknown>)?.isAdmin as boolean | undefined
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden — HR Admin required' }, { status: 403 })

    const body = await req.json()
    const { name, cycle_type, period_from, period_to, due_date, description } = body

    if (!name || !cycle_type || !period_from || !period_to) {
      return NextResponse.json({ error: 'Missing required fields: name, cycle_type, period_from, period_to' }, { status: 400 })
    }

    const VALID_TYPES = ['annual', 'half_yearly', 'quarterly', 'probation', 'pip']
    if (!VALID_TYPES.includes(cycle_type)) {
      return NextResponse.json({ error: `cycle_type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 })
    }

    const createdBy = (session.user as Record<string, unknown>)?.id as string | undefined

    const { data, error } = await supabaseAdmin
      .from('review_cycles')
      .insert({ name, cycle_type, period_from, period_to, due_date: due_date ?? null, description: description ?? null, status: 'active', created_by: createdBy ?? null })
      .select()
      .single()

    if (error) {
      console.error('[cycles POST]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    return NextResponse.json({ data: { ...data, participants: 0, completion: 0 } }, { status: 201 })
  } catch (err) {
    console.error('[cycles POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
