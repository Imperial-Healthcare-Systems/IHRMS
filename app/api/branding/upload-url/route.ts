/**
 * Direct upload for branding assets (logo, dark logo, favicon, invoice logo).
 *
 * Mirrors the existing employees/avatar pattern: client POSTs multipart
 * form-data, the server uploads via service role and writes the public URL
 * back to org_branding. We deliberately don't expose a signed-upload-URL
 * variant — the assets are small (< 1 MB typical) and a single round-trip
 * keeps the UI simple.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getOrgBranding, BRANDING_FIELDS_BY_LEVEL, type OrgBranding } from '@/lib/branding'
import { logAudit } from '@/lib/audit'

const ADMIN_ROLES = ['owner', 'admin', 'hr_admin', 'crm_admin', 'super_admin']
const BUCKET = 'branding'
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']

const VALID_KINDS: Array<keyof OrgBranding> = ['logo_url', 'logo_dark_url', 'favicon_url', 'invoice_logo_url']

export async function POST(req: NextRequest) {
  const auth = await requireRole(ADMIN_ROLES)
  if (auth.error) return auth.error
  const ctx = auth.ctx

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const kindRaw = formData.get('kind')
    const kind = typeof kindRaw === 'string' ? kindRaw : ''

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!VALID_KINDS.includes(kind as keyof OrgBranding)) {
      return NextResponse.json({ error: `Invalid kind. Allowed: ${VALID_KINDS.join(', ')}` }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only PNG, JPEG, WebP, SVG, or ICO files are allowed' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File must be under 2 MB' }, { status: 400 })
    }

    // Verify the field this upload targets is allowed at the org's branding level.
    const branding = await getOrgBranding(ctx.orgId)
    const allowed = new Set(BRANDING_FIELDS_BY_LEVEL[branding.level])
    if (!allowed.has(kind as keyof OrgBranding)) {
      return NextResponse.json({
        error: 'This asset is not editable at your branding level. Upgrade to Pro or higher to upload custom branding.',
        level: branding.level,
      }, { status: 403 })
    }

    const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'png'
    // Org-prefixed path so future Storage RLS can isolate per tenant.
    const filePath = `${ctx.orgId}/${kind}.${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
        cacheControl: '3600',
      })

    if (uploadErr) {
      if (uploadErr.message?.includes('Bucket not found')) {
        return NextResponse.json(
          { error: `Storage bucket "${BUCKET}" not found. Create it in Supabase → Storage (public bucket).` },
          { status: 500 },
        )
      }
      throw uploadErr
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filePath)
    const publicUrl = urlData.publicUrl

    const { data, error: updateErr } = await supabaseAdmin
      .from('org_branding')
      .upsert({ org_id: ctx.orgId, [kind]: publicUrl, updated_at: new Date().toISOString() } as never, { onConflict: 'org_id' })
      .select('*')
      .single()

    if (updateErr) throw updateErr

    logAudit({
      org_id: ctx.orgId,
      actor_identity_id: ctx.identityId, actor_membership_id: ctx.membershipId,
      action: 'updated',
      module: 'branding',
      entity_id: ctx.orgId,
      summary: `Uploaded ${kind} (${(file.size / 1024).toFixed(1)} KB)`,
    })

    return NextResponse.json({ url: publicUrl, kind, data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[branding upload-url POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
