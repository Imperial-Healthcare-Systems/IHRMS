'use client'

/**
 * No-op pass-through. Kept so app/layout.tsx doesn't need to change.
 * Session state now flows through lib/use-session (Supabase-backed),
 * which reads directly from the browser Supabase client — no provider
 * boundary required.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
