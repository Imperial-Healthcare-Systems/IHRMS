export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { SidebarProvider } from '@/components/layout/SidebarContext'
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner'
import { PoweredByImperialFooter } from '@/components/branding/PoweredByImperialFooter'
import { getOrgBranding } from '@/lib/branding'

// Imperial defaults — kept here so we don't depend on the branding row existing.
// Per spec §9.4 the customer-set primary/accent become the live theme once
// branding level >= 'logo'. Pages can read --imperial-primary / --imperial-accent
// to opt into the per-org theme; pages that still hardcode colors keep working.
const DEFAULT_PRIMARY = '#F47920'
const DEFAULT_ACCENT  = '#1565C0'

function isHexColor(v: string | null): v is string {
  return !!v && /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v.trim())
}

export default async function ModulesLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // Server-fetch the branding row so we can apply colours on first paint.
  // Falls back to defaults when no active org or no row.
  const orgId = (session.user as { activeOrgId?: string; orgId?: string }).activeOrgId
            ?? (session.user as { orgId?: string }).orgId
  let primary = DEFAULT_PRIMARY
  let accent  = DEFAULT_ACCENT
  if (orgId) {
    const b = await getOrgBranding(orgId)
    // Only honour customer colours at level >= 'logo' (the level that unlocks
    // primary/accent customisation per spec §9.4).
    const eligible = b.level === 'logo' || b.level === 'full' || b.level === 'custom_domain'
    if (eligible) {
      if (isHexColor(b.primary_color)) primary = b.primary_color
      if (isHexColor(b.accent_color))  accent  = b.accent_color
    }
  }

  const themeStyle = {
    '--imperial-primary': primary,
    '--imperial-accent':  accent,
    minHeight: '100vh',
  } as React.CSSProperties

  return (
    <SidebarProvider>
      <ImpersonationBanner />
      <div className="bg-gray-50" style={themeStyle}>
        <Sidebar />
        {/* On mobile: no left margin (sidebar is an overlay).
            On desktop (lg+): margin-left 248px to sit beside the fixed sidebar. */}
        <div className="lg:ml-[248px]" style={{ minHeight: '100vh', background: '#F1F4F9', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>{children}</div>
          <footer style={{ borderTop: '1px solid #E2E8F0', background: '#FFFFFF', padding: '6px 0' }}>
            <PoweredByImperialFooter />
          </footer>
        </div>
      </div>
    </SidebarProvider>
  )
}
