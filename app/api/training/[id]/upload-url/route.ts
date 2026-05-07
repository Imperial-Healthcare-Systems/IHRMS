import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: courseId } = await params
    const auth = await requireRole(HR_ROLES)
    if (auth.error) return auth.error
    const ctx = auth.ctx

    // Verify course belongs to this org
    {
      const { data: course } = await supabaseAdmin
        .from('training_courses').select('id')
        .eq('id', courseId).eq('org_id', ctx.orgId).maybeSingle()
      if (!course) return NextResponse.json({ error: 'Course not found in your organisation' }, { status: 404 })
    }

    const body = await req.json()
    const { file_name, content_type } = body
    if (!file_name) return NextResponse.json({ error: 'file_name required' }, { status: 400 })

    const safeName = file_name.replace(/[^a-zA-Z0-9._-]/g, '_')
    // Org-prefixed path so storage RLS isolates per tenant.
    // The course UUID stays as a sub-folder for human readability.
    const path = `${ctx.orgId}/${courseId}/${Date.now()}-${safeName}`

    const { data, error } = await supabaseAdmin.storage
      .from('course-content')
      .createSignedUploadUrl(path)

    if (error) throw error

    return NextResponse.json({ signed_url: data.signedUrl, path, token: data.token, content_type: content_type ?? null })
  } catch (err) {
    console.error('[course upload-url POST]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create upload URL' }, { status: 500 })
  }
}
