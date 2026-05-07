import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await requireAuth()
    if (error) return error

    const body = await req.json()
    const { employee_id, file_name } = body
    if (!employee_id || !file_name) {
      return NextResponse.json({ error: 'employee_id and file_name are required' }, { status: 400 })
    }

    // Cross-tenant guard
    const { data: emp } = await supabaseAdmin
      .from('employees').select('id')
      .eq('id', employee_id).eq('org_id', ctx.orgId).maybeSingle()
    if (!emp) return NextResponse.json({ error: 'Employee not found in your organisation' }, { status: 404 })

    // Org-prefixed path so storage RLS (when applied) can isolate per-tenant
    const path = `${ctx.orgId}/${employee_id}/${Date.now()}-${file_name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const { data, error: signErr } = await supabaseAdmin.storage
      .from('org-documents')
      .createSignedUploadUrl(path)

    if (signErr) throw signErr

    return NextResponse.json({ signed_url: data.signedUrl, path, token: data.token })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create upload URL' }, { status: 500 })
  }
}
