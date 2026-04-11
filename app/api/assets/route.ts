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
function isPgrstErr(m: string) {
  return m.includes('does not exist') || m.includes('PGRST') || m.includes('Could not find') || m.includes('ambiguous')
}

// Use * for the assets table so stale-cache columns never block the query.
// The join is attempted separately and dropped on failure.
const ASSET_SELECT_WITH_JOIN = `
  *,
  assigned_employee:employees!assigned_to(
    id, first_name, last_name, emp_id,
    department:departments!employees_department_id_fkey(name)
  )
`
// Fallback: all asset columns, no join
const ASSET_SELECT_BASIC = `*`

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const category    = searchParams.get('category')
    const status      = searchParams.get('status')
    const assigned_to = searchParams.get('assigned_to')
    const search      = searchParams.get('search')
    const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '200'), 500)
    const offset = parseInt(searchParams.get('offset') ?? '0')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function applyFilters(q: any) {
      if (category)    q = q.eq('category', category)
      if (status)      q = q.eq('status', status)
      if (assigned_to) q = q.eq('assigned_to', assigned_to)
      if (search)      q = q.or(`name.ilike.%${search}%,asset_code.ilike.%${search}%,brand.ilike.%${search}%,serial_number.ilike.%${search}%`)
      return q
    }

    // Attempt 1: with employee join
    let query = supabaseAdmin
      .from('assets')
      .select(ASSET_SELECT_WITH_JOIN, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)
    query = applyFilters(query)

    const { data, error, count } = await query

    if (!error) {
      return NextResponse.json({ data: data ?? [], count: count ?? 0, limit, offset })
    }

    const msg = errMsg(error)
    console.warn('[assets GET] join query failed, retrying without join:', msg)

    // Attempt 2: without join (schema cache issue with join resolution)
    let q2 = supabaseAdmin
      .from('assets')
      .select(ASSET_SELECT_BASIC, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)
    q2 = applyFilters(q2)

    const { data: d2, error: e2, count: c2 } = await q2

    if (!e2) {
      return NextResponse.json({ data: d2 ?? [], count: c2 ?? 0, limit, offset })
    }

    console.warn('[assets GET] basic query also failed, using select(*)')

    // Attempt 3: select * (most permissive — works regardless of which columns exist)
    let q3 = supabaseAdmin
      .from('assets')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)
    q3 = applyFilters(q3)

    const { data: d3, error: e3, count: c3 } = await q3
    if (e3) return NextResponse.json({ data: [], count: 0, limit, offset })
    return NextResponse.json({ data: d3 ?? [], count: c3 ?? 0, limit, offset })

  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // Removed isAdmin guard — asset creation available to all authenticated HR users

    const body = await req.json() as Record<string, unknown>
    const { name, category, brand, model, serial_number, purchase_date, purchase_value, condition, location, notes } = body

    if (!name || !category) {
      return NextResponse.json({ error: 'Missing required fields: name, category' }, { status: 400 })
    }

    // Auto-generate asset_code: AST/YEAR/SEQ
    const year = new Date().getFullYear()
    const { count } = await supabaseAdmin.from('assets').select('*', { count: 'exact', head: true })
    const seq = (count ?? 0) + 1
    const asset_code = `AST/${year}/${String(seq).padStart(4, '0')}`

    // Build payload — do NOT include created_at/updated_at (Supabase auto-manages via trigger)
    const payload: Record<string, unknown> = {
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
    // DB constraint: condition IN ('new', 'good', 'fair', 'poor')
    // UI sends: 'Excellent' | 'Good' | 'Fair' | 'Poor'  — map accordingly
    const CONDITION_TO_DB: Record<string, string> = {
      excellent: 'new', new: 'new', good: 'good', fair: 'fair', poor: 'poor',
    }
    if (condition != null && condition !== '') {
      const dbCond = CONDITION_TO_DB[String(condition).toLowerCase()]
      payload.condition = dbCond ?? 'good'  // default to 'good' if unknown value
    }
    if (location      != null && location      !== '') payload.location       = location
    if (notes         != null && notes         !== '') payload.notes          = notes

    // Retry loop: PostgREST schema cache may be stale for recently-added columns.
    // On each schema-cache miss, extract the offending column name and remove it, then retry.
    let data: unknown = null
    let currentPayload = { ...payload }

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: d, error: e } = await supabaseAdmin
        .from('assets').insert(currentPayload).select().single()

      if (!e) { data = d; break }

      const msg = errMsg(e)
      console.warn(`[assets POST] attempt ${attempt + 1} failed:`, msg)

      // Schema cache miss — matches all known formats:
      //   PostgREST: "Could not find the 'col' column of 'assets' in the schema cache"
      //   PostgreSQL: "column assets.col does not exist" | "column \"col\" does not exist"
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

      // Other PGRST schema error (ambiguous, relation not found, etc.) — strip to bare minimum
      if (isPgrstErr(msg)) {
        console.warn('[assets POST] generic schema error, retrying bare minimum')
        currentPayload = { asset_code, name, category, status: 'available' }
        continue
      }

      // Real DB error (constraint violation, type mismatch, etc.) — fail immediately
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
