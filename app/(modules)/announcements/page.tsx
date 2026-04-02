'use client'


import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  Bell,
  Plus,
  Pin,
  Edit,
  Trash2,
  Users,
  Building2,
  MapPin,
  ChevronDown,
  ChevronUp,
  Megaphone,
  Calendar,
  AlertCircle,
  Info,
  CheckCircle,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
type AnnouncementType = 'holiday' | 'policy' | 'event' | 'urgent' | 'general'
type TargetAudienceMode = 'all' | 'department' | 'location'

interface Announcement {
  id: number
  type: AnnouncementType
  title: string
  body: string
  publisher: string
  date: string
  target: string
  pinned: boolean
  urgent: boolean
}

/* ─────────────────────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────────────────────── */
const announcements: Announcement[] = [
  {
    id: 1,
    type: 'holiday',
    title: 'Office Closure — Good Friday',
    body: 'April 18, 2026 is a public holiday on account of Good Friday. All offices will remain closed. Employees requiring emergency access must get prior approval from their manager.',
    publisher: 'HR Team',
    date: 'Apr 1, 2026',
    target: 'All Employees',
    pinned: true,
    urgent: false,
  },
  {
    id: 2,
    type: 'policy',
    title: 'Updated Work From Home Policy',
    body: 'Effective April 15, 2026: Maximum 2 WFH days per week are permitted. WFH must be pre-approved by the reporting manager. Employees on probation are not eligible for WFH. Please read the updated policy document on the portal.',
    publisher: 'HR Admin',
    date: 'Mar 28, 2026',
    target: 'All Employees',
    pinned: false,
    urgent: false,
  },
  {
    id: 3,
    type: 'event',
    title: 'Annual Company Day — Save the Date!',
    body: 'Join us for our Grand Annual Celebration on May 15, 2026 at Taj Hotel, Bengaluru. Awards, entertainment, gala dinner. Family members are welcome. RSVP by May 1 to hr@company.com',
    publisher: 'HR Team',
    date: 'Mar 25, 2026',
    target: 'All Employees',
    pinned: false,
    urgent: false,
  },
  {
    id: 4,
    type: 'general',
    title: 'Q4 FY 2025-26 Performance Results Released',
    body: 'Annual appraisal outcomes for FY 2025-26 are now available. Employees can view their ratings and increment details in the Performance module. Please reach out to HR for any queries.',
    publisher: 'HR Admin',
    date: 'Mar 22, 2026',
    target: 'All Employees',
    pinned: false,
    urgent: false,
  },
  {
    id: 5,
    type: 'urgent',
    title: 'EPF KYC Update — Action Required by Apr 30',
    body: 'MANDATORY: All employees must link their Aadhaar with UAN (Universal Account Number) by April 30, 2026 for EPF KYC compliance. Failure to do so may result in EPF contribution being blocked. Visit the EPFO portal or contact HR for assistance.',
    publisher: 'Finance & Compliance',
    date: 'Mar 20, 2026',
    target: 'All Employees',
    pinned: true,
    urgent: true,
  },
  {
    id: 6,
    type: 'policy',
    title: 'New Leave Policy Effective April 2026',
    body: 'Key changes from April 1, 2026: Casual Leave increased from 8 to 12 days annually. Earned Leave carry forward limit raised to 30 days. LOP will now be tracked automatically from the attendance system. Full policy document available on the HR portal.',
    publisher: 'HR Admin',
    date: 'Mar 15, 2026',
    target: 'All Employees',
    pinned: false,
    urgent: false,
  },
  {
    id: 7,
    type: 'general',
    title: 'Welcome to Our New Team Members!',
    body: "Please join us in welcoming 8 new colleagues joining in April 2026 across Engineering, HR, Sales, Finance, and Operations. Their profiles are now live on the Employee Directory. Let's make them feel at home!",
    publisher: 'HR Team',
    date: 'Mar 10, 2026',
    target: 'All Employees',
    pinned: false,
    urgent: false,
  },
  {
    id: 8,
    type: 'general',
    title: 'Office Gymnasium Now Open',
    body: 'The gymnasium on Floor 2, Bengaluru office is now fully operational. Timings: 6:00 AM to 9:00 PM, Monday to Saturday. All employees are welcome. Please bring your ID card for access.',
    publisher: 'Admin Team',
    date: 'Mar 5, 2026',
    target: 'Bengaluru Office',
    pinned: false,
    urgent: false,
  },
]

const FILTER_OPTIONS = ['All', 'Holiday', 'Policy', 'Event', 'Urgent', 'General'] as const
type FilterOption = typeof FILTER_OPTIONS[number]

const DEPARTMENTS = [
  'Engineering',
  'HR',
  'Sales',
  'Finance',
  'Operations',
  'Marketing',
  'Customer Support',
]

/* ─────────────────────────────────────────────────────────────
   BADGE STYLES
───────────────────────────────────────────────────────────── */
const typeBadgeStyles: Record<AnnouncementType, { bg: string; text: string; label: string }> = {
  holiday: { bg: 'bg-green-100', text: 'text-green-700', label: 'Holiday' },
  policy: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Policy' },
  event: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Event' },
  urgent: { bg: 'bg-red-100', text: 'text-red-700', label: 'Urgent' },
  general: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'General' },
}

const typeBreakdown: { type: AnnouncementType; count: number }[] = [
  { type: 'holiday', count: 3 },
  { type: 'policy', count: 9 },
  { type: 'event', count: 7 },
  { type: 'urgent', count: 5 },
  { type: 'general', count: 18 },
]

/* ─────────────────────────────────────────────────────────────
   ANNOUNCEMENT CARD
───────────────────────────────────────────────────────────── */
function AnnouncementCard({
  announcement,
  expanded,
  onToggleExpand,
}: {
  announcement: Announcement
  expanded: boolean
  onToggleExpand: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const badge = typeBadgeStyles[announcement.type]
  const bodyPreview = announcement.body.slice(0, 120)
  const needsTruncation = announcement.body.length > 120

  return (
    <div
      className={`relative bg-white rounded-xl border transition-shadow duration-150 hover:shadow-md ${
        announcement.urgent
          ? 'border-l-4 border-l-red-500 border-t border-r border-b border-gray-200'
          : 'border border-gray-200'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="p-4">
        {/* Top row: badge + title + pinned chip */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${badge.bg} ${badge.text}`}
            >
              {badge.label}
            </span>
            <h3 className="text-sm font-semibold text-gray-800 leading-snug">{announcement.title}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {announcement.pinned && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                <Pin className="w-3 h-3" />
                Pinned
              </span>
            )}
            {/* Action buttons — visible on hover */}
            <div
              className={`flex items-center gap-1 transition-opacity duration-150 ${
                hovered ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <button className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors">
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <p className="text-sm text-gray-600 leading-relaxed mb-3">
          {expanded || !needsTruncation ? announcement.body : `${bodyPreview}...`}
          {needsTruncation && (
            <button
              onClick={onToggleExpand}
              className="ml-1 text-orange-500 hover:text-orange-600 text-xs font-medium inline-flex items-center gap-0.5"
            >
              {expanded ? (
                <>
                  Show less <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  Read more <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          )}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="font-medium text-gray-700">{announcement.publisher}</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {announcement.date}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
            <Users className="w-3 h-3" />
            {announcement.target}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function AnnouncementsPage() {
  /* Feed state */
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  /* Compose form state */
  const [composeTitle, setComposeTitle] = useState('')
  const [composeType, setComposeType] = useState<AnnouncementType>('general')
  const [composeBody, setComposeBody] = useState('')
  const [targetMode, setTargetMode] = useState<TargetAudienceMode>('all')
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set())
  const [expiresOn, setExpiresOn] = useState('')
  const [markUrgent, setMarkUrgent] = useState(false)
  const [pinToTop, setPinToTop] = useState(false)

  /* Filter logic */
  const filteredAnnouncements =
    activeFilter === 'All'
      ? announcements
      : announcements.filter(
          (a) => a.type === activeFilter.toLowerCase()
        )

  /* Toggle expanded body */
  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  /* Toggle department checkbox */
  const toggleDept = (dept: string) => {
    setSelectedDepts((prev) => {
      const next = new Set(prev)
      if (next.has(dept)) {
        next.delete(dept)
      } else {
        next.add(dept)
      }
      return next
    })
  }

  const handleReset = () => {
    setComposeTitle('')
    setComposeType('general')
    setComposeBody('')
    setTargetMode('all')
    setSelectedDepts(new Set())
    setExpiresOn('')
    setMarkUrgent(false)
    setPinToTop(false)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <Topbar
        title="Announcements"
        actions={
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            Post Announcement
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-6 items-start max-w-[1400px] mx-auto">
          {/* ── LEFT COLUMN — Feed (65%) ── */}
          <div className="flex-[0_0_65%] min-w-0">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-semibold text-gray-800">Company Announcements</h2>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold">
                8
              </span>
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-2 flex-wrap mb-5">
              {FILTER_OPTIONS.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    activeFilter === filter
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Announcement cards */}
            <div className="flex flex-col gap-3">
              {filteredAnnouncements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-200 text-gray-400">
                  <Bell className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">No announcements found for this filter.</p>
                </div>
              ) : (
                filteredAnnouncements.map((a) => (
                  <AnnouncementCard
                    key={a.id}
                    announcement={a}
                    expanded={expandedIds.has(a.id)}
                    onToggleExpand={() => toggleExpand(a.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN — Compose & Stats (35%) ── */}
          <div className="flex-[0_0_35%] min-w-0 flex flex-col gap-5">
            {/* ── Compose Card ── */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                <Megaphone className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-semibold text-gray-800">Post Announcement</h3>
              </div>

              <div className="p-5 flex flex-col gap-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Title</label>
                  <input
                    type="text"
                    value={composeTitle}
                    onChange={(e) => setComposeTitle(e.target.value)}
                    placeholder="Announcement title..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Type</label>
                  <select
                    value={composeType}
                    onChange={(e) => setComposeType(e.target.value as AnnouncementType)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition"
                  >
                    <option value="general">General</option>
                    <option value="policy">Policy</option>
                    <option value="event">Event</option>
                    <option value="urgent">Urgent</option>
                    <option value="holiday">Holiday</option>
                  </select>
                </div>

                {/* Body */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Message</label>
                  <textarea
                    rows={4}
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    placeholder="Write your announcement here..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition resize-none"
                  />
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Target Audience</label>
                  <div className="flex items-center gap-4 mb-3">
                    {(
                      [
                        { value: 'all', label: 'All Employees' },
                        { value: 'department', label: 'By Department' },
                        { value: 'location', label: 'By Location' },
                      ] as { value: TargetAudienceMode; label: string }[]
                    ).map(({ value, label }) => (
                      <label
                        key={value}
                        className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700"
                      >
                        <input
                          type="radio"
                          name="targetMode"
                          value={value}
                          checked={targetMode === value}
                          onChange={() => setTargetMode(value)}
                          className="accent-orange-500"
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  {/* Department checkboxes */}
                  {targetMode === 'department' && (
                    <div className="grid grid-cols-2 gap-1.5 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      {DEPARTMENTS.map((dept) => (
                        <label
                          key={dept}
                          className="flex items-center gap-2 cursor-pointer text-xs text-gray-700"
                        >
                          <input
                            type="checkbox"
                            checked={selectedDepts.has(dept)}
                            onChange={() => toggleDept(dept)}
                            className="accent-orange-500 rounded"
                          />
                          {dept}
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Location note */}
                  {targetMode === 'location' && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-600">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      Location-based targeting uses office location from employee profiles.
                    </div>
                  )}
                </div>

                {/* Expires On */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Expires On{' '}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={expiresOn}
                    onChange={(e) => setExpiresOn(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition"
                  />
                </div>

                {/* Checkboxes */}
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={markUrgent}
                      onChange={(e) => setMarkUrgent(e.target.checked)}
                      className="accent-red-500 w-4 h-4 rounded"
                    />
                    <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Mark as Urgent
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pinToTop}
                      onChange={(e) => setPinToTop(e.target.checked)}
                      className="accent-orange-500 w-4 h-4 rounded"
                    />
                    <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
                      <Pin className="w-3.5 h-3.5" />
                      Pin to top
                    </span>
                  </label>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleReset}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Save Draft
                  </button>
                  <button className="flex-1 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors">
                    Post Now
                  </button>
                </div>
              </div>
            </div>

            {/* ── Statistics Card ── */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                <Info className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-800">Statistics</h3>
              </div>

              <div className="p-5">
                {/* 2x2 stat grid */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {/* Total */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                      <Megaphone className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-800 leading-none">42</p>
                      <p className="text-xs text-gray-500 mt-0.5">Total</p>
                    </div>
                  </div>

                  {/* This Month */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-800 leading-none">8</p>
                      <p className="text-xs text-gray-500 mt-0.5">This Month</p>
                    </div>
                  </div>

                  {/* Pinned */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center shrink-0">
                      <Pin className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-800 leading-none">2</p>
                      <p className="text-xs text-gray-500 mt-0.5">Pinned</p>
                    </div>
                  </div>

                  {/* Unread Urgent */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-red-600 leading-none">1</p>
                      <p className="text-xs text-red-500 mt-0.5">Unread Urgent</p>
                    </div>
                  </div>
                </div>

                {/* Type breakdown */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">By Type</p>
                  <div className="flex flex-wrap gap-2">
                    {typeBreakdown.map(({ type, count }) => {
                      const badge = typeBadgeStyles[type]
                      return (
                        <span
                          key={type}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                          <span className="font-bold">{count}</span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
