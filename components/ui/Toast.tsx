'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'warning' | 'danger' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string) => void
  success: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  error:   (title: string, message?: string) => void
  info:    (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle size={17} color="var(--color-success)" />,
  warning: <AlertTriangle size={17} color="var(--color-warning)" />,
  danger:  <XCircle size={17} color="var(--color-danger)" />,
  info:    <Info size={17} color="var(--color-info)" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts(prev => [...prev, { id, type, title, message }])
    setTimeout(() => dismiss(id), 4500)
  }, [dismiss])

  const success = useCallback((t: string, m?: string) => toast('success', t, m), [toast])
  const warning = useCallback((t: string, m?: string) => toast('warning', t, m), [toast])
  const error   = useCallback((t: string, m?: string) => toast('danger',  t, m), [toast])
  const info    = useCallback((t: string, m?: string) => toast('info',    t, m), [toast])

  return (
    <ToastContext.Provider value={{ toast, success, warning, error, info }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`} role="alert">
            <span style={{ flexShrink: 0, marginTop: 1 }}>{icons[t.type]}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="toast-title">{t.title}</div>
              {t.message && <div className="toast-message">{t.message}</div>}
            </div>
            <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
