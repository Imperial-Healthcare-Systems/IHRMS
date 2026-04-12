export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { SidebarProvider } from '@/components/layout/SidebarContext'

export default async function ModulesLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <SidebarProvider>
      <div className="bg-gray-50" style={{ minHeight: '100vh' }}>
        <Sidebar />
        {/* On mobile: no left margin (sidebar is an overlay).
            On desktop (lg+): margin-left 248px to sit beside the fixed sidebar. */}
        <div className="lg:ml-[248px]" style={{ minHeight: '100vh', background: '#F1F4F9' }}>
          {children}
        </div>
      </div>
    </SidebarProvider>
  )
}
