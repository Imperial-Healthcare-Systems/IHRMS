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

// GET — fetch notifications for the current user (Supabase REST — fast HTTP, no cold TCP)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as Record<string, unknown>)?.id as string | undefined
    if (!userId) return NextResponse.json({ data: [], unread: 0 })

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('id, title, body, type, is_read, created_at')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      // Table may not exist yet on first boot — return empty gracefully
      if (error.code === '42P01') return NextResponse.json({ data: [], unread: 0 })
      console.error('[notifications GET]', error)
      return NextResponse.json({ data: [], unread: 0 })
    }

    const rows = data ?? []
    const unread = rows.filter(r => !r.is_read).length
    return NextResponse.json({ data: rows, unread })
  } catch (err: unknown) {
    console.error('[notifications GET catch]', errMsg(err))
    return NextResponse.json({ data: [], unread: 0 })
  }
}

// PATCH — mark notification(s) as read (Supabase REST)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as Record<string, unknown>)?.id as string | undefined
    if (!userId) return NextResponse.json({ error: 'No user ID in session' }, { status: 400 })

    const body = await req.json() as { id?: string; markAllRead?: boolean }

    if (body.markAllRead) {
      await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', userId)
        .eq('is_read', false)
    } else if (body.id) {
      await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('id', body.id)
        .eq('recipient_id', userId)
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[notifications PATCH]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

// POST — create a notification (internal server-to-server use, Supabase REST)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as {
      recipient_id: string
      title: string
      body?: string
      type?: string
    }

    if (!body.recipient_id || !body.title) {
      return NextResponse.json({ error: 'recipient_id and title are required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        recipient_id: body.recipient_id,
        title: body.title,
        body: body.body ?? null,
        type: body.type ?? 'info',
      })
      .select('id, title, body, type, is_read, created_at')
      .single()

    if (error) {
      console.error('[notifications POST]', error)
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    console.error('[notifications POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
