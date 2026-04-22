'use client'
import { ReactNode, createContext, useContext, useState } from 'react'

interface TabsContextValue {
  active: string
  setActive: (key: string) => void
}

const TabsContext = createContext<TabsContextValue>({ active: '', setActive: () => {} })

interface TabsProps {
  defaultTab: string
  children: ReactNode
  className?: string
  onChange?: (key: string) => void
}

export function Tabs({ defaultTab, children, className = '', onChange }: TabsProps) {
  const [active, setActive] = useState(defaultTab)

  function handleChange(key: string) {
    setActive(key)
    onChange?.(key)
  }

  return (
    <TabsContext.Provider value={{ active, setActive: handleChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabListProps {
  children: ReactNode
  className?: string
}

export function TabList({ children, className = '' }: TabListProps) {
  return <div className={`tabs ${className}`} role="tablist">{children}</div>
}

interface TabProps {
  id: string
  children: ReactNode
  count?: number
  disabled?: boolean
  icon?: ReactNode
}

export function Tab({ id, children, count, disabled, icon }: TabProps) {
  const { active, setActive } = useContext(TabsContext)
  const isActive = active === id

  return (
    <button
      className={`tab ${isActive ? 'active' : ''}`}
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => !disabled && setActive(id)}
    >
      {icon && <span style={{ flexShrink: 0 }}>{icon}</span>}
      {children}
      {count !== undefined && <span className="tab-count">{count}</span>}
    </button>
  )
}

interface TabPanelProps {
  id: string
  children: ReactNode
  className?: string
}

export function TabPanel({ id, children, className = '' }: TabPanelProps) {
  const { active } = useContext(TabsContext)
  if (active !== id) return null
  return (
    <div role="tabpanel" className={`page-enter ${className}`}>
      {children}
    </div>
  )
}

// Controlled variant for pages that manage tab state themselves
interface ControlledTabsProps {
  tabs: { id: string; label: string; count?: number; icon?: ReactNode }[]
  active: string
  onChange: (id: string) => void
  className?: string
}

export function ControlledTabs({ tabs, active, onChange, className = '' }: ControlledTabsProps) {
  return (
    <div className={`tabs ${className}`} role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab ${active === tab.id ? 'active' : ''}`}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && <span style={{ flexShrink: 0 }}>{tab.icon}</span>}
          {tab.label}
          {tab.count !== undefined && <span className="tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  )
}
