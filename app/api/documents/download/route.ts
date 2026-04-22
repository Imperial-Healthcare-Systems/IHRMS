import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { data: doc, error: docErr } = await supabaseAdmin
      .from('org_documents')
      .select('storage_path, employee_id')
      .eq('id', id)
      .single()

    if (docErr || !doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    // Employees can only download their own documents
    const userId  = (session.user as any)?.id as string
    const isAdmin = ['hr_admin', 'super_admin', 'admin', 'hr'].includes((session.user as any)?.role ?? '')
    if (!isAdmin && doc.employee_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin.storage
      .from('org-documents')
      .createSignedUrl(doc.storage_path, 120)

    if (error) throw error

    return NextResponse.json({ url: data.signedUrl })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to generate download URL' }, { status: 500 })
  }
}
