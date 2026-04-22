'use client'
import { useState, useRef, useEffect, ReactNode } from 'react'

interface DropdownItem {
  label: string
  icon?: ReactNode
  onClick?: () => void
  danger?: boolean
  href?: string
  dividerAfter?: boolean
}

interface DropdownProps {
  trigger: ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
  className?: string
}

export function Dropdown({ trigger, items, align = 'right', className = '' }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className={`dropdown ${className}`} ref={ref}>
      <div onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer' }}>
        {trigger}
      </div>
      {open && (
        <div
          className="dropdown-menu"
          style={align === 'left' ? { right: 'auto', left: 0 } : undefined}
          role="menu"
        >
          {items.map((item, i) => (
            <div key={i}>
              {item.href
                ? (
                  <a
                    href={item.href}
                    className={`dropdown-item ${item.danger ? 'danger' : ''}`}
                    onClick={() => setOpen(false)}
                    role="menuitem"
                  >
                    {item.icon}
                    {item.label}
                  </a>
                )
                : (
                  <button
                    className={`dropdown-item ${item.danger ? 'danger' : ''}`}
                    onClick={() => { item.onClick?.(); setOpen(false) }}
                    role="menuitem"
                  >
                    {item.icon}
                    {item.label}
                  </button>
                )
              }
              {item.dividerAfter && <div className="dropdown-divider" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
