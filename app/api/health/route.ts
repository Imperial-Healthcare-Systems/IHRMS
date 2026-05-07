/**
 * Public health endpoint — Phase 7 of IMPERIAL_TENANT_SPEC v1.0 §13.
 *
 * UptimeRobot pings this every minute. Must:
 *   - Return 200 quickly when DB is reachable
 *   - Return 503 when DB is not (so the pager fires)
 *   - Be public — UptimeRobot does not auth
 *   - Be lightweight — a HEAD-style probe with `count: 'exact', head: true`
 *     hits Postgres without streaming any rows
 *
 * The body is intentionally minimal. We do NOT expose internals, table
 * names, or queryable system info — just enough for the monitor and a
 * quick eyeball during incidents.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Avoid Next 15's static-render attempt at build time.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const TIMEOUT_MS = 4000

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('db timeout')), ms)),
  ])
}

export async function GET() {
  const startedAt = Date.now()
  let dbOk = false
  let dbError: string | null = null

  try {
    // Cheapest possible round-trip — count head on a table that always exists.
    const probe = Promise.resolve(
      supabaseAdmin
        .from('organisations')
        .select('id', { count: 'exact', head: true })
        .limit(1),
    ).then(({ error }) => ({ error: error ? error.message : null }))
    const { error } = await withTimeout(probe, TIMEOUT_MS)
    if (error) {
      dbError = error
    } else {
      dbOk = true
    }
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'db probe failed'
  }

  const body = {
    ok: dbOk,
    service: 'ihrms',
    db: dbOk ? 'up' : 'down',
    latency_ms: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
    ...(dbError && process.env.NODE_ENV !== 'production' ? { error: dbError } : {}),
  }

  return NextResponse.json(body, { status: dbOk ? 200 : 503 })
}

// HEAD requests cost nothing and some monitors prefer them.
export async function HEAD() {
  const res = await GET()
  return new NextResponse(null, { status: res.status, headers: res.headers })
}
