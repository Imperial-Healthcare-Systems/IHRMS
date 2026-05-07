import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

/** Returns a signed download URL for an enrolled user (or admin) to stream a video. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; contentId: string }> }) {
  try {
    const { id: courseId, contentId } = await params
    const auth = await requireAuth()
    if (auth.error) return auth.error
    const ctx = auth.ctx

    // Fetch content row (org-scoped)
    const { data: content, error: contentErr } = await supabaseAdmin
      .from('course_content')
      .select('id, course_id, storage_path, external_url')
      .eq('id', contentId)
      .eq('org_id', ctx.orgId)
      .single()

    if (contentErr || !content) return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    if (content.course_id !== courseId) return NextResponse.json({ error: 'Content/course mismatch' }, { status: 400 })

    // External URLs need no signing — just return them
    if (content.external_url && !content.storage_path) {
      return NextResponse.json({ url: content.external_url, type: 'external' })
    }

    // For storage-backed videos, verify the user is enrolled (admins bypass)
    if (!HR_ROLES.includes(ctx.role)) {
      const { data: enrollment } = await supabaseAdmin
        .from('training_enrollments')
        .select('id')
        .eq('org_id', ctx.orgId)
        .eq('course_id', courseId)
        .eq('employee_id', ctx.identityId)
        .maybeSingle()
      if (!enrollment) {
        return NextResponse.json({ error: 'You must enrol in this course first' }, { status: 403 })
      }
    }

    if (!content.storage_path) {
      return NextResponse.json({ error: 'No file attached to this content' }, { status: 404 })
    }

    // 1-hour signed URL — long enough to watch a single video without re-fetching mid-stream
    const { data, error } = await supabaseAdmin.storage
      .from('course-content')
      .createSignedUrl(content.storage_path, 60 * 60)

    if (error) throw error

    return NextResponse.json({ url: data.signedUrl, type: 'storage' })
  } catch (err) {
    console.error('[course stream GET]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to generate stream URL' }, { status: 500 })
  }
}
