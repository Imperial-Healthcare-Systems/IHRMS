import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const BUCKET = 'avatars'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as any)?.id as string
    if (!userId) return NextResponse.json({ error: 'No user ID in session' }, { status: 400 })

    const formData = await req.formData()
    const file = formData.get('avatar') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP or GIF images are allowed' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image must be under 5 MB' }, { status: 400 })
    }

    const ext      = file.name.split('.').pop() ?? 'jpg'
    const filePath = `${userId}/avatar.${ext}`
    const buffer   = Buffer.from(await file.arrayBuffer())

    // Upload to Supabase Storage (upsert so re-uploads replace the old file)
    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType:  file.type,
        upsert:       true,
        cacheControl: '3600',
      })

    if (uploadErr) {
      // If bucket doesn't exist yet, surface a helpful message
      if (uploadErr.message?.includes('Bucket not found') || (uploadErr as any).error === 'Bucket not found') {
        return NextResponse.json(
          { error: `Storage bucket "${BUCKET}" not found. Create it in Supabase → Storage.` },
          { status: 500 }
        )
      }
      throw uploadErr
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filePath)
    const publicUrl = urlData.publicUrl

    // Save to employees table
    const { error: updateErr } = await supabaseAdmin
      .from('employees')
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (updateErr) throw updateErr

    return NextResponse.json({ avatar_url: publicUrl })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[avatar upload]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
