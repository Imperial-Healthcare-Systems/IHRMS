import { ReactNode } from 'react'

type DotColor = 'green' | 'blue' | 'orange' | 'red' | 'amber' | 'purple' | 'gray'

interface TimelineItemData {
  id: string
  dot?: DotColor
  time?: string
  content: ReactNode
  actor?: string
}

interface TimelineProps {
  items: TimelineItemData[]
  className?: string
}

export function Timeline({ items, className = '' }: TimelineProps) {
  return (
    <div className={`timeline ${className}`}>
      {items.map(item => (
        <div key={item.id} className="timeline-item">
          <div className={`timeline-dot ${item.dot ?? 'gray'}`} />
          {item.time && <div className="timeline-time">{item.time}</div>}
          <div className="timeline-content">
            {item.actor && <span className="timeline-actor">{item.actor} </span>}
            {item.content}
          </div>
        </div>
      ))}
    </div>
  )
}
