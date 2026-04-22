'use client'
import { useEffect, useCallback, ReactNode, HTMLAttributes } from 'react'
import { X } from 'lucide-react'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  size?: ModalSize
  children: ReactNode
  footer?: ReactNode
  closeOnOverlay?: boolean
}

const sizeMap: Record<ModalSize, string> = {
  sm: 'modal-sm',
  md: '',
  lg: 'modal-lg',
  xl: 'modal-xl',
}

export function Modal({
  open, onClose, title, size = 'md', children, footer, closeOnOverlay = true,
}: ModalProps) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, handleKey])

  if (!open) return null

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={closeOnOverlay ? onClose : undefined}
    >
      <div
        className={`modal-content ${sizeMap[size]}`}
        onClick={e => e.stopPropagation()}
      >
        {title !== undefined && (
          <div className="modal-header">
            <h2 className="modal-title">{title}</h2>
            <button className="modal-close" onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmModal({
  open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: ReactNode
  confirmLabel?: string
  danger?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button
            className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => { onConfirm(); onClose() }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', lineHeight: 1.6 }}>{message}</p>
    </Modal>
  )
}
