'use client'

import { SYSTEM_CODES, type LeaveType } from '@/types/team-attendance'

type Props = { leaveTypes: LeaveType[] }

export function AttendanceLegend({ leaveTypes }: Props) {
  const systemItems = (Object.entries(SYSTEM_CODES) as Array<[keyof typeof SYSTEM_CODES, typeof SYSTEM_CODES[keyof typeof SYSTEM_CODES]]>)
  const tenantItems = leaveTypes.filter(l => l.is_active)

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18,
      padding: '10px 16px', borderTop: '0.5px solid #E2E8F0', background: '#F8FAFC',
      fontSize: 11, color: '#475569',
    }}>
      {systemItems.map(([code, def]) => (
        <LegendItem key={code} color={def.color} label={`${code} ${def.label}`} />
      ))}
      {tenantItems.length > 0 && (
        <span style={{ height: 16, width: 1, background: '#E2E8F0' }} aria-hidden="true" />
      )}
      {tenantItems.map(lt => (
        <LegendItem
          key={lt.id}
          color={lt.color_hex}
          letter={lt.letter ?? ''}
          label={`${lt.code} ${lt.label}`}
        />
      ))}
    </div>
  )
}

function LegendItem({ color, label, letter }: { color: string; label: string; letter?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 10, height: 10, borderRadius: '50%', background: color,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {letter && <span style={{ fontSize: 6, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{letter}</span>}
      </span>
      <span>{label}</span>
    </span>
  )
}
