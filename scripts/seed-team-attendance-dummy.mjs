// One-off seed for the Team Attendance Manager View.
//
// Usage:
//   node scripts/seed-team-attendance-dummy.mjs                   # apply
//   node scripts/seed-team-attendance-dummy.mjs --wipe            # remove DEMO rows
//   MANAGER_EMAIL=foo@bar.com node scripts/seed-team-attendance-dummy.mjs
//
// What it does:
//   - Resolves the manager's identity by email
//   - For EVERY org the manager has active HRMS membership in:
//       - Looks up the manager's employees.id in that org
//       - Inserts/updates a tenant leave_type (SL = Sick Leave)
//       - Picks/creates a Demo Department
//       - Inserts 10 demo employees reporting to the manager
//       - Inserts attendance_daily rows for the current month
//
// What it does NOT do:
//   - Touch identities or auth.users
//   - Touch any non-DEMO row

import { readFileSync } from 'node:fs'
import { WebSocket } from 'ws'
globalThis.WebSocket ??= WebSocket
import { createClient } from '@supabase/supabase-js'

const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_]+)\s*=\s*(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
}

const WIPE = process.argv.includes('--wipe')
const MANAGER_EMAIL = (process.env.MANAGER_EMAIL ?? 'imperialhealthcaresystems@gmail.com').toLowerCase().trim()

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const PEOPLE = [
  ['Aanya',    'Sharma',   'Senior Coder',           'RCM'],
  ['Rohan',    'Mehta',    'Medical Coder',          'RCM'],
  ['Priya',    'Iyer',     'AR Caller',              'RCM'],
  ['Vikram',   'Singh',    'Charge Entry Specialist','RCM'],
  ['Neha',     'Patel',    'Quality Analyst',        'RCM'],
  ['Arjun',    'Reddy',    'Clinical Documentation', 'CLIN'],
  ['Kavya',    'Nair',     'Staff Nurse',            'CLIN'],
  ['Siddharth','Joshi',    'Physiotherapist',        'CLIN'],
  ['Ritika',   'Bansal',   'Pharmacist',             'CLIN'],
  ['Aditya',   'Kapoor',   'Lab Technician',         'CLIN'],
]

// ── 1. Resolve manager identity ───────────────────────────────────────
const { data: identity } = await supa
  .from('identities')
  .select('id, last_active_org_id')
  .eq('email', MANAGER_EMAIL)
  .maybeSingle()

if (!identity) {
  console.error(`FAIL: no identity for ${MANAGER_EMAIL}`)
  process.exit(1)
}

const { data: targetOrgIds } = await supa
  .from('memberships')
  .select('org_id')
  .eq('identity_id', identity.id)
  .eq('status', 'active')
  .eq('hrms_access', true)

const orgList = (targetOrgIds ?? []).map(r => r.org_id)
if (orgList.length === 0) {
  console.error(`FAIL: no active HRMS membership for ${MANAGER_EMAIL}`)
  process.exit(1)
}
console.log(`${MANAGER_EMAIL} has HRMS access in ${orgList.length} org(s):`)
for (const id of orgList) console.log(`  - ${id}`)
console.log('')

// ── 2. Wipe mode ──────────────────────────────────────────────────────
if (WIPE) {
  const { data: demoEmps } = await supa
    .from('employees')
    .select('id')
    .in('org_id', orgList)
    .like('emp_id', 'DEMO-%')

  const ids = (demoEmps ?? []).map(e => e.id)
  console.log(`Found ${ids.length} DEMO employees to remove across ${orgList.length} org(s).`)

  if (ids.length > 0) {
    const { error: e1 } = await supa.from('attendance_daily').delete().in('employee_id', ids)
    if (e1) console.error('attendance_daily delete:', e1.message)
    const { error: e2 } = await supa.from('employees').delete().in('id', ids)
    if (e2) console.error('employees delete:', e2.message)
    console.log('Done. (leave_types + Demo Department not removed; safe to keep.)')
  }
  process.exit(0)
}

// ── 3. Per-org seed ───────────────────────────────────────────────────
const now = new Date()
const year  = now.getFullYear()
const month = now.getMonth() + 1
const daysInMonth = new Date(year, month, 0).getDate()

for (const orgId of orgList) {
  console.log(`─── org ${orgId} ───────────────────────────────────────`)

  // 3.1 Manager employees row IN THIS ORG
  const { data: managerEmp } = await supa
    .from('employees')
    .select('id, full_name, first_name, last_name')
    .eq('identity_id', identity.id)
    .eq('org_id', orgId)
    .maybeSingle()

  if (!managerEmp) {
    console.log(`  ⚠  no employees row for ${MANAGER_EMAIL} in this org — skipping.`)
    console.log('')
    continue
  }
  console.log(`  Manager: ${managerEmp.full_name ?? `${managerEmp.first_name ?? ''} ${managerEmp.last_name ?? ''}`.trim()} (${managerEmp.id})`)

  // 3.2 leave_type SL
  const { data: existingLt } = await supa
    .from('leave_types').select('id').eq('org_id', orgId).eq('code', 'SL').maybeSingle()
  let slLeaveTypeId = existingLt?.id ?? null
  if (!slLeaveTypeId) {
    const { data: newLt, error: ltErr } = await supa.from('leave_types').insert({
      org_id: orgId,
      code: 'SL', label: 'Sick Leave', letter: 'S', color_hex: '#7C3AED',
      is_active: true, display_order: 1,
    }).select('id').single()
    if (ltErr) console.warn('  leave_types insert:', ltErr.message)
    else { slLeaveTypeId = newLt.id; console.log('  ✓ Inserted leave_type SL') }
  }

  // 3.3 Department
  let deptId
  {
    const { data: existingDept } = await supa
      .from('departments').select('id').eq('org_id', orgId).limit(1).maybeSingle()
    if (existingDept) {
      deptId = existingDept.id
    } else {
      const { data: newDept, error: dErr } = await supa.from('departments').insert({
        org_id: orgId, name: 'Demo Department', code: 'DEMO',
      }).select('id').single()
      if (dErr) { console.error('  Could not seed department:', dErr.message); continue }
      deptId = newDept.id
      console.log('  ✓ Inserted Demo Department')
    }
  }

  // 3.4 Employees — employee_code is globally unique, namespace by org slug.
  const orgTag = orgId.slice(0, 4).toUpperCase()
  const codePrefix = `DEMO-${orgTag}-`

  const { data: alreadyDemo } = await supa
    .from('employees').select('emp_id').eq('org_id', orgId).like('emp_id', `${codePrefix}%`)
  const existingDemoIds = new Set((alreadyDemo ?? []).map(r => r.emp_id))

  const insertedEmpIds = []
  for (let i = 0; i < PEOPLE.length; i++) {
    const [first, last, designation] = PEOPLE[i]
    const empCode = `${codePrefix}${String(i + 1).padStart(3, '0')}`
    if (existingDemoIds.has(empCode)) {
      const { data: existing } = await supa
        .from('employees').select('id').eq('org_id', orgId).eq('emp_id', empCode).maybeSingle()
      if (existing) {
        insertedEmpIds.push({ id: existing.id, first, last })
        continue
      }
    }
    const fullName = `${first} ${last}`
    const emailAddr = `${first.toLowerCase()}.${last.toLowerCase()}+demo-${orgId.slice(0, 4)}@imperialhealthcare.cloud`
    const { data: row, error } = await supa.from('employees').insert({
      org_id: orgId,
      emp_id: empCode,
      employee_code: empCode,
      full_name: fullName,
      first_name: first,
      last_name: last,
      email: emailAddr,
      work_email: emailAddr,
      department_id: deptId,
      employment_type: 'full_time',
      role: designation,
      status: 'active',
      is_admin: false,
      reporting_manager_id: managerEmp.id,
      date_of_joining: '2025-04-01',
    }).select('id').single()
    if (error) {
      console.error(`  ✗ ${empCode} (${first} ${last}):`, error.message)
      continue
    }
    insertedEmpIds.push({ id: row.id, first, last })
  }
  console.log(`  ✓ ${insertedEmpIds.length} demo employees`)

  // 3.5 Attendance for the current month
  function statusFor(empIdx, day) {
    const date = new Date(Date.UTC(year, month - 1, day))
    const dow = date.getUTCDay()
    if (dow === 0 || dow === 6) return { status: 'weekend', leave_type_id: null }
    const seed = (empIdx * 17 + day * 31) % 100
    if (seed < 80) return { status: 'present',  leave_type_id: null }
    if (seed < 87) return { status: 'absent',   leave_type_id: null }
    if (seed < 93) return { status: 'late',     leave_type_id: null }
    if (seed < 100 && slLeaveTypeId) return { status: 'on_leave', leave_type_id: slLeaveTypeId }
    return { status: 'present', leave_type_id: null }
  }

  let dailyInserted = 0
  for (let i = 0; i < insertedEmpIds.length; i++) {
    const emp = insertedEmpIds[i]
    const rows = []
    for (let day = 1; day <= daysInMonth; day++) {
      const { status, leave_type_id } = statusFor(i, day)
      rows.push({
        org_id: orgId,
        employee_id: emp.id,
        attendance_date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        status,
        leave_type_id,
      })
    }
    await supa.from('attendance_daily').delete()
      .eq('employee_id', emp.id)
      .gte('attendance_date', `${year}-${String(month).padStart(2, '0')}-01`)
      .lte('attendance_date', `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`)
    const { error } = await supa.from('attendance_daily').insert(rows)
    if (error) console.error(`  attendance for ${emp.first} ${emp.last}:`, error.message)
    else dailyInserted += rows.length
  }
  console.log(`  ✓ ${dailyInserted} attendance_daily rows for ${year}-${String(month).padStart(2, '0')}`)
  console.log('')
}

console.log(`Refresh /team-attendance — you should see the grid populated for ${year}-${String(month).padStart(2, '0')}.`)
