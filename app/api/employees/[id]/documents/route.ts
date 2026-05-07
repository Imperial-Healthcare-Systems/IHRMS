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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireAuth()
    if (error) return error

    // Verify employee is in caller's org
    const { data: emp } = await supabaseAdmin
      .from('employees').select('id')
      .eq('id', id).eq('org_id', ctx.orgId).maybeSingle()
    if (!emp) return NextResponse.json({ error: 'Employee not found in your organisation' }, { status: 404 })

    const { data, error: dbErr } = await supabaseAdmin
      .from('employee_documents')
      .select('id, document_name, category, file_url, created_at')
      .eq('org_id', ctx.orgId)
      .eq('employee_id', id)
      .order('created_at', { ascending: false })

    if (dbErr) return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })

    const mapped = (data ?? []).map((d: Record<string, unknown>) => ({
      id:          d.id,
      name:        d.document_name,
      type:        (d.category as string) ?? 'other',
      url:         d.file_url,
      uploaded_at: d.created_at,
    }))

    return NextResponse.json({ data: mapped })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { data: emp } = await supabaseAdmin
      .from('employees').select('id')
      .eq('id', id).eq('org_id', ctx.orgId).maybeSingle()
    if (!emp) return NextResponse.json({ error: 'Employee not found in your organisation' }, { status: 404 })

    const formData = await req.formData()
    const file     = formData.get('file') as File | null
    const name     = formData.get('name') as string | null
    const category = (formData.get('category') as string | null) ?? 'other'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // Org-prefixed path
    const path     = `${ctx.orgId}/employee-docs/${id}/${Date.now()}-${file.name}`
    const buffer   = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from('hrms-documents')
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (uploadError) return NextResponse.json({ error: errMsg(uploadError) }, { status: 500 })

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('hrms-documents')
      .getPublicUrl(path)

    const { data, error: dbErr } = await supabaseAdmin
      .from('employee_documents')
      .insert({
        org_id:        ctx.orgId,
        employee_id:   id,
        document_name: name ?? file.name,
        category,
        document_type: category,
        file_url:      publicUrl,
      })
      .select()
      .single()

    if (dbErr) return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
