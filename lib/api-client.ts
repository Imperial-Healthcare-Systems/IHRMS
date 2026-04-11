/**
 * HRMS API Client — typed fetch wrappers for all backend endpoints.
 * All functions throw on HTTP errors so callers can catch them.
 */

// ─── helpers ────────────────────────────────────────────────────────────────

async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`)
  return json as T
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

// ─── types ───────────────────────────────────────────────────────────────────

export interface DashboardStats {
  headcount: { total: number; active: number; probation: number; on_notice: number; on_leave: number; new_joiners_this_month: number }
  today: { date: string; present: number; absent: number; on_leave: number; wfh: number; attendance_rate: number }
  pending: { leaves: number; expenses: number; regularizations: number }
  payroll: { current_period: string | null; status: string | null; total_net: number | null }
  recruitment: { open_positions: number }
  compliance: { warnings_this_year: number }
  generated_at: string
}

export interface Employee {
  id: string; emp_id: string; first_name: string; last_name: string
  email: string; phone: string; status: string; employment_type: string
  hire_date: string; work_location: string; avatar_url: string | null
  role: string; is_admin: boolean; ctc_annual: number
  department: { id: string; name: string; code: string } | null
  designation: { id: string; title: string; grade: string } | null
  reporting_manager: { id: string; first_name: string; last_name: string; emp_id: string } | null
}

export interface Department { id: string; name: string; code: string }
export interface Designation { id: string; title: string; grade: string; department: { id: string; name: string } | null }

export interface AttendanceLog {
  id: string; employee_id: string; date: string; punch_in: string | null; punch_out: string | null
  hours_worked: number | null; status: string; is_wfh: boolean; is_half_day: boolean
  overtime_hours: number | null; regularized: boolean; notes: string | null
  employee: { id: string; first_name: string; last_name: string; emp_id: string; department: { name: string } | null } | null
}

export interface LeaveRequest {
  id: string; employee_id: string; leave_type: string
  from_date: string; to_date: string; total_days: number
  reason: string; status: string
  approved_by: string | null; approved_at: string | null; approver_remarks: string | null
  created_at: string; updated_at: string | null
  employee: { id: string; first_name: string; last_name: string; emp_id: string; department_id: string | null } | null
}

export interface LeaveBalance {
  id: string; employee_id: string; leave_type: string; year: number
  opening_balance: number; credited: number; used: number; closing_balance: number
}

export interface PayrollRun {
  id: string; month: number; year: number; status: string
  run_date?: string | null; payment_date?: string | null
  total_employees?: number | null; total_gross?: number | null
  total_deductions?: number | null; total_net?: number | null
  total_employer_pf?: number | null; total_employer_esic?: number | null
  remarks?: string | null; processed_by?: string | null; approved_by?: string | null
  created_at?: string; updated_at?: string | null
}

export interface Payslip {
  id: string; employee_id: string; payroll_run_id: string; month: number; year: number
  basic_salary: number; hra: number; special_allowance: number; gross_salary: number
  pf_employee: number; esic_employee: number; professional_tax: number; tds: number
  total_deductions: number; net_salary: number; payment_status: string
  employee: { id: string; first_name: string; last_name: string; emp_id: string; department: { name: string } | null } | null
}

export interface JobRequisition {
  id: string; title: string; department_id: string; designation_id: string | null
  vacancies: number; experience_min: number; experience_max: number | null
  employment_type: string; work_location: string; job_description: string | null
  skills_required: string[] | null; ctc_budget_min: number | null; ctc_budget_max: number | null
  status: string; priority: string; created_at: string
  department: { id: string; name: string } | null
}

export interface Candidate {
  id: string; requisition_id: string; name: string; email: string; phone: string | null
  resume_url: string | null; current_employer: string | null; current_ctc: number | null
  expected_ctc: number | null; experience_years: number | null; stage: string; status: string
  source: string | null; created_at: string
  requisition: { id: string; title: string; department: { name: string } | null } | null
}

export interface Interview {
  id: string; candidate_id: string; requisition_id: string; round_number: number; interview_type: string
  scheduled_at: string; duration_minutes: number; status: string; meeting_link: string | null
  venue: string | null; notes: string | null; created_at: string
  candidate: { id: string; name: string; email: string } | null
}

export interface PerformanceReview {
  id: string; employee_id: string; reviewer_id: string; review_period: string; review_type: string
  rating: string; goals_score: number | null; competency_score: number | null; overall_score: number | null
  strengths: string | null; areas_for_improvement: string | null; comments: string | null; status: string
  created_at: string
  employee: { id: string; first_name: string; last_name: string; emp_id: string; department: { name: string } | null } | null
  reviewer: { id: string; first_name: string; last_name: string } | null
}

export interface WarningLetter {
  id: string; employee_id: string; issued_by: string; warning_type: string; severity: string
  incident_date: string; issued_date: string; subject: string; description: string
  acknowledgement_required: boolean; acknowledged_at: string | null; status: string
  employee: { id: string; first_name: string; last_name: string; emp_id: string; department: { name: string } | null } | null
  issued_by_employee: { id: string; first_name: string; last_name: string } | null
}

export interface ExitProcess {
  id: string; employee_id: string; exit_type: string; resignation_date: string | null
  last_working_date: string | null; notice_period_days: number; reason: string | null
  fnf_status: string; clearance_status: string; status: string; created_at: string
  employee: { id: string; first_name: string; last_name: string; emp_id: string; department: { name: string } | null } | null
}

export interface ExpenseClaim {
  id: string; employee_id: string; title: string; category: string; amount: number
  expense_date: string; description: string | null; receipt_url: string | null
  status: string; approved_amount: number | null; created_at: string
  employee: { id: string; first_name: string; last_name: string; emp_id: string } | null
}

export interface Asset {
  id: string; name: string; asset_code: string; category: string; brand: string | null
  model: string | null; serial_number: string | null; purchase_date: string | null
  purchase_value: number | null; condition: string; status: string; assigned_to: string | null
  assigned_at: string | null; location: string | null; notes: string | null; created_at: string
  assigned_employee: {
    id: string; first_name: string; last_name: string; emp_id: string
    department: { name: string } | null
  } | null
}

export interface AssetActionPayload {
  action?: 'assign' | 'unassign' | 'maintenance' | 'restore' | 'dispose'
  assigned_to?: string    // employee UUID for action: assign
  name?: string; brand?: string; model?: string; serial_number?: string
  condition?: string; location?: string; notes?: string
  purchase_value?: number; purchase_date?: string
}

export interface Announcement {
  id: string; title: string
  // Live DB columns
  content?: string; announcement_type?: string; target_audience?: string
  published_by?: string; is_published?: boolean; published_at?: string
  // Added columns (our migrations)
  body?: string; audience?: string; priority?: string; is_pinned?: boolean
  expires_at?: string | null; created_at: string; updated_at: string
  created_by_employee?: { id: string; first_name: string; last_name: string } | null
}

export interface ComplianceRecord {
  id: string; employee_id: string; month: number; year: number
  epf_employee: number; epf_employer: number; esic_employee: number; esic_employer: number
  professional_tax: number; tds_amount: number; total_statutory: number; status: string
  employee: { id: string; first_name: string; last_name: string; emp_id: string; department: { name: string } | null } | null
}

// ─── dashboard ───────────────────────────────────────────────────────────────

export const dashboardApi = {
  stats: () => apiFetch<DashboardStats>('/api/dashboard/stats'),
}

// ─── employees ───────────────────────────────────────────────────────────────

export interface EmployeeListResponse { data: Employee[]; count: number }
export interface CreateEmployeePayload {
  first_name: string; last_name: string; email: string; phone?: string
  department_id: string; designation_id?: string; employment_type?: string
  hire_date: string; work_location?: string; ctc_annual?: number; basic_salary?: number
  hra?: number; special_allowance?: number; pf_applicable?: boolean; esic_applicable?: boolean
  pt_applicable?: boolean; pan_number?: string; aadhaar_number?: string; tax_regime?: string
  reporting_manager_id?: string; role?: string; gender?: string; date_of_birth?: string
}

export const employeesApi = {
  list: (params: { status?: string; department_id?: string; employment_type?: string; search?: string; limit?: number; offset?: number } = {}) =>
    apiFetch<EmployeeListResponse>(`/api/employees${qs(params)}`),

  get: (id: string) => apiFetch<{ data: Employee }>(`/api/employees/${id}`),

  create: (payload: CreateEmployeePayload) =>
    apiFetch<{ data: Employee }>('/api/employees', { method: 'POST', body: JSON.stringify(payload) }),

  update: (id: string, payload: Partial<CreateEmployeePayload>) =>
    apiFetch<{ data: Employee }>(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  departments: () => apiFetch<{ data: Department[] }>('/api/departments'),
}

// ─── attendance ──────────────────────────────────────────────────────────────

export interface AttendanceListResponse { data: AttendanceLog[]; count: number }

export const attendanceApi = {
  list: (params: { employee_id?: string; date?: string; date_from?: string; date_to?: string; status?: string; limit?: number } = {}) =>
    apiFetch<AttendanceListResponse>(`/api/attendance${qs(params)}`),

  punchIn: (payload?: { employee_id?: string; punch_method?: string; is_wfh?: boolean; notes?: string }) =>
    apiFetch<{ data: AttendanceLog; message: string }>('/api/attendance', {
      method: 'POST', body: JSON.stringify({ action: 'punch_in', ...payload }),
    }),

  punchOut: (payload?: { employee_id?: string; punch_method?: string; notes?: string }) =>
    apiFetch<{ data: AttendanceLog; message: string }>('/api/attendance', {
      method: 'POST', body: JSON.stringify({ action: 'punch_out', ...payload }),
    }),

  requestRegularization: (payload: { employee_id?: string; date: string; punch_in?: string; punch_out?: string; reason: string }) =>
    apiFetch<{ data: unknown }>('/api/attendance/regularization', { method: 'POST', body: JSON.stringify(payload) }),
}

// ─── leaves ──────────────────────────────────────────────────────────────────

export interface LeaveListResponse { data: LeaveRequest[]; count: number }

export const leavesApi = {
  list: (params: { employee_id?: string; status?: string; leave_type?: string; year?: string; manager_id?: string; limit?: number } = {}) =>
    apiFetch<LeaveListResponse>(`/api/leaves${qs(params)}`),

  get: (id: string) => apiFetch<{ data: LeaveRequest }>(`/api/leaves/${id}`),

  create: (payload: { leave_type: string; from_date: string; to_date: string; days?: number; reason: string; employee_id?: string }) =>
    apiFetch<{ data: LeaveRequest }>('/api/leaves', { method: 'POST', body: JSON.stringify(payload) }),

  approve: (id: string, payload: { action: 'approve' | 'reject' | 'cancel'; remarks?: string }) =>
    apiFetch<{ data: LeaveRequest }>(`/api/leaves/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  balance: (params: { employee_id?: string; year?: number } = {}) =>
    apiFetch<{ data: LeaveBalance[] }>(`/api/leaves/balance${qs(params)}`),
}

// ─── payroll ─────────────────────────────────────────────────────────────────

export const payrollApi = {
  list: (params: { year?: number; status?: string; limit?: number } = {}) =>
    apiFetch<{ data: PayrollRun[]; count: number }>(`/api/payroll${qs(params)}`),

  get: (id: string) => apiFetch<{ data: PayrollRun }>(`/api/payroll/${id}`),

  create: (payload: { month: number; year: number }) =>
    apiFetch<{ data: PayrollRun; period_label: string }>('/api/payroll', { method: 'POST', body: JSON.stringify(payload) }),

  payslips: (id: string, params: { employee_id?: string } = {}) =>
    apiFetch<{ data: Payslip[] }>(`/api/payroll/${id}/payslips${qs(params)}`),

  salaryStructures: (params: { employee_id?: string } = {}) =>
    apiFetch<{ data: unknown[] }>(`/api/payroll/salary-structures${qs(params)}`),

  createSalaryStructure: (payload: {
    employee_id: string
    effective_from: string
    effective_to?: string
    ctc_annual: number
    basic: number
    hra?: number
    conveyance?: number
    medical_allowance?: number
    special_allowance?: number
    lta?: number
    pf_employer?: number
    esic_employer?: number
    remarks?: string
  }) => apiFetch<{ data: unknown }>('/api/payroll/salary-structures', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  action: (id: string, payload: { action: string; notes?: string }) =>
    apiFetch<{ data: PayrollRun }>(`/api/payroll/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
}

// ─── recruitment ─────────────────────────────────────────────────────────────

export const recruitmentApi = {
  requisitions: {
    list: (params: { status?: string; department_id?: string; limit?: number } = {}) =>
      apiFetch<{ data: JobRequisition[]; count: number }>(`/api/recruitment/requisitions${qs(params)}`),

    get: (id: string) => apiFetch<{ data: JobRequisition }>(`/api/recruitment/requisitions/${id}`),

    create: (payload: Partial<JobRequisition>) =>
      apiFetch<{ data: JobRequisition }>('/api/recruitment/requisitions', { method: 'POST', body: JSON.stringify(payload) }),

    update: (id: string, payload: Partial<JobRequisition>) =>
      apiFetch<{ data: JobRequisition }>(`/api/recruitment/requisitions/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  },

  candidates: {
    list: (params: { requisition_id?: string; stage?: string; status?: string; limit?: number } = {}) =>
      apiFetch<{ data: Candidate[]; count: number }>(`/api/recruitment/candidates${qs(params)}`),

    get: (id: string) => apiFetch<{ data: Candidate }>(`/api/recruitment/candidates/${id}`),

    create: (payload: Partial<Candidate>) =>
      apiFetch<{ data: Candidate }>('/api/recruitment/candidates', { method: 'POST', body: JSON.stringify(payload) }),

    update: (id: string, payload: Partial<Candidate>) =>
      apiFetch<{ data: Candidate }>(`/api/recruitment/candidates/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  },

  interviews: {
    list: (params: { candidate_id?: string; requisition_id?: string; status?: string } = {}) =>
      apiFetch<{ data: Interview[] }>(`/api/recruitment/interviews${qs(params)}`),

    schedule: (payload: Partial<Interview>) =>
      apiFetch<{ data: Interview }>('/api/recruitment/interviews', { method: 'POST', body: JSON.stringify(payload) }),
  },

  feedback: {
    submit: (payload: { interview_id: string; rating: string; recommendation: string; notes?: string }) =>
      apiFetch<{ data: unknown }>('/api/recruitment/feedback', { method: 'POST', body: JSON.stringify(payload) }),
  },
}

// ─── performance ─────────────────────────────────────────────────────────────

export const performanceApi = {
  list: (params: { employee_id?: string; review_type?: string; year?: number; status?: string; limit?: number } = {}) =>
    apiFetch<{ data: PerformanceReview[]; count: number }>(`/api/performance/reviews${qs(params)}`),

  get: (id: string) => apiFetch<{ data: PerformanceReview }>(`/api/performance/reviews/${id}`),

  create: (payload: Partial<PerformanceReview>) =>
    apiFetch<{ data: PerformanceReview }>('/api/performance/reviews', { method: 'POST', body: JSON.stringify(payload) }),
}

// ─── warnings ────────────────────────────────────────────────────────────────

export const warningsApi = {
  list: (params: { employee_id?: string; severity?: string; status?: string; year?: number; limit?: number } = {}) =>
    apiFetch<{ data: WarningLetter[]; count: number }>(`/api/warnings${qs(params)}`),

  create: (payload: Partial<WarningLetter>) =>
    apiFetch<{ data: WarningLetter }>('/api/warnings', { method: 'POST', body: JSON.stringify(payload) }),
}

// ─── exit ─────────────────────────────────────────────────────────────────────

export const exitApi = {
  list: (params: { status?: string; exit_type?: string; limit?: number } = {}) =>
    apiFetch<{ data: ExitProcess[]; count: number }>(`/api/exit${qs(params)}`),

  get: (id: string) => apiFetch<{ data: ExitProcess }>(`/api/exit/${id}`),

  create: (payload: Partial<ExitProcess>) =>
    apiFetch<{ data: ExitProcess }>('/api/exit', { method: 'POST', body: JSON.stringify(payload) }),

  update: (id: string, payload: Partial<ExitProcess>) =>
    apiFetch<{ data: ExitProcess }>(`/api/exit/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
}

// ─── reimbursements ──────────────────────────────────────────────────────────

export const reimbursementsApi = {
  list: (params: { employee_id?: string; status?: string; category?: string; limit?: number } = {}) =>
    apiFetch<{ data: ExpenseClaim[]; count: number }>(`/api/reimbursements${qs(params)}`),

  create: (payload: Partial<ExpenseClaim>) =>
    apiFetch<{ data: ExpenseClaim }>('/api/reimbursements', { method: 'POST', body: JSON.stringify(payload) }),

  update: (id: string, payload: Partial<ExpenseClaim>) =>
    apiFetch<{ data: ExpenseClaim }>(`/api/reimbursements/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
}

// ─── assets ──────────────────────────────────────────────────────────────────

export const assetsApi = {
  list: (params: { status?: string; category?: string; search?: string; assigned_to?: string; limit?: number; offset?: number } = {}) =>
    apiFetch<{ data: Asset[]; count: number }>(`/api/assets${qs(params)}`),

  get: (id: string) =>
    apiFetch<{ data: Asset }>(`/api/assets/${id}`),

  create: (payload: {
    name: string; category: string; brand?: string | null; model?: string | null
    serial_number?: string | null; purchase_date?: string | null; purchase_value?: number | null
    condition?: string; location?: string | null; notes?: string | null
  }) =>
    apiFetch<{ data: Asset }>('/api/assets', { method: 'POST', body: JSON.stringify(payload) }),

  patch: (id: string, payload: AssetActionPayload) =>
    apiFetch<{ data: Asset }>(`/api/assets/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/api/assets/${id}`, { method: 'DELETE' }),
}

// ─── announcements ───────────────────────────────────────────────────────────

export interface AnnouncementPayload {
  title?: string; body?: string; content?: string; category?: string; type?: string
  target_audience?: string; audience?: string; is_pinned?: boolean
  priority?: string; is_urgent?: boolean; expires_at?: string | null
}

export const announcementsApi = {
  list: (params: { audience?: string; priority?: string; active_only?: boolean; limit?: number; offset?: number } = {}) =>
    apiFetch<{ data: Announcement[]; count: number }>(`/api/announcements${qs(params)}`),

  create: (payload: AnnouncementPayload) =>
    apiFetch<{ data: Announcement }>('/api/announcements', { method: 'POST', body: JSON.stringify(payload) }),

  patch: (id: string, payload: AnnouncementPayload) =>
    apiFetch<{ data: Announcement }>(`/api/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/api/announcements/${id}`, { method: 'DELETE' }),
}

// ─── compliance ───────────────────────────────────────────────────────────────

export interface ComplianceSummary {
  total_active: number
  esic_eligible: number
  compliant_count: number
  action_required: number
  due_this_month: number
  current_month: number
  current_year: number
  payslip_count: number
  totals: {
    epf_employee: number; epf_employer: number
    esic_employee: number; esic_employer: number
    pt: number; tds: number; gross: number
  }
}

export interface ComplianceAddPayload {
  compliance_type: string
  period_month?: number
  period_year?: number
  due_date?: string
  amount?: number
  status?: string
  remarks?: string
}

export const complianceApi = {
  summary: () => apiFetch<ComplianceSummary>('/api/compliance/summary'),
  epf:  (params: { year?: number; month?: number } = {}) => apiFetch<{ data: unknown[]; month: number; year: number; count: number }>(`/api/compliance/epf${qs(params)}`),
  esic: (params: { year?: number; month?: number } = {}) => apiFetch<{ data: unknown[]; month: number; year: number; count: number }>(`/api/compliance/esic${qs(params)}`),
  pt:   (params: { year?: number; month?: number } = {}) => apiFetch<{ data: unknown[]; summary: unknown; month: number; year: number }>(`/api/compliance/pt${qs(params)}`),
  tds:  (params: { fy?: string } = {}) => apiFetch<{ fy: string; quarters: unknown[]; total_tds: number; total_gross: number }>(`/api/compliance/tds${qs(params)}`),
  addRecord: (payload: ComplianceAddPayload) =>
    apiFetch<{ data: unknown }>('/api/compliance/records', { method: 'POST', body: JSON.stringify(payload) }),
  records: (params: { limit?: number } = {}) => apiFetch<{ data: unknown[]; count: number }>(`/api/compliance/records${qs(params)}`),
}

// ─── reports ─────────────────────────────────────────────────────────────────

export interface ReportResponse {
  report_type: string
  generated_at: string
  record_count: number
  format: string
  data: Record<string, unknown>[]
}

export interface AnalyticsResponse {
  headcount_trend:         { month: string; value: number }[]
  payroll_trend:           { month: string; value: number; label: string }[]
  department_distribution: { dept: string; count: number; pct: number; color: string }[]
  total_active:            number
}

export const reportsApi = {
  /** List available report types */
  list: () =>
    apiFetch<{ available_reports: unknown[]; formats: string[] }>('/api/reports'),

  /** Generate a report — POST */
  generate: (payload: {
    report_type: string
    date_from?:      string
    date_to?:        string
    department_ids?: string[]
    fields?:         string[]
    format?:         string
  }) =>
    apiFetch<ReportResponse>('/api/reports', {
      method: 'POST',
      body:   JSON.stringify(payload),
    }),

  /** Analytics summary (headcount trend, payroll trend, dept distribution) */
  analytics: () =>
    apiFetch<AnalyticsResponse>('/api/reports/analytics'),
}

// ─── onboarding ──────────────────────────────────────────────────────────────

export const onboardingApi = {
  list: (params: { employee_id?: string; status?: string } = {}) =>
    apiFetch<{ data: unknown[] }>(`/api/onboarding${qs(params)}`),

  update: (payload: { employee_id: string; task_id: string; status: string; notes?: string }) =>
    apiFetch<{ data: unknown }>('/api/onboarding', { method: 'POST', body: JSON.stringify(payload) }),
}
