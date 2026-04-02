import { supabaseAdmin } from '@/lib/supabase'

export async function getJobRequisitions(filters: {
  status?: string
  department_id?: string
  priority?: string
  limit?: number
} = {}) {
  let query = supabaseAdmin
    .from('job_requisitions')
    .select(`
      *,
      department:departments(id, name),
      posted_by_employee:employees!posted_by(id, first_name, last_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.department_id) query = query.eq('department_id', filters.department_id)
  if (filters.priority) query = query.eq('priority', filters.priority)
  if (filters.limit) query = query.limit(filters.limit)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}

export async function createRequisition(payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('job_requisitions')
    .insert({ ...payload, status: 'open', filled: 0 })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRequisition(id: string, payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('job_requisitions')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getCandidates(filters: {
  requisition_id?: string
  stage?: string
  search?: string
  limit?: number
  offset?: number
} = {}) {
  let query = supabaseAdmin
    .from('candidates')
    .select(`
      *,
      requisition:job_requisitions(id, title, department_id,
        department:departments(name))
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.requisition_id) query = query.eq('requisition_id', filters.requisition_id)
  if (filters.stage) query = query.eq('stage', filters.stage)
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
  }
  if (filters.limit) query = query.limit(filters.limit)
  if (filters.offset) query = query.range(filters.offset, (filters.offset + (filters.limit ?? 20)) - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}

export async function createCandidate(payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('candidates')
    .insert({ ...payload, rejection_email_sent: false })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCandidateStage(id: string, stage: string, notes?: string) {
  const update: Record<string, unknown> = { stage, updated_at: new Date().toISOString() }
  if (notes) update.notes = notes
  if (stage === 'rejected') {
    update.rejection_reason = notes
  }
  const { data, error } = await supabaseAdmin
    .from('candidates')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function convertCandidateToEmployee(candidate_id: string) {
  const { data: candidate, error: candErr } = await supabaseAdmin
    .from('candidates')
    .select('*, requisition:job_requisitions(*)')
    .eq('id', candidate_id)
    .single()
  if (candErr) throw candErr

  // Return candidate data for pre-populating employee form
  return {
    first_name: candidate.name.split(' ')[0],
    last_name: candidate.name.split(' ').slice(1).join(' '),
    email: candidate.email,
    phone: candidate.phone,
    department_id: candidate.requisition?.department_id,
    employment_type: candidate.requisition?.employment_type ?? 'full_time',
    candidate_id: candidate.id,
    source_ctc: candidate.offer_amount,
  }
}

export async function getInterviews(filters: {
  candidate_id?: string
  status?: string
  date_from?: string
  date_to?: string
} = {}) {
  let query = supabaseAdmin
    .from('interview_schedules')
    .select(`
      *,
      candidate:candidates(id, name, email, stage,
        requisition:job_requisitions(title))
    `)
    .order('scheduled_at', { ascending: true })

  if (filters.candidate_id) query = query.eq('candidate_id', filters.candidate_id)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.date_from) query = query.gte('scheduled_at', filters.date_from)
  if (filters.date_to) query = query.lte('scheduled_at', filters.date_to)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function scheduleInterview(payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('interview_schedules')
    .insert({ ...payload, status: 'scheduled' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function submitInterviewFeedback(payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('interview_feedbacks')
    .upsert(payload)
    .select()
    .single()
  if (error) throw error

  // Update schedule status to completed
  if (payload.schedule_id) {
    await supabaseAdmin
      .from('interview_schedules')
      .update({ status: 'completed' })
      .eq('id', payload.schedule_id)
  }

  return data
}
