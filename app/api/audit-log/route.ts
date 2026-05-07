import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

const HR_ROLES = ['owner', 'admin', 'hr_admin', 'super_admin', 'hr']

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

type AuditRow = {
  id: string
  org_id: string
  actor_id: string | null
  actor_identity_id?: string | null
  actor_membership_id?: string | null
  action: string
  module: string | null
  entity_id: string | null
  summary: string | null
  meta: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  actor?: {
    id: string
    first_name: string
    last_name: string
    emp_id: string
    avatar_url: string | null
  } | null
}

/**
 * Audit log read API. Phase 8.x refactor:
 *
 * The legacy implementation tried to embed `employees!actor_id` via PostgREST,
 * which only worked when audit_logs.actor_id happened to be an employee.id.
 * Post-Phase 2 + Migration 109, actor_id is the identity_id — that join no
 * longer resolves to an employee in this org.
 *
 * The new approach is two-pass:
 *   1. Fetch audit_logs rows (no embedded join — robust to any column gaps).
 *   2. Collect distinct actor_identity_id values + the legacy actor_id values.
 *   3. Look up matching employees rows IN this org via either column, build
 *      a single hydration map, attach `actor` to each row.
 *
 * Result: rich actor display whether the row was written pre-Migration 109
 * (actor_id = employees.id) or after (actor_identity_id = identities.id).
 */
export async function GET(req: NextRequest) {
  try {
    const { ctx, error } = await requireRole(HR_ROLES)
    if (error) return error

    const { searchParams } = new URL(req.url)
    const limit    = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500)
    const offset   = parseInt(searchParams.get('offset') ?? '0')
    const action   = searchParams.get('action')
    const moduleP  = searchParams.get('module')
    const actorId  = searchParams.get('actor_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo   = searchParams.get('date_to')

    // 1. Pull audit rows. Try with the new columns first; on schema-cache or
    //    undefined-column errors, retry without them so the API works pre-
    //    Migration 109 too.
    const buildQuery = (withNewCols: boolean) => {
      const cols = withNewCols
        ? 'id, org_id, actor_id, actor_identity_id, actor_membership_id, action, module, entity_id, summary, meta, ip_address, user_agent, created_at'
        : 'id, org_id, actor_id, action, module, entity_id, summary, meta, ip_address, user_agent, created_at'

      let q = supabaseAdmin
        .from('audit_logs')
        .select(cols, { count: 'exact' })
        .eq('org_id', ctx.orgId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (action)   q = q.eq('action', action)
      if (moduleP)  q = q.eq('module', moduleP)
      if (actorId) {
        // Filter on either column — caller may pass an identity_id or an
        // employee.id. This is best-effort: if the new columns aren't there
        // yet we fall through to actor_id only.
        q = withNewCols ? q.or(`actor_id.eq.${actorId},actor_identity_id.eq.${actorId}`) : q.eq('actor_id', actorId)
      }
      if (dateFrom) q = q.gte('created_at', dateFrom)
      if (dateTo)   q = q.lte('created_at', `${dateTo}T23:59:59.999Z`)
      return q
    }

    let { data, error: dbErr, count } = await buildQuery(true)
    if (dbErr && (dbErr.code === '42703' || dbErr.code === 'PGRST204')) {
      console.warn('[audit-log GET] new columns absent, retrying with legacy schema:', dbErr.message)
      const retry = await buildQuery(false)
      data = retry.data; dbErr = retry.error; count = retry.count
    }

    if (dbErr) {
      console.error('[audit-log GET]', dbErr)
      if (dbErr.code === '42P01') return NextResponse.json({ data: [], count: 0 })
      throw dbErr
    }

    const rows = (data ?? []) as unknown as AuditRow[]

    // 2. Hydrate actor info from employees in this org. We collect every
    //    UUID we might want to look up (identity_id from new column, plus
    //    legacy actor_id which could be either an employee.id OR an
    //    identity.id depending on the row's age) and run a single bulk
    //    lookup against employees scoped to ctx.orgId.
    const lookupIds = new Set<string>()
    for (const r of rows) {
      if (r.actor_identity_id) lookupIds.add(r.actor_identity_id)
      if (r.actor_id)          lookupIds.add(r.actor_id)
    }

    if (lookupIds.size > 0) {
      const ids = Array.from(lookupIds)
      // employees.identity_id matches → covers post-Phase 2 rows.
      // employees.id matches            → covers pre-Phase 2 legacy rows.
      const { data: emps } = await supabaseAdmin
        .from('employees')
        .select('id, identity_id, first_name, last_name, emp_id, avatar_url')
        .eq('org_id', ctx.orgId)
        .or(`identity_id.in.(${ids.join(',')}),id.in.(${ids.join(',')})`) as {
          data: { id: string; identity_id: string | null; first_name: string; last_name: string; emp_id: string; avatar_url: string | null }[] | null
        }

      const byIdentity = new Map<string, NonNullable<AuditRow['actor']>>()
      const byEmpId    = new Map<string, NonNullable<AuditRow['actor']>>()
      for (const e of emps ?? []) {
        const actor = {
          id:          e.id,
          first_name:  e.first_name,
          last_name:   e.last_name,
          emp_id:      e.emp_id,
          avatar_url:  e.avatar_url,
        }
        if (e.identity_id) byIdentity.set(e.identity_id, actor)
        byEmpId.set(e.id, actor)
      }

      for (const r of rows) {
        // Prefer the identity-based lookup (canonical post-Migration 109);
        // fall back to legacy employee.id for older rows.
        const fromIdentity = r.actor_identity_id ? byIdentity.get(r.actor_identity_id) : null
        const fromActorId  = r.actor_id          ? (byIdentity.get(r.actor_id) ?? byEmpId.get(r.actor_id)) : null
        r.actor = fromIdentity ?? fromActorId ?? null
      }
    }

    return NextResponse.json({ data: rows, count: count ?? 0, limit, offset })
  } catch (err) {
    console.error('[audit-log GET catch]', errMsg(err))
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
