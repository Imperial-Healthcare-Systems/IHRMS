export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function ModulesLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ marginLeft: '248px' }}
      >
        <main className="flex-1 overflow-y-auto" style={{ background: '#F1F4F9', minHeight: '100vh' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
