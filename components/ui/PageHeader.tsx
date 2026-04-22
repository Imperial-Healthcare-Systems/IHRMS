import { ReactNode } from 'react'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  className?: string
}

export function PageHeader({ title, subtitle, actions, breadcrumbs, className = '' }: PageHeaderProps) {
  return (
    <div className={`page-header ${className}`}>
      <div className="page-header-text">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="breadcrumb" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} style={{ display: 'contents' }}>
                {i > 0 && <span className="breadcrumb-sep" aria-hidden="true">/</span>}
                {crumb.href
                  ? <a href={crumb.href}>{crumb.label}</a>
                  : <span>{crumb.label}</span>
                }
              </span>
            ))}
          </nav>
        )}
        <h1 className="page-header-title">{title}</h1>
        {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  )
}
