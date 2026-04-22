import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

function isAdmin(session: Awaited<ReturnType<typeof getServerSession<typeof authOptions>>>): boolean {
  const role = ((session as unknown as Record<string, unknown>)?.user as Record<string, unknown>)?.role as string | undefined
  return ['hr_admin', 'super_admin', 'admin', 'hr'].includes(role ?? '')
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as any)?.id as string
    const isAdminUser = isAdmin(session)

    const { data, error } = await supabaseAdmin
      .from('org_documents')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      throw error
    }

    if (!isAdminUser && data.employee_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: doc } = await supabaseAdmin
      .from('org_documents')
      .select('storage_path')
      .eq('id', id)
      .single()

    const { error } = await supabaseAdmin.from('org_documents').delete().eq('id', id)
    if (error) throw error

    if (doc?.storage_path) {
      await supabaseAdmin.storage.from('org-documents').remove([doc.storage_path])
    }

    const orgId = (session.user as any)?.orgId as string | null
    const actorId = (session.user as any)?.id as string
    if (orgId) logAudit({ org_id: orgId, actor_id: actorId, action: 'deleted', module: 'documents', entity_id: id, summary: 'Document deleted' })

    return NextResponse.json({ message: 'Document deleted' })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
