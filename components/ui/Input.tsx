import { forwardRef, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'

// ── FormGroup ──
export function FormGroup({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`form-group ${className}`}>{children}</div>
}

// ── FormLabel ──
interface LabelProps { htmlFor?: string; required?: boolean; children: ReactNode; className?: string }
export function FormLabel({ htmlFor, required, children, className = '' }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className={`form-label ${required ? 'required' : ''} ${className}`}>
      {children}
    </label>
  )
}

// ── FormHelper / FormError ──
export function FormHelper({ children }: { children: ReactNode }) {
  return <p className="form-helper">{children}</p>
}
export function FormError({ children }: { children: ReactNode }) {
  return <p className="form-error">{children}</p>
}

// ── Input ──
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error, iconLeft, iconRight, className = '', ...props }, ref
) {
  if (iconLeft || iconRight) {
    return (
      <div className="input-group">
        {iconLeft  && <span className="input-icon-left">{iconLeft}</span>}
        {iconRight && <span className="input-icon-right">{iconRight}</span>}
        <input
          ref={ref}
          className={`form-input ${iconLeft ? 'with-icon-left' : ''} ${iconRight ? 'with-icon-right' : ''} ${error ? 'error' : ''} ${className}`}
          {...props}
        />
      </div>
    )
  }
  return (
    <input
      ref={ref}
      className={`form-input ${error ? 'error' : ''} ${className}`}
      {...props}
    />
  )
})

// ── Select ──
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
  children: ReactNode
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { error, className = '', children, ...props }, ref
) {
  return (
    <select
      ref={ref}
      className={`form-select ${error ? 'error' : ''} ${className}`}
      {...props}
    >
      {children}
    </select>
  )
})

// ── Textarea ──
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { error, className = '', ...props }, ref
) {
  return (
    <textarea
      ref={ref}
      className={`form-textarea ${error ? 'error' : ''} ${className}`}
      {...props}
    />
  )
})

// ── SearchInput ──
interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  iconLeft?: ReactNode
}
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { className = '', iconLeft, ...props }, ref
) {
  return (
    <div className={`search-input-wrapper ${className}`}>
      <span className="search-icon">
        {iconLeft ?? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        )}
      </span>
      <input ref={ref} className="search-input" {...props} />
    </div>
  )
})

// ── Toggle ──
interface ToggleProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  label?: string
  id?: string
  disabled?: boolean
}
export function Toggle({ checked, onChange, label, id, disabled }: ToggleProps) {
  return (
    <div className="toggle-wrapper">
      <label className="toggle" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={e => onChange?.(e.target.checked)}
          disabled={disabled}
        />
        <div className="toggle-track" />
        <div className="toggle-thumb" />
      </label>
      {label && <span style={{ fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>{label}</span>}
    </div>
  )
}
