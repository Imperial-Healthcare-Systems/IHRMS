/**
 * Tenant-scoped Supabase client seam.
 *
 * Returns the per-request, cookie-backed Supabase client from
 * `lib/supabase-server.ts`. That client carries the user's real session
 * JWT, so PostgREST applies RLS — current_org_id(), is_imperial_admin(),
 * and auth.uid() all return real values inside SQL.
 *
 * The `_session` argument is retained for backwards compatibility with
 * any caller that used to pass the NextAuth session through.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { getServerSupabase } from './supabase-server'

export async function getTenantSupabase(_session?: unknown): Promise<SupabaseClient> {
  return getServerSupabase()
}
