import { supabaseAdmin } from './supabase'

export type AuditAction = 'created' | 'updated' | 'deleted' | 'approved' | 'rejected' | 'login' | 'logout'

export interface AuditEntry {
  org_id: string
  actor_id: string
  action: AuditAction
  module: string
  entity_id?: string
  summary: string
  meta?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
}

/** Fire-and-forget: writes to audit_logs table. Never throws. */
export function logAudit(entry: AuditEntry): void {
  supabaseAdmin.from('audit_logs').insert({
    org_id: entry.org_id,
    actor_id: entry.actor_id,
    action: entry.action,
    module: entry.module,
    entity_id: entry.entity_id ?? null,
    summary: entry.summary,
    meta: entry.meta ?? null,
    ip_address: entry.ip_address ?? null,
    user_agent: entry.user_agent ?? null,
    created_at: new Date().toISOString(),
  }).then(({ error }) => {
    if (error) console.warn('[audit.log]', error.message)
  })
}
