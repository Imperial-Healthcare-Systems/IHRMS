'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import toast from 'react-hot-toast'
import { Network, ChevronDown, ChevronRight, Loader2, Search, Users, X } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
interface OrgNode {
  id: string
  first_name: string
  last_name: string
  emp_id: string
  role: string | null
  avatar_url: string | null
  manager_id: string | null
  department: { id: string; name: string } | null
  designation: { id: string; title: string } | null
  children: OrgNode[]
}

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function getInitials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

function countDescendants(node: OrgNode): number {
  if (!node.children.length) return 0
  return node.children.reduce((acc, c) => acc + 1 + countDescendants(c), 0)
}

function searchTree(node: OrgNode, q: string): boolean {
  const name = `${node.first_name} ${node.last_name}`.toLowerCase()
  const dept = node.department?.name.toLowerCase() ?? ''
  const desig = node.designation?.title.toLowerCase() ?? ''
  const id = node.emp_id.toLowerCase()
  if (name.includes(q) || dept.includes(q) || desig.includes(q) || id.includes(q)) return true
  return node.children.some(c => searchTree(c, q))
}

/* ─────────────────────────────────────────────────────────────
   NODE CARD
───────────────────────────────────────────────────────────── */
function NodeCard({
  node, depth, collapsed, onToggle, highlight, onSelect,
}: {
  node: OrgNode
  depth: number
  collapsed: boolean
  onToggle: () => void
  highlight: boolean
  onSelect: (n: OrgNode) => void
}) {
  const [hovered, setHovered] = useState(false)
  const hasChildren = node.children.length > 0
  const descCount   = countDescendants(node)

  const DEPTH_COLORS = ['#F47920', '#1d4ed8', '#16a34a', '#d97706', '#7c3aed', '#0891b2']
  const accent = DEPTH_COLORS[depth % DEPTH_COLORS.length]

  return (
    <div
      onClick={() => onSelect(node)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: highlight ? '#fff7ed' : '#fff',
        borderTop: `3px solid ${accent}`,
        borderRight: `1.5px solid ${highlight ? '#F47920' : hovered ? '#e2e8f0' : '#f1f5f9'}`,
        borderBottom: `1.5px solid ${highlight ? '#F47920' : hovered ? '#e2e8f0' : '#f1f5f9'}`,
        borderLeft: `1.5px solid ${highlight ? '#F47920' : hovered ? '#e2e8f0' : '#f1f5f9'}`,
        borderRadius: 12,
        padding: '12px 14px',
        minWidth: 160,
        maxWidth: 190,
        boxShadow: hovered ? '0 4px 20px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.05)',
        cursor: 'pointer',
        transition: 'all 150ms',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Avatar */}
      <div style={{ marginBottom: 8, position: 'relative' }}>
        {node.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={node.avatar_url} alt=""
            style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${accent}40` }}
          />
        ) : (
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: `linear-gradient(135deg, ${accent}22, ${accent}44)`,
            border: `2px solid ${accent}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: accent,
          }}>
            {getInitials(node.first_name, node.last_name)}
          </div>
        )}
      </div>

      {/* Name */}
      <p style={{ fontWeight: 700, color: '#111827', fontSize: '0.8rem', margin: '0 0 2px', textAlign: 'center', lineHeight: 1.3 }}>
        {node.first_name} {node.last_name}
      </p>

      {/* Designation */}
      {node.designation && (
        <p style={{ fontSize: '0.7rem', color: accent, fontWeight: 600, margin: '0 0 2px', textAlign: 'center', lineHeight: 1.3 }}>
          {node.designation.title}
        </p>
      )}

      {/* Department */}
      {node.department && (
        <p style={{ fontSize: '0.65rem', color: '#9ca3af', margin: '0 0 6px', textAlign: 'center' }}>
          {node.department.name}
        </p>
      )}

      {/* Emp ID */}
      <span style={{ fontSize: '0.62rem', color: '#cbd5e1', fontFamily: 'monospace', background: '#f8fafc', borderRadius: 4, padding: '1px 5px' }}>
        {node.emp_id}
      </span>

      {/* Collapse toggle */}
      {hasChildren && (
        <button
          onClick={e => { e.stopPropagation(); onToggle() }}
          style={{
            position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)',
            width: 22, height: 22, borderRadius: '50%',
            background: '#1E3A5F', border: '2px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 2, color: '#fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }}
          title={collapsed ? `Expand (${descCount} reports)` : 'Collapse'}
        >
          {collapsed
            ? <ChevronRight size={10} />
            : <ChevronDown size={10} />
          }
        </button>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   TREE RENDERER
───────────────────────────────────────────────────────────── */
function OrgTree({
  nodes, depth = 0, collapsedIds, onToggle, searchQ, onSelect,
}: {
  nodes: OrgNode[]
  depth?: number
  collapsedIds: Set<string>
  onToggle: (id: string) => void
  searchQ: string
  onSelect: (n: OrgNode) => void
}) {
  if (!nodes.length) return null

  const visible = searchQ
    ? nodes.filter(n => searchTree(n, searchQ.toLowerCase()))
    : nodes

  if (!visible.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', position: 'relative' }}>
        {visible.map((node, idx) => {
          const isCollapsed = collapsedIds.has(node.id)
          const highlight   = searchQ ? searchTree(node, searchQ.toLowerCase()) : false
          const hasChildren = node.children.length > 0

          return (
            <div key={node.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {/* Horizontal connector line from parent — only if siblings exist */}
              {visible.length > 1 && (
                <div style={{
                  position: 'absolute', top: 0, height: 2,
                  background: '#e2e8f0',
                  // left edge to right edge connecting siblings
                  left: idx === 0 ? '50%' : 0,
                  right: idx === visible.length - 1 ? '50%' : 0,
                  zIndex: 0,
                }} />
              )}

              {/* Vertical line from connector to card */}
              {depth > 0 && (
                <div style={{ width: 2, height: 24, background: '#e2e8f0', flexShrink: 0 }} />
              )}

              <NodeCard
                node={node}
                depth={depth}
                collapsed={isCollapsed}
                onToggle={() => onToggle(node.id)}
                highlight={highlight}
                onSelect={onSelect}
              />

              {/* Children */}
              {hasChildren && !isCollapsed && (
                <>
                  {/* Vertical line down from card to children */}
                  <div style={{ width: 2, height: 28, background: '#e2e8f0', flexShrink: 0 }} />
                  {/* Horizontal bar spanning children */}
                  {node.children.length > 1 && (
                    <div style={{
                      height: 2, background: '#e2e8f0',
                      alignSelf: 'stretch', marginBottom: 0,
                    }} />
                  )}
                  <OrgTree
                    nodes={node.children}
                    depth={depth + 1}
                    collapsedIds={collapsedIds}
                    onToggle={onToggle}
                    searchQ={searchQ}
                    onSelect={onSelect}
                  />
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   DETAIL PANEL
───────────────────────────────────────────────────────────── */
function DetailPanel({ node, onClose }: { node: OrgNode; onClose: () => void }) {
  const directReports = node.children.length
  const totalReports  = countDescendants(node)

  return (
    <div style={{
      position: 'fixed', inset: '0 0 0 auto', zIndex: 50, width: 320,
      background: '#fff', borderLeft: '1.5px solid #f1f5f9',
      boxShadow: '-4px 0 32px rgba(0,0,0,0.1)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1.5px solid #f1f5f9' }}>
        <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '0.9rem' }}>Employee Profile</p>
        <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
          <X size={13} />
        </button>
      </div>

      <div style={{ padding: '24px 20px', flex: 1, overflowY: 'auto' }}>
        {/* Avatar + name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
          {node.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={node.avatar_url} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', marginBottom: 12, border: '3px solid #F47920' }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #F47920, #FFB347)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 12, border: '3px solid rgba(244,121,32,0.3)' }}>
              {getInitials(node.first_name, node.last_name)}
            </div>
          )}
          <p style={{ fontWeight: 700, color: '#111827', fontSize: '1rem', margin: '0 0 4px', textAlign: 'center' }}>
            {node.first_name} {node.last_name}
          </p>
          {node.designation && (
            <p style={{ fontSize: '0.8rem', color: '#F47920', fontWeight: 600, margin: '0 0 4px', textAlign: 'center' }}>
              {node.designation.title}
            </p>
          )}
          {node.department && (
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0, textAlign: 'center' }}>
              {node.department.name}
            </p>
          )}
        </div>

        {/* Details grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Employee ID', value: node.emp_id },
            { label: 'Role',        value: node.role ?? '—' },
            { label: 'Department',  value: node.department?.name ?? '—' },
            { label: 'Designation', value: node.designation?.title ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '10px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>{label}</p>
              <p style={{ fontSize: '0.8rem', color: '#111827', fontWeight: 600, margin: 0 }}>{value}</p>
            </div>
          ))}

          {/* Reporting stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ padding: '12px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', textAlign: 'center' }}>
              <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1d4ed8', margin: '0 0 2px' }}>{directReports}</p>
              <p style={{ fontSize: '0.65rem', color: '#1d4ed8', opacity: 0.8, margin: 0, fontWeight: 600 }}>Direct Reports</p>
            </div>
            <div style={{ padding: '12px', background: '#fff7ed', borderRadius: 8, border: '1px solid #fed7aa', textAlign: 'center' }}>
              <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#E8622A', margin: '0 0 2px' }}>{totalReports}</p>
              <p style={{ fontSize: '0.65rem', color: '#E8622A', opacity: 0.8, margin: 0, fontWeight: 600 }}>Total Reports</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
export default function OrgChartPage() {
  const [roots, setRoots]           = useState<OrgNode[]>([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [collapsedIds, setCollapsed] = useState<Set<string>>(new Set())
  const [searchQ, setSearchQ]       = useState('')
  const [selected, setSelected]     = useState<OrgNode | null>(null)

  const fetchChart = useCallback(async () => {
    try {
      const res  = await fetch('/api/org-chart')
      const json = await res.json()
      setRoots(json.data ?? [])
      setTotal(json.total ?? 0)
    } catch {
      toast.error('Failed to load org chart')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchChart() }, [fetchChart])

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const expandAll  = () => setCollapsed(new Set())
  const collapseAll = () => {
    const allIds = new Set<string>()
    const collect = (nodes: OrgNode[]) => {
      for (const n of nodes) {
        if (n.children.length) { allIds.add(n.id); collect(n.children) }
      }
    }
    collect(roots)
    setCollapsed(allIds)
  }

  return (
    <>
      <Topbar
        title="Organisation Chart"
        subtitle={`${total} active employees across all departments`}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-outline btn-sm" onClick={expandAll}>Expand All</button>
          <button className="btn btn-outline btn-sm" onClick={collapseAll}>Collapse All</button>
        </div>
      </Topbar>

      <div style={{ padding: '16px 16px 56px' }} className="sm:!px-7">
        {/* Search + legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '0 0 300px' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="Search by name, department, or ID…"
              style={{ width: '100%', borderRadius: 8, border: '1.5px solid #e5e7eb', padding: '8px 11px 8px 34px', fontSize: '0.8125rem', color: '#111827', background: '#f9fafb', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#9ca3af' }}>
            <Users size={13} />
            {total} employees · Click any card to view details · Click the circle to collapse/expand
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '80px 24px', textAlign: 'center' }}>
            <Loader2 size={32} style={{ color: '#d1d5db', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#9ca3af', margin: 0 }}>Building org chart…</p>
          </div>
        ) : roots.length === 0 ? (
          <div className="card" style={{ padding: '64px 24px', textAlign: 'center' }}>
            <Network size={36} style={{ color: '#d1d5db', margin: '0 auto 14px' }} />
            <p style={{ fontWeight: 700, color: '#6b7280', margin: '0 0 6px' }}>No org chart data</p>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>Add employees and set manager relationships to build the hierarchy.</p>
          </div>
        ) : (
          <div style={{
            overflowX: 'auto', overflowY: 'visible',
            padding: '32px 24px 48px',
            background: 'repeating-linear-gradient(0deg, transparent, transparent 31px, #f8fafc 31px, #f8fafc 32px), repeating-linear-gradient(90deg, transparent, transparent 31px, #f8fafc 31px, #f8fafc 32px)',
            borderRadius: 16, border: '1.5px solid #f1f5f9',
            minHeight: 300,
          }}>
            <OrgTree
              nodes={roots}
              collapsedIds={collapsedIds}
              onToggle={toggleCollapse}
              searchQ={searchQ}
              onSelect={setSelected}
            />
          </div>
        )}
      </div>

      {/* Detail side panel */}
      {selected && (
        <>
          <div
            onClick={() => setSelected(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(15,23,42,0.2)', backdropFilter: 'blur(2px)' }}
          />
          <DetailPanel node={selected} onClose={() => setSelected(null)} />
        </>
      )}
    </>
  )
}
