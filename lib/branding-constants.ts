/**
 * Constants and types safe for client-side import.
 *
 * Separate from `lib/branding.ts` because that module pulls in
 * `supabase-admin` (server-only) for getOrgBranding. Client components
 * (the watermark, the settings/branding page) need the constants and
 * types but not the server functions — keeping them split here avoids a
 * 'server-only' violation at build time.
 */

export type WhitelabelLevel = 'none' | 'logo' | 'full' | 'custom_domain'

export const WATERMARK_LINES = {
  ihrms: 'Powered by IHRMS (Imperial HRMS) · Made with care in India by Imperial Tech Innovations',
  icrm:  'Powered by ICRM (Imperial CRM) · Made with care in India by Imperial Tech Innovations',
} as const
