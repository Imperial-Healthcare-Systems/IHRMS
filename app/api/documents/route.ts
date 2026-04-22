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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employee_id')
    const orgId = (session.user as any)?.orgId as string | null
    const userId = (session.user as any)?.id as string
    const isAdminUser = isAdmin(session)

    let query = supabaseAdmin
      .from('org_documents')
      .select(`
        id, name, type, storage_path, size_bytes, created_at,
        employee:employees!employee_id(id, first_name, last_name, emp_id),
        uploader:employees!uploaded_by(id, first_name, last_name)
      `)
      .order('created_at', { ascending: false })

    if (!isAdminUser) query = query.eq('employee_id', userId)
    else if (employeeId) query = query.eq('employee_id', employeeId)
    if (orgId) query = query.eq('org_id', orgId)

    const { data, error } = await query
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ data: [] })
      throw error
    }
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { employee_id, name, type, storage_path, size_bytes } = body
    if (!employee_id || !name || !storage_path) {
      return NextResponse.json({ error: 'employee_id, name, storage_path are required' }, { status: 400 })
    }

    const orgId = (session.user as any)?.orgId as string | null
    const actorId = (session.user as any)?.id as string

    const { data, error } = await supabaseAdmin
      .from('org_documents')
      .insert({ employee_id, name, type: type ?? null, storage_path, size_bytes: size_bytes ?? null, uploaded_by: actorId, org_id: orgId })
      .select()
      .single()

    if (error) throw error

    if (orgId) logAudit({ org_id: orgId, actor_id: actorId, action: 'created', module: 'documents', entity_id: data.id, summary: 'Document uploaded' })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    // Get storage path before deleting record
    const { data: doc } = await supabaseAdmin.from('org_documents').select('storage_path').eq('id', id).single()

    const { error } = await supabaseAdmin.from('org_documents').delete().eq('id', id)
    if (error) throw error

    // Remove from storage (best-effort)
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
