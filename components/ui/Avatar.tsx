import { HTMLAttributes } from 'react'
import Image from 'next/image'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
type AvatarColor = 'blue' | 'green' | 'orange' | 'purple' | 'amber' | 'red' | 'teal' | 'pink'
type StatusType = 'online' | 'away' | 'offline'

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null
  name?: string
  size?: AvatarSize
  color?: AvatarColor
  status?: StatusType
}

const sizeMap: Record<AvatarSize, string> = {
  xs:  'avatar-xs',
  sm:  'avatar-sm',
  md:  'avatar-md',
  lg:  'avatar-lg',
  xl:  'avatar-xl',
  '2xl': 'avatar-2xl',
}

const colorMap: Record<AvatarColor, string> = {
  blue:   'avatar-blue',
  green:  'avatar-green',
  orange: 'avatar-orange',
  purple: 'avatar-purple',
  amber:  'avatar-amber',
  red:    'avatar-red',
  teal:   'avatar-teal',
  pink:   'avatar-pink',
}

const pxMap: Record<AvatarSize, number> = {
  xs: 24, sm: 32, md: 40, lg: 52, xl: 68, '2xl': 88
}

function getInitials(name?: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

// Deterministic color from name
function nameToColor(name?: string): AvatarColor {
  const colors: AvatarColor[] = ['blue', 'green', 'orange', 'purple', 'amber', 'teal', 'pink', 'red']
  if (!name) return 'blue'
  const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

export function Avatar({ src, name, size = 'md', color, status, className = '', ...props }: AvatarProps) {
  const resolvedColor = color ?? nameToColor(name)
  const classes = ['avatar', sizeMap[size], colorMap[resolvedColor], className].filter(Boolean).join(' ')
  const px = pxMap[size]

  return (
    <div className="avatar-wrapper" style={{ display: 'inline-flex' }} {...props}>
      <div className={classes}>
        {src
          ? <Image src={src} alt={name ?? 'avatar'} width={px} height={px} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
          : <span>{getInitials(name)}</span>
        }
      </div>
      {status && <span className={`avatar-status ${status}`} />}
    </div>
  )
}

interface AvatarGroupProps {
  items: { src?: string | null; name?: string }[]
  max?: number
  size?: AvatarSize
}

export function AvatarGroup({ items, max = 4, size = 'sm' }: AvatarGroupProps) {
  const visible = items.slice(0, max)
  const overflow = items.length - max

  return (
    <div className="avatar-group">
      {visible.map((item, i) => (
        <Avatar key={i} src={item.src} name={item.name} size={size} />
      ))}
      {overflow > 0 && (
        <div className={`avatar ${sizeMap[size]} avatar-blue`} style={{ fontSize: '0.65rem', fontWeight: 700 }}>
          +{overflow}
        </div>
      )}
    </div>
  )
}
