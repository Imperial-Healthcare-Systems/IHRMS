import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('assets')
      .select(`
        *,
        assigned_employee:employees!assigned_to(
          id, first_name, last_name, work_email, personal_phone,
          department:departments(id, name),
          designation:designations(id, title)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
      throw error
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = (session.user as any)?.isAdmin
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden — HR Admin required' }, { status: 403 })

    const body = await req.json()
    const { action, assigned_to, name, brand, model, serial_number, condition, location, notes, purchase_value } = body

    // Fetch the current asset
    const { data: asset, error: fetchError } = await supabaseAdmin
      .from('assets')
      .select('id, status, name')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
      throw fetchError
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Handle action-based updates
    if (action === 'assign') {
      if (!assigned_to) {
        return NextResponse.json({ error: 'assigned_to is required for assign action' }, { status: 400 })
      }
      if (asset.status !== 'available') {
        return NextResponse.json(
          { error: `Asset is not available for assignment (current status: ${asset.status})` },
          { status: 409 }
        )
      }
      updates.status = 'assigned'
      updates.assigned_to = assigned_to
      updates.assigned_at = new Date().toISOString()
    } else if (action === 'unassign') {
      updates.status = 'available'
      updates.assigned_to = null
      updates.assigned_at = null
    } else if (action === 'maintenance') {
      updates.status = 'under_repair'
    } else if (action === 'dispose') {
      updates.status = 'retired'
    } else {
      // General field updates (no action)
      if (name !== undefined) updates.name = name
      if (brand !== undefined) updates.brand = brand
      if (model !== undefined) updates.model = model
      if (serial_number !== undefined) updates.serial_number = serial_number
      if (condition !== undefined) updates.condition = condition
      if (location !== undefined) updates.location = location
      if (notes !== undefined) updates.notes = notes
      if (purchase_value !== undefined) updates.purchase_value = purchase_value
    }

    const { data, error } = await supabaseAdmin
      .from('assets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = (session.user as any)?.isAdmin
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden — HR Admin required' }, { status: 403 })

    // Fetch asset to check status
    const { data: asset, error: fetchError } = await supabaseAdmin
      .from('assets')
      .select('id, status, name')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
      throw fetchError
    }

    if (asset.status !== 'available') {
      return NextResponse.json(
        { error: `Only assets with status 'available' can be deleted (current status: ${asset.status})` },
        { status: 409 }
      )
    }

    const { error } = await supabaseAdmin.from('assets').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ message: `Asset '${asset.name}' deleted successfully` })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
