/**
 * List pending invitations for the current org.
 * Per IMPERIAL_TENANT_SPEC v1.0 §11 (settings/team page).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(_req: NextRequest) {
  const auth = await requireRole(['owner', 'admin', 'hr_admin', 'crm_admin', 'super_admin'])
  if (auth.error) return auth.error
  const ctx = auth.ctx

  try {
    const { data, error } = await supabaseAdmin
      .from('org_invitations')
      .select('id, email, role, hrms_access, crm_access, expires_at, created_at, invited_by')
      .eq('org_id', ctx.orgId)
      .is('accepted_at', null)
      .is('cancelled_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[team/invitations GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('[team/invitations GET catch]', err)
    const message = err instanceof Error ? err.message : 'List failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
