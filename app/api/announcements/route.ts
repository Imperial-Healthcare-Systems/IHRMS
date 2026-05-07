import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendAnnouncementEmails } from '@/lib/mailer'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

async function fanOutNotification(
  orgId: string,
  title: string,
  text: string,
  cat: string,
  dbAudience: string,
  target_audience: string | undefined,
  publisherName: string,
) {
  try {
    let empQuery = supabaseAdmin
      .from('employees')
      .select('id, work_email, first_name, last_name')
      .eq('org_id', orgId)
      .eq('status', 'active')

    if (dbAudience === 'department' && target_audience) {
      const { data: depts } = await supabaseAdmin
        .from('departments')
        .select('id')
        .eq('org_id', orgId)
        .ilike('name', `%${target_audience}%`)
        .limit(10)
      if (depts && depts.length > 0) {
        empQuery = empQuery.in('department_id', depts.map((d: Record<string, unknown>) => d.id))
      }
    }

    const { data: employees } = await empQuery.limit(500)
    if (!employees || employees.length === 0) return

    const notifTitle = cat === 'urgent' ? `Urgent: ${title}` : `Announcement: ${title}`
    const snippet = text.length > 120 ? text.substring(0, 120) + '…' : text
    const notifType = cat === 'urgent' ? 'warning' : cat === 'holiday' ? 'success' : 'info'

    const notifications = (employees as Record<string, unknown>[]).map(emp => ({
      org_id: orgId,
      recipient_id: emp.id as string,
      title: notifTitle,
      body: snippet,
      type: notifType,
    }))
    await supabaseAdmin.from('notifications').insert(notifications)

    const recipients = (employees as Record<string, unknown>[])
      .filter(e => e.work_email)
      .map(e => ({ email: e.work_email as string, name: `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() || 'Team Member' }))

    sendAnnouncementEmails({ recipients, title, body: text, announcementType: cat, publisherName, orgId })
  } catch (e) {
    console.warn('[announcements] notification fan-out non-fatal:', e)
  }
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

const CATEGORY_TO_PRIORITY: Record<string, string> = {
  urgent: 'urgent', holiday: 'low', event: 'normal',
  policy: 'high',   general: 'normal',
}

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

const SELECT = `
  id, title, content, announcement_type, target_audience,
  published_by, is_published, published_at, expires_at,
  priority, is_pinned, audience, body, created_at, updated_at
`

export async function GET(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(req.url)
    const audience   = searchParams.get('audience')
    const priority   = searchParams.get('priority')
    const limit      = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
    const offset     = parseInt(searchParams.get('offset') ?? '0')
    const active_only = searchParams.get('active_only') === 'true'

    let query = supabaseAdmin
      .from('announcements')
      .select(SELECT, { count: 'exact' })
      .eq('org_id', ctx.orgId)
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

    const { data, error: dbErr, count } = await query

    if (dbErr) {
      console.warn('[announcements GET] join failed, retrying basic:', errMsg(dbErr))
      const { data: d2, error: e2, count: c2 } = await supabaseAdmin
        .from('announcements')
        .select('*', { count: 'exact' })
        .eq('org_id', ctx.orgId)
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
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const {
      title,
      body: bodyText,
      content,
      category,
      type,
      target_audience,
      audience,
      is_pinned,
      priority,
      is_urgent,
      expires_at,
    } = body

    const text = bodyText ?? content
    if (!title || !text) {
      return NextResponse.json({ error: 'Missing required fields: title and body/content' }, { status: 400 })
    }

    const cat = (category ?? type ?? 'general') as string
    const dbPriority = priority
      ?? (is_urgent ? 'urgent' : null)
      ?? CATEGORY_TO_PRIORITY[cat.toLowerCase()]
      ?? 'normal'

    const dbAudience = audience ?? mapAudience(target_audience)

    const now = new Date().toISOString()
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('announcements')
      .insert({
        org_id: ctx.orgId,
        title,
        content: text,
        announcement_type: cat,
        target_audience: dbAudience,
        published_by: ctx.identityId,
        is_published: true,
        published_at: now,
        publish_at: now,
        expires_at: expires_at ?? null,
        priority: dbPriority,
        is_pinned: is_pinned ?? false,
        audience: dbAudience,
        body: text,
        created_by: ctx.identityId,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[announcements POST] insert error:', insertError)
      return NextResponse.json({ error: errMsg(insertError) }, { status: 500 })
    }

    const publisherName = await (async () => {
      try {
        const { data: pub } = await supabaseAdmin.from('employees').select('first_name, last_name').eq('id', ctx.identityId).eq('org_id', ctx.orgId).single()
        return pub ? `${pub.first_name} ${pub.last_name}`.trim() : 'HR'
      } catch { return 'HR' }
    })()
    fanOutNotification(ctx.orgId, title, text, cat, dbAudience, target_audience as string | undefined, publisherName)

    return NextResponse.json({ data: inserted }, { status: 201 })
  } catch (err) {
    console.error('[announcements POST] error:', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
