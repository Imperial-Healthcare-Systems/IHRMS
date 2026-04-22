/** Imperial Design Language — TypeScript tokens (mirror of globals.css :root) */

export const colors = {
  // Brand
  imperialBlue:       '#1565C0',
  imperialBlueLight:  '#1976D2',
  saffron:            '#F47920',
  saffronLight:       '#FB8C3A',
  saffronDark:        '#E53E1A',
  forestGreen:        '#1A7A4A',
  forestGreenLight:   '#22A05F',
  navy:               '#0A1628',

  // Semantic
  success:            '#16a34a',
  successBg:          '#f0fdf4',
  successBorder:      '#bbf7d0',
  warning:            '#d97706',
  warningBg:          '#fffbeb',
  warningBorder:      '#fde68a',
  danger:             '#dc2626',
  dangerBg:           '#fef2f2',
  dangerBorder:       '#fecaca',
  info:               '#2563eb',
  infoBg:             '#eff6ff',
  infoBorder:         '#bfdbfe',

  // Neutrals
  gray50:   '#f9fafb',
  gray100:  '#f3f4f6',
  gray200:  '#e5e7eb',
  gray300:  '#d1d5db',
  gray400:  '#9ca3af',
  gray500:  '#6b7280',
  gray600:  '#4b5563',
  gray700:  '#374151',
  gray800:  '#1f2937',
  gray900:  '#111827',

  // Surface
  surfaceBg:      '#f4f6fa',
  surfaceCard:    '#ffffff',
  surfaceSidebar: '#0A1628',
  surfaceTopbar:  '#ffffff',
} as const

export const typography = {
  fontHeading: "'Outfit', system-ui, sans-serif",
  fontBody:    "'Inter', system-ui, sans-serif",
  baseSize:    '15px',
  lineHeight:  1.6,
} as const

export const radius = {
  sm:   '6px',
  md:   '10px',
  lg:   '14px',
  xl:   '20px',
  full: '9999px',
} as const

export const shadow = {
  xs:  '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm:  '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
  md:  '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
  lg:  '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
  xl:  '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.05)',
} as const

export const spacing = {
  xs:  '4px',
  sm:  '8px',
  md:  '16px',
  lg:  '24px',
  xl:  '32px',
  '2xl': '48px',
  '3xl': '64px',
} as const

export const transition = {
  fast:   '150ms ease',
  normal: '200ms ease',
  slow:   '300ms ease',
} as const

export const zIndex = {
  sidebar: 40,
  topbar:  50,
  modal:   100,
  toast:   200,
} as const

export const layout = {
  sidebarWidth: '248px',
  topbarHeight: '60px',
} as const

/** Stat card accent colours keyed by semantic name */
export const statCardColors = {
  blue:   { border: colors.imperialBlue, iconBg: '#dbeafe', iconColor: colors.imperialBlue },
  green:  { border: colors.forestGreen,  iconBg: '#d1fae5', iconColor: colors.forestGreen  },
  orange: { border: colors.saffron,      iconBg: '#ffedd5', iconColor: colors.saffronDark  },
  amber:  { border: '#f59e0b',           iconBg: '#fef3c7', iconColor: '#b45309'           },
  red:    { border: colors.danger,       iconBg: '#fee2e2', iconColor: colors.danger       },
  purple: { border: '#7c3aed',           iconBg: '#ede9fe', iconColor: '#6d28d9'           },
} as const
