/**
 * Service-role Supabase client. Bypasses RLS, has write access to every
 * table — strictly server-only.
 *
 * The `import 'server-only'` directive makes any client component that
 * tries to import this file fail at build time. That's the architectural
 * gate preventing the SUPABASE_SERVICE_ROLE_KEY env var (and the admin
 * client object) from ever reaching the browser bundle.
 *
 * Server callers (API routes, lib/db/*, lib/auth.ts, etc.) should import
 * `supabaseAdmin` from this file. Client components that need read access
 * should use the anon client from `lib/supabase.ts` and rely on RLS.
 */
import 'server-only'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const DUMMY_URL = 'https://placeholder.supabase.co'

function isValidUrl(url: string) {
  try { new URL(url); return true } catch { return false }
}

export const supabaseAdmin: SupabaseClient = createClient(
  isValidUrl(supabaseUrl) ? supabaseUrl : DUMMY_URL,
  supabaseServiceKey || 'placeholder-service-key',
  { auth: { autoRefreshToken: false, persistSession: false } },
)
