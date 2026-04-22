import { HTMLAttributes, ReactNode } from 'react'

type BadgeVariant = 'green' | 'red' | 'amber' | 'blue' | 'orange' | 'purple' | 'gray'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
  children: ReactNode
}

const variantMap: Record<BadgeVariant, string> = {
  green:  'badge-green',
  red:    'badge-red',
  amber:  'badge-amber',
  blue:   'badge-blue',
  orange: 'badge-orange',
  purple: 'badge-purple',
  gray:   'badge-gray',
}

export function Badge({ variant = 'gray', dot, className = '', children, ...props }: BadgeProps) {
  const classes = [
    'badge',
    variantMap[variant],
    dot ? 'badge-dot' : '',
    className,
  ].filter(Boolean).join(' ')

  return <span className={classes} {...props}>{children}</span>
}

// Convenience helpers for common HRMS statuses
const statusMap: Record<string, BadgeVariant> = {
  active:      'green',
  inactive:    'gray',
  probation:   'amber',
  terminated:  'red',
  resigned:    'red',
  approved:    'green',
  pending:     'amber',
  rejected:    'red',
  present:     'green',
  absent:      'red',
  late:        'amber',
  work_from_home: 'blue',
  half_day:    'orange',
  paid:        'green',
  processing:  'blue',
  draft:       'gray',
  open:        'blue',
  in_progress: 'amber',
  resolved:    'green',
  closed:      'gray',
  upcoming:    'blue',
  ongoing:     'green',
  completed:   'green',
  cancelled:   'red',
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const variant = statusMap[status] ?? 'gray'
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return <Badge variant={variant} dot className={className}>{label}</Badge>
}
