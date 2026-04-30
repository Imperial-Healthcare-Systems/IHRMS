import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function Home() {
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch (error) {
    // Genuine failure resolving the session (e.g. DB down) — log and fall through to /login
    if (isRedirectError(error)) throw error
    console.error('Failed to resolve session on home route', error)
  }

  redirect(session ? '/dashboard' : '/login')
}
