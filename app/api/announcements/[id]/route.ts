import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('announcements')
      .select(`
        *,
        created_by_employee:employees!created_by(
          id, first_name, last_name, avatar_url,
          designation:designations(title)
        )
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
      throw error
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = (session.user as any)?.isAdmin
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden — HR Admin required' }, { status: 403 })

    const body = await req.json()
    const { title, body: announcementBody, expires_at, is_pinned, priority } = body

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (title !== undefined) updates.title = title
    if (announcementBody !== undefined) updates.body = announcementBody
    if (expires_at !== undefined) updates.expires_at = expires_at
    if (is_pinned !== undefined) updates.is_pinned = is_pinned
    if (priority !== undefined) updates.priority = priority

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('announcements')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
      throw error
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = (session.user as any)?.isAdmin
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden — HR Admin required' }, { status: 403 })

    // Verify announcement exists before deleting
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('announcements')
      .select('id, title')
      .eq('id', params.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
      throw fetchError
    }

    const { error } = await supabaseAdmin
      .from('announcements')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ message: `Announcement '${existing.title}' deleted successfully` })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
