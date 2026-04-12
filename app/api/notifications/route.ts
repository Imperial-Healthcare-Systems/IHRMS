import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import sql, { ensureSchema } from '@/lib/pg'

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

// GET — fetch notifications for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as Record<string, unknown>)?.id as string | undefined
    if (!userId) return NextResponse.json({ data: [], unread: 0 })

    await ensureSchema()

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

    const rows = await sql`
      SELECT id, title, body, type, is_read, created_at
      FROM notifications
      WHERE recipient_id = ${userId}::uuid
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    const unread = rows.filter(r => !r.is_read).length

    return NextResponse.json({ data: rows, unread })
  } catch (err: unknown) {
    console.error('[notifications GET]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

// PATCH — mark notification(s) as read
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as Record<string, unknown>)?.id as string | undefined
    if (!userId) return NextResponse.json({ error: 'No user ID in session' }, { status: 400 })

    const body = await req.json() as { id?: string; markAllRead?: boolean }

    await ensureSchema()

    if (body.markAllRead) {
      await sql`
        UPDATE notifications
        SET is_read = true
        WHERE recipient_id = ${userId}::uuid AND is_read = false
      `
    } else if (body.id) {
      await sql`
        UPDATE notifications
        SET is_read = true
        WHERE id = ${body.id}::uuid AND recipient_id = ${userId}::uuid
      `
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[notifications PATCH]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

// POST — create a notification (internal server-to-server use)
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

    await ensureSchema()

    const rows = await sql`
      INSERT INTO notifications (recipient_id, title, body, type)
      VALUES (
        ${body.recipient_id}::uuid,
        ${body.title},
        ${body.body ?? null},
        ${body.type ?? 'info'}
      )
      RETURNING id, title, body, type, is_read, created_at
    `

    return NextResponse.json({ data: rows[0] }, { status: 201 })
  } catch (err: unknown) {
    console.error('[notifications POST]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
