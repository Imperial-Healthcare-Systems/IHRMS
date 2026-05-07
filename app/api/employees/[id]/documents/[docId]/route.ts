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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { data: doc, error: fetchErr } = await supabaseAdmin
      .from('employee_documents')
      .select('id, file_url, employee_id')
      .eq('id', docId)
      .eq('employee_id', id)
      .eq('org_id', ctx.orgId)
      .single()

    if (fetchErr || !doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    try {
      const url      = new URL(doc.file_url)
      const pathPart = url.pathname.split('/hrms-documents/')[1]
      if (pathPart) {
        await supabaseAdmin.storage.from('hrms-documents').remove([pathPart])
      }
    } catch { /* storage cleanup is best-effort */ }

    const { error: dbErr } = await supabaseAdmin
      .from('employee_documents')
      .delete()
      .eq('id', docId)
      .eq('org_id', ctx.orgId)

    if (dbErr) return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
