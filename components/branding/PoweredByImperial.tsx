'use client'

/**
 * Watermark component — IMPERIAL_TENANT_SPEC v1.0 §9.1.
 *
 * Renders the "Powered by IHRMS / ICRM" line. Visibility comes from the
 * session JWT's `activeBrandingLevel` plus the `hide_powered_by` flag
 * which is server-injected via the `forceShow` / `hide` props (the JWT
 * doesn't carry hide_powered_by — branding settings change too rarely
 * to be worth widening the JWT). Server callers pass `hide` directly
 * after fetching org_branding.
 *
 * Behaviour:
 *   - Default (no props): shows unless activeBrandingLevel is 'full' or
 *     'custom_domain' (a conservative client-only hint that doesn't
 *     account for hide_powered_by — the server-rendered footer below
 *     this component, if any, will get the precise answer).
 *   - `hide={true}`: always hidden.
 *   - `forceShow={true}`: always shown (use sparingly — auth pages where
 *     the user has no session yet).
 */
import { useSession } from '@/lib/use-session'
import { WATERMARK_LINES } from '@/lib/branding-constants'

const APP_KIND = (process.env.NEXT_PUBLIC_APP_KIND ?? 'ihrms') as 'ihrms' | 'icrm'

type Props = {
  context?: 'footer' | 'auth' | 'pdf' | 'email'
  /** Server-resolved decision; takes precedence over the client check. */
  hide?: boolean
  /** Force visibility (auth pages, marketing site). */
  forceShow?: boolean
  className?: string
  style?: React.CSSProperties
}

export default function PoweredByImperial({ hide, forceShow, className, style }: Props) {
  const { data: session } = useSession()

  if (!forceShow) {
    if (hide) return null
    const level = (session?.user as { activeBrandingLevel?: string } | undefined)?.activeBrandingLevel
    // Conservative client hint — final say belongs to the server-rendered
    // footer in (modules)/layout.tsx which knows hide_powered_by precisely.
    if (level === 'full' || level === 'custom_domain') return null
  }

  return (
    <div
      className={className}
      style={{
        textAlign: 'center',
        fontSize: 11,
        color: '#94A3B8',
        opacity: 0.8,
        letterSpacing: '-0.1px',
        padding: '8px 12px',
        ...style,
      }}
    >
      {WATERMARK_LINES[APP_KIND]}
    </div>
  )
}
