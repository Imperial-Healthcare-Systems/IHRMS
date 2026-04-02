import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')           // maps to 'audience' column
    const target_audience = searchParams.get('target_audience')
    const limit = parseInt(searchParams.get('limit') ?? '50')
    const active_only = searchParams.get('active_only') === 'true'
    const offset = parseInt(searchParams.get('offset') ?? '0')

    let query = supabaseAdmin
      .from('announcements')
      .select(`
        id, title, body, audience, department_ids, priority,
        publish_at, expires_at, is_pinned, attachments,
        created_at, updated_at,
        created_by_employee:employees!created_by(
          id, first_name, last_name, avatar_url
        )
      `, { count: 'exact' })
      .lte('publish_at', new Date().toISOString())  // only published announcements
      .order('is_pinned', { ascending: false })
      .order('publish_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    if (type) query = query.eq('audience', type)
    if (target_audience) query = query.eq('audience', target_audience)

    if (active_only) {
      // expires_at IS NULL OR expires_at > now()
      const now = new Date().toISOString()
      query = query.or(`expires_at.is.null,expires_at.gt.${now}`)
    }

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({ data, count, limit, offset })
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
    const {
      title,
      body: announcementBody,
      type,
      target_audience,
      target_ids,
      expires_at,
      is_urgent,
    } = body

    // Support both 'type' and 'target_audience' as the audience field
    const audience = target_audience ?? type

    if (!title || !announcementBody || !audience) {
      return NextResponse.json(
        { error: 'Missing required fields: title, body, type/target_audience' },
        { status: 400 }
      )
    }

    const validAudiences = ['all', 'department', 'location', 'designation']
    if (!validAudiences.includes(audience)) {
      return NextResponse.json(
        { error: `audience must be one of: ${validAudiences.join(', ')}` },
        { status: 400 }
      )
    }

    const publishedById = (session.user as any)?.id
    if (!publishedById) {
      return NextResponse.json({ error: 'Could not identify publisher from session' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('announcements')
      .insert({
        title,
        body: announcementBody,
        audience,
        department_ids: target_ids ?? null,
        priority: is_urgent ? 'urgent' : 'normal',
        publish_at: new Date().toISOString(),
        expires_at: expires_at ?? null,
        is_pinned: false,
        created_by: publishedById,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
