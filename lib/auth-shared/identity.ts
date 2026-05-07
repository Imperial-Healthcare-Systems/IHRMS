/**
 * Identity lookup helpers — the auth root for the multi-tenant model.
 *
 * Per IMPERIAL_TENANT_SPEC v1.0 Section 3.1, this is the canonical version
 * to be copied into IHRMS, ICRM, and the Admin Console. Each project
 * imports from its local copy of this file.
 */
import { supabaseAdmin } from '../supabase-admin'

export type Identity = {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  isPlatformAdmin: boolean
  isLocked: boolean
  totpEnabled: boolean
  totpSecret: string | null
  lastActiveOrgId: string | null
}

/**
 * Look up an identity by email (case-insensitive).
 * Returns null if no identity exists for that email.
 */
export async function findIdentityByEmail(email: string): Promise<Identity | null> {
  const normalized = email.trim().toLowerCase()
  const { data, error } = await supabaseAdmin
    .from('identities')
    .select(
      'id, email, full_name, avatar_url, is_platform_admin, is_locked, ' +
      'totp_enabled, totp_secret, last_active_org_id',
    )
    .eq('email', normalized)
    .maybeSingle()

  if (error) {
    console.warn('[auth-shared/identity] findIdentityByEmail:', error.message)
    return null
  }
  if (!data) return null

  // Cast through unknown — Supabase generated types don't include the new
  // `identities` table yet (added in Migration 100, types not regenerated).
  const row = data as unknown as {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
    is_platform_admin: boolean | null
    is_locked: boolean | null
    totp_enabled: boolean | null
    totp_secret: string | null
    last_active_org_id: string | null
  }

  return {
    id:              row.id,
    email:           row.email,
    fullName:        row.full_name,
    avatarUrl:       row.avatar_url,
    isPlatformAdmin: row.is_platform_admin ?? false,
    isLocked:        row.is_locked ?? false,
    totpEnabled:     row.totp_enabled ?? false,
    totpSecret:      row.totp_secret,
    lastActiveOrgId: row.last_active_org_id,
  }
}

/**
 * Update last_login_at and last_active_org_id on the identity row.
 * Best-effort — failures are logged but not thrown.
 */
export async function recordLogin(identityId: string, activeOrgId: string | null): Promise<void> {
  const { error } = await supabaseAdmin
    .from('identities')
    .update({
      last_login_at:      new Date().toISOString(),
      last_active_org_id: activeOrgId,
    })
    .eq('id', identityId)

  if (error) {
    console.warn('[auth-shared/identity] recordLogin:', error.message)
  }
}
