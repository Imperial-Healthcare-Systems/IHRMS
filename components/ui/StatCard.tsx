import { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type Color = 'blue' | 'green' | 'orange' | 'amber' | 'red' | 'purple'
type TrendDir = 'up' | 'down' | 'flat'

interface StatCardProps {
  label: string
  value: ReactNode
  icon?: ReactNode
  color?: Color
  delta?: string | number
  trendDir?: TrendDir
  subtext?: string
  onClick?: () => void
  className?: string
}

const colorMap: Record<Color, string> = {
  blue:   'stat-card-blue',
  green:  'stat-card-green',
  orange: 'stat-card-orange',
  amber:  'stat-card-amber',
  red:    'stat-card-red',
  purple: 'stat-card-purple',
}

export function StatCard({
  label, value, icon, color = 'blue', delta, trendDir, subtext, onClick, className = '',
}: StatCardProps) {
  const classes = ['stat-card', colorMap[color], className, onClick ? 'cursor-pointer' : ''].filter(Boolean).join(' ')

  return (
    <div className={classes} onClick={onClick}>
      {icon && <div className="stat-card-icon">{icon}</div>}
      <div className="stat-card-value animate-count">{value}</div>
      <div className="stat-card-label">{label}</div>
      {(delta !== undefined || subtext) && (
        <div className={`stat-card-delta ${trendDir ?? ''}`}>
          {trendDir === 'up'   && <TrendingUp  size={13} />}
          {trendDir === 'down' && <TrendingDown size={13} />}
          {trendDir === 'flat' && <Minus size={13} />}
          {delta !== undefined && <span>{delta}</span>}
          {subtext && <span style={{ fontWeight: 400, color: 'var(--color-gray-400)', marginLeft: 4 }}>{subtext}</span>}
        </div>
      )}
    </div>
  )
}

interface StatGridProps {
  children: ReactNode
  cols?: 2 | 3 | 4
  className?: string
}

export function StatGrid({ children, className = '' }: StatGridProps) {
  return <div className={`stat-grid ${className}`}>{children}</div>
}
