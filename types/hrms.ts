// ============================================================
// IHRMS-2 — Enterprise HRMS Type Definitions
// India-compliant HR Management System
// ============================================================

// ─── ENUMS & CONSTANTS ───────────────────────────────────────

export type EmployeeStatus = 'active' | 'inactive' | 'on_leave' | 'terminated' | 'probation' | 'notice_period'
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed'
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern' | 'consultant'
export type UserRole = 'super_admin' | 'hr_admin' | 'manager' | 'operations_head' | 'employee'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'cancelled'
export type LeaveType = 'CL' | 'SL' | 'EL' | 'LOP' | 'ML' | 'PL' | 'CompOff' | 'Bereavement' | 'Sabbatical'
export type PayrollStatus = 'draft' | 'processing' | 'approved' | 'paid' | 'cancelled'
export type RecruitmentStage = 'applied' | 'screening' | 'interview' | 'technical' | 'hr_round' | 'offer' | 'selected' | 'rejected' | 'on_hold'
export type PerformanceRating = 'exceptional' | 'exceeds_expectations' | 'meets_expectations' | 'needs_improvement' | 'unsatisfactory'
export type DocumentType = 'aadhaar' | 'pan' | 'passport' | 'driving_license' | 'voter_id' | 'offer_letter' | 'appointment_letter' | 'contract' | 'nda' | 'policy_acknowledgement' | 'educational_certificate' | 'experience_certificate' | 'payslip' | 'form16' | 'other'
export type ExitType = 'resignation' | 'termination' | 'retirement' | 'contract_end' | 'mutual_separation'
export type AssetStatus = 'assigned' | 'available' | 'under_maintenance' | 'disposed'
export type ExpenseCategory = 'travel' | 'accommodation' | 'food' | 'communication' | 'medical' | 'equipment' | 'training' | 'other'
export type WarningLevel = 'verbal' | 'written_1' | 'written_2' | 'final'
export type ShiftType = 'morning' | 'afternoon' | 'night' | 'general' | 'rotational' | 'flexible'
export type PunchMethod = 'biometric' | 'geo' | 'ip' | 'manual' | 'mobile'
export type TaxRegime = 'old' | 'new'

// ─── CORE ENTITIES ───────────────────────────────────────────

export interface Department {
  id: string
  name: string
  code: string
  head_id: string | null
  parent_id: string | null
  budget?: number
  location?: string
  created_at: string
}

export interface Designation {
  id: string
  title: string
  department_id: string
  level: number // 1=entry, 2=mid, 3=senior, 4=lead, 5=manager, 6=head
  grade: string // e.g., L1, L2, M1
  created_at: string
}

export interface Employee {
  id: string
  emp_id: string // e.g., EMP/2026/001
  first_name: string
  last_name: string
  email: string
  personal_email?: string
  phone: string
  emergency_contact?: string
  emergency_phone?: string
  date_of_birth?: string
  gender?: Gender
  blood_group?: BloodGroup
  marital_status?: MaritalStatus
  nationality?: string
  religion?: string
  avatar_url?: string

  // Job Details
  department_id: string
  designation_id: string
  reporting_manager_id?: string
  employment_type: EmploymentType
  status: EmployeeStatus
  role: UserRole
  hire_date: string
  confirmation_date?: string
  probation_end_date?: string
  last_working_date?: string
  work_location: string
  shift_id?: string

  // Compensation
  ctc_annual: number
  basic_salary: number
  hra: number
  special_allowance: number
  pf_contribution: number
  currency: string

  // Tax & Compliance (India-specific)
  pan_number?: string
  aadhaar_number?: string
  uan_number?: string // Universal Account Number for PF
  esic_number?: string
  tax_regime?: TaxRegime
  pf_applicable: boolean
  esic_applicable: boolean
  pt_applicable: boolean // Professional Tax

  // Address
  current_address?: string
  permanent_address?: string
  city?: string
  state?: string
  pincode?: string

  // Bank Details
  bank_name?: string
  bank_account_number?: string
  bank_ifsc?: string
  bank_branch?: string

  is_admin: boolean
  created_at: string
  updated_at?: string

  // Joined relations
  department?: Department
  designation?: Designation
  reporting_manager?: Employee
}

// ─── ATTENDANCE ───────────────────────────────────────────────

export interface Shift {
  id: string
  name: string
  type: ShiftType
  start_time: string // HH:MM
  end_time: string
  break_minutes: number
  weekly_hours: number
  working_days: string[] // ['Mon','Tue','Wed','Thu','Fri']
  grace_minutes: number
  overtime_after_hours: number
  created_at: string
}

export interface AttendanceLog {
  id: string
  employee_id: string
  date: string
  punch_in?: string
  punch_out?: string
  hours_worked?: number
  is_wfh: boolean
  is_half_day: boolean
  punch_method?: PunchMethod
  ip_address?: string
  geo_lat?: number
  geo_lng?: number
  geo_location?: string
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'holiday' | 'weekend'
  overtime_hours?: number
  notes?: string
  regularized: boolean
  created_at: string
  employee?: Employee
}

export interface AttendanceRegularization {
  id: string
  employee_id: string
  date: string
  reason: string
  requested_punch_in?: string
  requested_punch_out?: string
  status: ApprovalStatus
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  created_at: string
}

// ─── LEAVE MANAGEMENT ────────────────────────────────────────

export interface LeavePolicy {
  id: string
  leave_type: LeaveType
  name: string
  description?: string
  days_per_year: number
  carry_forward_max: number
  carry_forward_expiry_months: number
  accrual_type: 'monthly' | 'quarterly' | 'yearly' | 'upfront'
  accrual_value: number
  applicable_from_joining: boolean // from day 1?
  applicable_from_confirmation: boolean // from confirmation?
  encashable: boolean
  paid: boolean
  gender_specific?: Gender
  min_notice_days: number
  max_consecutive_days?: number
  created_at: string
}

export interface LeaveBalance {
  id: string
  employee_id: string
  leave_type: LeaveType
  year: number
  opening_balance: number
  accrued: number
  availed: number
  carry_forward: number
  encashed: number
  closing_balance: number
  updated_at: string
}

export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  days: number
  is_half_day: boolean
  half_day_session?: 'morning' | 'afternoon'
  reason: string
  status: ApprovalStatus
  level1_approver_id?: string
  level1_status?: ApprovalStatus
  level1_remarks?: string
  level1_actioned_at?: string
  level2_approver_id?: string
  level2_status?: ApprovalStatus
  level2_remarks?: string
  level2_actioned_at?: string
  escalated_at?: string
  escalation_reason?: string
  created_at: string
  updated_at?: string
  employee?: Employee
  level1_approver?: Employee
  level2_approver?: Employee
}

// ─── PAYROLL ─────────────────────────────────────────────────

export interface SalaryStructure {
  id: string
  employee_id: string
  effective_from: string
  ctc_annual: number
  // Earnings
  basic: number
  hra: number
  conveyance: number
  medical_allowance: number
  special_allowance: number
  lta: number // Leave Travel Allowance
  bonus: number
  // Deductions
  pf_employee: number // 12% of basic
  pf_employer: number
  esic_employee?: number // 0.75% of gross
  esic_employer?: number // 3.25% of gross
  professional_tax: number // state-based
  tds: number // TDS as per Income Tax Act 1961
  // Reimbursements
  fuel_reimbursement?: number
  phone_reimbursement?: number
  internet_reimbursement?: number
  created_at: string
}

export interface PayrollRun {
  id: string
  month: number
  year: number
  period_label: string // e.g., "March 2026"
  status: PayrollStatus
  total_employees: number
  total_gross: number
  total_deductions: number
  total_net: number
  total_pf: number
  total_esic: number
  total_pt: number
  total_tds: number
  run_by?: string
  approved_by?: string
  approved_at?: string
  paid_at?: string
  notes?: string
  created_at: string
}

export interface Payslip {
  id: string
  payroll_run_id: string
  employee_id: string
  month: number
  year: number
  // Attendance data
  working_days: number
  present_days: number
  lop_days: number // Loss of Pay
  // Earnings
  basic: number
  hra: number
  conveyance: number
  medical_allowance: number
  special_allowance: number
  lta_monthly: number
  performance_bonus: number
  overtime_pay: number
  arrears: number
  reimbursements: number
  gross_salary: number
  // Deductions
  pf_employee: number
  esic_employee: number
  professional_tax: number
  tds: number
  loan_emi: number
  advance_recovery: number
  other_deductions: number
  total_deductions: number
  // Net
  net_salary: number
  // Metadata
  pdf_url?: string
  emailed_at?: string
  created_at: string
  employee?: Employee
  payroll_run?: PayrollRun
}

// ─── RECRUITMENT ─────────────────────────────────────────────

export interface JobRequisition {
  id: string
  title: string
  department_id: string
  designation_id?: string
  location: string
  employment_type: EmploymentType
  openings: number
  filled: number
  min_experience_years: number
  max_experience_years?: number
  min_salary?: number
  max_salary?: number
  skills_required: string[]
  job_description?: string
  status: 'open' | 'on_hold' | 'closed' | 'filled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  posted_by: string
  target_date?: string
  created_at: string
  department?: Department
}

export interface Candidate {
  id: string
  requisition_id: string
  name: string
  email: string
  phone: string
  resume_url?: string
  current_company?: string
  current_designation?: string
  current_ctc?: number
  expected_ctc?: number
  notice_period_days?: number
  total_experience_years?: number
  skills: string[]
  stage: RecruitmentStage
  source: 'linkedin' | 'naukri' | 'indeed' | 'referral' | 'direct' | 'agency' | 'campus' | 'other'
  referral_by?: string
  rejection_reason?: string
  rejection_email_sent: boolean
  offer_letter_url?: string
  offer_amount?: number
  offer_date?: string
  offer_accepted?: boolean
  joining_date?: string
  converted_employee_id?: string
  notes?: string
  created_at: string
  updated_at?: string
  requisition?: JobRequisition
}

export interface InterviewSchedule {
  id: string
  candidate_id: string
  round_number: number
  round_type: 'screening' | 'technical' | 'hr' | 'managerial' | 'final'
  scheduled_at: string
  duration_minutes: number
  mode: 'in_person' | 'video' | 'phone'
  meeting_link?: string
  location?: string
  interviewers: string[] // employee ids
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  created_at: string
}

export interface InterviewFeedback {
  id: string
  schedule_id: string
  interviewer_id: string
  candidate_id: string
  technical_rating: number // 1-5
  communication_rating: number
  attitude_rating: number
  cultural_fit_rating: number
  overall_rating: number
  strengths?: string
  weaknesses?: string
  remarks: string
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no'
  created_at: string
}

// ─── PERFORMANCE & WARNINGS ──────────────────────────────────

export interface PerformanceReview {
  id: string
  employee_id: string
  reviewer_id: string
  period_start: string
  period_end: string
  review_type: 'annual' | 'mid_year' | 'quarterly' | 'probation'
  rating: PerformanceRating
  rating_score: number // 1-5
  kra_scores: Record<string, number> // Key Result Areas
  manager_comments: string
  employee_comments?: string
  goals_for_next_period?: string[]
  increment_percentage?: number
  promotion_recommended: boolean
  status: 'draft' | 'submitted' | 'acknowledged' | 'completed'
  created_at: string
}

export interface WarningLetter {
  id: string
  employee_id: string
  issued_by: string
  level: WarningLevel
  date: string
  subject: string
  description: string
  incident_date?: string
  employee_response?: string
  document_url?: string
  status: 'draft' | 'issued' | 'acknowledged'
  acknowledged_at?: string
  created_at: string
  employee?: Employee
}

export interface AppreciationNote {
  id: string
  employee_id: string
  given_by: string
  date: string
  category: 'excellence' | 'teamwork' | 'innovation' | 'customer' | 'leadership' | 'other'
  subject: string
  description: string
  is_public: boolean
  created_at: string
}

// ─── REIMBURSEMENTS ──────────────────────────────────────────

export interface ExpenseClaim {
  id: string
  employee_id: string
  claim_number: string
  month: number
  year: number
  category: ExpenseCategory
  description: string
  amount: number
  receipt_url?: string
  status: ApprovalStatus
  approved_by?: string
  approved_amount?: number
  rejection_reason?: string
  included_in_payroll: boolean
  payroll_run_id?: string
  created_at: string
  updated_at?: string
  employee?: Employee
}

// ─── EMPLOYEE LIFECYCLE ──────────────────────────────────────

export interface ProbationReview {
  id: string
  employee_id: string
  due_date: string
  reviewed_at?: string
  reviewed_by?: string
  outcome: 'pending' | 'confirmed' | 'extended' | 'terminated'
  extension_months?: number
  remarks?: string
  created_at: string
}

export interface ExitProcess {
  id: string
  employee_id: string
  exit_type: ExitType
  resignation_date?: string
  notice_period_days: number
  last_working_date: string
  reason: string
  exit_interview_done: boolean
  clearance_hr: boolean
  clearance_it: boolean
  clearance_finance: boolean
  clearance_manager: boolean
  clearance_admin: boolean
  fnf_amount?: number
  fnf_paid: boolean
  fnf_paid_date?: string
  noc_issued: boolean
  experience_letter_issued: boolean
  status: 'initiated' | 'in_progress' | 'clearance_done' | 'fnf_done' | 'completed'
  created_at: string
  employee?: Employee
}

// ─── DOCUMENTS ───────────────────────────────────────────────

export interface EmployeeDocument {
  id: string
  employee_id: string
  document_type: DocumentType
  name: string
  file_url: string
  file_size?: number
  uploaded_by: string
  verified: boolean
  verified_by?: string
  verified_at?: string
  expiry_date?: string
  notes?: string
  created_at: string
}

// ─── ASSETS ──────────────────────────────────────────────────

export interface Asset {
  id: string
  asset_code: string
  name: string
  category: 'laptop' | 'mobile' | 'monitor' | 'keyboard' | 'mouse' | 'headset' | 'vehicle' | 'sim_card' | 'other'
  brand?: string
  model?: string
  serial_number?: string
  purchase_date?: string
  purchase_value?: number
  assigned_to?: string
  assigned_date?: string
  status: AssetStatus
  condition: 'excellent' | 'good' | 'fair' | 'poor'
  notes?: string
  created_at: string
}

// ─── HOLIDAYS & CALENDAR ─────────────────────────────────────

export interface Holiday {
  id: string
  name: string
  date: string
  type: 'national' | 'regional' | 'optional' | 'restricted'
  applicable_states?: string[]
  created_at: string
}

// ─── ANNOUNCEMENTS ───────────────────────────────────────────

export interface Announcement {
  id: string
  title: string
  body: string
  type: 'general' | 'policy' | 'event' | 'urgent' | 'holiday'
  target_audience: 'all' | 'department' | 'location' | 'designation'
  target_ids?: string[]
  published_by: string
  published_at: string
  expires_at?: string
  created_at: string
}

// ─── DASHBOARD STATS ─────────────────────────────────────────

export interface HRDashboardStats {
  total_employees: number
  active_employees: number
  on_probation: number
  on_notice: number
  new_joiners_this_month: number
  exits_this_month: number
  present_today: number
  absent_today: number
  on_leave_today: number
  wfh_today: number
  pending_leaves: number
  pending_regularizations: number
  pending_expenses: number
  open_positions: number
  payroll_status: string
  compliance_alerts: number
}

export interface ManagerDashboardStats {
  team_size: number
  present_today: number
  on_leave_today: number
  pending_leave_approvals: number
  pending_regularizations: number
  upcoming_appraisals: number
  warnings_issued: number
  average_team_attendance_rate: number
}

// ─── INDIA COMPLIANCE ────────────────────────────────────────

export interface StatutoryCompliance {
  employee_id: string
  month: number
  year: number
  // EPF
  epf_wages: number
  epf_employee_contribution: number // 12%
  epf_employer_contribution: number // 12%
  eps_contribution: number // 8.33% (part of employer)
  edli_contribution: number // 0.5%
  // ESI
  esic_wages?: number
  esic_employee: number // 0.75%
  esic_employer: number // 3.25%
  // Professional Tax (state-wise slabs)
  professional_tax: number
  pt_state?: string
  // TDS
  tds_gross_income: number
  tds_exemptions: number
  tds_taxable_income: number
  tds_deducted: number
  tax_regime: TaxRegime
}

export type { }
