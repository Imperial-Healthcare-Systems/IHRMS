import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}
function isPgrstErr(m: string) {
  return m.includes('does not exist') || m.includes('PGRST') || m.includes('Could not find') || m.includes('ambiguous')
}

const ASSET_SELECT_WITH_JOIN = `
  *,
  assigned_employee:employees!assigned_to(
    id, first_name, last_name, emp_id,
    department:departments!employees_department_id_fkey(name)
  )
`

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx

    const { searchParams } = new URL(req.url)
    const category    = searchParams.get('category')
    const status      = searchParams.get('status')
    const assigned_to = searchParams.get('assigned_to')
    const search      = searchParams.get('search')
    const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '200'), 500)
    const offset = parseInt(searchParams.get('offset') ?? '0')

    function applyFilters(q: any) {
      q = q.eq('org_id', ctx.orgId)
      if (category)    q = q.eq('category', category)
      if (status)      q = q.eq('status', status)
      if (assigned_to) q = q.eq('assigned_to', assigned_to)
      if (search)      q = q.or(`name.ilike.%${search}%,asset_code.ilike.%${search}%,brand.ilike.%${search}%,serial_number.ilike.%${search}%`)
      return q
    }

    let query = supabaseAdmin
      .from('assets')
      .select(ASSET_SELECT_WITH_JOIN, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)
    query = applyFilters(query)

    const { data, error: dbErr, count } = await query

    if (!dbErr) {
      return NextResponse.json({ data: data ?? [], count: count ?? 0, limit, offset })
    }

    console.warn('[assets GET] join query failed, retrying without join:', errMsg(dbErr))

    let q2 = supabaseAdmin
      .from('assets')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)
    q2 = applyFilters(q2)

    const { data: d2, error: e2, count: c2 } = await q2

    if (e2) return NextResponse.json({ data: [], count: 0, limit, offset })
    return NextResponse.json({ data: d2 ?? [], count: c2 ?? 0, limit, offset })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const body = await req.json() as Record<string, unknown>
    delete body.org_id

    const { name, category, brand, model, serial_number, purchase_date, purchase_value, condition, location, notes } = body

    if (!name || !category) {
      return NextResponse.json({ error: 'Missing required fields: name, category' }, { status: 400 })
    }

    // Auto-generate asset_code per-org
    const year = new Date().getFullYear()
    const { count } = await supabaseAdmin
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', ctx.orgId)
    const seq = (count ?? 0) + 1
    const asset_code = `AST/${year}/${String(seq).padStart(4, '0')}`

    const payload: Record<string, unknown> = {
      org_id: ctx.orgId,
      asset_code,
      name,
      category,
      status: 'available',
    }
    if (brand         != null && brand         !== '') payload.brand          = brand
    if (model         != null && model         !== '') payload.model          = model
    if (serial_number != null && serial_number !== '') payload.serial_number  = serial_number
    if (purchase_date != null && purchase_date !== '') payload.purchase_date  = purchase_date
    if (purchase_value != null)                        payload.purchase_value = purchase_value
    const CONDITION_TO_DB: Record<string, string> = {
      excellent: 'new', new: 'new', good: 'good', fair: 'fair', poor: 'poor',
    }
    if (condition != null && condition !== '') {
      const dbCond = CONDITION_TO_DB[String(condition).toLowerCase()]
      payload.condition = dbCond ?? 'good'
    }
    if (location      != null && location      !== '') payload.location       = location
    if (notes         != null && notes         !== '') payload.notes          = notes

    let data: unknown = null
    let currentPayload = { ...payload }

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: d, error: e } = await supabaseAdmin
        .from('assets').insert(currentPayload).select().single()

      if (!e) { data = d; break }

      const msg = errMsg(e)
      console.warn(`[assets POST] attempt ${attempt + 1} failed:`, msg)

      const badCol =
        msg.match(/Could not find the '(\w+)' column/)?.[1] ??
        msg.match(/column \w+\.(\w+) does not exist/)?.[1] ??
        msg.match(/column "(\w+)" does not exist/)?.[1] ??
        null

      if (badCol && badCol in currentPayload) {
        console.warn(`[assets POST] dropping stale-cache column '${badCol}' and retrying`)
        delete currentPayload[badCol]
        continue
      }

      if (isPgrstErr(msg)) {
        console.warn('[assets POST] generic schema error, retrying bare minimum')
        currentPayload = { org_id: ctx.orgId, asset_code, name, category, status: 'available' }
        continue
      }

      console.error('[assets POST] non-schema error:', msg)
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Failed to create asset after multiple attempts' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
