import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** Next.js signals redirects/notFounds by throwing errors with a special `digest`.
 *  We must rethrow them so the framework can act on them. */
function isNextInternalError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const digest = (err as { digest?: unknown }).digest
  return typeof digest === 'string' && (digest.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND')
}

export default async function Home() {
  let session = null
  try {
    session = await getSession()
  } catch (error) {
    // Rethrow Next.js internal redirect/not-found markers so the framework handles them
    if (isNextInternalError(error)) throw error
    // Real failure (e.g. DB down) — log and fall through to /login
    console.error('Failed to resolve session on home route', error)
  }

  redirect(session ? '/dashboard' : '/login')
}
