import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInDays, isWeekend, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate Employee ID: EMP/2026/001
export function generateEmployeeId(year: number, sequence: number): string {
  return `EMP/${year}/${String(sequence).padStart(3, '0')}`
}

// Format Indian currency
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format date for display
export function formatDate(date: string | Date, fmt = 'dd MMM yyyy'): string {
  try {
    return format(typeof date === 'string' ? parseISO(date) : date, fmt)
  } catch {
    return '—'
  }
}

// Calculate working days between two dates excluding weekends
export function calculateWorkingDays(start: string, end: string): number {
  const startDate = parseISO(start)
  const endDate = parseISO(end)
  let count = 0
  let current = startDate
  while (current <= endDate) {
    if (!isWeekend(current)) count++
    current = new Date(current.getTime() + 86400000)
  }
  return count
}

// India Professional Tax slabs (monthly salary)
export function calculateProfessionalTax(monthlySalary: number, state = 'Karnataka'): number {
  // Karnataka slabs (most common)
  if (monthlySalary <= 15000) return 0
  if (monthlySalary <= 17999) return 150
  return 200
}

// EPF Contribution calculation
export function calculateEPF(basicSalary: number): { employee: number; employer: number; eps: number } {
  const epfWage = Math.min(basicSalary, 15000) // EPF ceiling is ₹15,000 basic
  const employee = Math.round(epfWage * 0.12)
  const eps = Math.round(epfWage * 0.0833) // 8.33% goes to EPS
  const employer = employee // Total employer = 12% but 8.33% goes to EPS
  return { employee, employer, eps }
}

// ESIC Contribution (applicable if gross <= ₹21,000/month)
export function calculateESIC(grossSalary: number): { employee: number; employer: number; applicable: boolean } {
  if (grossSalary > 21000) return { employee: 0, employer: 0, applicable: false }
  return {
    employee: Math.round(grossSalary * 0.0075),
    employer: Math.round(grossSalary * 0.0325),
    applicable: true,
  }
}

// Get status badge color
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'badge-green',
    approved: 'badge-green',
    paid: 'badge-green',
    present: 'badge-green',
    confirmed: 'badge-green',
    selected: 'badge-green',
    pending: 'badge-amber',
    draft: 'badge-amber',
    processing: 'badge-amber',
    probation: 'badge-amber',
    screening: 'badge-amber',
    interview: 'badge-blue',
    on_hold: 'badge-blue',
    escalated: 'badge-orange',
    notice_period: 'badge-orange',
    rejected: 'badge-red',
    terminated: 'badge-red',
    inactive: 'badge-red',
    absent: 'badge-red',
    cancelled: 'badge-gray',
    completed: 'badge-gray',
  }
  return colors[status] || 'badge-gray'
}

export function formatTime(time: string): string {
  if (!time) return '—'
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${m} ${ampm}`
}

export function truncate(str: string, maxLength = 50): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}
