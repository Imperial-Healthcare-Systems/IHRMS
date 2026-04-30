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

    // Schema uses title/category/file_url/file_name; alias them to the
    // page-friendly names (name/type/storage_path/size_bytes) at select time
    // so the existing client-side rendering keeps working.
    const buildQuery = (withEmployeeFilter: boolean) => {
      let q = supabaseAdmin
        .from('org_documents')
        .select(`
          id,
          name:title,
          type:category,
          storage_path:file_url,
          file_name,
          size_bytes:file_size,
          mime_type,
          created_at,
          uploader:employees!uploaded_by(id, first_name, last_name)
        `)
        .order('created_at', { ascending: false })

      if (orgId) q = q.eq('org_id', orgId)
      if (withEmployeeFilter) {
        if (!isAdminUser)    q = q.eq('employee_id', userId)
        else if (employeeId) q = q.eq('employee_id', employeeId)
      }
      return q
    }

    let { data, error } = await buildQuery(true)
    // employee_id column may not exist on org_documents — retry without that filter
    if (error && error.code === '42703') {
      console.warn('[documents GET] employee_id column missing, returning all org documents:', error.message)
      const retry = await buildQuery(false)
      data = retry.data; error = retry.error
    }
    if (error) {
      console.error('[documents GET]', error)
      if (error.code === '42P01') return NextResponse.json({ data: [] })
      return NextResponse.json({ error: errMsg(error) }, { status: 500 })
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

    // Map page-friendly field names → actual org_documents schema:
    //   name           → title       (NOT NULL)
    //   type           → category    (NOT NULL — defaults to 'Other')
    //   storage_path   → file_url    (NOT NULL)
    //   <derived>      → file_name   (NOT NULL — extracted from storage path basename)
    //   size_bytes     → file_size
    const fileName = storage_path.split('/').pop() ?? name
    const insertPayload: Record<string, unknown> = {
      title:       name,
      category:    type ?? 'Other',
      file_url:    storage_path,
      file_name:   fileName,
      file_size:   size_bytes ?? null,
      uploaded_by: actorId,
      org_id:      orgId,
    }
    // Include employee_id if the column exists; if it doesn't, retry below
    if (employee_id) insertPayload.employee_id = employee_id

    let { data, error } = await supabaseAdmin
      .from('org_documents')
      .insert(insertPayload)
      .select()
      .single()

    // Column doesn't exist → drop employee_id and retry (org_documents may be org-wide only)
    if (error && error.code === '42703' && 'employee_id' in insertPayload) {
      console.warn('[documents POST] employee_id column missing on org_documents, retrying without it')
      delete insertPayload.employee_id
      const retry = await supabaseAdmin.from('org_documents').insert(insertPayload).select().single()
      data = retry.data; error = retry.error
    }

    if (error) {
      console.error('[documents POST]', error)
      return NextResponse.json({ error: error.message, code: error.code, details: error.details, hint: error.hint }, { status: 500 })
    }

    if (orgId) logAudit({ org_id: orgId, actor_id: actorId, action: 'created', module: 'documents', entity_id: data.id, summary: 'Document uploaded' })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[documents POST catch]', errMsg(err))
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
