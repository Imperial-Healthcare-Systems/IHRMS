'use client'


import { useState, useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  Users,
  UserPlus,
  Search,
  Download,
  Upload,
  Eye,
  Edit,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  FileText,
  LogOut,
  Filter,
  X,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type EmployeeStatus = 'Active' | 'Probation' | 'On Leave' | 'Notice Period' | 'Inactive'
type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Intern'

interface Employee {
  id: string
  empId: string
  name: string
  email: string
  phone: string
  department: string
  designation: string
  location: string
  employmentType: EmploymentType
  status: EmployeeStatus
  hireDate: string
}

/* ─────────────────────────────────────────────────────────────
   MOCK DATA — 15 employees
───────────────────────────────────────────────────────────── */
const EMPLOYEES: Employee[] = [
  {
    id: '1',  empId: 'EMP/2024/001', name: 'Rajesh Kumar',      email: 'rajesh.kumar@company.in',      phone: '+91 98765 43210', department: 'Engineering',        designation: 'Senior Software Engineer',  location: 'Bengaluru',   employmentType: 'Full-time', status: 'Active',        hireDate: '12 Jan 2024',
  },
  {
    id: '2',  empId: 'EMP/2024/002', name: 'Priya Sharma',      email: 'priya.sharma@company.in',      phone: '+91 98765 43211', department: 'Human Resources',    designation: 'HR Manager',                location: 'Mumbai',      employmentType: 'Full-time', status: 'Active',        hireDate: '15 Jan 2024',
  },
  {
    id: '3',  empId: 'EMP/2024/003', name: 'Amit Patel',        email: 'amit.patel@company.in',        phone: '+91 98765 43212', department: 'Finance',            designation: 'Finance Manager',           location: 'Ahmedabad',   employmentType: 'Full-time', status: 'Active',        hireDate: '22 Jan 2024',
  },
  {
    id: '4',  empId: 'EMP/2024/004', name: 'Sneha Gupta',       email: 'sneha.gupta@company.in',       phone: '+91 98765 43213', department: 'Sales',              designation: 'Sales Executive',           location: 'Delhi',       employmentType: 'Full-time', status: 'On Leave',      hireDate: '5 Feb 2024',
  },
  {
    id: '5',  empId: 'EMP/2024/005', name: 'Rahul Mehta',       email: 'rahul.mehta@company.in',       phone: '+91 98765 43214', department: 'Operations',         designation: 'Operations Lead',           location: 'Pune',        employmentType: 'Full-time', status: 'Active',        hireDate: '10 Feb 2024',
  },
  {
    id: '6',  empId: 'EMP/2024/006', name: 'Deepika Nair',      email: 'deepika.nair@company.in',      phone: '+91 98765 43215', department: 'Marketing',          designation: 'Marketing Manager',         location: 'Chennai',     employmentType: 'Full-time', status: 'Active',        hireDate: '18 Feb 2024',
  },
  {
    id: '7',  empId: 'EMP/2024/007', name: 'Vikram Singh',      email: 'vikram.singh@company.in',      phone: '+91 98765 43216', department: 'Engineering',        designation: 'DevOps Engineer',           location: 'Hyderabad',   employmentType: 'Full-time', status: 'Active',        hireDate: '1 Mar 2024',
  },
  {
    id: '8',  empId: 'EMP/2024/008', name: 'Kavitha Reddy',     email: 'kavitha.reddy@company.in',     phone: '+91 98765 43217', department: 'Customer Support',   designation: 'Support Lead',              location: 'Bengaluru',   employmentType: 'Full-time', status: 'Active',        hireDate: '5 Mar 2024',
  },
  {
    id: '9',  empId: 'EMP/2024/009', name: 'Suresh Babu',       email: 'suresh.babu@company.in',       phone: '+91 98765 43218', department: 'Sales',              designation: 'Sales Manager',             location: 'Mumbai',      employmentType: 'Full-time', status: 'Notice Period', hireDate: '12 Mar 2024',
  },
  {
    id: '10', empId: 'EMP/2024/010', name: 'Pooja Agarwal',     email: 'pooja.agarwal@company.in',     phone: '+91 98765 43219', department: 'Finance',            designation: 'Senior Accountant',         location: 'Delhi',       employmentType: 'Full-time', status: 'Active',        hireDate: '20 Mar 2024',
  },
  {
    id: '11', empId: 'EMP/2024/011', name: 'Kiran Rao',         email: 'kiran.rao@company.in',         phone: '+91 98765 43220', department: 'Engineering',        designation: 'Product Manager',           location: 'Bengaluru',   employmentType: 'Full-time', status: 'Active',        hireDate: '2 Apr 2024',
  },
  {
    id: '12', empId: 'EMP/2024/012', name: 'Ananya Krishnan',   email: 'ananya.krishnan@company.in',   phone: '+91 98765 43221', department: 'Human Resources',    designation: 'HR Executive',              location: 'Chennai',     employmentType: 'Full-time', status: 'Probation',     hireDate: '15 Sep 2025',
  },
  {
    id: '13', empId: 'EMP/2025/013', name: 'Mohammed Farouk',   email: 'mohammed.farouk@company.in',   phone: '+91 98765 43222', department: 'Engineering',        designation: 'Software Engineer',         location: 'Hyderabad',   employmentType: 'Full-time', status: 'Probation',     hireDate: '1 Oct 2025',
  },
  {
    id: '14', empId: 'EMP/2025/014', name: 'Ritu Verma',        email: 'ritu.verma@company.in',        phone: '+91 98765 43223', department: 'Marketing',          designation: 'Content Strategist',        location: 'Delhi',       employmentType: 'Contract',  status: 'Active',        hireDate: '15 Nov 2025',
  },
  {
    id: '15', empId: 'EMP/2026/015', name: 'Arjun Krishnan',    email: 'arjun.krishnan@company.in',    phone: '+91 98765 43224', department: 'Engineering',        designation: 'SDE-II',                    location: 'Bengaluru',   employmentType: 'Full-time', status: 'Probation',     hireDate: '28 Mar 2026',
  },
]

const DEPARTMENTS = ['All Departments', 'Engineering', 'Human Resources', 'Sales', 'Finance', 'Operations', 'Marketing', 'Customer Support']
const STATUSES: ['All Status', ...EmployeeStatus[]] = ['All Status', 'Active', 'Probation', 'On Leave', 'Notice Period', 'Inactive']
const EMP_TYPES: ['All Types', ...EmploymentType[]] = ['All Types', 'Full-time', 'Part-time', 'Contract', 'Intern']

/* ─────────────────────────────────────────────────────────────
   STATUS CONFIG
───────────────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<EmployeeStatus, { bg: string; color: string; border: string }> = {
  'Active':        { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  'Probation':     { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  'On Leave':      { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Notice Period': { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  'Inactive':      { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
}

const EMP_TYPE_CONFIG: Record<EmploymentType, { bg: string; color: string; border: string }> = {
  'Full-time': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Part-time': { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  'Contract':  { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  'Intern':    { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
}

/* ─────────────────────────────────────────────────────────────
   AVATAR
───────────────────────────────────────────────────────────── */
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
  const PALETTE = ['#1E3A5F', '#FF6B00', '#1A7A4A', '#7C3AED', '#0369A1', '#BE185D', '#0F766E', '#B45309']
  const idx = (name.charCodeAt(0) + name.charCodeAt(1)) % PALETTE.length
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `${PALETTE[idx]}1A`,
        border: `2px solid ${PALETTE[idx]}35`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.32,
        fontWeight: 700,
        color: PALETTE[idx],
        flexShrink: 0,
        fontFamily: 'var(--font-heading)',
        letterSpacing: '0.02em',
      }}
    >
      {initials}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MORE MENU
───────────────────────────────────────────────────────────── */
function MoreMenu({ empName }: { empName: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn btn-ghost btn-sm btn-icon"
        onClick={() => setOpen((v) => !v)}
        title="More options"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 10 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 4px)',
              zIndex: 20,
              background: '#fff',
              border: '1px solid var(--color-gray-200)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              minWidth: 180,
              overflow: 'hidden',
            }}
          >
            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', fontSize: '0.8125rem', color: 'var(--color-gray-700)', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
              onClick={() => setOpen(false)}
            >
              <FileText size={14} style={{ color: 'var(--color-gray-400)' }} />
              Manage Documents
            </button>
            <button
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', fontSize: '0.8125rem', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', borderTop: '1px solid var(--color-gray-100)' }}
              onClick={() => setOpen(false)}
            >
              <LogOut size={14} style={{ color: '#dc2626' }} />
              Exit Process
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export default function EmployeesPage() {
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All Departments')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [currentPage, setCurrentPage] = useState(1)

  const PAGE_SIZE = 15

  /* Filter logic */
  const filtered = useMemo(() => {
    return EMPLOYEES.filter((emp) => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.empId.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.designation.toLowerCase().includes(q)
      const matchDept   = deptFilter   === 'All Departments' || emp.department      === deptFilter
      const matchStatus = statusFilter === 'All Status'      || emp.status          === statusFilter
      const matchType   = typeFilter   === 'All Types'       || emp.employmentType  === typeFilter
      return matchSearch && matchDept && matchStatus && matchType
    })
  }, [search, deptFilter, statusFilter, typeFilter])

  const totalFiltered = filtered.length + 233 // simulate 248 total
  const paginated = filtered // Show all 15 from mock; pagination is simulated below

  const hasActiveFilters = deptFilter !== 'All Departments' || statusFilter !== 'All Status' || typeFilter !== 'All Types' || search

  function clearFilters() {
    setSearch('')
    setDeptFilter('All Departments')
    setStatusFilter('All Status')
    setTypeFilter('All Types')
    setCurrentPage(1)
  }

  return (
    <>
      <Topbar
        title="Employee Directory"
        subtitle="Manage your workforce"
        notificationCount={5}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-outline btn-sm">
              <Upload size={14} />
              Bulk Import
            </button>
            <button className="btn btn-outline btn-sm">
              <Download size={14} />
              Export
            </button>
            <button className="btn btn-primary btn-sm">
              <UserPlus size={14} />
              Add Employee
            </button>
          </div>
        }
      />

      <div style={{ padding: '28px 28px 56px' }}>

        {/* ── Summary Cards ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 12,
            marginBottom: 24,
          }}
        >
          {[
            { label: 'Total Employees', value: '248', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Active',          value: '220', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
            { label: 'Probation',       value: '15',  color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
            { label: 'On Leave',        value: '8',   color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Notice Period',   value: '5',   color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
          ].map((s) => (
            <div
              key={s.label}
              className="card card-interactive"
              style={{
                padding: '16px 18px',
                borderColor: s.border,
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: s.color,
                  lineHeight: 1.1,
                }}
              >
                {s.value}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 4, fontWeight: 500 }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Search & Filter Bar ── */}
        <div
          className="card"
          style={{ padding: '16px 20px', marginBottom: 16 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            {/* Search */}
            <div
              style={{
                flex: '1 1 260px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: '1.5px solid var(--color-gray-200)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
                background: 'var(--color-gray-50)',
              }}
            >
              <Search size={15} style={{ color: 'var(--color-gray-400)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search by name, EMP ID, email, or designation..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.875rem',
                  color: 'var(--color-gray-800)',
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', display: 'flex' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1) }}
              className="form-select"
              style={{ width: 'auto', minWidth: 170, flex: '0 1 auto', fontSize: '0.875rem' }}
            >
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
              className="form-select"
              style={{ width: 'auto', minWidth: 150, flex: '0 1 auto', fontSize: '0.875rem' }}
            >
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>

            {/* Employment Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1) }}
              className="form-select"
              style={{ width: 'auto', minWidth: 140, flex: '0 1 auto', fontSize: '0.875rem' }}
            >
              {EMP_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ color: '#ef4444' }}>
                <X size={14} />
                Clear
              </button>
            )}

            {/* Results count */}
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '0.8125rem',
                color: 'var(--color-gray-500)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <Filter size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              {paginated.length} of {totalFiltered} results
            </span>
          </div>
        </div>

        {/* ── Employee Table ── */}
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>Employee</th>
                <th style={{ minWidth: 200 }}>Department &amp; Designation</th>
                <th style={{ minWidth: 220 }}>Contact</th>
                <th style={{ minWidth: 130 }}>Employment Type</th>
                <th style={{ minWidth: 130 }}>Status</th>
                <th style={{ minWidth: 120 }}>Hire Date</th>
                <th style={{ minWidth: 100, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <Users size={36} style={{ color: 'var(--color-gray-300)' }} />
                      <p style={{ fontWeight: 600, color: 'var(--color-gray-500)', fontSize: '0.9375rem' }}>
                        No employees found
                      </p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-400)' }}>
                        Try adjusting your search or filter criteria
                      </p>
                      <button className="btn btn-outline btn-sm" onClick={clearFilters}>
                        Clear Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((emp) => {
                  const sc = STATUS_CONFIG[emp.status]
                  const tc = EMP_TYPE_CONFIG[emp.employmentType]
                  return (
                    <tr key={emp.id}>
                      {/* Employee */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                          <Avatar name={emp.name} size={36} />
                          <div style={{ minWidth: 0 }}>
                            <p
                              style={{
                                fontWeight: 600,
                                color: 'var(--color-gray-900)',
                                fontSize: '0.875rem',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {emp.name}
                            </p>
                            <p
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--color-imperial-blue)',
                                fontFamily: 'monospace',
                                marginTop: 2,
                                fontWeight: 500,
                              }}
                            >
                              {emp.empId}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Department & Designation */}
                      <td>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-gray-800)' }}>
                          {emp.department}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', marginTop: 2 }}>
                          {emp.designation}
                        </p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-gray-400)', marginTop: 2 }}>
                          📍 {emp.location}
                        </p>
                      </td>

                      {/* Contact */}
                      <td>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-700)' }}>
                          {emp.email}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: 3 }}>
                          {emp.phone}
                        </p>
                      </td>

                      {/* Employment Type */}
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: tc.bg,
                            color: tc.color,
                            border: `1px solid ${tc.border}`,
                          }}
                        >
                          {emp.employmentType}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className="badge badge-dot"
                          style={{
                            background: sc.bg,
                            color: sc.color,
                            border: `1px solid ${sc.border}`,
                          }}
                        >
                          {emp.status}
                        </span>
                      </td>

                      {/* Hire Date */}
                      <td style={{ fontSize: '0.8125rem', color: 'var(--color-gray-600)', whiteSpace: 'nowrap' }}>
                        {emp.hireDate}
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            title={`View ${emp.name}`}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            title={`Edit ${emp.name}`}
                          >
                            <Edit size={15} />
                          </button>
                          <MoreMenu empName={emp.name} />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>
            Showing{' '}
            <strong style={{ color: 'var(--color-gray-800)' }}>
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, 248)}
            </strong>{' '}
            of{' '}
            <strong style={{ color: 'var(--color-gray-800)' }}>248</strong>{' '}
            employees
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              className="btn btn-outline btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{ padding: '6px 12px' }}
            >
              <ChevronLeft size={14} />
              Previous
            </button>

            {/* Page numbers */}
            {[1, 2, 3, '...', 17].map((pg, idx) => (
              typeof pg === 'number' ? (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(pg)}
                  style={{
                    minWidth: 34,
                    height: 34,
                    borderRadius: 'var(--radius-sm)',
                    border: currentPage === pg ? 'none' : '1.5px solid var(--color-gray-200)',
                    background: currentPage === pg
                      ? 'linear-gradient(135deg,#1E3A5F 0%,#2D5391 100%)'
                      : 'transparent',
                    color: currentPage === pg ? '#fff' : 'var(--color-gray-600)',
                    fontWeight: currentPage === pg ? 700 : 500,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  {pg}
                </button>
              ) : (
                <span
                  key={idx}
                  style={{ color: 'var(--color-gray-400)', fontSize: '0.875rem', padding: '0 4px' }}
                >
                  {pg}
                </span>
              )
            ))}

            <button
              className="btn btn-outline btn-sm"
              disabled={currentPage === 17}
              onClick={() => setCurrentPage((p) => Math.min(17, p + 1))}
              style={{ padding: '6px 12px' }}
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

      </div>
    </>
  )
}
