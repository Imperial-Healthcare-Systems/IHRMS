import { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  glass?: boolean
  noPad?: boolean
  children: ReactNode
}

export function Card({ interactive, glass, noPad, className = '', children, ...props }: CardProps) {
  const classes = [
    'card',
    interactive ? 'card-interactive' : '',
    glass ? 'card-glass' : '',
    noPad ? '!p-0' : '',
    className,
  ].filter(Boolean).join(' ')
  return <div className={classes} {...props}>{children}</div>
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}

export function CardHeader({ title, subtitle, actions, className = '', ...props }: CardHeaderProps) {
  return (
    <div className={`card-header ${className}`} {...props}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="card-title">{title}</div>
        {subtitle && <div className="card-subtitle">{subtitle}</div>}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{actions}</div>}
    </div>
  )
}

export function CardBody({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card-body ${className}`} {...props}>{children}</div>
}

export function CardFooter({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card-footer ${className}`} {...props}>{children}</div>
}
