'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Clock,
  Calendar,
  CalendarClock,
  IndianRupee,
  Receipt,
  Star,
  AlertTriangle,
  UserCheck,
  LogOut,
  BarChart3,
  Shield,
  Package,
  Bell,
  Settings,
  ChevronRight,
  X,
  FileText,
  Network,
  GraduationCap,
  HelpCircle,
  ClipboardList,
} from 'lucide-react'
import { useSidebar } from './SidebarContext'

/* ─────────────────────────────────────────────
   Nav config
───────────────────────────────────────────── */
interface NavItemConfig {
  label: string
  href:  string
  icon:  React.ElementType
  badge?: number
  roles?: string[]
}

interface NavGroupConfig {
  title: string
  items: NavItemConfig[]
}

const HR_ADMIN  = ['super_admin', 'hr_admin', 'admin', 'hr']
const ALL_ROLES = [...HR_ADMIN, 'payroll_admin', 'finance_admin', 'operations_head', 'manager', 'employee']

const navGroupConfigs: NavGroupConfig[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Workforce',
    items: [
      { label: 'Employees',   href: '/employees',  icon: Users,        roles: [...HR_ADMIN, 'operations_head', 'manager'] },
      { label: 'Recruitment', href: '/recruitment', icon: UserPlus,     roles: HR_ADMIN },
      { label: 'Attendance',  href: '/attendance',  icon: Clock,        roles: ALL_ROLES },
      { label: 'Leaves',      href: '/leaves',      icon: Calendar,     roles: ALL_ROLES },
      { label: 'Shifts',      href: '/shifts',      icon: CalendarClock, roles: [...HR_ADMIN, 'operations_head', 'manager'] },
      { label: 'Org Chart',   href: '/org-chart',   icon: Network,      roles: ALL_ROLES },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Payroll',        href: '/payroll',        icon: IndianRupee, roles: [...HR_ADMIN, 'payroll_admin'] },
      { label: 'Reimbursements', href: '/reimbursements', icon: Receipt,     roles: [...HR_ADMIN, 'finance_admin'] },
    ],
  },
  {
    title: 'Performance',
    items: [
      { label: 'Reviews',            href: '/performance', icon: Star,           roles: [...HR_ADMIN, 'operations_head', 'manager'] },
      { label: 'Warnings & Actions', href: '/warnings',    icon: AlertTriangle,  roles: [...HR_ADMIN, 'manager'] },
      { label: 'Training',           href: '/training',    icon: GraduationCap,  roles: ALL_ROLES },
    ],
  },
  {
    title: 'Lifecycle',
    items: [
      { label: 'Onboarding',      href: '/onboarding', icon: UserCheck, roles: HR_ADMIN },
      { label: 'Exit Management', href: '/exit',        icon: LogOut,    roles: HR_ADMIN },
    ],
  },
  {
    title: 'Admin',
    items: [
      { label: 'Reports',       href: '/reports',       icon: BarChart3,    roles: [...HR_ADMIN, 'operations_head'] },
      { label: 'Compliance',    href: '/compliance',    icon: Shield,       roles: HR_ADMIN },
      { label: 'Assets',        href: '/assets',        icon: Package,      roles: HR_ADMIN },
      { label: 'Documents',     href: '/documents',     icon: FileText,     roles: ALL_ROLES },
      { label: 'Announcements', href: '/announcements', icon: Bell,         roles: ALL_ROLES },
      { label: 'Helpdesk',      href: '/helpdesk',      icon: HelpCircle,   roles: ALL_ROLES },
      { label: 'Audit Log',     href: '/audit-log',     icon: ClipboardList, roles: HR_ADMIN },
      { label: 'Settings',      href: '/settings',      icon: Settings,     roles: HR_ADMIN },
    ],
  },
]

function getInitials(name?: string | null) {
  if (!name) return 'U'
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

const ROLE_LABELS: Record<string, string> = {
  super_admin:     'Super Admin',
  hr_admin:        'HR Administrator',
  admin:           'HR Administrator',
  hr:              'HR Administrator',
  operations_head: 'Operations Head',
  manager:         'Manager',
  payroll_admin:   'Payroll Admin',
  finance_admin:   'Finance Admin',
  employee:        'Employee',
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { isOpen, close } = useSidebar()

  /* Track mobile breakpoint so we can drive transform via React state
     (more reliable than CSS data-attribute on production builds) */
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const userName  = session?.user?.name ?? 'User'
  const userImage = session?.user?.image ?? null
  const userRole  = ((session?.user as Record<string, unknown>)?.role as string | null) ?? 'employee'

  const navGroups = navGroupConfigs
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(userRole)),
    }))
    .filter((group) => group.items.length > 0)

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* ── Mobile overlay ── */}
      <div
        onClick={close}
        style={{
          position: 'fixed', inset: 0, zIndex: 39,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(2px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
        className="lg:hidden"
      />

      {/* ── Sidebar ── */}
      <aside
        style={{
          position: 'fixed',
          inset: '0 auto 0 0',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          width: 248,
          background: 'linear-gradient(180deg, #07111F 0%, #0B1929 60%, #0A1628 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '4px 0 32px rgba(0,0,0,0.25)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          /* React-state-driven transform — bypasses CSS specificity entirely */
          transform: isMobile ? (isOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
        }}
      >
        {/* ── Logo ── */}
        <div
          className="flex items-center shrink-0"
          style={{ padding: '12px 14px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', gap: 6 }}
        >
          {/* White logo — mix-blend-mode:screen makes the black bg invisible on dark navbar */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
            <Image
              src="/imperial-logo-white.png"
              alt="Imperial Healthcare Systems"
              width={180}
              height={56}
              style={{
                width: '100%',
                maxWidth: 180,
                height: 'auto',
                objectFit: 'contain',
                mixBlendMode: 'screen',
              }}
              priority
            />
          </div>

          {/* Mobile close button */}
          <button
            onClick={close}
            className="lg:hidden"
            style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav
          className="flex-1 overflow-y-auto"
          style={{ padding: '8px 10px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
        >
          {navGroups.map((group, gi) => (
            <div key={group.title} style={{ marginBottom: 4, marginTop: gi === 0 ? 4 : 12 }}>
              <p style={{
                padding: '0 8px 4px',
                fontSize: 9.5, fontWeight: 700,
                letterSpacing: '0.09em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.2)',
              }}>
                {group.title}
              </p>

              <ul style={{ listStyle: 'none' }}>
                {group.items.map(({ label, href, icon: Icon, badge }) => {
                  const active = isActive(href)
                  return (
                    <li key={href} style={{ marginBottom: 1 }}>
                      <Link
                        href={href}
                        onClick={close}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 10px', borderRadius: 8,
                          fontSize: 13.5, fontWeight: active ? 600 : 500,
                          color: active ? '#FFFFFF' : 'rgba(148,163,184,0.9)',
                          background: active
                            ? 'linear-gradient(90deg, rgba(244,121,32,0.18) 0%, rgba(244,121,32,0.06) 100%)'
                            : 'transparent',
                          borderLeft: active ? '2.5px solid #F47920' : '2.5px solid transparent',
                          transition: 'all 0.15s ease', textDecoration: 'none', position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          if (!active) {
                            const el = e.currentTarget as HTMLElement
                            el.style.background = 'rgba(255,255,255,0.05)'
                            el.style.color = '#E2E8F0'
                            el.style.borderLeftColor = 'rgba(244,121,32,0.3)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!active) {
                            const el = e.currentTarget as HTMLElement
                            el.style.background = 'transparent'
                            el.style.color = 'rgba(148,163,184,0.9)'
                            el.style.borderLeftColor = 'transparent'
                          }
                        }}
                      >
                        <Icon
                          size={15}
                          style={{ flexShrink: 0, color: active ? '#F47920' : 'inherit', opacity: active ? 1 : 0.8 }}
                        />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {label}
                        </span>
                        {badge != null && badge > 0 && (
                          <span style={{
                            fontSize: 10, fontWeight: 700,
                            background: active ? 'rgba(255,255,255,0.25)' : '#F47920',
                            color: '#fff', borderRadius: 20, padding: '1px 6px', minWidth: 18, textAlign: 'center',
                          }}>
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                        {active && !badge && (
                          <ChevronRight size={12} style={{ color: '#F47920', opacity: 0.7, flexShrink: 0 }} />
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* ── User Footer ── */}
        <div
          className="shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 10px 12px' }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userImage} alt={userName}
                style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(244,121,32,0.4)' }}
              />
            ) : (
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #F47920, #FFB347)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff',
                border: '2px solid rgba(244,121,32,0.4)',
              }}>
                {getInitials(userName)}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                {userName}
              </p>
              <p style={{ fontSize: 10, color: '#4B6080', lineHeight: 1.3 }}>{ROLE_LABELS[userRole] ?? userRole}</p>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign out"
              style={{
                flexShrink: 0, width: 28, height: 28, borderRadius: 7,
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#4B6080', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#EF4444'; el.style.background = 'rgba(239,68,68,0.12)' }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.color = '#4B6080'; el.style.background = 'transparent' }}
            >
              <LogOut size={13} />
            </button>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            marginTop: 8, padding: '5px 0',
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
            <span style={{ fontSize: 9.5, color: '#243347', letterSpacing: '0.2px' }}>
              EPF · ESIC · TDS · PT · All Systems Operational
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}
