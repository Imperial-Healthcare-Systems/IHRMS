export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function ModulesLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="bg-gray-50" style={{ minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '248px', minHeight: '100vh', background: '#F1F4F9' }}>
        {children}
      </div>
    </div>
  )
}
