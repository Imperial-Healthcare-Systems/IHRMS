import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { employee_id, file_name, content_type } = body
    if (!employee_id || !file_name) {
      return NextResponse.json({ error: 'employee_id and file_name are required' }, { status: 400 })
    }

    const ext  = file_name.split('.').pop() ?? 'bin'
    const path = `${employee_id}/${Date.now()}-${file_name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const { data, error } = await supabaseAdmin.storage
      .from('org-documents')
      .createSignedUploadUrl(path)

    if (error) throw error

    return NextResponse.json({ signed_url: data.signedUrl, path, token: data.token })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create upload URL' }, { status: 500 })
  }
}
