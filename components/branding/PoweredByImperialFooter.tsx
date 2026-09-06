/**
 * Server component wrapper that resolves the precise hide_powered_by
 * decision once per page load and renders the watermark. Use in server
 * layouts (e.g. app/(modules)/layout.tsx).
 *
 * Client islands can keep using the bare `<PoweredByImperial>` — the
 * conservative session-based check is good enough for them.
 */
import { getSession } from '@/lib/session'
import { getOrgBranding, shouldShowWatermark } from '@/lib/branding'
import PoweredByImperial from './PoweredByImperial'

export async function PoweredByImperialFooter() {
  const session = await getSession()
  const orgId = session?.user.activeOrgId ?? session?.user.orgId

  if (!orgId) {
    // No active org (logged out, or session missing) — show by default.
    return <PoweredByImperial forceShow />
  }

  const branding = await getOrgBranding(orgId)
  const show = shouldShowWatermark(branding)
  if (!show) return null

  return <PoweredByImperial forceShow />
}
