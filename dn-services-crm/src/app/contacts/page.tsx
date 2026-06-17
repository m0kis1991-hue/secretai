"use client"

import { CRMSidebar } from "@/components/layout/crm-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search, Plus, Upload, ChevronLeft, ChevronRight,
  Download, LayoutList, Columns3, Phone, Calendar, Lock, RefreshCcw, Bell, ExternalLink, Send, Filter, X, Layers, Trash2, CheckSquare, Square,
} from "lucide-react"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Contact, LeadStatus } from "../lib/types"
import { STATUS, isAdmin as isAdminRole } from "../lib/constants"
import { rowToContact } from "../lib/contact-utils"
import { ImportLeadsDialog } from "@/components/contacts/import-leads-dialog"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// ── Multi-phone helpers ───────────────────────────────────────────────────────

function normalizePhone(p: string): string {
  return p.replace(/[\s\-\(\)]/g, '')
}

// Build a Map<normalizedPhone → contactName> from all contacts (handles JSON array phones)
function buildExistingPhoneMap(rows: Array<{ id?: string; name?: string; phone?: string | null }>): Map<string, string> {
  const m = new Map<string, string>()
  for (const r of rows) {
    if (!r.phone) continue
    const phones = parsePhonesField(r.phone)
    phones.forEach(p => { if (p) m.set(normalizePhone(p), r.name ?? '') })
  }
  return m
}

// ── Date helpers ─────────────────────────────────────────────────────────────

type ContactDateInfo = { date: string; type: 'followup' | 'called' | 'created' }

function getContactDate(contact: Contact): ContactDateInfo | null {
  if (contact.nextActionDate) return { date: contact.nextActionDate.slice(0, 10), type: 'followup' }
  if (contact.lastContacted)  return { date: contact.lastContacted.slice(0, 10),  type: 'called'  }
  if (contact.createdAt)      return { date: contact.createdAt.slice(0, 10),       type: 'created' }
  return null
}

function formatDateShort(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function parsePhonesField(raw: string): string[] {
  if (!raw) return []
  if (raw.startsWith("[")) {
    try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr.filter(Boolean) : [raw] } catch {}
  }
  return [raw]
}

function serializePhones(phones: string[]): string {
  const f = phones.filter(Boolean)
  if (f.length === 0) return ''
  if (f.length === 1) return f[0]
  return JSON.stringify(f)
}

// Greek mobile numbers start with 69x (domestic) or +3069x / 003069x (international)
function isMobile(phone: string): boolean {
  const clean = phone.replace(/[\s\-\+\(\)]/g, '')
  return /^(69\d|3069\d|00306[0-9])/.test(clean)
}

function sortMobileFirst(phones: string[]): string[] {
  return [...phones].sort((a, b) => (isMobile(a) ? 0 : 1) - (isMobile(b) ? 0 : 1))
}


function PhoneCallButton({
  phone,
  contactId,
  contactName,
  callerId,
  callerName,
  size = "sm",
  className = "h-8 w-8 p-0 text-accent",
}: {
  phone: string
  contactId: string
  contactName: string
  callerId?: string | null
  callerName?: string
  size?: "sm" | "lg"
  className?: string
}) {
  const phones = sortMobileFirst(parsePhonesField(phone))
  const [pickerOpen, setPickerOpen] = useState(false)

  const logAndCall = async (p: string) => {
    if (callerId) {
      const supabase = createClient()
      const today = new Date().toISOString().slice(0, 10)
      await Promise.all([
        supabase.from('call_logs').insert({
          telephonist_id: callerId,
          telephonist_name: callerName ?? '',
          contact_id: contactId,
          contact_name: contactName,
          called_at: new Date().toISOString(),
        }),
        supabase.from('contacts').update({ last_contacted: today }).eq('id', contactId),
      ])
    }
    window.location.href = `tel:${p}`
  }

  if (phones.length <= 1) {
    return (
      <Button
        size={size}
        variant="ghost"
        className={className}
        title="Κλήση"
        onClick={(e) => { e.stopPropagation(); if (phones[0]) logAndCall(phones[0]) }}
      >
        <Phone className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <>
      <Button
        size={size}
        variant="ghost"
        className={className}
        title="Επιλογή αριθμού"
        onClick={(e) => { e.stopPropagation(); setPickerOpen(true) }}
      >
        <Phone className="h-4 w-4" />
      </Button>
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-xs" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="text-sm">{contactName}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            {phones.map((p, i) => (
              <Button
                key={i}
                variant="outline"
                className="justify-start gap-3 h-12 font-mono text-base"
                onClick={() => { setPickerOpen(false); logAndCall(p) }}
              >
                <Phone className={`h-4 w-4 shrink-0 ${isMobile(p) ? 'text-green-500' : 'text-blue-500'}`} />
                <span>{p}</span>
                <span className={`ml-auto text-[10px] px-1 rounded ${isMobile(p) ? 'text-green-600 bg-green-50' : 'text-blue-600 bg-blue-50'}`}>
                  {isMobile(p) ? 'κινητό' : 'σταθερό'}
                </span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

const todayISO = () => new Date().toISOString().slice(0, 10)

type FilterKey = 'all' | 'today' | 'high' | 'new' | 'likely' | 'bought'

const STATUS_COLS: { key: LeadStatus; labelEl: string; labelEn: string; color: string }[] = [
  { key: STATUS.NEW,             labelEl: 'Νέο',           labelEn: 'New',       color: 'border-t-blue-400' },
  { key: STATUS.CANVA,           labelEl: 'Canva',         labelEn: 'Canva',     color: 'border-t-purple-500' },
  { key: STATUS.LIKELY_SALE,     labelEl: 'Sale',          labelEn: 'Sale',      color: 'border-t-amber-500' },
  { key: STATUS.LIKELY_ANTISALE, labelEl: 'Antisale',      labelEn: 'Antisale',  color: 'border-t-amber-800' },
  { key: STATUS.NO_ANSWER,       labelEl: 'Δεν Απάντησε', labelEn: 'No Answer', color: 'border-t-orange-400' },
  { key: STATUS.NOT_BUYING,      labelEl: 'Όχι',           labelEn: 'Declined',  color: 'border-t-red-400' },
  { key: STATUS.BOUGHT,          labelEl: 'Αγόρασε',       labelEn: 'Bought',    color: 'border-t-green-500' },
]

const emptyForm = (): Partial<Contact> => ({
  name: '', phone: '', email: '', jobTitle: '', industry: '',
  observations: '', investmentAmount: 0, status: STATUS.NEW, priorityScore: 50,
})

export default function ContactsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false)
  const [newLeadForm, setNewLeadForm] = useState<Partial<Contact>>(emptyForm())
  const [newLeadPhones, setNewLeadPhones] = useState<string[]>([''])
  const [newLeadTime, setNewLeadTime] = useState('')
  const [newLeadAssignTo, setNewLeadAssignTo] = useState<string>('self')
  const [newLeadSource, setNewLeadSource] = useState('')
  const [lang, setLang] = useState<'el' | 'en'>('el')
  const [page, setPage] = useState(1)
  const [pageJumpActive, setPageJumpActive] = useState(false)
  const [pageJumpValue, setPageJumpValue] = useState('')
  const pageJumpRef = useRef<HTMLInputElement>(null)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [view, setView] = useState<'table' | 'kanban'>('table')
  const [userRole, setUserRole] = useState<string>('telephonist')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [pendingRequests, setPendingRequests] = useState<{ id: string; contact_id: string; contact_name: string; requester_name: string; requester_id: string }[]>([])
  const [telephonists, setTelephonists] = useState<{ id: string; name: string }[]>([])
  const [testUserIds, setTestUserIds] = useState<string[]>([])
  const [topLeadsAccess, setTopLeadsAccess] = useState(false)

  const CONTACT_BASE_COLUMNS = 'id,name,phone,email,company_name,industry,job_title,status,owner_id,created_by,locked_until,sale_locked,last_contacted,priority_score,next_action_date,next_action_time,investment_amount,lead_source,created_at'

  const loadContacts = useCallback(async (forUserId?: string | null, forRole?: string, excludeIds?: string[], forTopLeadsAccess?: boolean) => {
    const supabase = createClient()
    const effectiveRole = forRole ?? userRole
    const effectiveUserId = forUserId !== undefined ? forUserId : currentUserId
    const effectiveExclude = excludeIds ?? testUserIds
    const effectiveTopLeads = forTopLeadsAccess !== undefined ? forTopLeadsAccess : topLeadsAccess

    const buildQuery = (withRating: boolean) => {
      let q = supabase
        .from('contacts')
        .select(withRating ? `${CONTACT_BASE_COLUMNS},rating,review_count` : CONTACT_BASE_COLUMNS)
        .order('priority_score', { ascending: false })
        .range(0, 9999)
      if (withRating && effectiveTopLeads) {
        // Top-rated mode: see ALL contacts with rating > 4 stars AND > 70 reviews,
        // bypassing ownership/locking — these telephonists cover a different sales lane.
        q = q.gt('rating', 4).gt('review_count', 70)
      } else if (!isAdminRole(effectiveRole) && effectiveUserId) {
        // Standard telephonist: only their own contacts (respecting 10-day lock rule).
        const today = new Date().toISOString().slice(0, 10)
        q = q.or([
          `and(owner_id.eq.${effectiveUserId},sale_locked.eq.true)`,
          `and(owner_id.eq.${effectiveUserId},locked_until.gte.${today})`,
          `and(owner_id.eq.${effectiveUserId},locked_until.is.null)`,
          `and(created_by.eq.${effectiveUserId},owner_id.is.null)`,
        ].join(','))
      }
      return q
    }

    let { data, error } = await buildQuery(true)
    if (error) {
      // rating/review_count columns may not exist yet (pending migration) — retry without them
      console.warn('[loadContacts] retrying without rating/review_count:', error.message)
      ;({ data, error } = await buildQuery(false))
    }
    if (!error && data) {
      const contacts = data.map(rowToContact)
      const visible = (isAdminRole(effectiveRole) && effectiveExclude.length > 0)
        ? contacts.filter(c => !effectiveExclude.includes(c.ownerId ?? ''))
        : contacts
      setContacts(visible)
    } else if (error) {
      console.error('[loadContacts] failed:', error.message)
    }
    setLoadingContacts(false)
  }, [userRole, currentUserId, testUserIds, topLeadsAccess])

  useEffect(() => {
    const savedLang = localStorage.getItem('app-lang') as 'el' | 'en'
    if (savedLang) setLang(savedLang)
    const savedView = localStorage.getItem('contacts-view') as 'table' | 'kanban'
    if (savedView) setView(savedView)

    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user
      if (!user) return
      setCurrentUserId(user.id)
      // Profile + pending requests in parallel
      const [{ data }, { data: reqs }] = await Promise.all([
        supabase.from('profiles').select('role, name, top_leads_access').eq('id', user.id).single(),
        supabase
          .from('contact_access_requests')
          .select('id, contact_id, contact_name, requester_name, requester_id')
          .eq('owner_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
      ])
      const role = data?.role ?? 'telephonist'
      const tla = data?.top_leads_access ?? false
      if (data?.role) setUserRole(role)
      if (data?.name) setUserName(data.name)
      if (tla) setTopLeadsAccess(true)
      setPendingRequests(reqs ?? [])
      // Load telephonist list for admin reassignment + resolve test IDs
      const TEST_EMAILS = ['m0kis1991@gmail.com', 'm0kis@hotmail.com']
      let resolvedTestIds: string[] = []
      if (isAdminRole(role)) {
        const { data: tels } = await supabase.from('profiles').select('id, name, email').eq('role', 'telephonist').eq('suspended', false)
        const allTels = tels ?? []
        const filtered = allTels.filter(t => role === 'superadmin' || !TEST_EMAILS.includes(t.email))
        setTelephonists(filtered.map(({ id, name }) => ({ id, name })))
        if (role !== 'superadmin') {
          resolvedTestIds = allTels.filter(t => TEST_EMAILS.includes(t.email)).map(t => t.id)
          setTestUserIds(resolvedTestIds)
        }
      }
      loadContacts(user.id, role, resolvedTestIds, tla)
    }).catch(() => {})
  }, [loadContacts])

  // Refetch when page is restored from browser bfcache (back/forward navigation)
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) loadContacts()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [loadContacts])

  useEffect(() => { setPage(1) }, [searchTerm, activeFilter, categoryFilter])

  const handleViewToggle = (v: 'table' | 'kanban') => {
    setView(v)
    localStorage.setItem('contacts-view', v)
  }

  const isAdmin = userRole === 'admin' || userRole === 'superadmin'
  const canEdit = (contact: Contact) => isAdmin || contact.ownerId === currentUserId || contact.ownerId === null || contact.createdBy === currentUserId

  // ── Filters ────────────────────────────────────────────────────────────────
  const applyFilter = (c: Contact): boolean => {
    switch (activeFilter) {
      case 'today':  return c.nextActionDate === todayISO()
      case 'high':   return (c.priorityScore ?? 0) >= 70
      case 'new':    return c.status === 'new'
      case 'likely': return c.status === 'likely_sale' || c.status === 'likely_antisale'
      case 'bought': return c.status === 'bought'
      default: return true
    }
  }

  const todayCount = useMemo(() => contacts.filter(c => c.nextActionDate === todayISO()).length, [contacts])

  // Distinct categories derived from contacts (jobTitle + industry)
  const categoryOptions = useMemo(() => {
    const cats = new Set<string>()
    for (const c of contacts) {
      if (c.jobTitle?.trim()) cats.add(c.jobTitle.trim())
      if (c.industry?.trim()) cats.add(c.industry.trim())
    }
    return Array.from(cats).sort((a, b) => a.localeCompare(b, 'el'))
  }, [contacts])

  const filtered = useMemo(() => contacts.filter(c => {
    if (!applyFilter(c)) return false
    if (categoryFilter !== 'all') {
      const cat = categoryFilter.toLowerCase()
      const match =
        (c.jobTitle ?? '').toLowerCase().includes(cat) ||
        (c.industry ?? '').toLowerCase().includes(cat)
      if (!match) return false
    }
    if (!searchTerm) return true
    return (
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parsePhonesField(c.phone || '').join(' ').includes(searchTerm)
    )
  }), [contacts, searchTerm, activeFilter, categoryFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // ── Status helpers ─────────────────────────────────────────────────────────
  const handleSendJ2TEmail = (contact: Contact) => {
    if (!contact.email) return
    const body = lang === 'el'
      ? `Αξιότιμε/η ${contact.name},\n\nΣε συνέχεια της επικοινωνίας μας, σας αποστέλλουμε τα αναλυτικά στοιχεία της επενδυτικής πλατφόρμας που συζητήσαμε.\n\nΜπορείτε να ενημερωθείτε πλήρως μέσω του ακόλουθου συνδέσμου:\n\nhttps://j2t.com/el/ref/7rni1Vwzbh-forexstandard\n\nΜε εκτίμηση,\nDN Services Capital | Just2Trade (J2T)`
      : `Dear ${contact.name},\n\nFollowing our conversation, please find the investment platform details at:\n\nhttps://j2t.com/el/ref/7rni1Vwzbh-forexstandard\n\nKind regards,\nDN Services Capital | Just2Trade (J2T)`
    const subject = 'DN Services Capital / Just2Trade'
    window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(contact.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
  }

  const handleStatusChange = async (id: string, status: LeadStatus) => {
    const supabase = createClient()
    const { error } = await supabase.from('contacts').update({ status }).eq('id', id)
    if (!error) {
      setContacts(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'bought':        return <Badge className="bg-green-500 hover:bg-green-600 text-[10px]">{lang === 'el' ? 'Αγόρασε' : 'Bought'}</Badge>
      case 'canva':           return <Badge className="bg-purple-500 text-white text-[10px]">Canva</Badge>
      case 'likely_sale':     return <Badge className="bg-amber-500 text-white text-[10px]">Sale</Badge>
      case 'likely_antisale': return <Badge className="bg-amber-800 text-white text-[10px]">Antisale</Badge>
      case 'no_answer':     return <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-[10px]">{lang === 'el' ? 'Δεν Απάντησε' : 'No Answer'}</Badge>
      case 'not_buying':    return <Badge variant="destructive" className="text-[10px]">{lang === 'el' ? 'Όχι' : 'No'}</Badge>
      default:              return <Badge variant="secondary" className="text-[10px]">{lang === 'el' ? 'Νέο' : 'New'}</Badge>
    }
  }

  // ── Admin: assign contact to telephonist ──────────────────────────────────
  const handleAssignContact = async (contactId: string, telephonistId: string | null) => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token ?? ''
    // Use the save route (proven auth) with only the fields that need to change
    const res = await fetch('/api/contacts/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify({
        isNew: false,
        contactId,
        userId: currentUserId,
        row: { owner_id: telephonistId, locked_until: null },
      }),
    })
    if (res.ok) {
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, ownerId: telephonistId, lockedUntil: undefined } : c))
      toast({ title: lang === 'el' ? 'Η επαφή ανατέθηκε' : 'Contact assigned' })
    } else {
      const json = await res.json().catch(() => ({}))
      toast({ variant: 'destructive', title: lang === 'el' ? 'Σφάλμα ανάθεσης' : 'Assignment error', description: json?.error })
    }
  }

  // ── Access request handlers ────────────────────────────────────────────────
  const handleGrantAccess = async (requestId: string, requesterId: string, contactId: string) => {
    const supabase = createClient()
    await supabase.from('contacts').update({ owner_id: requesterId }).eq('id', contactId)
    await supabase.from('contact_access_requests').update({ status: 'granted' }).eq('id', requestId)
    setPendingRequests(prev => prev.filter(r => r.id !== requestId))
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, ownerId: requesterId } : c))
    toast({ title: lang === 'el' ? 'Πρόσβαση Δόθηκε' : 'Access Granted' })
  }

  const handleDenyAccess = async (requestId: string) => {
    const supabase = createClient()
    await supabase.from('contact_access_requests').update({ status: 'denied' }).eq('id', requestId)
    setPendingRequests(prev => prev.filter(r => r.id !== requestId))
    toast({ title: lang === 'el' ? 'Αίτημα Απορρίφθηκε' : 'Request Denied' })
  }

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const cols = ['Όνομα', 'Τηλέφωνο', 'Email', 'Επάγγελμα', 'Κλάδος', 'Κατάσταση', 'Επένδυση', 'Σκορ', 'Ημερομηνία']
    const rows = filtered.map(c => [
      c.name, c.phone, c.email, c.jobTitle ?? '', c.industry ?? '',
      c.status, c.investmentAmount, c.priorityScore, getContactDate(c)?.date ?? ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const csv = [cols.join(','), ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `contacts-${todayISO()}.csv`
    a.click(); URL.revokeObjectURL(url)
    toast({ title: lang === 'el' ? `Εξαγωγή ${filtered.length} επαφών` : `Exported ${filtered.length} contacts` })
  }

  const handleNewLeadSave = async () => {
    if (!newLeadForm.name?.trim()) {
      toast({ variant: 'destructive', title: lang === 'el' ? 'Συμπληρώστε το όνομα' : 'Name is required' })
      return
    }
    const supabase = createClient()
    const phoneVal = serializePhones(sortMobileFirst(newLeadPhones))
    const dateVal = newLeadForm.nextActionDate || ''
    const row = {
      name: newLeadForm.name.trim(),
      phone: phoneVal,
      email: newLeadForm.email ?? '',
      job_title: newLeadForm.jobTitle ?? '',
      industry: newLeadForm.industry ?? '',
      observations: newLeadForm.observations ?? '',
      investment_amount: Number(newLeadForm.investmentAmount) || 0,
      status: newLeadForm.status ?? 'new',
      priority_score: 50,
      owner_id: isAdmin
        ? (newLeadAssignTo === 'self' || newLeadAssignTo === 'unassigned' ? null : newLeadAssignTo)
        : currentUserId,
      created_by: currentUserId,
      next_action_date: dateVal || null,
      next_action_time: (dateVal && newLeadTime) ? newLeadTime : null,
      lead_source: newLeadSource.trim() || null,
    }
    if (phoneVal) {
      const { data: allExisting } = await supabase.from('contacts').select('name, phone')
      const phoneMap = buildExistingPhoneMap(allExisting ?? [])
      const inputPhones = parsePhonesField(phoneVal).map(normalizePhone)
      for (const p of inputPhones) {
        const existingName = phoneMap.get(p)
        if (existingName !== undefined) {
          toast({ variant: 'destructive', title: lang === 'el' ? 'Η επαφή υπάρχει ήδη' : 'Contact already exists', description: lang === 'el' ? `Υπάρχει ήδη επαφή με αυτό το τηλέφωνο (${existingName}).` : `A contact with this phone already exists (${existingName}).` })
          return
        }
      }
    }
    const { data, error } = await supabase.from('contacts').insert(row).select().single()
    if (error) {
      toast({ variant: 'destructive', title: lang === 'el' ? 'Σφάλμα Αποθήκευσης' : 'Save Error' })
      return
    }
    if (data) setContacts(prev => [rowToContact(data), ...prev])
    setIsNewLeadOpen(false)
    setNewLeadForm(emptyForm())
    setNewLeadPhones([''])
    setNewLeadTime('')
    setNewLeadSource('')
    toast({ title: lang === 'el' ? 'Η επαφή προστέθηκε' : 'Contact added' })
  }

  // ── Duplicate finder ───────────────────────────────────────────────────────
  type DupContact = { id: string; name: string; phone: string; status: string; ownerName: string; createdAt: string }
  type DupGroup   = { phone: string; contacts: DupContact[] }

  const [isDupOpen, setIsDupOpen] = useState(false)
  const [dupLoading, setDupLoading] = useState(false)
  const [dupGroups, setDupGroups] = useState<DupGroup[]>([])
  const [dupSelected, setDupSelected] = useState<Set<string>>(new Set())
  const [dupDeleting, setDupDeleting] = useState(false)
  const [dupDeleteConfirm, setDupDeleteConfirm] = useState(false)

  const findDuplicates = async () => {
    setDupLoading(true)
    setDupGroups([])
    setDupSelected(new Set())
    setIsDupOpen(true)
    try {
      const supabase = createClient()
      const [{ data: allC }, { data: profs }] = await Promise.all([
        supabase.from('contacts').select('id, name, phone, status, owner_id, created_at').order('created_at', { ascending: true }).range(0, 9999),
        supabase.from('profiles').select('id, name'),
      ])
      const ownerMap = new Map<string, string>()
      ;(profs ?? []).forEach((p: any) => ownerMap.set(p.id, p.name ?? '—'))

      const phoneMap = new Map<string, DupContact[]>()
      for (const c of allC ?? []) {
        const phones = parsePhonesField(c.phone ?? '')
        if (!phones.length) continue
        const primary = normalizePhone(phones[0])
        if (!primary) continue
        if (!phoneMap.has(primary)) phoneMap.set(primary, [])
        phoneMap.get(primary)!.push({
          id: c.id, name: c.name ?? '', phone: c.phone ?? '',
          status: c.status ?? 'new',
          ownerName: ownerMap.get(c.owner_id) ?? '—',
          createdAt: c.created_at ?? '',
        })
      }
      const groups: DupGroup[] = []
      for (const [phone, contacts] of phoneMap.entries()) {
        if (contacts.length > 1) groups.push({ phone, contacts })
      }
      setDupGroups(groups)
    } finally {
      setDupLoading(false)
    }
  }

  const autoSelectDups = () => {
    const sel = new Set<string>()
    dupGroups.forEach(g => g.contacts.slice(1).forEach(c => sel.add(c.id)))
    setDupSelected(sel)
  }

  const handleDeleteDups = async () => {
    if (!dupSelected.size) return
    setDupDeleting(true)
    const ids = Array.from(dupSelected)
    try {
      const supabase = createClient()
      // Delete in batches of 50 to stay well within URL length limits
      const BATCH = 50
      for (let i = 0; i < ids.length; i += BATCH) {
        const batch = ids.slice(i, i + BATCH)
        const { error } = await supabase.from('contacts').delete().in('id', batch)
        if (error) throw new Error(error.message)
      }
      toast({ title: lang === 'el' ? `${ids.length} διπλότυπες επαφές διαγράφηκαν` : `${ids.length} duplicate contacts deleted` })
      setContacts(prev => prev.filter(c => !dupSelected.has(c.id)))
      setDupGroups(prev =>
        prev.map(g => ({ ...g, contacts: g.contacts.filter(c => !dupSelected.has(c.id)) }))
            .filter(g => g.contacts.length > 1)
      )
      setDupSelected(new Set())
    } catch (e: any) {
      toast({ variant: 'destructive', title: lang === 'el' ? 'Σφάλμα διαγραφής' : 'Delete error', description: e?.message })
    }
    setDupDeleting(false)
  }

  // ── Filter chips ───────────────────────────────────────────────────────────
  const FILTERS: { key: FilterKey; labelEl: string; labelEn: string; badge?: number }[] = [
    { key: 'all',    labelEl: 'Όλες',                labelEn: 'All' },
    { key: 'today',  labelEl: 'Ακολούθηση σήμερα',    labelEn: "Today's Follow-ups", badge: todayCount },
    { key: 'high',   labelEl: 'Υψηλή Προτεραιότητα', labelEn: 'High Priority' },
    { key: 'new',    labelEl: 'Νέοι',                labelEn: 'New' },
    { key: 'likely', labelEl: 'Πιθανοί',             labelEn: 'Likely' },
    { key: 'bought', labelEl: 'Αγόρασαν',            labelEn: 'Bought' },
  ]

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full max-w-full bg-background overflow-x-hidden">
        <CRMSidebar />
        <SidebarInset>
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 md:px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1 overflow-hidden">
              <h1 className="text-base md:text-lg font-semibold text-primary truncate">
                {lang === 'el' ? 'Επαφές & Ευκαιρίες' : 'Contacts & Leads'}
              </h1>
            </div>
            <div className="flex items-center gap-1.5">
              {/* View toggle */}
              <div className="flex border rounded-md overflow-hidden">
                <Button variant="ghost" size="sm" className={cn("h-8 px-2 rounded-none", view === 'table' && "bg-muted")} onClick={() => handleViewToggle('table')} title={lang === 'el' ? 'Προβολή Λίστας' : 'List View'}>
                  <LayoutList className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className={cn("h-8 px-2 rounded-none", view === 'kanban' && "bg-muted")} onClick={() => handleViewToggle('kanban')} title={lang === 'el' ? 'Προβολή Kanban' : 'Kanban View'}>
                  <Columns3 className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => loadContacts()} className="h-8 px-2" title={lang === 'el' ? 'Ανανέωση λίστας' : 'Refresh list'}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
              {isAdmin && (
                <>
                  <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 px-2" title={lang === 'el' ? 'Εξαγωγή επαφών σε CSV' : 'Export contacts to CSV'}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={findDuplicates} className="h-8 px-2 text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30" title={lang === 'el' ? 'Εύρεση Διπλότυπων Επαφών' : 'Find Duplicate Contacts'}>
                    <Layers className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)} className="border-primary text-primary hover:bg-primary/10 h-8 md:h-9" title={lang === 'el' ? 'Μαζική εισαγωγή επαφών' : 'Bulk import contacts'}>
                <Upload className="h-4 w-4 md:mr-2" />
                <span className="hidden sm:inline">{lang === 'el' ? 'Εισαγωγή' : 'Import'}</span>
              </Button>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 md:h-9"
                onClick={() => { setNewLeadForm(emptyForm()); setIsNewLeadOpen(true) }}
                title={lang === 'el' ? 'Προσθήκη νέας επαφής' : 'Add new contact'}>
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden sm:inline">{lang === 'el' ? 'Νέο Lead' : 'New Lead'}</span>
              </Button>
            </div>
          </header>

          <main className="p-4 md:p-6 space-y-4">
            {/* Search + category filter + count */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[160px] max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder={lang === 'el' ? "Αναζήτηση..." : "Search..."}
                  className="pl-8 bg-card" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              {/* Category / specialty filter */}
              <div className="relative">
                <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <select
                  className="pl-8 pr-8 h-9 rounded-md border border-input bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring appearance-none min-w-[140px] max-w-[200px] truncate"
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                >
                  <option value="all">{lang === 'el' ? 'Όλοι οι κλάδοι' : 'All categories'}</option>
                  {categoryOptions.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              {categoryFilter !== 'all' && (
                <button
                  onClick={() => setCategoryFilter('all')}
                  className="text-xs text-muted-foreground hover:text-foreground underline whitespace-nowrap"
                >
                  {lang === 'el' ? 'Εκκαθάριση' : 'Clear'}
                </button>
              )}
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {filtered.length} {lang === 'el' ? 'επαφές' : 'contacts'}
              </span>
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map(f => (
                <button key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    activeFilter === f.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {f.key === 'today' && <Calendar className="h-3 w-3" />}
                  {lang === 'el' ? f.labelEl : f.labelEn}
                  {f.badge ? <span className="bg-white/25 text-[10px] font-black px-1 rounded-full">{f.badge}</span> : null}
                </button>
              ))}
            </div>

            {/* ── Pending access requests banner ─────────────────────────── */}
            {pendingRequests.length > 0 && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/70 dark:bg-amber-950/20 p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
                  <Bell className="h-4 w-4" />
                  {lang === 'el'
                    ? `${pendingRequests.length} Αίτημα${pendingRequests.length > 1 ? 'τα' : ''} Πρόσβασης`
                    : `${pendingRequests.length} Access Request${pendingRequests.length > 1 ? 's' : ''}`}
                </div>
                {pendingRequests.map(req => (
                  <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-background rounded-lg p-3 border">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        <span className="text-primary">{req.requester_name}</span>
                        {lang === 'el' ? ' ζητά πρόσβαση στην επαφή ' : ' is requesting access to '}
                        <span className="font-bold">{req.contact_name}</span>
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="h-7 text-xs border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => handleDenyAccess(req.id)}>
                        {lang === 'el' ? 'Απόρριψη' : 'Deny'}
                      </Button>
                      <Button size="sm" className="h-7 text-xs bg-green-500 hover:bg-green-600 text-white"
                        onClick={() => handleGrantAccess(req.id, req.requester_id, req.contact_id)}>
                        {lang === 'el' ? 'Παραχώρηση' : 'Grant'}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                        onClick={() => router.push(`/contacts/details?id=${req.contact_id}`)}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {loadingContacts && (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <RefreshCcw className="h-4 w-4 animate-spin" />
                <span className="text-sm">{lang === 'el' ? 'Φόρτωση...' : 'Loading...'}</span>
              </div>
            )}

            {/* ── TABLE VIEW ──────────────────────────────────────────────── */}
            {!loadingContacts && view === 'table' && (
              <>
                {/* Mobile card list */}
                <div className="md:hidden flex flex-col gap-2">
                  {paginated.length === 0 ? (
                    <p className="text-center text-muted-foreground py-10 text-sm">
                      {lang === 'el' ? 'Δεν βρέθηκαν επαφές.' : 'No contacts found.'}
                    </p>
                  ) : paginated.map(contact => {
                    const locked = !isAdmin && contact.ownerId !== null && contact.ownerId !== currentUserId
                    return (
                      <div key={contact.id}
                        className="bg-card border rounded-xl p-3 shadow-sm active:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/contacts/details?id=${contact.id}`)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {contact.nextActionDate === todayISO() && (
                              <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                            )}
                            {locked && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                            <span className="font-semibold text-sm truncate">{contact.name}</span>
                          </div>
                          {getStatusBadge(contact.status)}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {(() => {
                            const di = getContactDate(contact)
                            if (!di) return null
                            if (di.type === 'followup') return (
                              <span className="flex flex-col gap-0">
                                <span className="text-[10px] text-amber-600 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />{formatDateShort(di.date)}
                                </span>
                                {contact.nextActionTime && <span className="text-[10px] text-amber-500 pl-4">{contact.nextActionTime}</span>}
                              </span>
                            )
                            if (di.type === 'called') return (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />{formatDateShort(di.date)}
                              </span>
                            )
                            return <span className="text-[10px] text-muted-foreground/60">{formatDateShort(di.date)}</span>
                          })()}
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50"
                          onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${contact.priorityScore}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{contact.priorityScore}%</span>
                          </div>
                          <div className="flex gap-1">
                            <PhoneCallButton phone={contact.phone} contactId={contact.id} contactName={contact.name} callerId={currentUserId} callerName={userName} />
                            {contact.email && (
                              <Button size="sm" variant="ghost"
                                className="h-8 w-8 p-0 text-blue-600"
                                title={lang === 'el' ? 'Αποστολή email J2T' : 'Send J2T email'}
                                onClick={(e) => { e.stopPropagation(); handleSendJ2TEmail(contact) }}>
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block rounded-md border bg-card overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>{lang === 'el' ? 'Όνομα' : 'Name'}</TableHead>
                        <TableHead>{lang === 'el' ? 'Προτεραιότητα' : 'Priority'}</TableHead>
                        <TableHead>{lang === 'el' ? 'Κατάσταση' : 'Status'}</TableHead>
                        <TableHead>{lang === 'el' ? 'Ημερομηνία' : 'Date'}</TableHead>
                        <TableHead>{lang === 'el' ? 'Επένδυση' : 'Investment'}</TableHead>
                        {isAdmin && <TableHead>{lang === 'el' ? 'Τηλεφωνητής' : 'Assigned to'}</TableHead>}
                        <TableHead className="text-right">{lang === 'el' ? 'Ενέργειες' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={isAdmin ? 7 : 6} className="h-24 text-center text-muted-foreground">
                            {lang === 'el' ? 'Δεν βρέθηκαν επαφές.' : 'No contacts found.'}
                          </TableCell>
                        </TableRow>
                      ) : paginated.map(contact => {
                        const locked = !isAdmin && contact.ownerId !== null && contact.ownerId !== currentUserId
                        return (
                          <TableRow key={contact.id} className="cursor-pointer hover:bg-muted/50"
                            onClick={() => router.push(`/contacts/details?id=${contact.id}`)}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-1.5">
                                {contact.nextActionDate === todayISO() && (
                                  <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" title="Ακολούθηση σήμερα" />
                                )}
                                {locked && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                                <div>
                                  <div>{contact.name}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary" style={{ width: `${contact.priorityScore}%` }} />
                                </div>
                                <span className="text-[10px]">{contact.priorityScore}%</span>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(contact.status)}</TableCell>
                            <TableCell className="text-xs">
                              {(() => {
                                const di = getContactDate(contact)
                                if (!di) return <span className="text-muted-foreground">—</span>
                                if (di.type === 'followup') return (
                                  <span className="flex flex-col gap-0 text-amber-600 font-medium">
                                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3 shrink-0" />{formatDateShort(di.date)}</span>
                                    {contact.nextActionTime && <span className="text-[10px] pl-4 text-amber-500">{contact.nextActionTime}</span>}
                                  </span>
                                )
                                if (di.type === 'called') return (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Phone className="h-3 w-3 shrink-0" />{formatDateShort(di.date)}
                                  </span>
                                )
                                return <span className="text-muted-foreground/60">{formatDateShort(di.date)}</span>
                              })()}
                            </TableCell>
                            <TableCell className="text-xs">
                              {contact.investmentAmount > 0 ? `€${contact.investmentAmount.toLocaleString()}` : "—"}
                            </TableCell>
                            {isAdmin && (
                              <TableCell onClick={e => e.stopPropagation()}>
                                <Select
                                  value={contact.ownerId ?? 'unassigned'}
                                  onValueChange={v => handleAssignContact(contact.id, v === 'unassigned' ? null : v)}
                                >
                                  <SelectTrigger className="h-7 text-xs w-36 border-dashed">
                                    <SelectValue placeholder={lang === 'el' ? 'Αδέσμευτη' : 'Unassigned'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unassigned" className="text-xs text-muted-foreground">
                                      {lang === 'el' ? '— Αδέσμευτη' : '— Unassigned'}
                                    </SelectItem>
                                    {telephonists.map(t => (
                                      <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            )}
                            <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex justify-end gap-1">
                                <PhoneCallButton phone={contact.phone} contactId={contact.id} contactName={contact.name} callerId={currentUserId} callerName={userName} className="h-9 w-9 p-0 text-accent" />
                                {contact.email && (
                                  <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-blue-600"
                                    title={lang === 'el' ? 'Αποστολή email J2T' : 'Send J2T email'}
                                    onClick={() => handleSendJ2TEmail(contact)}>
                                    <Send className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-10 w-10 p-0" disabled={safePage === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                        .reduce<(number | '...')[]>((acc, n, i, arr) => {
                          if (i > 0 && typeof arr[i - 1] === 'number' && (n as number) - (arr[i - 1] as number) > 1) acc.push('...')
                          acc.push(n); return acc
                        }, [])
                        .map((item, i) => item === '...'
                          ? <span key={`e-${i}`} className="text-xs text-muted-foreground px-1">…</span>
                          : <Button key={item} variant={item === safePage ? "default" : "outline"} size="sm"
                              className="h-10 w-10 p-0 text-xs" onClick={() => setPage(item as number)}>{item}</Button>
                        )}
                      <Button variant="outline" size="sm" className="h-10 w-10 p-0" disabled={safePage === totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    {pageJumpActive ? (
                      <form
                        className="flex items-center gap-1"
                        onSubmit={(e) => {
                          e.preventDefault()
                          const n = parseInt(pageJumpValue)
                          if (!isNaN(n) && n >= 1 && n <= totalPages) setPage(n)
                          setPageJumpActive(false)
                          setPageJumpValue('')
                        }}
                      >
                        <input
                          ref={pageJumpRef}
                          type="number"
                          min={1}
                          max={totalPages}
                          value={pageJumpValue}
                          onChange={e => setPageJumpValue(e.target.value)}
                          onBlur={() => { setPageJumpActive(false); setPageJumpValue('') }}
                          onKeyDown={e => { if (e.key === 'Escape') { setPageJumpActive(false); setPageJumpValue('') } }}
                          className="h-7 w-14 rounded border border-input bg-background px-2 text-xs text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-1 focus:ring-ring"
                          placeholder={String(safePage)}
                          autoFocus
                        />
                        <span className="text-xs text-muted-foreground">{lang === 'el' ? `από ${totalPages}` : `of ${totalPages}`}</span>
                      </form>
                    ) : (
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer transition-colors"
                        title={lang === 'el' ? 'Κάντε κλικ για μετάβαση σε σελίδα' : 'Click to jump to page'}
                        onClick={() => {
                          setPageJumpValue(String(safePage))
                          setPageJumpActive(true)
                          setTimeout(() => pageJumpRef.current?.select(), 10)
                        }}
                      >
                        {lang === 'el' ? `Σελίδα ${safePage} από ${totalPages}` : `Page ${safePage} of ${totalPages}`}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── KANBAN VIEW ─────────────────────────────────────────────── */}
            {!loadingContacts && view === 'kanban' && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {STATUS_COLS.map(col => {
                  const colContacts = filtered
                    .filter(c => c.status === col.key)
                    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
                  return (
                    <div key={col.key} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {lang === 'el' ? col.labelEl : col.labelEn}
                        </span>
                        <Badge variant="secondary" className="text-[10px] h-4">{colContacts.length}</Badge>
                      </div>
                      <div className={cn("flex flex-col gap-2 min-h-[200px] rounded-xl p-2 bg-muted/30 border-t-4", col.color)}>
                        {colContacts.length === 0 && (
                          <p className="text-[10px] text-muted-foreground text-center pt-6">
                            {lang === 'el' ? 'Κανένα' : 'Empty'}
                          </p>
                        )}
                        {colContacts.map(contact => {
                          const locked = !isAdmin && contact.ownerId !== null && contact.ownerId !== currentUserId
                          return (
                            <Card key={contact.id}
                              className="cursor-pointer hover:border-primary transition-all shadow-sm"
                              onClick={() => router.push(`/contacts/details?id=${contact.id}`)}>
                              <CardHeader className="p-3 pb-1">
                                <div className="flex items-start justify-between gap-1">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                      {locked && <Lock className="h-2.5 w-2.5 text-muted-foreground shrink-0" />}
                                      <p className="text-xs font-bold truncate">{contact.name}</p>
                                    </div>
                                    {contact.jobTitle && (
                                      <p className="text-[10px] text-muted-foreground truncate">{contact.jobTitle}</p>
                                    )}
                                    {(() => {
                                      const di = getContactDate(contact)
                                      if (!di) return null
                                      if (di.type === 'followup') return (
                                        <span className="flex flex-col gap-0 mt-0.5">
                                          <span className="text-[9px] text-amber-600 flex items-center gap-0.5">
                                            <Calendar className="h-2.5 w-2.5 shrink-0" />{formatDateShort(di.date)}
                                          </span>
                                          {contact.nextActionTime && <span className="text-[9px] text-amber-500 pl-3">{contact.nextActionTime}</span>}
                                        </span>
                                      )
                                      if (di.type === 'called') return (
                                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                                          <Phone className="h-2.5 w-2.5 shrink-0" />{formatDateShort(di.date)}
                                        </span>
                                      )
                                      return <span className="text-[9px] text-muted-foreground/50 block mt-0.5">{formatDateShort(di.date)}</span>
                                    })()}
                                  </div>
                                  {contact.nextActionDate === todayISO() && (
                                    <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0 mt-1" title="Ακολούθηση σήμερα" />
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent className="p-3 pt-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${contact.priorityScore}%` }} />
                                  </div>
                                  <span className="text-[9px] text-muted-foreground">{contact.priorityScore}%</span>
                                </div>
                                <div className="flex items-center justify-end gap-1">
                                  <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                                    <PhoneCallButton phone={contact.phone} contactId={contact.id} contactName={contact.name} callerId={currentUserId} callerName={userName} className="h-9 w-9 p-0 text-accent" />
                                  </div>
                                </div>
                                {canEdit(contact) && (
                                  <div className="flex gap-0.5 flex-wrap pt-0.5" onClick={e => e.stopPropagation()}>
                                    {STATUS_COLS.filter(s => s.key !== col.key).map(s => (
                                      <button key={s.key}
                                        className="text-[10px] px-2 py-1 min-h-[28px] rounded bg-muted hover:bg-muted-foreground/20 text-muted-foreground font-medium transition-colors"
                                        onClick={() => handleStatusChange(contact.id, s.key)}>
                                        → {lang === 'el' ? s.labelEl : s.labelEn}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </main>

          <ImportLeadsDialog
            open={isImportDialogOpen}
            onOpenChange={(open) => { setIsImportDialogOpen(open); if (!open) loadContacts() }}
          />

          {/* ── New Lead Dialog ─────────────────────────────────────────────── */}
          <Dialog open={isNewLeadOpen} onOpenChange={v => { setIsNewLeadOpen(v); if (!v) { setNewLeadPhones(['']); setNewLeadTime(''); setNewLeadAssignTo('self'); setNewLeadSource('') } }}>
            <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{lang === 'el' ? 'Νέα Επαφή / Lead' : 'New Contact / Lead'}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">{lang === 'el' ? 'Ονοματεπώνυμο *' : 'Full Name *'}</Label>
                  <Input
                    placeholder={lang === 'el' ? 'π.χ. Γιώργος Παπαδόπουλος' : 'e.g. George Papadopoulos'}
                    value={newLeadForm.name ?? ''}
                    onChange={e => setNewLeadForm(f => ({ ...f, name: e.target.value }))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">{lang === 'el' ? 'Τηλέφωνο' : 'Phone'}</Label>
                  <div className="space-y-1.5">
                    {newLeadPhones.map((ph, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          placeholder={idx === 0 ? '+30 697 000 0000' : lang === 'el' ? 'Επιπλέον τηλέφωνο' : 'Additional phone'}
                          value={ph}
                          onChange={e => {
                            const updated = [...newLeadPhones]
                            updated[idx] = e.target.value
                            setNewLeadPhones(updated)
                          }}
                          className="h-9 flex-1"
                          type="tel"
                        />
                        {newLeadPhones.length > 1 && (
                          <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => setNewLeadPhones(p => p.filter((_, i) => i !== idx))}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1 mt-0.5"
                    onClick={() => setNewLeadPhones(p => [...p, ''])}>
                    <Plus className="h-3 w-3" />
                    {lang === 'el' ? 'Προσθήκη τηλεφώνου' : 'Add phone'}
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input
                    placeholder="email@example.com"
                    value={newLeadForm.email ?? ''}
                    onChange={e => setNewLeadForm(f => ({ ...f, email: e.target.value }))}
                    className="h-9"
                    type="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{lang === 'el' ? 'Επάγγελμα' : 'Job Title'}</Label>
                  <Input
                    placeholder={lang === 'el' ? 'π.χ. Γιατρός' : 'e.g. Doctor'}
                    value={newLeadForm.jobTitle ?? ''}
                    onChange={e => setNewLeadForm(f => ({ ...f, jobTitle: e.target.value }))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{lang === 'el' ? 'Κλάδος' : 'Industry'}</Label>
                  <Input
                    placeholder={lang === 'el' ? 'π.χ. Υγεία' : 'e.g. Healthcare'}
                    value={newLeadForm.industry ?? ''}
                    onChange={e => setNewLeadForm(f => ({ ...f, industry: e.target.value }))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{lang === 'el' ? 'Ύψος Επένδυσης (€)' : 'Investment Amount (€)'}</Label>
                  <Input
                    placeholder="0"
                    value={newLeadForm.investmentAmount || ''}
                    onChange={e => setNewLeadForm(f => ({ ...f, investmentAmount: Number(e.target.value) || 0 }))}
                    className="h-9"
                    type="number"
                    min="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{lang === 'el' ? 'Πηγή Εύρεσης' : 'Lead Source'}</Label>
                  <Input
                    placeholder={lang === 'el' ? 'π.χ. Χρυσός Οδηγός, Google Maps, Σύσταση...' : 'e.g. Yellow Pages, Google Maps, Referral...'}
                    value={newLeadSource}
                    onChange={e => setNewLeadSource(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{lang === 'el' ? 'Κατάσταση' : 'Status'}</Label>
                  <Select
                    value={newLeadForm.status ?? 'new'}
                    onValueChange={v => setNewLeadForm(f => ({ ...f, status: v as LeadStatus }))}
                  >
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">{lang === 'el' ? 'Νέος' : 'New'}</SelectItem>
                      <SelectItem value="canva">Canva</SelectItem>
                      <SelectItem value="likely_sale">Sale</SelectItem>
                      <SelectItem value="likely_antisale">Antisale</SelectItem>
                      <SelectItem value="no_answer">{lang === 'el' ? 'Δεν Απάντησε' : 'No Answer'}</SelectItem>
                      <SelectItem value="not_buying">{lang === 'el' ? 'Δεν Αγοράζει' : 'Not Buying'}</SelectItem>
                      <SelectItem value="bought">{lang === 'el' ? 'Αγόρασε' : 'Bought'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">{lang === 'el' ? 'Επόμενη Ενέργεια (Ακολούθηση)' : 'Follow-up Date & Time'}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={newLeadForm.nextActionDate ?? ''}
                      onChange={e => setNewLeadForm(f => ({ ...f, nextActionDate: e.target.value }))}
                      className="h-9 flex-1"
                    />
                    <Input
                      type="time"
                      value={newLeadTime}
                      onChange={e => setNewLeadTime(e.target.value)}
                      className="h-9 w-28 shrink-0"
                      placeholder="--:--"
                    />
                  </div>
                </div>
                {isAdmin && telephonists.length > 0 && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">{lang === 'el' ? 'Ανάθεση σε τηλεφωνητή' : 'Assign to telephonist'}</Label>
                    <Select value={newLeadAssignTo} onValueChange={setNewLeadAssignTo}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned" className="text-xs">{lang === 'el' ? '— Αδέσμευτη' : '— Unassigned'}</SelectItem>
                        {telephonists.map(t => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">{lang === 'el' ? 'Σημειώσεις' : 'Notes'}</Label>
                  <Textarea
                    placeholder={lang === 'el' ? 'Γράψτε τυχόν σημειώσεις...' : 'Write any notes...'}
                    value={newLeadForm.observations ?? ''}
                    onChange={e => setNewLeadForm(f => ({ ...f, observations: e.target.value }))}
                    className="min-h-[80px] text-sm resize-none"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsNewLeadOpen(false)}>
                  {lang === 'el' ? 'Άκυρο' : 'Cancel'}
                </Button>
                <Button onClick={handleNewLeadSave} className="bg-primary text-primary-foreground">
                  <Plus className="h-4 w-4 mr-2" />
                  {lang === 'el' ? 'Αποθήκευση' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ── Duplicate Finder Dialog ──────────────────────────────────────── */}
          <Dialog open={isDupOpen} onOpenChange={v => { setIsDupOpen(v); if (!v) setDupSelected(new Set()) }}>
            <DialogContent className="sm:max-w-2xl max-h-[85dvh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-amber-600" />
                  {lang === 'el' ? 'Εύρεση Διπλότυπων Επαφών' : 'Find Duplicate Contacts'}
                </DialogTitle>
              </DialogHeader>

              {/* Body */}
              <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pr-1">
                {dupLoading && (
                  <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                    <RefreshCcw className="h-5 w-5 animate-spin" />
                    <span className="text-sm">{lang === 'el' ? 'Αναζήτηση διπλότυπων...' : 'Searching for duplicates...'}</span>
                  </div>
                )}

                {!dupLoading && dupGroups.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckSquare className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="font-semibold text-green-700 dark:text-green-400">
                      {lang === 'el' ? 'Δεν βρέθηκαν διπλότυπες επαφές!' : 'No duplicate contacts found!'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lang === 'el' ? 'Όλα τα τηλέφωνα είναι μοναδικά.' : 'All phone numbers are unique.'}
                    </p>
                  </div>
                )}

                {!dupLoading && dupGroups.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b">
                      <p className="text-sm text-muted-foreground">
                        {lang === 'el'
                          ? `${dupGroups.length} ομάδες · ${dupGroups.reduce((s, g) => s + g.contacts.length, 0)} επαφές συνολικά`
                          : `${dupGroups.length} groups · ${dupGroups.reduce((s, g) => s + g.contacts.length, 0)} contacts total`}
                      </p>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={autoSelectDups}>
                        <CheckSquare className="h-3.5 w-3.5" />
                        {lang === 'el' ? 'Κράτησε παλαιότερη, επίλεξε τις υπόλοιπες' : 'Keep oldest, select rest'}
                      </Button>
                    </div>

                    {dupGroups.map((group, gi) => (
                      <div key={gi} className="rounded-lg border overflow-hidden">
                        <div className="px-3 py-1.5 bg-muted/50 border-b flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-mono font-bold text-foreground">{group.phone}</span>
                          <span className="text-[10px] text-muted-foreground">({group.contacts.length} {lang === 'el' ? 'επαφές' : 'contacts'})</span>
                        </div>
                        <div className="divide-y">
                          {group.contacts.map((c, ci) => {
                            const isFirst = ci === 0
                            const checked = dupSelected.has(c.id)
                            return (
                              <div
                                key={c.id}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors",
                                  checked && "bg-destructive/5"
                                )}
                                onClick={() => setDupSelected(prev => {
                                  const n = new Set(prev)
                                  if (n.has(c.id)) n.delete(c.id); else n.add(c.id)
                                  return n
                                })}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => setDupSelected(prev => {
                                    const n = new Set(prev); if (v) n.add(c.id); else n.delete(c.id); return n
                                  })}
                                  onClick={e => e.stopPropagation()}
                                  className="shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium truncate">{c.name}</span>
                                    {isFirst && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold shrink-0">
                                        {lang === 'el' ? 'παλαιότερη' : 'oldest'}
                                      </span>
                                    )}
                                    {getStatusBadge(c.status)}
                                  </div>
                                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                    <span className="text-[11px] text-muted-foreground">{lang === 'el' ? 'Τηλ/τής:' : 'Owner:'} {c.ownerName}</span>
                                    {c.createdAt && (
                                      <span className="text-[11px] text-muted-foreground">
                                        {new Date(c.createdAt).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {checked && <Trash2 className="h-3.5 w-3.5 text-destructive shrink-0" />}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-3">
                <Button variant="outline" onClick={() => setIsDupOpen(false)} className="sm:mr-auto">
                  {lang === 'el' ? 'Κλείσιμο' : 'Close'}
                </Button>
                {dupSelected.size > 0 && (
                  <Button
                    variant="destructive"
                    onClick={() => setDupDeleteConfirm(true)}
                    disabled={dupDeleting}
                    className="gap-2"
                  >
                    {dupDeleting ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {lang === 'el' ? `Διαγραφή ${dupSelected.size} επαφών` : `Delete ${dupSelected.size} contacts`}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </SidebarInset>
      </div>

      <AlertDialog open={dupDeleteConfirm} onOpenChange={setDupDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lang === 'el' ? 'Επιβεβαίωση διαγραφής' : 'Confirm deletion'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lang === 'el'
                ? `Πρόκειται να διαγράψετε ${dupSelected.size} επαφές. Αυτή η ενέργεια είναι μη αναστρέψιμη.`
                : `You are about to delete ${dupSelected.size} contacts. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === 'el' ? 'Ακύρωση' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setDupDeleteConfirm(false); handleDeleteDups() }}
            >
              {lang === 'el' ? 'Διαγραφή' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </SidebarProvider>
  )
}
