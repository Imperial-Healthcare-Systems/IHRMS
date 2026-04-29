import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

function isHrAdmin(session: Awaited<ReturnType<typeof getServerSession<typeof authOptions>>>): boolean {
  const role = ((session as unknown as Record<string, unknown>)?.user as Record<string, unknown>)?.role as string | undefined
  return ['hr_admin', 'super_admin', 'admin', 'hr'].includes(role ?? '')
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: courseId } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrAdmin(session)) return NextResponse.json({ error: 'Forbidden — HR Admin required' }, { status: 403 })

    const body = await req.json()
    const { file_name, content_type } = body
    if (!file_name) return NextResponse.json({ error: 'file_name required' }, { status: 400 })

    const safeName = file_name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${courseId}/${Date.now()}-${safeName}`

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
