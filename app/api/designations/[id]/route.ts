import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

function errMsg(err: unknown) {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

function isAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
  const role = (session?.user as Record<string, unknown>)?.role as string | undefined
  return ['hr_admin', 'super_admin', 'admin', 'hr'].includes(role ?? '')
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const allowed: Record<string, unknown> = {}
    if (body.title     !== undefined) allowed.title     = String(body.title).trim()
    if (body.grade     !== undefined) allowed.grade     = body.grade ? String(body.grade).trim() : null
    if (body.is_active !== undefined) allowed.is_active = Boolean(body.is_active)

    if (Object.keys(allowed).length === 0)
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('designations')
      .update(allowed)
      .eq('id', id)
      .select('id, title, grade, is_active, created_at')
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Designation not found' }, { status: 404 })
      throw error
    }
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabaseAdmin.from('designations').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ message: 'Designation deleted' })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
