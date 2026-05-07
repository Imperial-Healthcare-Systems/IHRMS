import { supabaseAdmin } from './supabase-admin'

type LookupColumn = 'work_email' | 'email'

type RawEmployee = {
  id: string
  emp_id: string
  first_name: string
  last_name: string
  role: string | null
  is_admin: boolean | null
  avatar_url: string | null
  department_id: string | null
  status: string | null
  work_email?: string | null
  email?: string | null
}

export type AuthenticatedEmployee = {
  id: string
  emp_id: string
  first_name: string
  last_name: string
  email: string
  role: string | null
  is_admin: boolean
  avatar_url: string | null
  department_id: string | null
}

function isMissingColumnError(message: string, column: LookupColumn) {
  const normalizedMessage = message.toLowerCase()
  return (
    normalizedMessage.includes(column) &&
    (
      normalizedMessage.includes('column') ||
      normalizedMessage.includes('schema cache') ||
      normalizedMessage.includes('does not exist')
    )
  )
}

async function lookupEmployeeByColumn(column: LookupColumn, email: string) {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select(`id, emp_id, first_name, last_name, ${column}, role, is_admin, avatar_url, department_id, status`)
    .eq(column, email)
    .maybeSingle<RawEmployee>()

  if (error) {
    if (isMissingColumnError(error.message, column)) {
      return null
    }

    throw new Error(error.message)
  }

  if (!data) {
    return null
  }

  if ((data.status ?? '').toLowerCase() !== 'active') {
    return null
  }

  const loginEmail = column === 'work_email' ? data.work_email : data.email

  if (!loginEmail) {
    return null
  }

  return {
    id: data.id,
    emp_id: data.emp_id,
    first_name: data.first_name,
    last_name: data.last_name,
    email: loginEmail,
    role: data.role,
    is_admin: Boolean(data.is_admin),
    avatar_url: data.avatar_url,
    department_id: data.department_id,
  } satisfies AuthenticatedEmployee
}

export async function findActiveEmployeeByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const lookupColumns: LookupColumn[] = ['work_email', 'email']
  let lastError: Error | null = null

  for (const column of lookupColumns) {
    try {
      const employee = await lookupEmployeeByColumn(column, normalizedEmail)

      if (employee) {
        return employee
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Employee lookup failed')
    }
  }

  if (lastError) {
    throw lastError
  }

  return null
}
