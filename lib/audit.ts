import { supabaseAdmin } from './supabase-admin'

export type AuditAction = 'created' | 'updated' | 'deleted' | 'approved' | 'rejected' | 'login' | 'logout'

/**
 * Audit log entry per IMPERIAL_TENANT_SPEC v1.0 §4.
 *
 * `actor_identity_id` and `actor_membership_id` are the canonical actor
 * fields — identity is stable across orgs, membership pins the role at
 * the time of the action. The legacy `actor_id` column is kept populated
 * (mirrors `actor_identity_id`) so existing dashboards and joins keep
 * working through the migration.
 */
export interface AuditEntry {
  org_id: string
  /** identities.id of the actor — required. */
  actor_identity_id: string
  /** memberships.id at the time of the action — optional (signup creates the membership inline). */
  actor_membership_id?: string | null
  action: AuditAction
  module: string
  entity_id?: string
  summary: string
  meta?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
}

/**
 * Fire-and-forget: writes to audit_logs. Never throws.
 *
 * If the audit_logs table doesn't yet have the actor_identity_id /
 * actor_membership_id columns (Phase 8.1 migration not applied), the
 * insert returns Postgres error 42703; we strip the new columns and
 * retry with the legacy schema. That makes the deploy safe to ship in
 * either order — code first, migration later, or vice versa.
 */
export function logAudit(entry: AuditEntry): void {
  const fullRow = {
    org_id: entry.org_id,
    actor_id: entry.actor_identity_id,           // legacy mirror
    actor_identity_id: entry.actor_identity_id,
    actor_membership_id: entry.actor_membership_id ?? null,
    action: entry.action,
    module: entry.module,
    entity_id: entry.entity_id ?? null,
    summary: entry.summary,
    meta: entry.meta ?? null,
    ip_address: entry.ip_address ?? null,
    user_agent: entry.user_agent ?? null,
    created_at: new Date().toISOString(),
  }

  supabaseAdmin.from('audit_logs').insert(fullRow).then(({ error }) => {
    if (!error) return
    if (error.code === '42703') {
      // New columns not yet present — fall back to legacy shape.
      const legacyRow = {
        org_id: fullRow.org_id,
        actor_id: fullRow.actor_id,
        action: fullRow.action,
        module: fullRow.module,
        entity_id: fullRow.entity_id,
        summary: fullRow.summary,
        meta: fullRow.meta,
        ip_address: fullRow.ip_address,
        user_agent: fullRow.user_agent,
        created_at: fullRow.created_at,
      }
      supabaseAdmin.from('audit_logs').insert(legacyRow).then(({ error: e2 }) => {
        if (e2) console.error('[audit.log fallback] INSERT FAILED:', e2.message, {
          org_id: legacyRow.org_id, action: legacyRow.action, module: legacyRow.module,
          entity_id: legacyRow.entity_id,
        })
      })
      return
    }
    console.error('[audit.log] INSERT FAILED:', error.message, {
      org_id: fullRow.org_id, action: fullRow.action, module: fullRow.module,
      entity_id: fullRow.entity_id,
    })
  })
}
