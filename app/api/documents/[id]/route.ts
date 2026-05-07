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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireAuth()
    if (error) return error

    const isAdminUser = HR_ROLES.includes(ctx.role)

    const { data, error: dbErr } = await supabaseAdmin
      .from('org_documents')
      .select('*')
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    if (dbErr) {
      if (dbErr.code === 'PGRST116') return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      throw dbErr
    }

    if (!isAdminUser && data.employee_id && data.employee_id !== ctx.identityId) {
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
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const { data: doc } = await supabaseAdmin
      .from('org_documents')
      .select('file_url')
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    const { error: dbErr } = await supabaseAdmin
      .from('org_documents')
      .delete()
      .eq('id', id)
      .eq('org_id', ctx.orgId)
    if (dbErr) throw dbErr

    if (doc?.file_url) {
      await supabaseAdmin.storage.from('org-documents').remove([doc.file_url])
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
