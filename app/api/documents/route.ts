import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAudit } from '@/lib/audit'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

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
    const employeeId  = searchParams.get('employee_id')
    const isAdminUser = HR_ROLES.includes(ctx.role)

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
        .eq('org_id', ctx.orgId)
        .order('created_at', { ascending: false })

      if (withEmployeeFilter) {
        if (!isAdminUser)    q = q.eq('employee_id', ctx.identityId)
        else if (employeeId) q = q.eq('employee_id', employeeId)
      }
      return q
    }

    let { data, error: dbErr } = await buildQuery(true)
    if (dbErr && dbErr.code === '42703') {
      console.warn('[documents GET] employee_id column missing, returning all org documents:', dbErr.message)
      const retry = await buildQuery(false)
      data = retry.data; dbErr = retry.error
    }
    if (dbErr) {
      console.error('[documents GET]', dbErr)
      if (dbErr.code === '42P01') return NextResponse.json({ data: [] })
      return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })
    }
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const body = await req.json()
    delete (body as Record<string, unknown>).org_id

    const { employee_id, name, type, storage_path, size_bytes } = body
    if (!employee_id || !name || !storage_path) {
      return NextResponse.json({ error: 'employee_id, name, storage_path are required' }, { status: 400 })
    }

    // Cross-tenant guard
    const { data: emp } = await supabaseAdmin
      .from('employees').select('id')
      .eq('id', employee_id).eq('org_id', ctx.orgId).maybeSingle()
    if (!emp) return NextResponse.json({ error: 'Employee not found in your organisation' }, { status: 404 })

    const fileName = storage_path.split('/').pop() ?? name
    const insertPayload: Record<string, unknown> = {
      org_id:      ctx.orgId,
      title:       name,
      category:    type ?? 'Other',
      file_url:    storage_path,
      file_name:   fileName,
      file_size:   size_bytes ?? null,
      uploaded_by: ctx.identityId,
      employee_id,
    }

    let { data, error: dbErr } = await supabaseAdmin
      .from('org_documents')
      .insert(insertPayload)
      .select()
      .single()

    if (dbErr && dbErr.code === '42703' && 'employee_id' in insertPayload) {
      console.warn('[documents POST] employee_id column missing on org_documents, retrying without it')
      delete insertPayload.employee_id
      const retry = await supabaseAdmin.from('org_documents').insert(insertPayload).select().single()
      data = retry.data; dbErr = retry.error
    }

    if (dbErr) {
      console.error('[documents POST]', dbErr)
      return NextResponse.json({ error: dbErr.message, code: dbErr.code, details: dbErr.details, hint: dbErr.hint }, { status: 500 })
    }

    logAudit({
      org_id: ctx.orgId,
      actor_identity_id: ctx.identityId, actor_membership_id: ctx.membershipId,
      action: 'created',
      module: 'documents',
      entity_id: data.id,
      summary: 'Document uploaded',
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[documents POST catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { data: doc } = await supabaseAdmin
      .from('org_documents')
      .select('storage_path:file_url')
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    const { error: dbErr } = await supabaseAdmin
      .from('org_documents')
      .delete()
      .eq('id', id)
      .eq('org_id', ctx.orgId)
    if (dbErr) throw dbErr

    if (doc?.storage_path) {
      await supabaseAdmin.storage.from('org-documents').remove([doc.storage_path])
    }

    logAudit({
      org_id: ctx.orgId,
      actor_identity_id: ctx.identityId, actor_membership_id: ctx.membershipId,
      action: 'deleted',
      module: 'documents',
      entity_id: id,
      summary: 'Document deleted',
    })

    return NextResponse.json({ message: 'Document deleted' })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
