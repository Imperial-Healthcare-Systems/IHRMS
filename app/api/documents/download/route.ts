import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

export async function GET(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { data: doc, error: docErr } = await supabaseAdmin
      .from('org_documents')
      .select('file_url, employee_id')
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    if (docErr || !doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    const isAdmin = HR_ROLES.includes(ctx.role)
    if (!isAdmin && doc.employee_id && doc.employee_id !== ctx.identityId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error: signErr } = await supabaseAdmin.storage
      .from('org-documents')
      .createSignedUrl(doc.file_url, 120)

    if (signErr) throw signErr

    return NextResponse.json({ url: data.signedUrl })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to generate download URL' }, { status: 500 })
  }
}
