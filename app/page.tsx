import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function Home() {
  try {
    const session = await getServerSession(authOptions)
    if (session) {
      redirect('/dashboard')
    }
  } catch (error) {
    console.error('Failed to resolve session on home route', error)
  }

  redirect('/login')
}
