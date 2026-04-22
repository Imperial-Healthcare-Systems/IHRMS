import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return String(e.message ?? e.details ?? e.hint ?? JSON.stringify(err))
  }
  return String(err)
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { course_id, employee_id } = body

    if (!course_id) return NextResponse.json({ error: 'course_id is required' }, { status: 400 })

    const enrolleeId = employee_id ?? (session.user as any)?.id as string

    const { data, error } = await supabaseAdmin
      .from('training_enrollments')
      .upsert(
        { programme_id: course_id, employee_id: enrolleeId, status: 'enrolled' },
        { onConflict: 'programme_id,employee_id' }
      )
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const course_id = searchParams.get('course_id')
    const employee_id = searchParams.get('employee_id')

    if (!course_id) return NextResponse.json({ error: 'course_id is required' }, { status: 400 })

    const enrolleeId = employee_id ?? (session.user as any)?.id as string

    const { error } = await supabaseAdmin
      .from('training_enrollments')
      .delete()
      .eq('programme_id', course_id)
      .eq('employee_id', enrolleeId)

    if (error) throw error
    return NextResponse.json({ message: 'Enrollment removed' })
  } catch (err) {
    return NextResponse.json({ error: errMsg(err) }, { status: 500 })
  }
}
