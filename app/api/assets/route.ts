import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const assigned_to = searchParams.get('assigned_to')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') ?? '50')
    const offset = parseInt(searchParams.get('offset') ?? '0')

    let query = supabaseAdmin
      .from('assets')
      .select(`
        id, asset_code, name, category, brand, model, serial_number,
        purchase_date, purchase_value, status, condition, location, notes,
        assigned_at, created_at, updated_at,
        assigned_employee:employees!assigned_to(
          id, first_name, last_name, work_email,
          department:departments(name)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    if (category) query = query.eq('category', category)
    if (status) query = query.eq('status', status)
    if (assigned_to) query = query.eq('assigned_to', assigned_to)
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,asset_code.ilike.%${search}%,brand.ilike.%${search}%,serial_number.ilike.%${search}%`
      )
    }

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({ data, count, limit, offset })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = (session.user as any)?.isAdmin
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden — HR Admin required' }, { status: 403 })

    const body = await req.json()
    const {
      name,
      category,
      brand,
      model,
      serial_number,
      purchase_date,
      purchase_value,
      condition,
      location,
      notes,
    } = body

    if (!name || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category' },
        { status: 400 }
      )
    }

    const validCategories = ['laptop', 'desktop', 'mobile', 'sim_card', 'vehicle', 'furniture', 'access_card', 'other']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `category must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      )
    }

    // Auto-generate asset_code: AST/YEAR/SEQ
    const year = new Date().getFullYear()
    const { count } = await supabaseAdmin
      .from('assets')
      .select('*', { count: 'exact', head: true })
    const seq = (count ?? 0) + 1
    const asset_code = `AST/${year}/${String(seq).padStart(4, '0')}`

    const { data, error } = await supabaseAdmin
      .from('assets')
      .insert({
        asset_code,
        name,
        category,
        brand: brand ?? null,
        model: model ?? null,
        serial_number: serial_number ?? null,
        purchase_date: purchase_date ?? null,
        purchase_value: purchase_value ?? null,
        condition: condition ?? null,
        location: location ?? null,
        notes: notes ?? null,
        status: 'available',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
