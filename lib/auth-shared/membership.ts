/**
 * Membership lookup helpers — what orgs an identity has access to.
 *
 * Canonical version per IMPERIAL_TENANT_SPEC v1.0 Section 3.1. Mirror
 * verbatim into ICRM and Admin Console; per-app `lib/auth.ts` filters
 * on hrmsAccess vs crmAccess as appropriate.
 */
import { supabaseAdmin } from '../supabase-admin'

export type Membership = {
  id: string
  orgId: string
  orgName: string
  orgSlug: string | null
  role: string
  status: string
  hrmsAccess: boolean
  crmAccess: boolean
  planTier: string | null
  subscriptionStatus: string | null
  brandingLevel: string
}

/**
 * Returns every active membership for an identity, with the organisation
 * and branding metadata embedded for the org-switcher UI.
 */
export async function getActiveMemberships(identityId: string): Promise<Membership[]> {
  const { data, error } = await supabaseAdmin
    .from('memberships')
    .select(`
      id, role, status, hrms_access, crm_access,
      organisations!inner (
        id, name, slug, plan_tier, subscription_status,
        org_branding ( level )
      )
    `)
    .eq('identity_id', identityId)
    .eq('status', 'active')

  if (error) {
    console.warn('[auth-shared/membership] getActiveMemberships:', error.message)
    return []
  }
  if (!data) return []

  return data.map((m: any) => ({
    id:                 m.id,
    orgId:              m.organisations?.id,
    orgName:            m.organisations?.name,
    orgSlug:            m.organisations?.slug ?? null,
    role:               m.role,
    status:             m.status,
    hrmsAccess:         !!m.hrms_access,
    crmAccess:          !!m.crm_access,
    planTier:           m.organisations?.plan_tier ?? null,
    subscriptionStatus: m.organisations?.subscription_status ?? null,
    // org_branding is returned as an array because of the relationship; pick first
    brandingLevel:      m.organisations?.org_branding?.[0]?.level ?? 'none',
  })).filter(m => !!m.orgId)
}

/**
 * Choose which org context a session should land in.
 *
 * Priority order:
 *   1. preferOrgId if it's a valid membership for this identity
 *   2. last_active_org_id from the identities table, if still in the membership list
 *   3. first membership in the array (deterministic per Supabase order)
 */
export async function pickActiveOrg(
  identityId: string,
  memberships: Membership[],
  preferOrgId?: string,
): Promise<Membership | null> {
  if (memberships.length === 0) return null

  if (preferOrgId) {
    const found = memberships.find(m => m.orgId === preferOrgId)
    if (found) return found
  }

  const { data } = await supabaseAdmin
    .from('identities')
    .select('last_active_org_id')
    .eq('id', identityId)
    .maybeSingle()

  if (data?.last_active_org_id) {
    const lastActive = memberships.find(m => m.orgId === data.last_active_org_id)
    if (lastActive) return lastActive
  }

  return memberships[0]
}
