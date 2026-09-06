'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from '@/lib/use-session'
import { Topbar } from '@/components/layout/Topbar'
import toast from 'react-hot-toast'
import {
  GraduationCap, Plus, X, Loader2, Users, Calendar,
  CheckCircle, Clock, BookOpen, Award, Play, Trash2, Link as LinkIcon, Upload, Video,
} from 'lucide-react'

interface Enrollment {
  id: string
  employee_id: string
  status: string
  completed_at: string | null
}

interface Course {
  id: string
  title: string
  description: string | null
  trainer: string | null
  start_date: string | null
  end_date: string | null
  status: string
  created_at: string
  enrollments: Enrollment[]
}

const FIELD_STYLE: React.CSSProperties = {
  width: '100%', borderRadius: 8, border: '1.5px solid #e5e7eb',
  padding: '8px 11px', fontSize: '0.8125rem', color: '#111827',
  background: '#f9fafb', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}
const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', fontWeight: 600,
  color: '#374151', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em',
}

const STATUS_CFG: Record<string, { bg: string; color: string; border: string; label: string }> = {
  upcoming:   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Upcoming' },
  ongoing:    { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: 'Ongoing' },
  completed:  { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Completed' },
  cancelled:  { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb', label: 'Cancelled' },
}

const ADMIN_ROLES = ['hr_admin', 'super_admin', 'admin', 'hr']

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function NewCourseModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle]       = useState('')
  const [desc, setDesc]         = useState('')
  const [trainer, setTrainer]   = useState('')
  const [startDate, setStart]   = useState('')
  const [endDate, setEnd]       = useState('')
  const [saving, setSaving]     = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: desc || null, trainer: trainer || null, start_date: startDate || null, end_date: endDate || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Course created successfully')
      onSuccess()
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to create course')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'white', width: 520, maxWidth: '95vw', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1.5px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GraduationCap size={16} color="#E8622A" />
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827', margin: 0 }}>Create Training Course</p>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
            <X size={13} />
          </button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={LABEL_STYLE}>Course Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Fire Safety Training" style={FIELD_STYLE} />
          </div>
          <div>
            <label style={LABEL_STYLE}>Trainer / Facilitator</label>
            <input value={trainer} onChange={e => setTrainer(e.target.value)} placeholder="Internal or external trainer name" style={FIELD_STYLE} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL_STYLE}>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStart(e.target.value)} style={FIELD_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>End Date</label>
              <input type="date" value={endDate} onChange={e => setEnd(e.target.value)} style={FIELD_STYLE} />
            </div>
          </div>
          <div>
            <label style={LABEL_STYLE}>Description <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9ca3af' }}>(optional)</span></label>
            <textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="What will employees learn?" style={{ ...FIELD_STYLE, resize: 'none', lineHeight: 1.55 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: 'white', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.8125rem' }}>Cancel</button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ flex: 2, padding: '9px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #E8622A 0%, #F47920 100%)', color: 'white', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.8125rem', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
              {saving ? 'Creating…' : 'Create Course'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
   COURSE DETAIL MODAL — content list + admin add/delete + video player
   ────────────────────────────────────────────────────────────────── */

interface CourseContent {
  id: string
  course_id: string
  title: string
  description: string | null
  content_type: 'video' | 'document' | 'link' | 'youtube' | 'vimeo'
  storage_path: string | null
  external_url: string | null
  duration_seconds: number | null
  display_order: number
  created_at: string
  completed_by_me?: boolean
}

interface CourseProgress {
  total: number
  done: number
  percentage: number
}

function CourseDetailModal({
  course, isAdmin, isEnrolled, onClose, onCourseCompleted,
}: { course: Course; isAdmin: boolean; isEnrolled: boolean; onClose: () => void; onCourseCompleted?: () => void }) {
  const [items, setItems]               = useState<CourseContent[]>([])
  const [progress, setProgress]         = useState<CourseProgress>({ total: 0, done: 0, percentage: 0 })
  const [loading, setLoading]           = useState(true)
  const [activeUrl, setActiveUrl]       = useState<{ url: string; type: string; contentType: CourseContent['content_type']; contentId: string } | null>(null)
  const [activeTitle, setActiveTitle]   = useState('')
  const [streamingId, setStreamingId]   = useState<string | null>(null)
  const [markingId, setMarkingId]       = useState<string | null>(null)
  const iframeRef                       = useRef<HTMLIFrameElement | null>(null)
  const markCompleteRef                 = useRef<(id: string, silent?: boolean) => void>(() => {})

  // Add-content form state (admin only)
  const [showAdd, setShowAdd]           = useState(false)
  const [newTitle, setNewTitle]         = useState('')
  const [newDesc, setNewDesc]           = useState('')
  const [newType, setNewType]           = useState<'youtube' | 'vimeo' | 'link' | 'video'>('youtube')
  const [newUrl, setNewUrl]             = useState('')
  const [uploadFile, setUploadFile]     = useState<File | null>(null)
  const [saving, setSaving]             = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const refresh = useCallback(() => {
    setLoading(true)
    fetch(`/api/training/${course.id}/content`)
      .then(r => r.json())
      .then(j => {
        setItems(j.data ?? [])
        setProgress(j.progress ?? { total: 0, done: 0, percentage: 0 })
      })
      .catch(() => toast.error('Failed to load course content'))
      .finally(() => setLoading(false))
  }, [course.id])

  useEffect(() => { refresh() }, [refresh])

  async function play(item: CourseContent) {
    if (!isEnrolled && !isAdmin) {
      toast.error('Enrol in this course to access content')
      return
    }
    setStreamingId(item.id)
    try {
      const res = await fetch(`/api/training/${course.id}/stream/${item.id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      // Transform YouTube/Vimeo watch URLs into embeddable iframe URLs.
      // Include enablejsapi=1 (YouTube) so the IFrame API can post state-change events
      // back to the parent window — that's how we auto-mark complete on natural end.
      let finalUrl: string = json.url
      if (item.content_type === 'youtube') {
        const m = finalUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/)
        if (m) finalUrl = `https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0&enablejsapi=1`
      } else if (item.content_type === 'vimeo') {
        const m = finalUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/)
        if (m) finalUrl = `https://player.vimeo.com/video/${m[1]}?autoplay=1`
      }

      setActiveUrl({ url: finalUrl, type: json.type, contentType: item.content_type, contentId: item.id })
      setActiveTitle(item.title)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load video')
    } finally {
      setStreamingId(null)
    }
  }

  async function markComplete(contentId: string, silent = false) {
    if (!isEnrolled && !isAdmin) return
    setMarkingId(contentId)
    try {
      const res = await fetch(`/api/training/${course.id}/content/${contentId}/complete`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      // Optimistically mark this item; the next refresh will re-sync
      setItems(prev => prev.map(it => it.id === contentId ? { ...it, completed_by_me: true } : it))
      setProgress({ total: json.total, done: json.done, percentage: json.percentage })

      if (!silent) toast.success('Marked as watched')
      if (json.course_completed) {
        toast.success('🎉 Course completed!', { duration: 4000 })
        onCourseCompleted?.()
      }
    } catch (e: unknown) {
      if (!silent) toast.error(e instanceof Error ? e.message : 'Failed to mark complete')
    } finally {
      setMarkingId(null)
    }
  }

  async function handleAdd() {
    if (!newTitle) { toast.error('Title required'); return }
    setSaving(true)
    try {
      let storage_path: string | null = null
      let external_url: string | null = null

      if (newType === 'video' && uploadFile) {
        // Step 1: get signed upload URL
        const urlRes = await fetch(`/api/training/${course.id}/upload-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_name: uploadFile.name, content_type: uploadFile.type }),
        })
        const urlJson = await urlRes.json()
        if (!urlRes.ok) throw new Error(urlJson.error ?? 'Failed to get upload URL')

        // Step 2: PUT file directly to Supabase Storage with progress tracking
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', urlJson.signed_url)
          xhr.setRequestHeader('Content-Type', uploadFile.type || 'application/octet-stream')
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100))
          }
          xhr.onload  = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`))
          xhr.onerror = () => reject(new Error('Upload network error'))
          xhr.send(uploadFile)
        })

        storage_path = urlJson.path
      } else {
        if (!newUrl) { toast.error('URL required'); setSaving(false); return }
        external_url = newUrl
      }

      // Step 3: register the content
      const res = await fetch(`/api/training/${course.id}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc || null,
          content_type: newType,
          storage_path,
          external_url,
          display_order: items.length,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      toast.success('Content added!')
      setItems(prev => [...prev, json.data])
      setShowAdd(false)
      setNewTitle(''); setNewDesc(''); setNewUrl(''); setUploadFile(null); setUploadProgress(0)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add content')
    } finally {
      setSaving(false); setUploadProgress(0)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this content? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/training/${course.id}/content/${id}`, { method: 'DELETE' })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error) }
      setItems(prev => prev.filter(x => x.id !== id))
      toast.success('Removed')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  function embedUrl(item: CourseContent): string {
    const url = item.external_url ?? ''
    if (item.content_type === 'youtube') {
      const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\/]+)/)
      if (m) return `https://www.youtube.com/embed/${m[1]}`
    }
    if (item.content_type === 'vimeo') {
      const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
      if (m) return `https://player.vimeo.com/video/${m[1]}`
    }
    return url
  }

  // Keep a ref to markComplete so the useEffect below doesn't have to re-run
  // (and tear down the player) every time `items` changes
  useEffect(() => {
    markCompleteRef.current = markComplete
  })

  /* ─────────────────────────────────────────────────────────────
     Auto-track playback for YouTube + Vimeo embeds.
     - YouTube: load the IFrame API once, create a YT.Player around the iframe,
       fire markComplete on state === ENDED (0)
     - Vimeo:   load player.js once, create Vimeo.Player(iframe), listen 'ended'
     - HTML5 video and external links handle themselves elsewhere
     ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!activeUrl) return
    if (activeUrl.contentType !== 'youtube' && activeUrl.contentType !== 'vimeo') return
    if (!iframeRef.current) return

    const iframe       = iframeRef.current
    const contentId    = activeUrl.contentId
    const contentType  = activeUrl.contentType
    let cancelled      = false
    let cleanupPlayer  = () => {}

    const onEnded = () => {
      if (cancelled) return
      // Mark silently — toast for course completion still fires from inside markComplete
      const fn = markCompleteRef.current
      const item = items.find(it => it.id === contentId)
      if (item?.completed_by_me) return
      fn(contentId, true)
    }

    function loadScript(src: string): Promise<void> {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
        const s = document.createElement('script')
        s.src = src; s.async = true
        s.onload = () => resolve()
        s.onerror = () => reject(new Error(`Failed to load ${src}`))
        document.body.appendChild(s)
      })
    }

    if (contentType === 'youtube') {
      const w = window as any
      const setup = () => {
        if (cancelled || !w.YT?.Player) return
        try {
          const player = new w.YT.Player(iframe, {
            events: {
              onStateChange: (e: { data: number }) => {
                // YT.PlayerState.ENDED === 0
                if (e.data === 0) onEnded()
              },
            },
          })
          cleanupPlayer = () => { try { player.destroy?.() } catch { /* noop */ } }
        } catch (err) {
          console.warn('[training] YT.Player init failed (auto-track disabled):', err)
        }
      }

      if (w.YT?.Player) {
        setup()
      } else {
        // The IFrame API calls a global `onYouTubeIframeAPIReady` once it's loaded.
        // Chain into any existing handler so we don't clobber other pages' setup.
        const prev = w.onYouTubeIframeAPIReady
        w.onYouTubeIframeAPIReady = () => { try { prev?.() } catch { /* noop */ } setup() }
        loadScript('https://www.youtube.com/iframe_api').catch(err => console.warn('[training]', err))
      }
    } else if (contentType === 'vimeo') {
      loadScript('https://player.vimeo.com/api/player.js').then(() => {
        if (cancelled) return
        const w = window as any
        if (!w.Vimeo?.Player) return
        try {
          const player = new w.Vimeo.Player(iframe)
          player.on('ended', onEnded)
          cleanupPlayer = () => { try { player.off('ended', onEnded); player.destroy?.() } catch { /* noop */ } }
        } catch (err) {
          console.warn('[training] Vimeo.Player init failed (auto-track disabled):', err)
        }
      }).catch(err => console.warn('[training]', err))
    }

    return () => {
      cancelled = true
      cleanupPlayer()
    }
  // Intentionally excluding `items` — markCompleteRef provides the latest closure
  // and re-running on items change would tear down the active player mid-watch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUrl?.contentId, activeUrl?.contentType])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 880, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, margin: 0 }}>Course</p>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: '4px 0 0' }}>{course.title}</h2>
            {course.description && <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '6px 0 0' }}>{course.description}</p>}

            {/* Progress bar — visible to enrolled users (and admins) */}
            {(isEnrolled || isAdmin) && progress.total > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151' }}>
                    {progress.done} of {progress.total} watched
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: progress.percentage === 100 ? '#16a34a' : '#E8622A' }}>
                    {progress.percentage}%
                  </span>
                </div>
                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${progress.percentage}%`,
                    background: progress.percentage === 100
                      ? 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)'
                      : 'linear-gradient(90deg, #E8622A 0%, #F47920 100%)',
                    transition: 'width 300ms ease',
                  }} />
                </div>
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>

        {/* Player area */}
        {activeUrl && (() => {
          const activeItem  = items.find(it => it.id === activeUrl.contentId)
          const alreadyDone = !!activeItem?.completed_by_me
          return (
            <div style={{ padding: '14px 22px', background: '#0f172a' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10, flexWrap: 'wrap' }}>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem', margin: 0, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeTitle}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(isEnrolled || isAdmin) && !alreadyDone && (
                    <button
                      onClick={() => markComplete(activeUrl.contentId)}
                      disabled={markingId === activeUrl.contentId}
                      style={{ background: '#16a34a', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                      title="Mark this video as watched"
                    >
                      {markingId === activeUrl.contentId
                        ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                        : <CheckCircle size={11} />}
                      Mark watched
                    </button>
                  )}
                  {alreadyDone && (
                    <span style={{ background: '#064e3b', border: '1px solid #16a34a', color: '#bbf7d0', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CheckCircle size={11} /> Watched
                    </span>
                  )}
                  <button onClick={() => setActiveUrl(null)} style={{ background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 6, padding: '3px 10px', fontSize: '0.75rem', cursor: 'pointer' }}>Close player</button>
                </div>
              </div>
              <div style={{ aspectRatio: '16/9', width: '100%', background: '#000', borderRadius: 8, overflow: 'hidden' }}>
                {activeUrl.type === 'storage' || activeUrl.contentType === 'video' ? (
                  <video
                    controls autoPlay
                    style={{ width: '100%', height: '100%' }}
                    src={activeUrl.url}
                    onEnded={() => { if (!alreadyDone) markComplete(activeUrl.contentId, true) }}
                  />
                ) : activeUrl.contentType === 'youtube' || activeUrl.contentType === 'vimeo' ? (
                  <iframe
                    ref={iframeRef}
                    src={activeUrl.url}
                    style={{ width: '100%', height: '100%', border: 0 }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <a href={activeUrl.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, gap: 8 }}>
                    <LinkIcon size={16} /> Open external link
                  </a>
                )}
              </div>
            </div>
          )
        })()}

        {/* Content list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }}>
          {/* Lock notice for non-enrolled, non-admin users */}
          {!isEnrolled && !isAdmin && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 10, padding: '10px 14px', fontSize: '0.8rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={14} />
              Enrol in this course to unlock the videos and materials.
            </div>
          )}

          {/* Admin: Add content button */}
          {isAdmin && !showAdd && (
            <button onClick={() => setShowAdd(true)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1.5px dashed #d1d5db', background: '#fafafa', color: '#374151', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Plus size={14} /> Add content
            </button>
          )}

          {/* Add content form */}
          {isAdmin && showAdd && (
            <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 14, background: '#f9fafb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', margin: 0 }}>Add new content</p>
                <button onClick={() => { setShowAdd(false); setUploadFile(null); setNewUrl('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={14} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={LABEL_STYLE}>Title *</label>
                  <input value={newTitle} onChange={e => setNewTitle(e.target.value)} style={FIELD_STYLE} placeholder="e.g. Introduction to AR Follow-ups" />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Description</label>
                  <input value={newDesc} onChange={e => setNewDesc(e.target.value)} style={FIELD_STYLE} placeholder="Optional short description" />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Source type</label>
                  <select value={newType} onChange={e => { setNewType(e.target.value as any); setUploadFile(null); setNewUrl('') }} style={FIELD_STYLE}>
                    <option value="youtube">YouTube link</option>
                    <option value="vimeo">Vimeo link</option>
                    <option value="link">External link / document</option>
                    <option value="video">Upload video file</option>
                  </select>
                </div>
                {newType === 'video' ? (
                  <div>
                    <label style={LABEL_STYLE}>Video file</label>
                    <input type="file" accept="video/*" onChange={e => setUploadFile(e.target.files?.[0] ?? null)} style={{ ...FIELD_STYLE, padding: 8 }} />
                    {uploadFile && <p style={{ fontSize: '0.72rem', color: '#6b7280', margin: '4px 0 0' }}>{uploadFile.name} · {(uploadFile.size / 1024 / 1024).toFixed(1)} MB</p>}
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div style={{ marginTop: 6, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${uploadProgress}%`, background: '#F47920', transition: 'width 200ms' }} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label style={LABEL_STYLE}>URL</label>
                    <input value={newUrl} onChange={e => setNewUrl(e.target.value)} style={FIELD_STYLE} placeholder={newType === 'youtube' ? 'https://www.youtube.com/watch?v=...' : newType === 'vimeo' ? 'https://vimeo.com/...' : 'https://...'} />
                  </div>
                )}
                <button onClick={handleAdd} disabled={saving} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #E8622A 0%, #F47920 100%)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {saving ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />{uploadProgress > 0 ? `Uploading ${uploadProgress}%` : 'Saving…'}</> : <><Plus size={13} /> Add to course</>}
                </button>
              </div>
            </div>
          )}

          {/* Content list */}
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 8 }} />Loading…</div>
          ) : items.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#6b7280' }}>
              <BookOpen size={32} color="#d1d5db" style={{ marginBottom: 10 }} />
              <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>No content added yet</p>
              <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '4px 0 0' }}>{isAdmin ? 'Add the first video or material above.' : 'The instructor hasn\'t added any content yet.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((item, idx) => {
                const Icon    = item.content_type === 'document' ? BookOpen : item.content_type === 'link' ? LinkIcon : Video
                const canPlay = isEnrolled || isAdmin
                const done    = !!item.completed_by_me
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: done ? '#f0fdf4' : '#fff', borderTop: `1px solid ${done ? '#bbf7d0' : '#f1f5f9'}`, borderRight: `1px solid ${done ? '#bbf7d0' : '#f1f5f9'}`, borderBottom: `1px solid ${done ? '#bbf7d0' : '#f1f5f9'}`, borderLeft: `1px solid ${done ? '#bbf7d0' : '#f1f5f9'}` }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: done ? '#16a34a' : '#fff7ed', color: done ? '#fff' : '#E8622A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                      {done ? <CheckCircle size={14} /> : idx + 1}
                    </div>
                    <Icon size={15} color={done ? '#16a34a' : '#6b7280'} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</p>
                      {item.description && <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</p>}
                    </div>
                    <button
                      onClick={() => play(item)}
                      disabled={!canPlay || streamingId === item.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: 'none', background: canPlay ? (done ? '#16a34a' : '#0f172a') : '#e5e7eb', color: canPlay ? '#fff' : '#9ca3af', fontSize: '0.75rem', fontWeight: 600, cursor: canPlay ? 'pointer' : 'not-allowed' }}
                      title={canPlay ? (done ? 'Re-watch' : 'Play') : 'Enrol to unlock'}
                    >
                      {streamingId === item.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={11} />}
                      {canPlay ? (done ? 'Re-watch' : 'Play') : 'Locked'}
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Delete content">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
   LEARNER DASHBOARD — admin-only learner & course progress tracking
   ────────────────────────────────────────────────────────────────── */

interface DashboardStats {
  total_enrollments: number
  completed_enrollments: number
  unique_learners: number
  avg_progress: number
  completion_rate: number
  total_courses: number
}

interface DashboardEnrollment {
  id: string
  employee: { id: string; first_name: string; last_name: string; emp_id: string; avatar_url: string | null; department: { id: string; name: string } | null } | null
  course:   { id: string; title: string; status: string }
  status:   string
  enrolled_at:  string | null
  completed_at: string | null
  score:        number | null
  progress: { total: number; done: number; percentage: number }
}

interface CourseRollup {
  course_id: string; title: string; status: string
  total_content: number; total_enrolled: number; completed: number
  avg_progress: number; completion_rate: number
}

function LearnerDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats]                 = useState<DashboardStats | null>(null)
  const [enrollments, setEnrollments]     = useState<DashboardEnrollment[]>([])
  const [courseBreakdown, setCourseRows]  = useState<CourseRollup[]>([])
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState<'all' | 'pending' | 'completed'>('all')
  const [courseFilter, setCourseFilter]   = useState<string>('all')

  useEffect(() => {
    setLoading(true)
    fetch('/api/training/admin/overview')
      .then(r => r.json())
      .then(j => {
        if (j.error) { toast.error(j.error); return }
        setStats(j.stats)
        setEnrollments(j.enrollments ?? [])
        setCourseRows(j.course_breakdown ?? [])
      })
      .catch(() => toast.error('Failed to load learner dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = enrollments.filter(e => {
    if (courseFilter !== 'all' && e.course.id !== courseFilter) return false
    if (statusFilter === 'completed' && !(e.status === 'completed' || e.progress.percentage === 100)) return false
    if (statusFilter === 'pending'   && (e.status === 'completed' || e.progress.percentage === 100)) return false
    if (search) {
      const q = search.toLowerCase()
      const name  = e.employee ? `${e.employee.first_name} ${e.employee.last_name}`.toLowerCase() : ''
      const empId = e.employee?.emp_id?.toLowerCase() ?? ''
      const ttl   = e.course.title.toLowerCase()
      if (!name.includes(q) && !empId.includes(q) && !ttl.includes(q)) return false
    }
    return true
  })

  if (loading) {
    return (
      <div style={{ padding: '64px 24px', textAlign: 'center' }}>
        <Loader2 size={28} style={{ color: '#d1d5db', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#9ca3af', margin: 0 }}>Loading learner dashboard…</p>
      </div>
    )
  }

  return (
    <div>
      {/* Top stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Enrolments',  value: stats.total_enrollments,     color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', icon: Users },
            { label: 'Completed',         value: stats.completed_enrollments, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: Award },
            { label: 'Completion Rate',   value: `${stats.completion_rate}%`, color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe', icon: CheckCircle },
            { label: 'Avg Progress',      value: `${stats.avg_progress}%`,    color: '#E8622A', bg: '#fff7ed', border: '#fed7aa', icon: BookOpen },
            { label: 'Active Learners',   value: stats.unique_learners,       color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: GraduationCap },
            { label: 'Courses with Data', value: stats.total_courses,         color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', icon: Calendar },
          ].map(({ label, value, color, bg, border, icon: Icon }) => (
            <div key={label} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, borderTop: `1.5px solid ${border}`, borderRight: `1.5px solid ${border}`, borderBottom: `1.5px solid ${border}`, borderLeft: `1.5px solid ${border}`, background: bg }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={13} style={{ color }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, color, margin: 0, lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: '0.65rem', color, opacity: 0.85, margin: '2px 0 0', fontWeight: 500 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Per-course rollup */}
      {courseBreakdown.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Course Breakdown</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {courseBreakdown.map(c => (
              <div key={c.course_id} className="card" style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={() => setCourseFilter(c.course_id === courseFilter ? 'all' : c.course_id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <p style={{ fontWeight: 700, color: '#111827', fontSize: '0.85rem', margin: 0, lineHeight: 1.3, flex: 1 }}>{c.title}</p>
                  {courseFilter === c.course_id && <span style={{ fontSize: '0.65rem', color: '#E8622A', fontWeight: 700 }}>● Filtered</span>}
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: '0.72rem', color: '#6b7280' }}>
                  <span><strong style={{ color: '#111827' }}>{c.total_enrolled}</strong> enrolled</span>
                  <span><strong style={{ color: '#16a34a' }}>{c.completed}</strong> done</span>
                  <span><strong style={{ color: '#E8622A' }}>{c.total_content}</strong> items</span>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#9ca3af', marginBottom: 4 }}>
                    <span>Avg progress</span><span style={{ fontWeight: 700, color: c.avg_progress === 100 ? '#16a34a' : '#374151' }}>{c.avg_progress}%</span>
                  </div>
                  <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${c.avg_progress}%`, background: c.avg_progress === 100 ? '#16a34a' : 'linear-gradient(90deg, #E8622A 0%, #F47920 100%)', transition: 'width 300ms' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search learner, ID, or course…"
          style={{ ...FIELD_STYLE, flex: '1 1 240px', maxWidth: 360 }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} style={{ ...FIELD_STYLE, flex: '0 0 140px' }}>
          <option value="all">All status</option>
          <option value="pending">In progress</option>
          <option value="completed">Completed</option>
        </select>
        {courseFilter !== 'all' && (
          <button onClick={() => setCourseFilter('all')} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <X size={11} /> Clear course filter
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#6b7280' }}>{filtered.length} of {enrollments.length}</span>
      </div>

      {/* Learner table */}
      {filtered.length === 0 ? (
        <div style={{ padding: '40px 16px', textAlign: 'center', color: '#9ca3af' }}>
          <Users size={28} color="#d1d5db" style={{ marginBottom: 8 }} />
          <p style={{ margin: 0, fontWeight: 600, color: '#6b7280' }}>No enrolments match your filters</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Learner', 'Department', 'Course', 'Progress', 'Status', 'Enrolled', 'Completed'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => {
                const name      = e.employee ? `${e.employee.first_name} ${e.employee.last_name}` : '—'
                const initials  = e.employee ? `${e.employee.first_name[0] ?? ''}${e.employee.last_name[0] ?? ''}`.toUpperCase() : '?'
                const isDone    = e.status === 'completed' || e.progress.percentage === 100
                const pctColor  = isDone ? '#16a34a' : e.progress.percentage >= 50 ? '#E8622A' : '#9ca3af'
                return (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f8fafc', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #F47920, #E8622A)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>{initials}</div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 600, color: '#111827', margin: 0 }}>{name}</p>
                          <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: 0 }}>{e.employee?.emp_id ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>{e.employee?.department?.name ?? '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#374151', fontWeight: 500 }}>{e.course.title}</td>
                    <td style={{ padding: '10px 12px', minWidth: 180 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', minWidth: 80 }}>
                          <div style={{ height: '100%', width: `${e.progress.percentage}%`, background: isDone ? 'linear-gradient(90deg, #16a34a, #22c55e)' : 'linear-gradient(90deg, #E8622A, #F47920)' }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: pctColor, minWidth: 36, textAlign: 'right' }}>{e.progress.percentage}%</span>
                      </div>
                      <p style={{ fontSize: '0.65rem', color: '#9ca3af', margin: '3px 0 0' }}>{e.progress.done} / {e.progress.total} items</p>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {isDone ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: '#f0fdf4', color: '#16a34a', fontSize: '0.7rem', fontWeight: 600, border: '1px solid #bbf7d0' }}>
                          <CheckCircle size={10} /> Completed
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: '#fffbeb', color: '#b45309', fontSize: '0.7rem', fontWeight: 600, border: '1px solid #fde68a' }}>
                          <Clock size={10} /> In progress
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(e.enrolled_at)}</td>
                    <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(e.completed_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function TrainingPage() {
  const { data: session } = useSession()
  const isAdmin   = ADMIN_ROLES.includes((session?.user as any)?.role ?? '')
  const myId      = (session?.user as any)?.id as string | undefined

  const [courses, setCourses]     = useState<Course[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter]       = useState('all')
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [openCourse, setOpenCourse] = useState<Course | null>(null)
  const [view, setView]             = useState<'courses' | 'dashboard'>('courses')

  const fetchCourses = useCallback(async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const res  = await fetch(`/api/training${params}`)
      const json = await res.json()
      setCourses(json.data ?? [])
    } catch {
      toast.error('Failed to load courses')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchCourses() }, [fetchCourses])

  const enroll = async (courseId: string) => {
    setEnrolling(courseId)
    try {
      const res = await fetch('/api/training', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enroll', course_id: courseId, employee_id: myId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Enrolled successfully')
      fetchCourses()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Enrolment failed')
    } finally {
      setEnrolling(null)
    }
  }

  const markComplete = async (courseId: string) => {
    setEnrolling(courseId)
    try {
      const res = await fetch('/api/training', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', course_id: courseId, employee_id: myId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Marked as completed')
      fetchCourses()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to mark complete')
    } finally {
      setEnrolling(null)
    }
  }

  const totalCourses    = courses.length
  const upcoming        = courses.filter(c => c.status === 'upcoming').length
  const myEnrolled      = courses.filter(c => c.enrollments?.some(e => e.employee_id === myId)).length
  const myCompleted     = courses.filter(c => c.enrollments?.some(e => e.employee_id === myId && e.status === 'completed')).length

  const FILTERS = ['all', 'upcoming', 'ongoing', 'completed']

  return (
    <>
      {showModal && <NewCourseModal onClose={() => setShowModal(false)} onSuccess={fetchCourses} />}
      {openCourse && (
        <CourseDetailModal
          course={openCourse}
          isAdmin={isAdmin}
          isEnrolled={!!openCourse.enrollments?.some(e => e.employee_id === myId)}
          onClose={() => setOpenCourse(null)}
          onCourseCompleted={fetchCourses}
        />
      )}

      <Topbar title="Training & Development" subtitle="Courses, certifications, and L&D programmes">
        {isAdmin && (
          <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowModal(true)}>
            <Plus size={14} /> New Course
          </button>
        )}
      </Topbar>

      <div style={{ padding: '16px 16px 56px' }} className="sm:!px-7">
        {/* Admin tab strip */}
        {isAdmin && (
          <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #f1f5f9', marginBottom: 16 }}>
            {([['courses', 'Courses', BookOpen], ['dashboard', 'Learner Dashboard', Users]] as const).map(([key, label, Icon]) => {
              const active = view === key
              return (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  style={{
                    padding: '10px 18px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    background: 'none',
                    borderTop: 0, borderLeft: 0, borderRight: 0,
                    borderBottom: active ? '2px solid #E8622A' : '2px solid transparent',
                    marginBottom: '-2px',
                    color: active ? '#E8622A' : '#6b7280',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Icon size={13} /> {label}
                </button>
              )
            })}
          </div>
        )}

        {view === 'dashboard' && isAdmin
          ? <LearnerDashboard />
          : <>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Courses', value: totalCourses, color: '#E8622A', bg: '#fff7ed', border: '#fed7aa', icon: BookOpen },
            { label: 'Upcoming',      value: upcoming,     color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', icon: Calendar },
            { label: 'My Enrolments', value: myEnrolled,   color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: Users },
            { label: 'Completed',     value: myCompleted,  color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: Award },
          ].map(({ label, value, color, bg, border, icon: Icon }) => (
            <div key={label} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, border: `1.5px solid ${border}`, background: bg }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={14} style={{ color }} />
              </div>
              <div>
                <p style={{ fontSize: '1.2rem', fontWeight: 800, color, margin: 0, lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: '0.65rem', color, opacity: 0.8, margin: '2px 0 0', fontWeight: 500 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {FILTERS.map(f => {
            const active = filter === f
            return (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '5px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', background: active ? '#1E3A5F' : '#fff', color: active ? '#fff' : '#6b7280', border: active ? '1.5px solid #1E3A5F' : '1.5px solid #e5e7eb' }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            )
          })}
        </div>

        {/* Course cards */}
        {loading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Loader2 size={28} style={{ color: '#d1d5db', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.875rem' }}>Loading courses…</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <GraduationCap size={32} style={{ color: '#d1d5db', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, color: '#6b7280', margin: '0 0 4px', fontSize: '0.875rem' }}>No courses found</p>
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.8rem' }}>
              {isAdmin ? 'Create the first training course.' : 'No training courses are available yet.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {courses.map(course => {
              const cfg         = STATUS_CFG[course.status] ?? STATUS_CFG.upcoming
              const myEnrollment = course.enrollments?.find(e => e.employee_id === myId)
              const enrollCount  = course.enrollments?.length ?? 0

              return (
                <div key={course.id} className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
                        {cfg.label}
                      </span>
                      <p style={{ fontWeight: 700, color: '#111827', fontSize: '0.9rem', margin: '8px 0 0', lineHeight: 1.3 }}>{course.title}</p>
                    </div>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(244,121,32,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <GraduationCap size={16} color="#F47920" />
                    </div>
                  </div>

                  {course.description && (
                    <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0, lineHeight: 1.55 }}>
                      {course.description.length > 100 ? course.description.slice(0, 100) + '…' : course.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {course.trainer && (
                      <p style={{ fontSize: '0.75rem', color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <GraduationCap size={12} color="#9ca3af" /> {course.trainer}
                      </p>
                    )}
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={12} color="#9ca3af" />
                      {fmtDate(course.start_date)} — {fmtDate(course.end_date)}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={12} color="#9ca3af" /> {enrollCount} enrolled
                    </p>
                  </div>

                  {/* View content button — always visible; opens modal */}
                  <button
                    onClick={() => setOpenCourse(course)}
                    style={{ width: '100%', padding: '7px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <BookOpen size={12} /> {isAdmin ? 'Manage content' : 'View course'}
                  </button>

                  {/* CTA */}
                  <div style={{ marginTop: 4 }}>
                    {!myEnrollment ? (
                      <button
                        onClick={() => enroll(course.id)}
                        disabled={enrolling === course.id || course.status === 'completed' || course.status === 'cancelled'}
                        style={{ width: '100%', padding: '8px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #E8622A 0%, #F47920 100%)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: (course.status === 'completed' || course.status === 'cancelled') ? 0.5 : 1 }}>
                        {enrolling === course.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
                        Enrol Now
                      </button>
                    ) : myEnrollment.status === 'completed' ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', background: '#f0fdf4', borderRadius: 8, color: '#16a34a', fontSize: '0.8rem', fontWeight: 600 }}>
                        <CheckCircle size={14} /> Completed {fmtDate(myEnrollment.completed_at)}
                      </div>
                    ) : (
                      <button
                        onClick={() => markComplete(course.id)}
                        disabled={enrolling === course.id}
                        style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1.5px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontWeight: 700, cursor: 'pointer', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {enrolling === course.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={13} />}
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        </>}
      </div>
    </>
  )
}
