import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

// Use a dummy URL during build time to avoid instantiation errors
const DUMMY_URL = 'https://placeholder.supabase.co'

function isValidUrl(url: string) {
  try { new URL(url); return true } catch { return false }
}

// Client-side Supabase client (uses anon key)
export const supabase: SupabaseClient = createClient(
  isValidUrl(supabaseUrl) ? supabaseUrl : DUMMY_URL,
  supabaseAnonKey || 'placeholder-anon-key'
)

// Server-side Supabase admin client (uses service role key - bypasses RLS)
export const supabaseAdmin: SupabaseClient = createClient(
  isValidUrl(supabaseUrl) ? supabaseUrl : DUMMY_URL,
  supabaseServiceKey || 'placeholder-service-key',
  { auth: { autoRefreshToken: false, persistSession: false } }
)
