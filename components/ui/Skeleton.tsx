import { HTMLAttributes } from 'react'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'title' | 'avatar' | 'btn' | 'card' | 'custom'
  width?: string | number
  height?: string | number
  rounded?: boolean
}

export function Skeleton({ variant = 'text', width, height, rounded, className = '', style, ...props }: SkeletonProps) {
  const variantClass = variant !== 'custom' ? `skeleton-${variant}` : ''
  const classes = ['skeleton', variantClass, rounded ? 'skeleton-avatar' : '', className].filter(Boolean).join(' ')

  return (
    <div
      className={classes}
      style={{ width, height, ...style }}
      aria-hidden="true"
      {...props}
    />
  )
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Skeleton variant="title" width="55%" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === rows - 1 ? '70%' : '100%'} />
      ))}
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
      <Skeleton variant="avatar" width={36} height={36} />
      <div style={{ flex: 1 }}>
        <Skeleton variant="title" width="40%" style={{ marginBottom: 6 }} />
        <Skeleton variant="text" width="60%" />
      </div>
      <Skeleton variant="btn" />
    </div>
  )
}
