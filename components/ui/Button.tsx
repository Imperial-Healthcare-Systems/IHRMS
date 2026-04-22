'use client'
import { forwardRef, ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  iconOnly?: boolean
  as?: 'button'
}

interface AnchorButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  iconOnly?: boolean
  as: 'a'
}

type Props = ButtonProps | AnchorButtonProps

const variantMap: Record<Variant, string> = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  outline:   'btn-outline',
  danger:    'btn-danger',
  ghost:     'btn-ghost',
}

const sizeMap: Record<Size, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
}

const Spinner = () => (
  <svg
    width="14" height="14" viewBox="0 0 14 14" fill="none"
    style={{ animation: 'spin 0.75s linear infinite', flexShrink: 0 }}
  >
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" strokeLinecap="round"/>
  </svg>
)

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, Props>(
  function Button(props, ref) {
    const { variant = 'primary', size = 'md', loading, iconOnly, className = '', children, ...rest } = props

    const classes = [
      'btn',
      variantMap[variant],
      sizeMap[size],
      iconOnly ? 'btn-icon' : '',
      className,
    ].filter(Boolean).join(' ')

    if ((rest as AnchorButtonProps).as === 'a') {
      const { as: _a, ...anchorRest } = rest as AnchorButtonProps
      return (
        <a ref={ref as React.Ref<HTMLAnchorElement>} className={classes} {...anchorRest}>
          {loading && <Spinner />}
          {children}
        </a>
      )
    }

    const { as: _a, ...btnRest } = rest as ButtonProps & { as?: 'button' }
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={classes}
        disabled={(btnRest as ButtonHTMLAttributes<HTMLButtonElement>).disabled || loading}
        {...btnRest}
      >
        {loading && <Spinner />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
