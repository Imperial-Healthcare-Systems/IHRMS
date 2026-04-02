'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import {
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Command,
  Zap,
} from 'lucide-react'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children?: React.ReactNode
  notificationCount?: number
}

function getInitials(name?: string | null) {
  if (!name) return 'U'
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export function Topbar({ title, subtitle, actions, children, notificationCount = 0 }: TopbarProps) {
  const { data: session } = useSession()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const userName = session?.user?.name ?? 'User'
  const userEmail = session?.user?.email ?? ''
  const userImage = session?.user?.image
  const initials = getInitials(userName)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 px-6"
      style={{
        height: 60,
        background: 'rgba(255,255,255,0.98)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #EEF0F4',
        boxShadow: '0 1px 0 0 rgba(0,0,0,0.04), 0 2px 8px 0 rgba(0,0,0,0.03)',
      }}
    >
      {/* ── Left: Title ── */}
      <div style={{ flexShrink: 0, minWidth: 0 }}>
        <h1 style={{
          fontSize: 15, fontWeight: 700, color: '#0F172A',
          lineHeight: 1.2, fontFamily: "'Outfit', sans-serif",
          letterSpacing: '-0.2px',
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 11.5, color: '#94A3B8', lineHeight: 1.3, marginTop: 1 }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* ── Spacer ── */}
      <div style={{ flex: 1 }} />

      {/* ── Search ── */}
      <div
        className="hidden sm:flex items-center gap-2 rounded-lg"
        style={{
          background: searchFocused ? '#FFFFFF' : '#F7F8FA',
          border: `1.5px solid ${searchFocused ? '#F47920' : '#E8EBF0'}`,
          boxShadow: searchFocused ? '0 0 0 3px rgba(244,121,32,0.1)' : 'none',
          padding: '7px 12px',
          width: searchFocused ? 280 : 220,
          transition: 'all 0.2s ease',
        }}
      >
        <Search size={13} style={{ color: '#94A3B8', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search employees, leaves…"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            fontSize: 13, color: '#374151', width: '100%',
            fontFamily: "'Inter', sans-serif",
          }}
        />
        {!searchFocused && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0,
            background: '#EDF0F4', borderRadius: 5, padding: '2px 5px',
          }}>
            <Command size={9} style={{ color: '#94A3B8' }} />
            <span style={{ fontSize: 9.5, color: '#94A3B8', fontWeight: 600 }}>K</span>
          </div>
        )}
      </div>

      {/* ── Action Slot ── */}
      {(actions || children) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {actions}
          {children}
        </div>
      )}

      {/* ── Divider ── */}
      <div style={{ width: 1, height: 22, background: '#E8EBF0', flexShrink: 0, marginLeft: 2, marginRight: 2 }} />

      {/* ── Help ── */}
      <IconBtn title="Help & Documentation">
        <HelpCircle size={16} />
      </IconBtn>

      {/* ── Notifications ── */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setNotifOpen(v => !v)}
          title="Notifications"
          style={{
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 9, border: 'none', cursor: 'pointer',
            background: notifOpen ? '#FFF3E8' : 'transparent',
            color: notifOpen ? '#F47920' : '#64748B',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (!notifOpen) { (e.currentTarget as HTMLElement).style.background = '#F7F8FA'; (e.currentTarget as HTMLElement).style.color = '#374151' }}}
          onMouseLeave={e => { if (!notifOpen) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#64748B' }}}
        >
          <Bell size={16} />
          {notificationCount > 0 && (
            <span style={{
              position: 'absolute', top: 5, right: 5,
              width: 16, height: 16,
              background: 'linear-gradient(135deg, #F47920, #E53E1A)',
              borderRadius: '50%',
              fontSize: 8.5, fontWeight: 800, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid #fff',
              boxShadow: '0 2px 6px rgba(244,121,32,0.5)',
              animation: 'notif-pulse 2s ease-in-out infinite',
            }}>
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>

        {/* Notifications panel */}
        {notifOpen && (
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 6px)',
            width: 320, background: '#FFFFFF',
            border: '1px solid #EEF0F4',
            borderRadius: 14,
            boxShadow: '0 12px 32px -4px rgba(0,0,0,0.12), 0 4px 10px -6px rgba(0,0,0,0.08)',
            overflow: 'hidden', zIndex: 60,
          }}>
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Notifications</p>
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#F47920',
                background: 'rgba(244,121,32,0.1)', borderRadius: 20, padding: '2px 8px',
              }}>
                {notificationCount} new
              </span>
            </div>
            {[
              { title: '5 leave requests pending', time: '2m ago', icon: '📋', color: '#3B82F6' },
              { title: 'Payroll approval due today', time: '1h ago', icon: '💰', color: '#8B5CF6' },
              { title: 'Arjun Krishnan — probation ending', time: '3h ago', icon: '⏰', color: '#F59E0B' },
            ].map((n, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 16px',
                borderBottom: i < 2 ? '1px solid #F8FAFC' : 'none',
                cursor: 'pointer', transition: 'background 0.1s',
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFBFC'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: `${n.color}14`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0,
                }}>
                  {n.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 500, color: '#1E293B', lineHeight: 1.35 }}>{n.title}</p>
                  <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{n.time}</p>
                </div>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#F47920', flexShrink: 0, marginTop: 5 }} />
              </div>
            ))}
            <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
              <button style={{ fontSize: 12, color: '#F47920', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                View all notifications →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── User Avatar + Dropdown ── */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 8px 5px 5px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: dropdownOpen ? '#FFF3E8' : 'transparent',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (!dropdownOpen) (e.currentTarget as HTMLElement).style.background = '#F7F8FA' }}
          onMouseLeave={e => { if (!dropdownOpen) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userImage}
              alt={userName}
              style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(244,121,32,0.3)' }}
            />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg, #F47920, #FFB347)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10.5, fontWeight: 700, color: '#fff',
              border: '2px solid rgba(244,121,32,0.3)',
            }}>
              {initials}
            </div>
          )}
          <span className="hidden md:block" style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userName}
          </span>
          <ChevronDown
            size={13}
            className="hidden md:block"
            style={{ color: '#94A3B8', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 6px)',
            width: 230, background: '#FFFFFF',
            border: '1px solid #EEF0F4',
            borderRadius: 14,
            boxShadow: '0 12px 32px -4px rgba(0,0,0,0.12), 0 4px 10px -6px rgba(0,0,0,0.08)',
            overflow: 'hidden', zIndex: 60,
          }}>
            {/* User info */}
            <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                {userImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userImage} alt={userName} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(244,121,32,0.3)' }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #F47920, #FFB347)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                    {initials}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</p>
                  <p style={{ fontSize: 11, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</p>
                </div>
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(244,121,32,0.1)', color: '#F47920',
                fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                border: '1px solid rgba(244,121,32,0.2)',
              }}>
                <Zap size={9} />
                HR Administrator
              </span>
            </div>

            {/* Menu items */}
            <div style={{ padding: '6px 0' }}>
              <DDItem href="/profile" icon={<User size={13} />} label="My Profile" onClick={() => setDropdownOpen(false)} />
              <DDItem href="/settings" icon={<Settings size={13} />} label="Settings" onClick={() => setDropdownOpen(false)} />
            </div>

            {/* Sign out */}
            <div style={{ padding: '6px 0', borderTop: '1px solid #F1F5F9' }}>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 16px', fontSize: 13, fontWeight: 500,
                  color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEF2F2'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <LogOut size={13} />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes notif-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(244,121,32,0.5); }
          50% { box-shadow: 0 0 0 4px rgba(244,121,32,0); }
        }
      `}</style>
    </header>
  )
}

/* ── Helpers ── */
function IconBtn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <button
      title={title}
      style={{
        width: 36, height: 36, borderRadius: 9,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: '#64748B', transition: 'all 0.15s', flexShrink: 0,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F7F8FA'; (e.currentTarget as HTMLElement).style.color = '#374151' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#64748B' }}
    >
      {children}
    </button>
  )
}

function DDItem({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <a
      href={href}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 16px', fontSize: 13, fontWeight: 500,
        color: '#374151', textDecoration: 'none', transition: 'background 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F8FAFC'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
    >
      <span style={{ color: '#94A3B8' }}>{icon}</span>
      {label}
    </a>
  )
}
