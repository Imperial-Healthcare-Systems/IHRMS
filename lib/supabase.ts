/**
 * Anon-key Supabase client. Safe to import from client components — RLS
 * gates every read/write.
 *
 * The service-role admin client lives separately in `lib/supabase-admin.ts`
 * with an `import 'server-only'` guard so the SUPABASE_SERVICE_ROLE_KEY env
 * reference and the admin client object can never be bundled into a
 * browser chunk.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const DUMMY_URL = 'https://placeholder.supabase.co'

function isValidUrl(url: string) {
  try { new URL(url); return true } catch { return false }
}

export const supabase: SupabaseClient = createClient(
  isValidUrl(supabaseUrl) ? supabaseUrl : DUMMY_URL,
  supabaseAnonKey || 'placeholder-anon-key',
)
