import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}
function isPgrstErr(m: string) {
  return m.includes('does not exist') || m.includes('PGRST') || m.includes('Could not find') || m.includes('ambiguous')
}

const ASSET_SELECT = `
  id, asset_code, name, category, brand, model, serial_number,
  purchase_date, purchase_value, status, condition, location, notes,
  assigned_to, assigned_at, created_at, updated_at,
  assigned_employee:employees!assigned_to(
    id, first_name, last_name, emp_id,
    department:departments!employees_department_id_fkey(name)
  )
`

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { data, error: dbErr } = await supabaseAdmin
      .from('assets')
      .select(ASSET_SELECT)
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    if (dbErr) {
      if (dbErr.code === 'PGRST116') return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
      const msg = errMsg(dbErr)
      if (isPgrstErr(msg)) {
        const { data: basic, error: e2 } = await supabaseAdmin
          .from('assets').select('*').eq('id', id).eq('org_id', ctx.orgId).single()
        if (e2) return NextResponse.json({ error: errMsg(e2) }, { status: 500 })
        return NextResponse.json({ data: basic })
      }
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireAuth()
    if (error) return error

    const body = await req.json() as Record<string, unknown>
    delete body.org_id

    const { action, assigned_to, name, brand, model, serial_number, condition, location, notes, purchase_value, purchase_date } = body

    const { data: asset, error: fetchError } = await supabaseAdmin
      .from('assets')
      .select('id, status, name')
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
      return NextResponse.json({ error: errMsg(fetchError) }, { status: 500 })
    }

    const updates: Record<string, unknown> = {}

    if (action === 'assign') {
      if (!assigned_to) return NextResponse.json({ error: 'assigned_to (employee ID) is required for assign action' }, { status: 400 })
      if (asset.status !== 'available') return NextResponse.json({ error: `Asset is not available for assignment (current status: ${asset.status})` }, { status: 409 })
      // Cross-tenant guard
      const { data: emp } = await supabaseAdmin
        .from('employees').select('id')
        .eq('id', assigned_to).eq('org_id', ctx.orgId).maybeSingle()
      if (!emp) return NextResponse.json({ error: 'Employee not found in your organisation' }, { status: 404 })

      updates.status      = 'assigned'
      updates.assigned_to = assigned_to
      updates.assigned_at = new Date().toISOString()

    } else if (action === 'unassign') {
      updates.status      = 'available'
      updates.assigned_to = null

    } else if (action === 'maintenance') {
      updates.status      = 'under_repair'
      updates.assigned_to = null

    } else if (action === 'restore') {
      updates.status = 'available'

    } else if (action === 'dispose') {
      updates.status      = 'disposed'
      updates.assigned_to = null

    } else {
      if (name          !== undefined) updates.name          = name
      if (brand         !== undefined) updates.brand         = brand
      if (model         !== undefined) updates.model         = model
      if (serial_number !== undefined) updates.serial_number = serial_number
      if (condition !== undefined) {
        const COND_MAP: Record<string, string> = { excellent: 'new', new: 'new', good: 'good', fair: 'fair', poor: 'poor' }
        updates.condition = COND_MAP[String(condition).toLowerCase()] ?? 'good'
      }
      if (location       !== undefined) updates.location       = location
      if (notes          !== undefined) updates.notes          = notes
      if (purchase_value !== undefined) updates.purchase_value = purchase_value
      if (purchase_date  !== undefined) updates.purchase_date  = purchase_date
    }

    function extractBadColumn(msg: string): string | null {
      return (
        msg.match(/Could not find the '(\w+)' column/)?.[1] ??
        msg.match(/column \w+\.(\w+) does not exist/)?.[1] ??
        msg.match(/column "(\w+)" does not exist/)?.[1] ??
        null
      )
    }

    if (!action) {
      const setCols = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      )
      if (Object.keys(setCols).length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
      }
      let editData: unknown = null
      let currentEdit = { ...setCols }
      for (let attempt = 0; attempt < 6; attempt++) {
        const { data: d, error: e } = await supabaseAdmin
          .from('assets').update(currentEdit).eq('id', id).eq('org_id', ctx.orgId).select().single()
        if (!e) { editData = d; break }
        const msg = errMsg(e)
        const badCol = extractBadColumn(msg)
        if (badCol && badCol in currentEdit) {
          console.warn(`[assets PATCH field] dropping stale column '${badCol}' and retrying`)
          delete currentEdit[badCol]
          continue
        }
        console.error('[assets PATCH field]', e)
        return NextResponse.json({ error: msg }, { status: 500 })
      }
      if (!editData) return NextResponse.json({ error: 'Asset not found or update failed' }, { status: 404 })
      return NextResponse.json({ data: editData })
    }

    let data: unknown = null
    let currentUpdates = { ...updates }

    for (let attempt = 0; attempt < 6; attempt++) {
      const { data: d, error: e } = await supabaseAdmin
        .from('assets').update(currentUpdates).eq('id', id).eq('org_id', ctx.orgId).select().single()

      if (!e) { data = d; break }

      const msg = errMsg(e)
      const badCol = extractBadColumn(msg)

      if (badCol && badCol in currentUpdates) {
        console.warn(`[assets PATCH] dropping stale-cache column '${badCol}' and retrying`)
        delete currentUpdates[badCol]
        continue
      }

      if (msg.includes('assets_status_check') && 'status' in currentUpdates) {
        const cur = currentUpdates.status as string
        const alt = cur === 'disposed' ? 'retired' : 'disposed'
        console.warn(`[assets PATCH] status check constraint rejected '${cur}', retrying with '${alt}'`)
        currentUpdates.status = alt
        continue
      }

      console.error('[assets PATCH] non-schema error:', msg)
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Update failed after multiple retries' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { ctx, error } = await requireAuth()
    if (error) return error

    const { data: asset, error: fetchError } = await supabaseAdmin
      .from('assets')
      .select('id, status, name')
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
      return NextResponse.json({ error: errMsg(fetchError) }, { status: 500 })
    }

    if (asset.status !== 'available') {
      return NextResponse.json({ error: `Only available assets can be deleted (current status: ${asset.status})` }, { status: 409 })
    }

    const { error: dbErr } = await supabaseAdmin
      .from('assets').delete().eq('id', id).eq('org_id', ctx.orgId)
    if (dbErr) return NextResponse.json({ error: errMsg(dbErr) }, { status: 500 })

    return NextResponse.json({ message: `Asset '${asset.name}' deleted successfully` })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
