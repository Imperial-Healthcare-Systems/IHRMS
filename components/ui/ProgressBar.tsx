type BarVariant = 'blue' | 'green' | 'orange' | 'amber' | 'red' | 'purple'

interface ProgressBarProps {
  value: number        // 0–100
  label?: string
  showValue?: boolean
  variant?: BarVariant
  thin?: boolean
  className?: string
}

const variantMap: Record<BarVariant, string> = {
  blue:   '',
  green:  'green',
  orange: 'orange',
  amber:  'amber',
  red:    'red',
  purple: 'purple',
}

export function ProgressBar({
  value, label, showValue = true, variant = 'blue', thin, className = '',
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value))

  return (
    <div className={`progress-bar-wrapper ${className}`}>
      {(label || showValue) && (
        <div className="progress-bar-header">
          {label && <span>{label}</span>}
          {showValue && <span>{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={`progress-bar-track ${thin ? 'thin' : ''}`}>
        <div
          className={`progress-bar-fill ${variantMap[variant]}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}
