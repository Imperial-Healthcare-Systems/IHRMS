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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = (session.user as { isAdmin?: boolean })?.isAdmin
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    // Only allow safe fields to be updated
    const allowed: Record<string, unknown> = {}
    if (body.name      !== undefined) allowed.name      = body.name
    if (body.code      !== undefined) allowed.code      = body.code
    if (body.is_active !== undefined) allowed.is_active = body.is_active

    const { data, error } = await supabaseAdmin
      .from('departments')
      .update(allowed)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Department not found' }, { status: 404 })
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = (session.user as { isAdmin?: boolean })?.isAdmin
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Soft delete — deactivate instead of hard delete to preserve referential integrity
    const { data, error } = await supabaseAdmin
      .from('departments')
      .update({ is_active: false })
      .eq('id', id)
      .select('id, name, is_active')
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Department not found' }, { status: 404 })
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
    }

    return NextResponse.json({ data, message: 'Department deactivated' })
  } catch (err: unknown) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
