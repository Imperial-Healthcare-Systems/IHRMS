import { supabaseAdmin } from '@/lib/supabase'

export async function getAssets(filters: {
  status?: string
  asset_type?: string
  assigned_to?: string
  search?: string
  limit?: number
  offset?: number
} = {}) {
  let query = supabaseAdmin
    .from('assets')
    .select(`
      *,
      assigned_employee:employees!assigned_to(
        id, first_name, last_name, emp_id,
        department:departments(name)
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.asset_type) query = query.eq('asset_type', filters.asset_type)
  if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to)
  if (filters.search) {
    query = query.or(
      `asset_name.ilike.%${filters.search}%,asset_code.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`
    )
  }
  if (filters.limit) query = query.limit(filters.limit)
  if (filters.offset && filters.limit) {
    query = query.range(filters.offset, filters.offset + filters.limit - 1)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}

export async function getAsset(id: string) {
  const { data, error } = await supabaseAdmin
    .from('assets')
    .select(`
      *,
      assigned_employee:employees!assigned_to(
        id, first_name, last_name, emp_id,
        department:departments(name),
        designation:designations(title)
      )
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getAssetsByEmployee(employee_id: string) {
  const { data, error } = await supabaseAdmin
    .from('assets')
    .select('*')
    .eq('assigned_to', employee_id)
    .eq('status', 'assigned')
  if (error) throw error
  return data ?? []
}

export async function createAsset(payload: Record<string, unknown>) {
  // Auto-generate asset code
  const year = new Date().getFullYear()
  const { count } = await supabaseAdmin
    .from('assets')
    .select('*', { count: 'exact', head: true })
  const seq = (count ?? 0) + 1
  const asset_code = `AST/${year}/${String(seq).padStart(4, '0')}`

  const { data, error } = await supabaseAdmin
    .from('assets')
    .insert({ ...payload, asset_code, status: 'available' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function assignAsset(id: string, employee_id: string, assigned_by?: string) {
  const { data, error } = await supabaseAdmin
    .from('assets')
    .update({
      assigned_to: employee_id,
      assigned_date: new Date().toISOString().split('T')[0],
      assigned_by: assigned_by ?? null,
      status: 'assigned',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function reclaimAsset(id: string, reclaim_note?: string) {
  const { data, error } = await supabaseAdmin
    .from('assets')
    .update({
      assigned_to: null,
      assigned_date: null,
      assigned_by: null,
      status: 'available',
      notes: reclaim_note ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAsset(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('assets')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getAssetStats() {
  const { data, error } = await supabaseAdmin
    .from('assets')
    .select('status, asset_type, purchase_value')
  if (error) throw error

  const rows = data ?? []
  const total_value = rows.reduce((s, r) => s + (r.purchase_value ?? 0), 0)
  return {
    total: rows.length,
    available: rows.filter(r => r.status === 'available').length,
    assigned: rows.filter(r => r.status === 'assigned').length,
    under_repair: rows.filter(r => r.status === 'under_repair').length,
    retired: rows.filter(r => r.status === 'retired').length,
    total_value,
    by_type: [...new Set(rows.map(r => r.asset_type))].map(t => ({
      type: t,
      count: rows.filter(r => r.asset_type === t).length,
    })),
  }
}
