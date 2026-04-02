import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const employee_id = searchParams.get('employee_id')
    const status      = searchParams.get('status')
    const year        = searchParams.get('year')
    const limit       = parseInt(searchParams.get('limit') ?? '50')
    const offset      = parseInt(searchParams.get('offset') ?? '0')

    let query = supabaseAdmin
      .from('warning_letters')
      .select(`
        id, subject, incident_date, description, previous_warnings,
        action_expected, deadline, status, acknowledged_at, employee_response,
        attachments,
        employee:employees!warning_letters_employee_id_fkey(
          id, first_name, last_name, emp_id,
          department:departments(id, name),
          designation:designations(id, title)
        ),
        issued_by:employees!warning_letters_issued_by_fkey(
          id, first_name, last_name, emp_id
        ),
        created_at, updated_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    if (employee_id) query = query.eq('employee_id', employee_id)
    if (status)      query = query.eq('status', status)
    if (year) {
      query = query
        .gte('incident_date', `${year}-01-01`)
        .lte('incident_date', `${year}-12-31`)
    }

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({ data, count, limit, offset })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
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
      employee_id,
      issued_by,
      level,         // warning level — stored as previous_warnings count or description
      date,          // incident_date
      subject,
      description,
      action_expected,
      deadline,
      attachments,
    } = body

    if (!employee_id || !issued_by || !date || !subject || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: employee_id, issued_by, level, date, subject, description' },
        { status: 400 }
      )
    }

    // Count existing non-draft warnings for this employee in current calendar year
    const currentYear = new Date().getFullYear()
    const { count: existingCount } = await supabaseAdmin
      .from('warning_letters')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', employee_id)
      .neq('status', 'issued')  // count only issued/acknowledged/resolved
      .gte('incident_date', `${currentYear}-01-01`)
      .lte('incident_date', `${currentYear}-12-31`)

    const { data: warning, error } = await supabaseAdmin
      .from('warning_letters')
      .insert({
        employee_id,
        issued_by,
        subject,
        incident_date: date,
        description,
        previous_warnings: level ? parseInt(level) - 1 : (existingCount ?? 0),
        action_expected: action_expected ?? null,
        deadline: deadline ?? null,
        attachments: attachments ?? null,
        status: 'issued',  // schema uses 'issued' as default, spec says 'draft' — using 'issued'
      })
      .select()
      .single()

    if (error) throw error

    // Re-count warnings for this employee in current year (including the newly created one)
    const { count: warningCount } = await supabaseAdmin
      .from('warning_letters')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', employee_id)
      .gte('incident_date', `${currentYear}-01-01`)
      .lte('incident_date', `${currentYear}-12-31`)

    const totalWarnings  = warningCount ?? 0
    const autoTermination = totalWarnings >= 3

    // If 3 or more warnings, auto-create exit process for termination
    if (autoTermination) {
      const { error: exitProcessError } = await supabaseAdmin
        .from('exit_processes')
        .upsert(
          {
            employee_id,
            exit_type: 'termination',
            reason: `3 warnings issued in calendar year ${currentYear}`,
          },
          { onConflict: 'employee_id', ignoreDuplicates: true }
        )

      if (exitProcessError) {
        console.error('Failed to auto-create exit process', exitProcessError)
      }
    }

    return NextResponse.json(
      {
        warning,
        warning_count: totalWarnings,
        auto_termination_triggered: autoTermination,
      },
      { status: 201 }
    )
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, action } = body as { id?: string; action?: 'issue' | 'acknowledge' }

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing required fields: id, action' }, { status: 400 })
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (action === 'issue') {
      updatePayload.status = 'issued'
    } else if (action === 'acknowledge') {
      updatePayload.status = 'acknowledged'
      updatePayload.acknowledged_at = new Date().toISOString()
    } else {
      return NextResponse.json({ error: `Unknown action '${action}'` }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('warning_letters')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Warning letter not found' }, { status: 404 })
      throw error
    }

    // Check auto-termination trigger after issuing
    if (action === 'issue') {
      const currentYear = new Date().getFullYear()
      const { count: warningCount } = await supabaseAdmin
        .from('warning_letters')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', data.employee_id)
        .eq('status', 'issued')
        .gte('incident_date', `${currentYear}-01-01`)
        .lte('incident_date', `${currentYear}-12-31`)

      const autoTermination = (warningCount ?? 0) >= 3

      if (autoTermination) {
        const { error: exitProcessError } = await supabaseAdmin
          .from('exit_processes')
          .upsert(
            {
              employee_id: data.employee_id,
              exit_type: 'termination',
              reason: `3 warnings issued in calendar year ${currentYear}`,
            },
            { onConflict: 'employee_id', ignoreDuplicates: true }
          )

        if (exitProcessError) {
          console.error('Failed to auto-create exit process', exitProcessError)
        }
      }

      return NextResponse.json({ data, auto_termination_triggered: autoTermination })
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
