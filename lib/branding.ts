/**
 * Branding helpers — Phase 6 of IMPERIAL_TENANT_SPEC v1.0 §9.
 *
 * The customer-facing apps read branding in three contexts:
 *   1. Client components — the JWT carries `activeBrandingLevel` already
 *      (lib/auth.ts), so the watermark visibility decision is local.
 *   2. SSR (server components) — call `getOrgBranding(orgId)`.
 *   3. PDF / email generators — same.
 *
 * The watermark text itself is hard-coded per app kind. The decision
 * to *render* it is the only thing branding controls.
 */
import { supabaseAdmin } from './supabase-admin'
import { WATERMARK_LINES, type WhitelabelLevel } from './branding-constants'

// Re-export for back-compat with existing server-side callers.
export { WATERMARK_LINES }
export type { WhitelabelLevel }

export type OrgBranding = {
  org_id: string
  level: WhitelabelLevel
  logo_url: string | null
  logo_dark_url: string | null
  favicon_url: string | null
  primary_color: string | null
  accent_color: string | null
  app_name_hrms: string | null
  app_name_crm: string | null
  email_from_name: string | null
  email_from_addr: string | null
  email_dns_verified: boolean
  custom_domain_hrms: string | null
  custom_domain_crm: string | null
  custom_domain_verified: boolean
  hide_powered_by: boolean
  invoice_logo_url: string | null
  invoice_footer_text: string | null
  pdf_template: string | null
}

const DEFAULT_BRANDING: Omit<OrgBranding, 'org_id'> = {
  level: 'none',
  logo_url: null,
  logo_dark_url: null,
  favicon_url: null,
  primary_color: '#1565C0',
  accent_color: '#10B981',
  app_name_hrms: null,
  app_name_crm: null,
  email_from_name: null,
  email_from_addr: null,
  email_dns_verified: false,
  custom_domain_hrms: null,
  custom_domain_crm: null,
  custom_domain_verified: false,
  hide_powered_by: false,
  invoice_logo_url: null,
  invoice_footer_text: null,
  pdf_template: 'default',
}

/**
 * Fetch the org_branding row, returning sane defaults when the row is
 * missing (level=none) or when the table itself doesn't exist yet
 * (Migration 103 not run).
 */
export async function getOrgBranding(orgId: string): Promise<OrgBranding> {
  const { data, error } = await supabaseAdmin
    .from('org_branding')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) {
    if (error.code !== '42P01') {
      console.warn('[branding] getOrgBranding:', error.message)
    }
    return { org_id: orgId, ...DEFAULT_BRANDING }
  }
  if (!data) return { org_id: orgId, ...DEFAULT_BRANDING }

  const row = data as unknown as Partial<OrgBranding>
  return {
    org_id: orgId,
    ...DEFAULT_BRANDING,
    ...row,
    level: (row.level ?? DEFAULT_BRANDING.level) as WhitelabelLevel,
  }
}

/**
 * Should the "Powered by Imperial" watermark show on this surface?
 * Hidden only when level >= 'full' AND hide_powered_by is true.
 */
export function shouldShowWatermark(b: Pick<OrgBranding, 'level' | 'hide_powered_by'>): boolean {
  const fullOrAbove = b.level === 'full' || b.level === 'custom_domain'
  return !(fullOrAbove && b.hide_powered_by)
}

const APP_KIND = (process.env.NEXT_PUBLIC_APP_KIND ?? 'ihrms') as 'ihrms' | 'icrm'

export function watermarkLine(): string {
  return WATERMARK_LINES[APP_KIND]
}

/** Which fields the customer is allowed to mutate at their current level. */
export const BRANDING_FIELDS_BY_LEVEL: Record<WhitelabelLevel, ReadonlyArray<keyof OrgBranding>> = {
  none: [],
  logo: [
    'logo_url', 'logo_dark_url', 'favicon_url', 'primary_color', 'accent_color',
    'invoice_logo_url',
  ],
  full: [
    'logo_url', 'logo_dark_url', 'favicon_url', 'primary_color', 'accent_color',
    'invoice_logo_url', 'invoice_footer_text', 'pdf_template',
    'app_name_hrms', 'app_name_crm',
    'email_from_name', 'email_from_addr',
    'hide_powered_by',
  ],
  custom_domain: [
    'logo_url', 'logo_dark_url', 'favicon_url', 'primary_color', 'accent_color',
    'invoice_logo_url', 'invoice_footer_text', 'pdf_template',
    'app_name_hrms', 'app_name_crm',
    'email_from_name', 'email_from_addr',
    'hide_powered_by',
    // custom_domain_* fields stay admin-edited even at this level (DNS verification owned by ops)
  ],
}
