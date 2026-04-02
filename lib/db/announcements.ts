import { supabaseAdmin } from '@/lib/supabase'

export async function getAnnouncements(filters: {
  is_published?: boolean
  audience?: string
  department_id?: string
  limit?: number
  offset?: number
} = {}) {
  let query = supabaseAdmin
    .from('announcements')
    .select(`
      *,
      created_by_employee:employees!created_by(id, first_name, last_name, emp_id,
        designation:designations(title))
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.is_published !== undefined) query = query.eq('is_published', filters.is_published)
  if (filters.audience) query = query.eq('audience', filters.audience)
  if (filters.department_id) query = query.eq('department_id', filters.department_id)
  if (filters.limit) query = query.limit(filters.limit)
  if (filters.offset && filters.limit) {
    query = query.range(filters.offset, filters.offset + filters.limit - 1)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}

export async function getAnnouncement(id: string) {
  const { data, error } = await supabaseAdmin
    .from('announcements')
    .select(`
      *,
      created_by_employee:employees!created_by(id, first_name, last_name,
        designation:designations(title))
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createAnnouncement(payload: {
  title: string
  content: string
  audience: string
  department_id?: string
  is_published?: boolean
  publish_date?: string
  expiry_date?: string
  priority?: string
  created_by: string
}) {
  const { data, error } = await supabaseAdmin
    .from('announcements')
    .insert({
      ...payload,
      is_published: payload.is_published ?? false,
      priority: payload.priority ?? 'normal',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAnnouncement(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('announcements')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function publishAnnouncement(id: string) {
  const { data, error } = await supabaseAdmin
    .from('announcements')
    .update({
      is_published: true,
      publish_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabaseAdmin
    .from('announcements')
    .delete()
    .eq('id', id)
  if (error) throw error
  return { success: true }
}

export async function getActiveAnnouncements(department_id?: string) {
  const today = new Date().toISOString().split('T')[0]

  let query = supabaseAdmin
    .from('announcements')
    .select(`
      id, title, content, audience, priority, publish_date, expiry_date,
      created_by_employee:employees!created_by(first_name, last_name)
    `)
    .eq('is_published', true)
    .lte('publish_date', today)
    .or(`expiry_date.is.null,expiry_date.gte.${today}`)
    .order('priority', { ascending: false })
    .order('publish_date', { ascending: false })

  if (department_id) {
    query = query.or(`audience.eq.all,department_id.eq.${department_id}`)
  } else {
    query = query.eq('audience', 'all')
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}
