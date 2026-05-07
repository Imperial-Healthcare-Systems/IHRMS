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

export async function GET(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

    const { data, error: dbErr } = await supabaseAdmin
      .from('notifications')
      .select('id, title, body, type, is_read, created_at')
      .eq('org_id', ctx.orgId)
      .eq('recipient_id', ctx.identityId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (dbErr) {
      if (dbErr.code === '42P01') return NextResponse.json({ data: [], unread: 0 })
      console.error('[notifications GET]', dbErr)
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

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const body = await req.json() as { id?: string; markAllRead?: boolean }

    if (body.markAllRead) {
      await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('org_id', ctx.orgId)
        .eq('recipient_id', ctx.identityId)
        .eq('is_read', false)
    } else if (body.id) {
      await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('id', body.id)
        .eq('org_id', ctx.orgId)
        .eq('recipient_id', ctx.identityId)
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[notifications PATCH]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const body = await req.json() as {
      recipient_id: string
      title: string
      body?: string
      type?: string
    }

    if (!body.recipient_id || !body.title) {
      return NextResponse.json({ error: 'recipient_id and title are required' }, { status: 400 })
    }

    // Cross-tenant guard: recipient must be in caller's org
    const { data: rcpt } = await supabaseAdmin
      .from('employees').select('id')
      .eq('id', body.recipient_id).eq('org_id', ctx.orgId).maybeSingle()
    if (!rcpt) return NextResponse.json({ error: 'Recipient not found in your organisation' }, { status: 404 })

    const { data, error: dbErr } = await supabaseAdmin
      .from('notifications')
      .insert({
        org_id: ctx.orgId,
        recipient_id: body.recipient_id,
        title: body.title,
        body: body.body ?? null,
        type: body.type ?? 'info',
      })
      .select('id, title, body, type, is_read, created_at')
      .single()

    if (dbErr) {
      console.error('[notifications POST]', dbErr)
      return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    console.error('[notifications POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
