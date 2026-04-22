'use client'
import { useState, ReactNode } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'

type AlertVariant = 'success' | 'warning' | 'danger' | 'info'

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: ReactNode
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}

const icons: Record<AlertVariant, ReactNode> = {
  success: <CheckCircle size={17} />,
  warning: <AlertTriangle size={17} />,
  danger:  <XCircle size={17} />,
  info:    <Info size={17} />,
}

export function Alert({ variant = 'info', title, children, dismissible, onDismiss, className = '' }: AlertProps) {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  function dismiss() {
    setVisible(false)
    onDismiss?.()
  }

  return (
    <div className={`alert alert-${variant} ${className}`} role="alert">
      <span className="alert-icon">{icons[variant]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div className="alert-title">{title}</div>}
        <div>{children}</div>
      </div>
      {dismissible && (
        <button className="alert-dismiss" onClick={dismiss} aria-label="Dismiss">
          <X size={15} />
        </button>
      )}
    </div>
  )
}
