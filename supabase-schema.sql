-- ============================================================
-- IHRMS-2 — Indian Human Resource Management System
-- PostgreSQL / Supabase Schema
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────

CREATE TYPE employee_status       AS ENUM ('active', 'inactive', 'on_leave', 'probation', 'notice_period', 'terminated', 'resigned');
CREATE TYPE gender_type           AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE employment_type       AS ENUM ('full_time', 'part_time', 'contract', 'intern', 'consultant', 'temporary');
CREATE TYPE tax_regime_type       AS ENUM ('old', 'new');
CREATE TYPE marital_status_type   AS ENUM ('single', 'married', 'divorced', 'widowed');
CREATE TYPE blood_group_type      AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');

CREATE TYPE attendance_status     AS ENUM ('present', 'absent', 'half_day', 'late', 'on_leave', 'holiday', 'weekend', 'work_from_home', 'on_duty', 'comp_off');
CREATE TYPE punch_type            AS ENUM ('in', 'out', 'break_start', 'break_end');
CREATE TYPE regularization_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE leave_type            AS ENUM ('casual', 'earned', 'sick', 'maternity', 'paternity', 'bereavement', 'compensatory', 'unpaid', 'optional_holiday', 'work_from_home');
CREATE TYPE leave_request_status  AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'revoked');
CREATE TYPE leave_carry_forward   AS ENUM ('allowed', 'not_allowed', 'capped');

CREATE TYPE payroll_run_status    AS ENUM ('draft', 'processing', 'processed', 'approved', 'paid', 'cancelled');
CREATE TYPE salary_component_type AS ENUM ('earning', 'deduction', 'statutory');
CREATE TYPE calculation_type      AS ENUM ('fixed', 'percentage_of_basic', 'percentage_of_ctc', 'formula');

CREATE TYPE requisition_status    AS ENUM ('draft', 'open', 'on_hold', 'closed', 'cancelled');
CREATE TYPE candidate_status      AS ENUM ('applied', 'screening', 'shortlisted', 'interview', 'offer', 'hired', 'rejected', 'withdrawn');
CREATE TYPE interview_mode        AS ENUM ('in_person', 'video', 'phone', 'panel');
CREATE TYPE interview_result      AS ENUM ('selected', 'rejected', 'on_hold', 'no_show', 'cancelled');

CREATE TYPE review_status         AS ENUM ('draft', 'submitted', 'acknowledged', 'completed');
CREATE TYPE review_cycle          AS ENUM ('annual', 'half_yearly', 'quarterly', 'probation', 'pip');
CREATE TYPE rating_scale          AS ENUM ('1', '2', '3', '4', '5');

CREATE TYPE document_category     AS ENUM ('identity', 'address', 'education', 'experience', 'statutory', 'bank', 'other');
CREATE TYPE asset_status          AS ENUM ('available', 'assigned', 'under_repair', 'retired', 'lost');

CREATE TYPE warning_status        AS ENUM ('issued', 'acknowledged', 'disputed', 'resolved');
CREATE TYPE expense_status        AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'paid');
CREATE TYPE exit_status           AS ENUM ('initiated', 'in_progress', 'cleared', 'completed', 'cancelled');

CREATE TYPE compliance_type       AS ENUM ('pf', 'esic', 'pt', 'tds', 'lwf', 'gratuity', 'bonus');
CREATE TYPE compliance_status     AS ENUM ('pending', 'filed', 'paid', 'overdue');

CREATE TYPE announcement_audience AS ENUM ('all', 'department', 'location', 'designation');

-- ─────────────────────────────────────────────────────────────
-- HELPER: updated_at trigger function
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Macro to attach the trigger to any table
-- Usage: SELECT create_updated_at_trigger('table_name');
CREATE OR REPLACE FUNCTION create_updated_at_trigger(tbl TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER trg_%I_updated_at
     BEFORE UPDATE ON %I
     FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()',
    tbl, tbl
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- TABLE: departments
-- ─────────────────────────────────────────────────────────────
COMMENT ON SCHEMA public IS 'IHRMS-2 — Indian HRMS schema';

CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  code        TEXT NOT NULL UNIQUE,
  parent_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  head_id     UUID,                        -- FK to employees added after employees table
  cost_center TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE departments IS 'Organisational departments / cost centres';
CREATE INDEX idx_departments_parent ON departments(parent_id);
SELECT create_updated_at_trigger('departments');

-- ─────────────────────────────────────────────────────────────
-- TABLE: designations
-- ─────────────────────────────────────────────────────────────
CREATE TABLE designations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL UNIQUE,
  level       SMALLINT CHECK (level BETWEEN 1 AND 20),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE designations IS 'Job designations / grades';
SELECT create_updated_at_trigger('designations');

-- ─────────────────────────────────────────────────────────────
-- TABLE: shifts
-- ─────────────────────────────────────────────────────────────
CREATE TABLE shifts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL UNIQUE,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  grace_minutes   SMALLINT NOT NULL DEFAULT 10 CHECK (grace_minutes >= 0),
  half_day_hours  NUMERIC(4,2) NOT NULL DEFAULT 4.5,
  full_day_hours  NUMERIC(4,2) NOT NULL DEFAULT 9,
  is_night_shift  BOOLEAN NOT NULL DEFAULT FALSE,
  is_flexible     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE shifts IS 'Work shifts (day / night / flexible)';
SELECT create_updated_at_trigger('shifts');

-- ─────────────────────────────────────────────────────────────
-- TABLE: employees
-- ─────────────────────────────────────────────────────────────
CREATE TABLE employees (
  -- Core identity
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_code     TEXT NOT NULL UNIQUE,
  first_name        TEXT NOT NULL,
  middle_name       TEXT,
  last_name         TEXT NOT NULL,
  full_name         TEXT GENERATED ALWAYS AS (
                      TRIM(first_name || ' ' || COALESCE(middle_name || ' ', '') || last_name)
                    ) STORED,
  date_of_birth     DATE NOT NULL,
  gender            gender_type NOT NULL,
  marital_status    marital_status_type,
  blood_group       blood_group_type,
  nationality       TEXT NOT NULL DEFAULT 'Indian',
  religion          TEXT,
  category          TEXT CHECK (category IN ('general', 'obc', 'sc', 'st', 'ews')),

  -- Contact
  personal_email    TEXT,
  work_email        TEXT NOT NULL UNIQUE,
  personal_phone    TEXT NOT NULL,
  work_phone        TEXT,
  emergency_contact_name    TEXT,
  emergency_contact_phone   TEXT,
  emergency_contact_relation TEXT,

  -- Address
  current_address   TEXT,
  current_city      TEXT,
  current_state     TEXT,
  current_pincode   TEXT CHECK (current_pincode ~ '^[1-9][0-9]{5}$'),
  permanent_address TEXT,
  permanent_city    TEXT,
  permanent_state   TEXT,
  permanent_pincode TEXT CHECK (permanent_pincode ~ '^[1-9][0-9]{5}$'),

  -- Employment
  department_id     UUID NOT NULL REFERENCES departments(id),
  designation_id    UUID NOT NULL REFERENCES designations(id),
  manager_id        UUID REFERENCES employees(id) ON DELETE SET NULL,
  shift_id          UUID REFERENCES shifts(id) ON DELETE SET NULL,
  date_of_joining   DATE NOT NULL,
  date_of_confirmation DATE,
  probation_end_date DATE,
  employment_type   employment_type NOT NULL DEFAULT 'full_time',
  status            employee_status NOT NULL DEFAULT 'probation',
  work_location     TEXT,
  notice_period_days SMALLINT NOT NULL DEFAULT 30 CHECK (notice_period_days >= 0),

  -- Indian statutory identifiers
  pan_number        TEXT UNIQUE CHECK (pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  aadhaar_number    TEXT UNIQUE CHECK (LENGTH(aadhaar_number) = 12 AND aadhaar_number ~ '^[0-9]+$'),
  uan_number        TEXT UNIQUE CHECK (LENGTH(uan_number) = 12),
  esic_number       TEXT UNIQUE,
  pt_state          TEXT,   -- Professional Tax state jurisdiction

  -- Tax
  tax_regime        tax_regime_type NOT NULL DEFAULT 'new',

  -- Statutory flags
  pf_applicable     BOOLEAN NOT NULL DEFAULT TRUE,
  esic_applicable   BOOLEAN NOT NULL DEFAULT FALSE,
  pt_applicable     BOOLEAN NOT NULL DEFAULT TRUE,
  lwf_applicable    BOOLEAN NOT NULL DEFAULT TRUE,
  tds_applicable    BOOLEAN NOT NULL DEFAULT TRUE,

  -- PF details
  pf_account_number TEXT,
  vpf_percentage    NUMERIC(5,2) DEFAULT 0 CHECK (vpf_percentage >= 0 AND vpf_percentage <= 100),

  -- Bank details
  bank_name         TEXT,
  bank_account_number TEXT,
  bank_ifsc         TEXT CHECK (bank_ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
  bank_branch       TEXT,
  payment_mode      TEXT NOT NULL DEFAULT 'bank_transfer' CHECK (payment_mode IN ('bank_transfer', 'cash', 'cheque')),

  -- Profile
  avatar_url        TEXT,
  bio               TEXT,
  skills            TEXT[],
  linkedin_url      TEXT,

  -- Metadata
  created_by        UUID,
  updated_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE employees IS 'Core employee master — Indian HRMS with PAN, Aadhaar, UAN, ESIC fields';
COMMENT ON COLUMN employees.pan_number       IS 'Permanent Account Number (Income Tax)';
COMMENT ON COLUMN employees.aadhaar_number   IS 'Aadhaar UID — stored masked / encrypted in production';
COMMENT ON COLUMN employees.uan_number       IS 'Universal Account Number (EPFO)';
COMMENT ON COLUMN employees.esic_number      IS 'Employee State Insurance Corporation number';
COMMENT ON COLUMN employees.tax_regime       IS 'Old vs New Income Tax regime (Budget 2023+)';

-- Indexes
CREATE INDEX idx_employees_department    ON employees(department_id);
CREATE INDEX idx_employees_designation   ON employees(designation_id);
CREATE INDEX idx_employees_manager       ON employees(manager_id);
CREATE INDEX idx_employees_status        ON employees(status);
CREATE INDEX idx_employees_doj           ON employees(date_of_joining);
CREATE INDEX idx_employees_work_email    ON employees(work_email);
CREATE INDEX idx_employees_pan           ON employees(pan_number);
CREATE INDEX idx_employees_uan           ON employees(uan_number);

SELECT create_updated_at_trigger('employees');

-- Back-fill FK from departments.head_id
ALTER TABLE departments
  ADD CONSTRAINT fk_departments_head
  FOREIGN KEY (head_id) REFERENCES employees(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────
-- TABLE: holidays
-- ─────────────────────────────────────────────────────────────
CREATE TABLE holidays (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  date          DATE NOT NULL,
  type          TEXT NOT NULL DEFAULT 'national' CHECK (type IN ('national', 'state', 'optional', 'restricted', 'company')),
  applicable_states TEXT[],         -- NULL = all India
  description   TEXT,
  year          SMALLINT NOT NULL GENERATED ALWAYS AS (EXTRACT(YEAR FROM date)::SMALLINT) STORED,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, name)
);
COMMENT ON TABLE holidays IS 'Indian public, state and company holidays';
CREATE INDEX idx_holidays_date ON holidays(date);
CREATE INDEX idx_holidays_year ON holidays(year);
SELECT create_updated_at_trigger('holidays');

-- ─────────────────────────────────────────────────────────────
-- TABLE: attendance_logs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE attendance_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  log_date        DATE NOT NULL,
  punch_time      TIMESTAMPTZ NOT NULL,
  punch_type      punch_type NOT NULL,
  source          TEXT NOT NULL DEFAULT 'biometric' CHECK (source IN ('biometric', 'mobile', 'manual', 'web', 'rfid')),
  location        TEXT,
  latitude        NUMERIC(10, 7),
  longitude       NUMERIC(10, 7),
  device_id       TEXT,
  ip_address      INET,
  remarks         TEXT,
  is_regularized  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE attendance_logs IS 'Raw punch in/out logs from biometric / mobile / web sources';
CREATE INDEX idx_attendance_logs_employee    ON attendance_logs(employee_id);
CREATE INDEX idx_attendance_logs_date        ON attendance_logs(log_date);
CREATE INDEX idx_attendance_logs_emp_date    ON attendance_logs(employee_id, log_date);
CREATE INDEX idx_attendance_logs_punch_time  ON attendance_logs(punch_time);

-- Daily attendance summary (computed / cached)
CREATE TABLE attendance_daily (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  attendance_date     DATE NOT NULL,
  status              attendance_status NOT NULL DEFAULT 'absent',
  first_in            TIMESTAMPTZ,
  last_out            TIMESTAMPTZ,
  effective_hours     NUMERIC(5,2),
  overtime_hours      NUMERIC(5,2) DEFAULT 0,
  late_minutes        SMALLINT DEFAULT 0,
  early_exit_minutes  SMALLINT DEFAULT 0,
  shift_id            UUID REFERENCES shifts(id),
  remarks             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, attendance_date)
);
COMMENT ON TABLE attendance_daily IS 'Processed daily attendance summary per employee';
CREATE INDEX idx_attendance_daily_emp       ON attendance_daily(employee_id);
CREATE INDEX idx_attendance_daily_date      ON attendance_daily(attendance_date);
CREATE INDEX idx_attendance_daily_status    ON attendance_daily(status);
SELECT create_updated_at_trigger('attendance_daily');

-- ─────────────────────────────────────────────────────────────
-- TABLE: attendance_regularizations
-- ─────────────────────────────────────────────────────────────
CREATE TABLE attendance_regularizations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reg_date        DATE NOT NULL,
  requested_in    TIME NOT NULL,
  requested_out   TIME NOT NULL,
  reason          TEXT NOT NULL,
  status          regularization_status NOT NULL DEFAULT 'pending',
  approved_by     UUID REFERENCES employees(id),
  approved_at     TIMESTAMPTZ,
  rejection_note  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE attendance_regularizations IS 'Employee requests to correct attendance records';
CREATE INDEX idx_reg_employee ON attendance_regularizations(employee_id);
CREATE INDEX idx_reg_status   ON attendance_regularizations(status);
SELECT create_updated_at_trigger('attendance_regularizations');

-- ─────────────────────────────────────────────────────────────
-- TABLE: leave_policies
-- ─────────────────────────────────────────────────────────────
CREATE TABLE leave_policies (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                    TEXT NOT NULL,
  leave_type              leave_type NOT NULL,
  days_per_year           NUMERIC(5,2) NOT NULL CHECK (days_per_year >= 0),
  carry_forward           leave_carry_forward NOT NULL DEFAULT 'not_allowed',
  carry_forward_max_days  NUMERIC(5,2) DEFAULT 0,
  encashable              BOOLEAN NOT NULL DEFAULT FALSE,
  min_service_days        SMALLINT DEFAULT 0,
  applicable_gender       gender_type,           -- NULL = all genders
  employment_types        employment_type[],      -- NULL = all types
  accrual_frequency       TEXT DEFAULT 'yearly' CHECK (accrual_frequency IN ('monthly', 'quarterly', 'half_yearly', 'yearly')),
  sandwich_rule           BOOLEAN NOT NULL DEFAULT FALSE,
  include_weekends        BOOLEAN NOT NULL DEFAULT FALSE,
  include_holidays        BOOLEAN NOT NULL DEFAULT FALSE,
  max_consecutive_days    SMALLINT,
  min_notice_days         SMALLINT DEFAULT 0,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE leave_policies IS 'Leave types with entitlement rules (CL, EL, SL, Maternity etc.)';
SELECT create_updated_at_trigger('leave_policies');

-- ─────────────────────────────────────────────────────────────
-- TABLE: leave_balances
-- ─────────────────────────────────────────────────────────────
CREATE TABLE leave_balances (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  policy_id       UUID NOT NULL REFERENCES leave_policies(id),
  year            SMALLINT NOT NULL,
  opening_balance NUMERIC(5,2) NOT NULL DEFAULT 0,
  accrued         NUMERIC(5,2) NOT NULL DEFAULT 0,
  availed         NUMERIC(5,2) NOT NULL DEFAULT 0,
  pending         NUMERIC(5,2) NOT NULL DEFAULT 0,
  lapsed          NUMERIC(5,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(5,2) GENERATED ALWAYS AS (opening_balance + accrued - availed - lapsed) STORED,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, policy_id, year)
);
COMMENT ON TABLE leave_balances IS 'Year-wise leave balance per employee per leave type';
CREATE INDEX idx_leave_balances_emp  ON leave_balances(employee_id);
CREATE INDEX idx_leave_balances_year ON leave_balances(year);

-- ─────────────────────────────────────────────────────────────
-- TABLE: leave_requests
-- ─────────────────────────────────────────────────────────────
CREATE TABLE leave_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  policy_id       UUID NOT NULL REFERENCES leave_policies(id),
  from_date       DATE NOT NULL,
  to_date         DATE NOT NULL CHECK (to_date >= from_date),
  total_days      NUMERIC(5,2) NOT NULL,
  half_day        BOOLEAN NOT NULL DEFAULT FALSE,
  half_day_session TEXT CHECK (half_day_session IN ('first_half', 'second_half')),
  reason          TEXT NOT NULL,
  contact_during_leave TEXT,
  status          leave_request_status NOT NULL DEFAULT 'pending',
  approved_by     UUID REFERENCES employees(id),
  approved_at     TIMESTAMPTZ,
  rejection_note  TEXT,
  cancelled_at    TIMESTAMPTZ,
  attachments     TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE leave_requests IS 'Employee leave applications with approval workflow';
CREATE INDEX idx_leave_req_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_req_status   ON leave_requests(status);
CREATE INDEX idx_leave_req_dates    ON leave_requests(from_date, to_date);
SELECT create_updated_at_trigger('leave_requests');

-- ─────────────────────────────────────────────────────────────
-- TABLE: salary_structures
-- ─────────────────────────────────────────────────────────────
CREATE TABLE salary_structures (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id           UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  effective_from        DATE NOT NULL,
  effective_to          DATE,
  ctc_annual            NUMERIC(14,2) NOT NULL CHECK (ctc_annual > 0),
  ctc_monthly           NUMERIC(12,2) GENERATED ALWAYS AS (ctc_annual / 12) STORED,
  basic_monthly         NUMERIC(12,2) NOT NULL,
  hra_monthly           NUMERIC(12,2) NOT NULL DEFAULT 0,
  special_allowance     NUMERIC(12,2) NOT NULL DEFAULT 0,
  conveyance_allowance  NUMERIC(12,2) NOT NULL DEFAULT 0,
  medical_allowance     NUMERIC(12,2) NOT NULL DEFAULT 0,
  lta_monthly           NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_allowances      JSONB DEFAULT '{}',  -- { "name": amount }
  employer_pf           NUMERIC(12,2) NOT NULL DEFAULT 0,
  employer_esic         NUMERIC(12,2) NOT NULL DEFAULT 0,
  employer_gratuity     NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  approved_by           UUID REFERENCES employees(id),
  remarks               TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (effective_to IS NULL OR effective_to > effective_from)
);
COMMENT ON TABLE salary_structures IS 'CTC breakup with Indian salary components (Basic, HRA, PF, Gratuity)';
CREATE INDEX idx_salary_structures_employee ON salary_structures(employee_id);
CREATE INDEX idx_salary_structures_effective ON salary_structures(effective_from, effective_to);
SELECT create_updated_at_trigger('salary_structures');

-- ─────────────────────────────────────────────────────────────
-- TABLE: payroll_runs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE payroll_runs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month           SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year            SMALLINT NOT NULL CHECK (year >= 2020),
  run_date        DATE,
  payment_date    DATE,
  status          payroll_run_status NOT NULL DEFAULT 'draft',
  total_employees SMALLINT DEFAULT 0,
  total_gross     NUMERIC(14,2) DEFAULT 0,
  total_deductions NUMERIC(14,2) DEFAULT 0,
  total_net       NUMERIC(14,2) DEFAULT 0,
  total_employer_pf  NUMERIC(14,2) DEFAULT 0,
  total_employer_esic NUMERIC(14,2) DEFAULT 0,
  processed_by    UUID REFERENCES employees(id),
  approved_by     UUID REFERENCES employees(id),
  remarks         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(month, year)
);
COMMENT ON TABLE payroll_runs IS 'Monthly payroll processing batch';
SELECT create_updated_at_trigger('payroll_runs');

-- ─────────────────────────────────────────────────────────────
-- TABLE: payslips
-- ─────────────────────────────────────────────────────────────
CREATE TABLE payslips (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_run_id        UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id           UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month                 SMALLINT NOT NULL,
  year                  SMALLINT NOT NULL,

  -- Days
  working_days          SMALLINT NOT NULL,
  paid_days             NUMERIC(5,2) NOT NULL,
  lop_days              NUMERIC(5,2) NOT NULL DEFAULT 0,

  -- Earnings
  basic                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  hra                   NUMERIC(12,2) NOT NULL DEFAULT 0,
  special_allowance     NUMERIC(12,2) NOT NULL DEFAULT 0,
  conveyance            NUMERIC(12,2) NOT NULL DEFAULT 0,
  medical_allowance     NUMERIC(12,2) NOT NULL DEFAULT 0,
  lta                   NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime              NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_earnings        JSONB DEFAULT '{}',
  gross_earnings        NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Deductions
  employee_pf           NUMERIC(12,2) NOT NULL DEFAULT 0,
  employee_esic         NUMERIC(12,2) NOT NULL DEFAULT 0,
  professional_tax      NUMERIC(12,2) NOT NULL DEFAULT 0,
  tds                   NUMERIC(12,2) NOT NULL DEFAULT 0,
  lwf_employee          NUMERIC(12,2) NOT NULL DEFAULT 0,
  advance_recovery      NUMERIC(12,2) NOT NULL DEFAULT 0,
  loan_recovery         NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_deductions      JSONB DEFAULT '{}',
  total_deductions      NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Net
  net_pay               NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Employer contributions (for cost sheet)
  employer_pf           NUMERIC(12,2) NOT NULL DEFAULT 0,
  employer_esic         NUMERIC(12,2) NOT NULL DEFAULT 0,
  employer_gratuity     NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- YTD (Year to Date)
  ytd_gross             NUMERIC(14,2) DEFAULT 0,
  ytd_tds               NUMERIC(14,2) DEFAULT 0,
  ytd_pf                NUMERIC(14,2) DEFAULT 0,

  -- Metadata
  payment_status        TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'on_hold')),
  payment_date          DATE,
  payment_ref           TEXT,
  pdf_url               TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, month, year)
);
COMMENT ON TABLE payslips IS 'Monthly payslip with full Indian statutory deduction breakdown';
CREATE INDEX idx_payslips_employee   ON payslips(employee_id);
CREATE INDEX idx_payslips_run        ON payslips(payroll_run_id);
CREATE INDEX idx_payslips_month_year ON payslips(month, year);
SELECT create_updated_at_trigger('payslips');

-- ─────────────────────────────────────────────────────────────
-- TABLE: job_requisitions
-- ─────────────────────────────────────────────────────────────
CREATE TABLE job_requisitions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             TEXT NOT NULL,
  department_id     UUID NOT NULL REFERENCES departments(id),
  designation_id    UUID REFERENCES designations(id),
  employment_type   employment_type NOT NULL DEFAULT 'full_time',
  no_of_positions   SMALLINT NOT NULL DEFAULT 1 CHECK (no_of_positions > 0),
  filled_positions  SMALLINT NOT NULL DEFAULT 0,
  location          TEXT,
  min_experience_years NUMERIC(4,1) DEFAULT 0,
  max_experience_years NUMERIC(4,1),
  min_ctc           NUMERIC(12,2),
  max_ctc           NUMERIC(12,2),
  skills_required   TEXT[],
  job_description   TEXT,
  status            requisition_status NOT NULL DEFAULT 'draft',
  priority          TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  target_date       DATE,
  raised_by         UUID NOT NULL REFERENCES employees(id),
  approved_by       UUID REFERENCES employees(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE job_requisitions IS 'Internal hiring requests (JRF — Job Requisition Form)';
CREATE INDEX idx_jrq_department ON job_requisitions(department_id);
CREATE INDEX idx_jrq_status     ON job_requisitions(status);
SELECT create_updated_at_trigger('job_requisitions');

-- ─────────────────────────────────────────────────────────────
-- TABLE: candidates
-- ─────────────────────────────────────────────────────────────
CREATE TABLE candidates (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requisition_id    UUID REFERENCES job_requisitions(id) ON DELETE SET NULL,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  email             TEXT NOT NULL,
  phone             TEXT NOT NULL,
  current_ctc       NUMERIC(12,2),
  expected_ctc      NUMERIC(12,2),
  current_company   TEXT,
  current_designation TEXT,
  total_experience  NUMERIC(4,1),
  notice_period_days SMALLINT,
  skills            TEXT[],
  resume_url        TEXT,
  linkedin_url      TEXT,
  source            TEXT CHECK (source IN ('naukri', 'linkedin', 'internal', 'referral', 'campus', 'agency', 'direct', 'other')),
  referred_by       UUID REFERENCES employees(id),
  status            candidate_status NOT NULL DEFAULT 'applied',
  rejection_reason  TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE candidates IS 'Job applicants and their recruitment pipeline status';
CREATE INDEX idx_candidates_requisition ON candidates(requisition_id);
CREATE INDEX idx_candidates_status      ON candidates(status);
CREATE INDEX idx_candidates_email       ON candidates(email);
SELECT create_updated_at_trigger('candidates');

-- ─────────────────────────────────────────────────────────────
-- TABLE: interview_schedules
-- ─────────────────────────────────────────────────────────────
CREATE TABLE interview_schedules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  requisition_id  UUID REFERENCES job_requisitions(id),
  round_number    SMALLINT NOT NULL DEFAULT 1,
  round_name      TEXT,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_minutes SMALLINT DEFAULT 60,
  mode            interview_mode NOT NULL DEFAULT 'video',
  location        TEXT,
  meeting_link    TEXT,
  interviewers    UUID[] NOT NULL,  -- Array of employee IDs
  result          interview_result,
  remarks         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE interview_schedules IS 'Interview rounds scheduled for candidates';
CREATE INDEX idx_interview_candidate    ON interview_schedules(candidate_id);
CREATE INDEX idx_interview_scheduled_at ON interview_schedules(scheduled_at);
SELECT create_updated_at_trigger('interview_schedules');

-- ─────────────────────────────────────────────────────────────
-- TABLE: interview_feedbacks
-- ─────────────────────────────────────────────────────────────
CREATE TABLE interview_feedbacks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id     UUID NOT NULL REFERENCES interview_schedules(id) ON DELETE CASCADE,
  interviewer_id  UUID NOT NULL REFERENCES employees(id),
  technical_rating  SMALLINT CHECK (technical_rating BETWEEN 1 AND 5),
  communication_rating SMALLINT CHECK (communication_rating BETWEEN 1 AND 5),
  attitude_rating   SMALLINT CHECK (attitude_rating BETWEEN 1 AND 5),
  overall_rating    SMALLINT CHECK (overall_rating BETWEEN 1 AND 5),
  strengths         TEXT,
  weaknesses        TEXT,
  recommendation    TEXT NOT NULL CHECK (recommendation IN ('strongly_hire', 'hire', 'hold', 'no_hire', 'strong_no_hire')),
  comments          TEXT,
  submitted_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(schedule_id, interviewer_id)
);
COMMENT ON TABLE interview_feedbacks IS 'Structured interviewer feedback per interview round';
SELECT create_updated_at_trigger('interview_feedbacks');

-- ─────────────────────────────────────────────────────────────
-- TABLE: performance_reviews
-- ─────────────────────────────────────────────────────────────
CREATE TABLE performance_reviews (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id         UUID NOT NULL REFERENCES employees(id),
  cycle               review_cycle NOT NULL DEFAULT 'annual',
  review_period_from  DATE NOT NULL,
  review_period_to    DATE NOT NULL,
  self_rating         SMALLINT CHECK (self_rating BETWEEN 1 AND 5),
  manager_rating      SMALLINT CHECK (manager_rating BETWEEN 1 AND 5),
  final_rating        SMALLINT CHECK (final_rating BETWEEN 1 AND 5),
  kra_scores          JSONB DEFAULT '{}',  -- { "KRA name": { self: x, manager: y } }
  goals               JSONB DEFAULT '[]',
  strengths           TEXT,
  areas_of_improvement TEXT,
  training_needs      TEXT[],
  promotion_recommended BOOLEAN,
  increment_recommended NUMERIC(5,2),  -- Percentage
  status              review_status NOT NULL DEFAULT 'draft',
  employee_acknowledged_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE performance_reviews IS 'Annual / quarterly performance appraisals with KRA scoring';
CREATE INDEX idx_perf_employee ON performance_reviews(employee_id);
CREATE INDEX idx_perf_cycle    ON performance_reviews(cycle);
CREATE INDEX idx_perf_status   ON performance_reviews(status);
SELECT create_updated_at_trigger('performance_reviews');

-- ─────────────────────────────────────────────────────────────
-- TABLE: warning_letters
-- ─────────────────────────────────────────────────────────────
CREATE TABLE warning_letters (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  issued_by       UUID NOT NULL REFERENCES employees(id),
  subject         TEXT NOT NULL,
  incident_date   DATE NOT NULL,
  description     TEXT NOT NULL,
  previous_warnings SMALLINT DEFAULT 0,
  action_expected TEXT,
  deadline        DATE,
  status          warning_status NOT NULL DEFAULT 'issued',
  acknowledged_at TIMESTAMPTZ,
  employee_response TEXT,
  attachments     TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE warning_letters IS 'Disciplinary warning letters / show-cause notices';
CREATE INDEX idx_warning_employee ON warning_letters(employee_id);
SELECT create_updated_at_trigger('warning_letters');

-- ─────────────────────────────────────────────────────────────
-- TABLE: appreciation_notes
-- ─────────────────────────────────────────────────────────────
CREATE TABLE appreciation_notes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  given_by      UUID NOT NULL REFERENCES employees(id),
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  category      TEXT CHECK (category IN ('performance', 'teamwork', 'innovation', 'leadership', 'customer_focus', 'other')),
  is_public     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE appreciation_notes IS 'Peer and manager appreciation / recognition notes';
CREATE INDEX idx_appreciation_employee ON appreciation_notes(employee_id);

-- ─────────────────────────────────────────────────────────────
-- TABLE: expense_claims
-- ─────────────────────────────────────────────────────────────
CREATE TABLE expense_claims (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  claim_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  category        TEXT NOT NULL CHECK (category IN ('travel', 'accommodation', 'food', 'client_entertainment', 'communication', 'training', 'medical', 'other')),
  description     TEXT NOT NULL,
  amount          NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency        TEXT NOT NULL DEFAULT 'INR',
  receipt_urls    TEXT[],
  status          expense_status NOT NULL DEFAULT 'draft',
  approved_by     UUID REFERENCES employees(id),
  approved_at     TIMESTAMPTZ,
  rejection_note  TEXT,
  paid_at         DATE,
  payment_ref     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE expense_claims IS 'Employee expense reimbursement claims';
CREATE INDEX idx_expense_employee ON expense_claims(employee_id);
CREATE INDEX idx_expense_status   ON expense_claims(status);
SELECT create_updated_at_trigger('expense_claims');

-- ─────────────────────────────────────────────────────────────
-- TABLE: probation_reviews
-- ─────────────────────────────────────────────────────────────
CREATE TABLE probation_reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id     UUID NOT NULL REFERENCES employees(id),
  review_date     DATE NOT NULL,
  probation_end   DATE NOT NULL,
  attendance_rating   SMALLINT CHECK (attendance_rating BETWEEN 1 AND 5),
  performance_rating  SMALLINT CHECK (performance_rating BETWEEN 1 AND 5),
  behaviour_rating    SMALLINT CHECK (behaviour_rating BETWEEN 1 AND 5),
  overall_rating      SMALLINT CHECK (overall_rating BETWEEN 1 AND 5),
  outcome         TEXT NOT NULL CHECK (outcome IN ('confirmed', 'extended', 'terminated')),
  extension_days  SMALLINT,
  comments        TEXT,
  status          review_status NOT NULL DEFAULT 'draft',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE probation_reviews IS 'Probation period confirmation reviews';
CREATE INDEX idx_probation_employee ON probation_reviews(employee_id);
SELECT create_updated_at_trigger('probation_reviews');

-- ─────────────────────────────────────────────────────────────
-- TABLE: exit_processes
-- ─────────────────────────────────────────────────────────────
CREATE TABLE exit_processes (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id           UUID NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  resignation_date      DATE,
  last_working_day      DATE,
  exit_type             TEXT NOT NULL CHECK (exit_type IN ('resignation', 'termination', 'retirement', 'end_of_contract', 'absconding', 'death')),
  reason                TEXT,
  notice_period_days    SMALLINT,
  notice_period_waived  BOOLEAN DEFAULT FALSE,
  exit_interview_done   BOOLEAN DEFAULT FALSE,
  exit_interview_notes  TEXT,
  noc_issued            BOOLEAN DEFAULT FALSE,
  experience_letter     BOOLEAN DEFAULT FALSE,
  relieving_letter      BOOLEAN DEFAULT FALSE,
  fnf_settlement_date   DATE,           -- Full and Final Settlement
  fnf_amount            NUMERIC(14,2),
  gratuity_amount       NUMERIC(12,2),
  earned_leave_encashed NUMERIC(5,2),

  -- Clearance checklist (JSON: { department: status })
  clearance_checklist   JSONB DEFAULT '{}',

  status                exit_status NOT NULL DEFAULT 'initiated',
  initiated_by          UUID REFERENCES employees(id),
  hr_manager_id         UUID REFERENCES employees(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE exit_processes IS 'Full and Final settlement, resignation and exit workflow';
SELECT create_updated_at_trigger('exit_processes');

-- ─────────────────────────────────────────────────────────────
-- TABLE: employee_documents
-- ─────────────────────────────────────────────────────────────
CREATE TABLE employee_documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  category        document_category NOT NULL,
  document_name   TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  file_type       TEXT,
  file_size_kb    INTEGER,
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by     UUID REFERENCES employees(id),
  verified_at     TIMESTAMPTZ,
  expiry_date     DATE,
  remarks         TEXT,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE employee_documents IS 'KYC and onboarding documents (Aadhaar, PAN, degree, bank passbook etc.)';
CREATE INDEX idx_docs_employee  ON employee_documents(employee_id);
CREATE INDEX idx_docs_category  ON employee_documents(category);
SELECT create_updated_at_trigger('employee_documents');

-- ─────────────────────────────────────────────────────────────
-- TABLE: assets
-- ─────────────────────────────────────────────────────────────
CREATE TABLE assets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_code      TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL CHECK (category IN ('laptop', 'desktop', 'mobile', 'sim_card', 'vehicle', 'furniture', 'access_card', 'other')),
  brand           TEXT,
  model           TEXT,
  serial_number   TEXT UNIQUE,
  purchase_date   DATE,
  purchase_value  NUMERIC(12,2),
  assigned_to     UUID REFERENCES employees(id) ON DELETE SET NULL,
  assigned_at     TIMESTAMPTZ,
  status          asset_status NOT NULL DEFAULT 'available',
  condition       TEXT CHECK (condition IN ('new', 'good', 'fair', 'poor')),
  location        TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE assets IS 'Company asset inventory and employee allocation';
CREATE INDEX idx_assets_assigned_to ON assets(assigned_to);
CREATE INDEX idx_assets_status      ON assets(status);
SELECT create_updated_at_trigger('assets');

-- ─────────────────────────────────────────────────────────────
-- TABLE: announcements
-- ─────────────────────────────────────────────────────────────
CREATE TABLE announcements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  audience        announcement_audience NOT NULL DEFAULT 'all',
  department_ids  UUID[],          -- if audience = department
  priority        TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  publish_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
  attachments     TEXT[],
  created_by      UUID NOT NULL REFERENCES employees(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE announcements IS 'Company-wide or department notices and announcements';
CREATE INDEX idx_announcements_publish ON announcements(publish_at);
CREATE INDEX idx_announcements_audience ON announcements(audience);
SELECT create_updated_at_trigger('announcements');

-- ─────────────────────────────────────────────────────────────
-- TABLE: statutory_compliance
-- ─────────────────────────────────────────────────────────────
CREATE TABLE statutory_compliance (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  compliance_type compliance_type NOT NULL,
  period_month    SMALLINT CHECK (period_month BETWEEN 1 AND 12),
  period_year     SMALLINT NOT NULL,
  due_date        DATE NOT NULL,
  challan_number  TEXT,
  amount          NUMERIC(14,2),
  paid_amount     NUMERIC(14,2),
  payment_date    DATE,
  bank_ref        TEXT,
  status          compliance_status NOT NULL DEFAULT 'pending',
  form_number     TEXT,   -- e.g. ECR for PF, Form 16A for TDS
  return_filed    BOOLEAN DEFAULT FALSE,
  filed_at        DATE,
  acknowledgement_no TEXT,
  remarks         TEXT,
  managed_by      UUID REFERENCES employees(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE statutory_compliance IS 'PF, ESIC, PT, TDS, LWF filing tracker — Indian statutory returns';
CREATE INDEX idx_compliance_type   ON statutory_compliance(compliance_type);
CREATE INDEX idx_compliance_period ON statutory_compliance(period_year, period_month);
CREATE INDEX idx_compliance_status ON statutory_compliance(status);
SELECT create_updated_at_trigger('statutory_compliance');

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────

-- Enable RLS on sensitive tables
ALTER TABLE employees              ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips               ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_structures      ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_daily       ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_regularizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews    ENABLE ROW LEVEL SECURITY;
ALTER TABLE warning_letters        ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_claims         ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE probation_reviews      ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_processes         ENABLE ROW LEVEL SECURITY;

-- ── employees ── HR admins see all; employees see only themselves
CREATE POLICY "employees_hr_all"
  ON employees FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('hr_admin', 'super_admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('hr_admin', 'super_admin'));

CREATE POLICY "employees_self_read"
  ON employees FOR SELECT
  TO authenticated
  USING (id = (auth.uid())::UUID);

CREATE POLICY "employees_manager_team_read"
  ON employees FOR SELECT
  TO authenticated
  USING (manager_id = (auth.uid())::UUID);

-- ── payslips ── own payslips only (plus HR)
CREATE POLICY "payslips_hr_all"
  ON payslips FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('hr_admin', 'super_admin', 'payroll_admin'));

CREATE POLICY "payslips_self_read"
  ON payslips FOR SELECT
  TO authenticated
  USING (employee_id = (auth.uid())::UUID);

-- ── salary_structures ── confidential
CREATE POLICY "salary_hr_all"
  ON salary_structures FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('hr_admin', 'super_admin', 'payroll_admin'));

-- ── leave_requests ── own + manager + HR
CREATE POLICY "leave_req_hr_all"
  ON leave_requests FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('hr_admin', 'super_admin'));

CREATE POLICY "leave_req_self"
  ON leave_requests FOR ALL
  TO authenticated
  USING (employee_id = (auth.uid())::UUID);

CREATE POLICY "leave_req_manager_read"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE manager_id = (auth.uid())::UUID
    )
  );

-- ── attendance ── self + manager + HR
CREATE POLICY "attendance_hr_all"
  ON attendance_daily FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('hr_admin', 'super_admin'));

CREATE POLICY "attendance_self"
  ON attendance_daily FOR SELECT
  TO authenticated
  USING (employee_id = (auth.uid())::UUID);

-- ── expense_claims ── self + manager + HR
CREATE POLICY "expense_hr_all"
  ON expense_claims FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('hr_admin', 'super_admin', 'finance_admin'));

CREATE POLICY "expense_self"
  ON expense_claims FOR ALL
  TO authenticated
  USING (employee_id = (auth.uid())::UUID);

-- ── employee_documents ── own + HR
CREATE POLICY "docs_hr_all"
  ON employee_documents FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('hr_admin', 'super_admin'));

CREATE POLICY "docs_self"
  ON employee_documents FOR SELECT
  TO authenticated
  USING (employee_id = (auth.uid())::UUID);

-- ── performance_reviews ── self + reviewer + HR
CREATE POLICY "perf_hr_all"
  ON performance_reviews FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('hr_admin', 'super_admin'));

CREATE POLICY "perf_self"
  ON performance_reviews FOR SELECT
  TO authenticated
  USING (employee_id = (auth.uid())::UUID OR reviewer_id = (auth.uid())::UUID);

-- ── warning_letters ── HR + self read
CREATE POLICY "warning_hr_all"
  ON warning_letters FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('hr_admin', 'super_admin'));

CREATE POLICY "warning_self_read"
  ON warning_letters FOR SELECT
  TO authenticated
  USING (employee_id = (auth.uid())::UUID);

-- ─────────────────────────────────────────────────────────────
-- USEFUL VIEWS
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_employee_directory AS
SELECT
  e.id,
  e.employee_code,
  e.full_name,
  e.work_email,
  e.personal_phone,
  e.status,
  e.employment_type,
  e.date_of_joining,
  e.work_location,
  d.name  AS department,
  dg.title AS designation,
  CONCAT(m.first_name, ' ', m.last_name) AS reporting_manager,
  e.avatar_url
FROM employees e
LEFT JOIN departments  d  ON e.department_id  = d.id
LEFT JOIN designations dg ON e.designation_id = dg.id
LEFT JOIN employees    m  ON e.manager_id     = m.id;

COMMENT ON VIEW v_employee_directory IS 'Public employee directory (no PII / financial data)';

CREATE OR REPLACE VIEW v_headcount_by_department AS
SELECT
  d.name AS department,
  COUNT(e.id) FILTER (WHERE e.status = 'active')     AS active,
  COUNT(e.id) FILTER (WHERE e.status = 'probation')  AS probation,
  COUNT(e.id) FILTER (WHERE e.status = 'notice_period') AS notice_period,
  COUNT(e.id) AS total
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
GROUP BY d.name
ORDER BY active DESC;

CREATE OR REPLACE VIEW v_monthly_payroll_summary AS
SELECT
  pr.year,
  pr.month,
  pr.status,
  pr.total_employees,
  pr.total_gross,
  pr.total_deductions,
  pr.total_net,
  pr.total_employer_pf + pr.total_employer_esic AS total_employer_contributions
FROM payroll_runs pr
ORDER BY pr.year DESC, pr.month DESC;

-- ─────────────────────────────────────────────────────────────
-- SAMPLE SEED: Statutory compliance calendar skeleton
-- ─────────────────────────────────────────────────────────────
-- (Uncomment to seed)
/*
INSERT INTO statutory_compliance (compliance_type, period_month, period_year, due_date, status) VALUES
  ('pf',   4, 2025, '2025-05-15', 'pending'),
  ('esic',  4, 2025, '2025-05-15', 'pending'),
  ('pt',    4, 2025, '2025-05-30', 'pending'),
  ('tds',   4, 2025, '2025-05-07', 'pending');
*/
