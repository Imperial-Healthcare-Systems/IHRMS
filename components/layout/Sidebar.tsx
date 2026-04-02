'use client'

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
} from 'lucide-react'

/* ─────────────────────────────────────────────
   Nav config
───────────────────────────────────────────── */
interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Workforce',
    items: [
      { label: 'Employees', href: '/employees', icon: Users },
      { label: 'Recruitment', href: '/recruitment', icon: UserPlus },
      { label: 'Attendance', href: '/attendance', icon: Clock },
      { label: 'Leaves', href: '/leaves', icon: Calendar },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Payroll', href: '/payroll', icon: IndianRupee },
      { label: 'Reimbursements', href: '/reimbursements', icon: Receipt },
    ],
  },
  {
    title: 'Performance',
    items: [
      { label: 'Reviews', href: '/performance', icon: Star },
      { label: 'Warnings & Actions', href: '/warnings', icon: AlertTriangle },
    ],
  },
  {
    title: 'Lifecycle',
    items: [
      { label: 'Onboarding', href: '/onboarding', icon: UserCheck },
      { label: 'Exit Management', href: '/exit', icon: LogOut },
    ],
  },
  {
    title: 'Admin',
    items: [
      { label: 'Reports', href: '/reports', icon: BarChart3 },
      { label: 'Compliance', href: '/compliance', icon: Shield },
      { label: 'Assets', href: '/assets', icon: Package },
      { label: 'Announcements', href: '/announcements', icon: Bell },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function getInitials(name?: string | null) {
  if (!name) return 'U'
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const userName = session?.user?.name ?? 'User'
  const userEmail = session?.user?.email ?? ''
  const userImage = session?.user?.image

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex flex-col"
      style={{
        width: '248px',
        background: 'linear-gradient(180deg, #07111F 0%, #0B1929 60%, #0A1628 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '4px 0 32px rgba(0,0,0,0.25)',
      }}
    >
      {/* ── Logo ── */}
      <div
        className="flex items-center gap-3 shrink-0"
        style={{ padding: '18px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Logo mark using SVG */}
        <div
          style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #F47920 0%, #FFB347 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(244,121,32,0.45)',
          }}
        >
          <Image src="/logo.svg" alt="IHRMS" width={22} height={22} style={{ filter: 'brightness(0) invert(1)' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-baseline gap-1.5">
            <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 17, letterSpacing: '-0.4px', fontFamily: "'Outfit', sans-serif" }}>
              IHRMS
            </span>
            <span style={{
              background: 'rgba(244,121,32,0.2)', color: '#F59E0B',
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20,
              border: '1px solid rgba(245,158,11,0.25)', letterSpacing: '0.3px',
            }}>
              v2.0
            </span>
          </div>
          <p style={{ color: '#344563', fontSize: 10, marginTop: 1, letterSpacing: '0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Imperial Healthcare Systems
          </p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav
        className="flex-1 overflow-y-auto"
        style={{ padding: '8px 10px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
      >
        {navGroups.map((group, gi) => (
          <div key={group.title} style={{ marginBottom: 4, marginTop: gi === 0 ? 4 : 12 }}>
            {/* Group Label */}
            <p style={{
              padding: '0 8px 4px',
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.2)',
            }}>
              {group.title}
            </p>

            {/* Items */}
            <ul style={{ listStyle: 'none' }}>
              {group.items.map(({ label, href, icon: Icon, badge }) => {
                const active = isActive(href)
                return (
                  <li key={href} style={{ marginBottom: 1 }}>
                    <Link
                      href={href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 8,
                        fontSize: 13.5,
                        fontWeight: active ? 600 : 500,
                        color: active ? '#FFFFFF' : 'rgba(148,163,184,0.9)',
                        background: active
                          ? 'linear-gradient(90deg, rgba(244,121,32,0.18) 0%, rgba(244,121,32,0.06) 100%)'
                          : 'transparent',
                        borderLeft: active ? '2.5px solid #F47920' : '2.5px solid transparent',
                        transition: 'all 0.15s ease',
                        textDecoration: 'none',
                        position: 'relative',
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
                        style={{
                          flexShrink: 0,
                          color: active ? '#F47920' : 'inherit',
                          opacity: active ? 1 : 0.8,
                        }}
                      />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {label}
                      </span>
                      {badge != null && badge > 0 && (
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          background: active ? 'rgba(255,255,255,0.25)' : '#F47920',
                          color: '#fff',
                          borderRadius: 20, padding: '1px 6px', minWidth: 18, textAlign: 'center',
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
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Avatar */}
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userImage}
              alt={userName}
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

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
              {userName}
            </p>
            <p style={{ fontSize: 10, color: '#4B6080', lineHeight: 1.3 }}>HR Administrator</p>
          </div>

          {/* Sign out */}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Sign out"
            style={{
              flexShrink: 0, width: 28, height: 28, borderRadius: 7,
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#4B6080', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.color = '#EF4444'
              el.style.background = 'rgba(239,68,68,0.12)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.color = '#4B6080'
              el.style.background = 'transparent'
            }}
          >
            <LogOut size={13} />
          </button>
        </div>

        {/* Compliance footer */}
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
  )
}
