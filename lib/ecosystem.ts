import { supabaseAdmin } from './supabase-admin'

type EcosystemEvent = {
  org_id: string
  source_platform: 'ihrms' | 'icrm'
  event_type: string
  actor_id?: string
  entity_id?: string
  payload?: Record<string, unknown>
  triggered_by_automation?: boolean
}

// Fire-and-forget event emitter. Never throws; logs errors to console.
export function emitEvent(p: EcosystemEvent): void {
  supabaseAdmin.from('ecosystem_events').insert({
    org_id: p.org_id,
    source_platform: p.source_platform,
    event_type: p.event_type,
    actor_id: p.actor_id ?? null,
    entity_id: p.entity_id ?? null,
    payload: p.payload ?? {},
    triggered_by_automation: p.triggered_by_automation ?? false,
  }).then(({ error }) => {
    if (error) console.warn('[ecosystem.emit]', error.message)
  })
}
