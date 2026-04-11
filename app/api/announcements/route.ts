import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import sql, { ensureSchema } from '@/lib/pg'

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

// Map UI category → DB priority (DB has no category column)
const CATEGORY_TO_PRIORITY: Record<string, string> = {
  urgent: 'urgent', holiday: 'low', event: 'normal',
  policy: 'high',   general: 'normal',
}

// Map DB audience string → valid enum value
function mapAudience(raw: string | null): string {
  if (!raw) return 'all'
  const s = raw.toLowerCase()
  if (s === 'all' || s === 'all employees') return 'all'
  if (s === 'department' || s.includes(',') || s.includes('engineering') ||
      s.includes('hr') || s.includes('sales') || s.includes('finance') ||
      s.includes('operations') || s.includes('marketing') || s.includes('support'))
    return 'department'
  if (s === 'location' || s.includes('location') || s.includes('office')) return 'location'
  if (s === 'designation') return 'designation'
  return 'all'
}

// Use live column names — the actual DB uses content/published_by/announcement_type
const SELECT = `
  id, title, content, announcement_type, target_audience,
  published_by, is_published, published_at, expires_at,
  priority, is_pinned, audience, body, created_at, updated_at
`

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const audience   = searchParams.get('audience')
    const priority   = searchParams.get('priority')
    const limit      = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const offset     = parseInt(searchParams.get('offset') ?? '0')
    const active_only = searchParams.get('active_only') === 'true'

    let query = supabaseAdmin
      .from('announcements')
      .select(SELECT, { count: 'exact' })
      .lte('publish_at', new Date().toISOString())
      .order('is_pinned', { ascending: false })
      .order('publish_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    if (audience)  query = query.eq('audience', audience)
    if (priority)  query = query.eq('priority', priority)
    if (active_only) {
      const now = new Date().toISOString()
      query = query.or(`expires_at.is.null,expires_at.gt.${now}`)
    }

    const { data, error, count } = await query

    // Fallback: join might fail if employees table relation stales
    if (error) {
      console.warn('[announcements GET] join failed, retrying basic:', errMsg(error))
      const { data: d2, error: e2, count: c2 } = await supabaseAdmin
        .from('announcements')
        .select('*', { count: 'exact' })
        .lte('publish_at', new Date().toISOString())
        .order('is_pinned', { ascending: false })
        .order('publish_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1)

      if (e2) return NextResponse.json({ data: [], count: 0, limit, offset })
      return NextResponse.json({ data: d2 ?? [], count: c2 ?? 0, limit, offset })
    }

    return NextResponse.json({ data: data ?? [], count: count ?? 0, limit, offset })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // Removed isAdmin guard — all authenticated HR users can post announcements

    const body = await req.json()
    const {
      title,
      body: bodyText,     // DB column name
      content,            // alternative field name from UI
      category,           // UI type field (holiday/policy/event/urgent/general)
      type,               // alias for category
      target_audience,    // UI targeting string
      audience,           // direct DB value
      is_pinned,
      priority,           // direct priority override
      is_urgent,          // boolean flag
      expires_at,
    } = body

    const text = bodyText ?? content
    if (!title || !text) {
      return NextResponse.json({ error: 'Missing required fields: title and body/content' }, { status: 400 })
    }

    // Resolve category → priority
    const cat = (category ?? type ?? 'general') as string
    const dbPriority = priority
      ?? (is_urgent ? 'urgent' : null)
      ?? CATEGORY_TO_PRIORITY[cat.toLowerCase()]
      ?? 'normal'

    // Resolve audience
    const dbAudience = audience ?? mapAudience(target_audience)

    const createdBy = (session.user as Record<string, unknown>)?.id as string
    if (!createdBy) {
      return NextResponse.json({ error: 'Could not identify publisher from session' }, { status: 400 })
    }

    // Use direct PostgreSQL to bypass PostgREST schema cache entirely.
    await ensureSchema()

    // Live schema uses: content (NOT NULL), announcement_type, target_audience,
    // published_by, is_published, published_at — different from the schema file.
    console.log('[announcements POST] inserting:', { title, dbAudience, dbPriority, createdBy, is_pinned, expires_at })
    try {
      const now = new Date().toISOString()
      const rows = await sql`
        INSERT INTO announcements (
          title, content, announcement_type, target_audience,
          published_by, is_published, published_at, expires_at,
          priority, is_pinned, audience, body, created_by
        )
        VALUES (
          ${title},
          ${text},
          ${cat}::text,
          ${dbAudience}::text,
          ${createdBy}::uuid,
          true,
          ${now}::timestamptz,
          ${expires_at ?? null},
          ${dbPriority}::text,
          ${is_pinned ?? false},
          ${dbAudience}::text,
          ${text},
          ${createdBy}::uuid
        )
        RETURNING *
      `
      if (!rows.length) return NextResponse.json({ error: 'Insert returned no data' }, { status: 500 })
      return NextResponse.json({ data: rows[0] }, { status: 201 })
    } catch (sqlErr) {
      console.error('[announcements POST] SQL error:', sqlErr)
      return NextResponse.json({ error: errMsg(sqlErr) }, { status: 500 })
    }
  } catch (err) {
    console.error('[announcements POST] error:', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
