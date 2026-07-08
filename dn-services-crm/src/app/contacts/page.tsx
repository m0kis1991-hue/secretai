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
  Download, LayoutList, Columns3, Phone, Calendar, Lock, RefreshCcw, Bell, ExternalLink, Send, Filter, X, Layers, Trash2, CheckSquare, Star, Crown, Users,
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

  const logAndCall = (p: string) => {
    // Fire tel: immediately — mobile browsers block tel: navigation after any await (user gesture expires)
    window.location.href = `tel:${p}`
    if (callerId) {
      const supabase = createClient()
      const today = new Date().toISOString().slice(0, 10)
      Promise.all([
        supabase.from('call_logs').insert({
          telephonist_id: callerId,
          telephonist_name: callerName ?? '',
          contact_id: contactId,
          contact_name: contactName,
          called_at: new Date().toISOString(),
        }),
        supabase.from('contacts').update({ last_contacted: today }).eq('id', contactId),
      ]).catch(() => {})
    }
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

type FilterKey = 'all' | 'today' | 'high' | 'new' | 'canva' | 'probable' | 'likely_sale' | 'likely_antisale' | 'another_time' | 'email' | 'no_answer' | 'not_buying' | 'bought' | 'few_reviews'

const STATUS_COLS: { key: LeadStatus; labelEl: string; labelEn: string; color: string }[] = [
  { key: STATUS.NEW,             labelEl: 'Νέο',           labelEn: 'New',       color: 'border-t-blue-400' },
  { key: STATUS.CANVA,           labelEl: 'Canva',         labelEn: 'Canva',     color: 'border-t-purple-500' },
  { key: STATUS.LIKELY_SALE,     labelEl: 'Sale',          labelEn: 'Sale',      color: 'border-t-amber-500' },
  { key: STATUS.LIKELY_ANTISALE, labelEl: 'Antisale',      labelEn: 'Antisale',  color: 'border-t-amber-800' },
  { key: STATUS.NO_ANSWER,       labelEl: 'Δεν Απάντησε', labelEn: 'No Answer', color: 'border-t-orange-400' },
  { key: STATUS.NOT_BUYING,      labelEl: 'Όχι',           labelEn: 'Declined',  color: 'border-t-red-400' },
  { key: STATUS.BOUGHT,          labelEl: 'Αγόρασε',       labelEn: 'Bought',    color: 'border-t-green-500' },
]

const TROPHY_STATUS_COLS: { key: LeadStatus; labelEl: string; labelEn: string; color: string }[] = [
  { key: STATUS.NEW,         labelEl: 'Νέο',                  labelEn: 'New',         color: 'border-t-blue-400' },
  { key: STATUS.CANVA,       labelEl: 'Canva',                labelEn: 'Canva',       color: 'border-t-purple-500' },
  { key: STATUS.PROBABLE,    labelEl: 'Πιθανός',              labelEn: 'Probable',    color: 'border-t-teal-500' },
  { key: STATUS.LIKELY_SALE, labelEl: 'Sale',                 labelEn: 'Sale',        color: 'border-t-amber-500' },
  { key: STATUS.FEW_REVIEWS, labelEl: 'Λίγες Αξιολογήσεις',  labelEn: 'Few Reviews', color: 'border-t-sky-400' },
  { key: STATUS.NO_ANSWER,   labelEl: 'Δεν Απάντησε',        labelEn: 'No Answer',   color: 'border-t-orange-400' },
  { key: STATUS.NOT_BUYING,  labelEl: 'Όχι',                  labelEn: 'Declined',    color: 'border-t-red-400' },
  { key: STATUS.BOUGHT,      labelEl: 'Αγόρασε',              labelEn: 'Bought',      color: 'border-t-green-500' },
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
  const [page, setPage] = useState<number>(() => {
    try { return parseInt(sessionStorage.getItem('contacts-page') ?? '1', 10) || 1 } catch { return 1 }
  })
  const [pageJumpActive, setPageJumpActive] = useState(false)
  const [pageJumpValue, setPageJumpValue] = useState('')
  const pageJumpRef = useRef<HTMLInputElement>(null)
  const [activeFilter, setActiveFilter] = useState<FilterKey>(() => {
    try {
      const VALID: FilterKey[] = ['all','today','high','new','canva','probable','likely_sale','likely_antisale','another_time','email','no_answer','not_buying','bought','few_reviews']
      const stored = sessionStorage.getItem('contacts-filter') as FilterKey
      return VALID.includes(stored) ? stored : 'all'
    } catch { return 'all' }
  })
  const [categoryFilter, setCategoryFilter] = useState<string>(() => {
    try { return sessionStorage.getItem('contacts-category') || 'all' } catch { return 'all' }
  })
  const [view, setView] = useState<'table' | 'kanban'>('table')
  const [userRole, setUserRole] = useState<string>('telephonist')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [pendingRequests, setPendingRequests] = useState<{ id: string; contact_id: string; contact_name: string; requester_name: string; requester_id: string }[]>([])
  const [telephonists, setTelephonists] = useState<{ id: string; name: string }[]>([])
  const [testUserIds, setTestUserIds] = useState<string[]>([])
  const [topLeadsAccess, setTopLeadsAccess] = useState(false)
  const [trophySessions, setTrophySessions] = useState<Map<string, { status: string; nextActionDate?: string | null }>>(new Map())
  const [adminTrophyMap, setAdminTrophyMap] = useState<Map<string, string>>(new Map())
  const [totalCount, setTotalCount] = useState(0)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [ownerScope, setOwnerScope] = useState<'all' | 'trophy' | 'regular'>(() => {
    try { return (sessionStorage.getItem('contacts-scope') as 'all' | 'trophy' | 'regular') || 'all' } catch { return 'all' }
  })
  const loadIdRef = useRef(0)
  // Tracks which contacts the current user has their own trophy session for (own session takes priority)
  const myTrophyContactIds = useRef<Set<string>>(new Set())
  // IDs of profiles with top_leads_access (trophy telephonists) — used for admin scope filter
  const trophyUserIdsRef = useRef<string[]>([])

  const CONTACT_BASE_COLUMNS = 'id,name,phone,email,address,company_name,industry,job_title,status,owner_id,created_by,locked_until,sale_locked,last_contacted,priority_score,next_action_date,next_action_time,investment_amount,lead_source,created_at'

  // Params ref: always holds latest values so the stable loadContacts closure never goes stale
  const paramsRef = useRef({ userRole, currentUserId, testUserIds, topLeadsAccess, activeFilter, debouncedSearch, categoryFilter, page, view, ownerScope })
  paramsRef.current = { userRole, currentUserId, testUserIds, topLeadsAccess, activeFilter, debouncedSearch, categoryFilter, page, view, ownerScope }

  // Stable loadContacts — no stale closure issues because it reads from paramsRef
  const loadContacts = useCallback(async (boot?: { userId: string; role: string; excludeIds: string[]; tla: boolean }) => {
    const myId = ++loadIdRef.current
    setLoadingContacts(true)

    const p = boot
      ? { ...paramsRef.current, currentUserId: boot.userId, userRole: boot.role, testUserIds: boot.excludeIds, topLeadsAccess: boot.tla }
      : paramsRef.current

    const supabase = createClient()
    const today = new Date().toISOString().slice(0, 10)
    const isKanban = p.view === 'kanban'

    // For admin + trophy scope (or probable filter): pre-fetched contact IDs from trophy sessions
    // populated before buildQuery is called so closure sees updated value
    let trophyStatusIds: string[] | null = null

    const buildQuery = (withRating: boolean) => {
      const cols = withRating ? `${CONTACT_BASE_COLUMNS},rating,review_count` : CONTACT_BASE_COLUMNS
      // For admin/regular: server counts exact total for pagination
      const countOpt = p.topLeadsAccess ? undefined : ({ count: 'exact' } as const)
      let q = supabase.from('contacts').select(cols, countOpt)

      if (p.topLeadsAccess) {
        // Trophy: exclude ONLY contacts with an active time-lock (owner_id set + locked_until in the future).
        // Contacts with owner_id but NO locked_until are "soft-assigned" (imported leads never time-locked)
        // and should be visible to trophy — that's where all the rated Google Maps leads live.
        // Condition: exclude where locked_until IS NOT NULL AND locked_until >= today AND owner_id IS NOT NULL.
        // Equivalent to: include where (owner_id IS NULL) OR (locked_until IS NULL) OR (locked_until < today).
        q = q
          .or('sale_locked.is.false,sale_locked.is.null')
          .or(`owner_id.is.null,locked_until.is.null,locked_until.lt.${today}`)
        // Sort: Google Maps / rated contacts first (NULLS LAST), then newest by date within each group
        q = (q as any)
          .order('rating', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
        q = q.range(0, 1999)
      } else if (!isAdminRole(p.userRole) && p.currentUserId) {
        // Regular telephonist: only their own contacts
        q = q.or([
          `and(owner_id.eq.${p.currentUserId},sale_locked.eq.true)`,
          `and(owner_id.eq.${p.currentUserId},locked_until.gte.${today})`,
          `and(owner_id.eq.${p.currentUserId},locked_until.is.null)`,
          `and(created_by.eq.${p.currentUserId},owner_id.is.null)`,
        ].join(','))
          .order('priority_score', { ascending: false })
        // Regular telephonists have few contacts — load all
        q = q.range(0, 9999)
      } else {
        // Admin: server-side pagination + filters
        q = q.order('priority_score', { ascending: false })

        // Owner scope: isolate trophy vs regular telephonist contacts
        const trophyIds = trophyUserIdsRef.current
        if (p.ownerScope === 'trophy') {
          // Two sources of trophy contacts must be unioned:
          // 1. Session contacts: imported leads worked via trophy_contact_sessions (status stored there, contacts.status='new')
          // 2. Owned contacts: contacts created directly by trophy telephonists (status stored in contacts.status)
          // Without the OR, directly-created contacts with no session row were invisible to admin.
          const sessionPart = trophyStatusIds !== null && trophyStatusIds.length > 0
            ? `id.in.(${trophyStatusIds.join(',')})` : null
          let ownedPart: string | null = null
          if (trophyIds.length > 0) {
            const ownerFilter = `owner_id.in.(${trophyIds.join(',')})`
            if (p.activeFilter === 'all' || p.activeFilter === 'high') {
              ownedPart = ownerFilter
            } else if (p.activeFilter === 'today') {
              ownedPart = `and(${ownerFilter},next_action_date.eq.${today})`
            } else {
              ownedPart = `and(${ownerFilter},status.eq.${p.activeFilter})`
            }
          }
          const orParts = [sessionPart, ownedPart].filter(Boolean) as string[]
          if (orParts.length > 0) {
            q = q.or(orParts.join(','))
          } else {
            q = q.eq('id', '00000000-0000-0000-0000-000000000000')
          }
        } else if (p.ownerScope === 'regular' && trophyIds.length > 0) {
          q = q.not('owner_id', 'is', null)
          q = q.not('owner_id', 'in', `(${trophyIds.join(',')})`)
        }

        if (!isKanban) {
          if (p.activeFilter === 'today' && p.ownerScope !== 'trophy') q = q.eq('next_action_date', today)
          // trophy scope + today: handled in OR condition above (session contacts via pre-fetch, owned contacts via next_action_date.eq)
          else if (p.activeFilter === 'high') q = q.gte('priority_score', 70)
          // trophyStatusIds: status already filtered via id IN above (trophy scope) or applied below (all scope)
          else if (trophyStatusIds !== null && p.ownerScope !== 'trophy') {
            // ownerScope=all + probable: filter contacts by trophy session IDs
            q = trophyStatusIds.length > 0
              ? q.in('id', trophyStatusIds)
              : q.eq('id', '00000000-0000-0000-0000-000000000000')
          }
          else if (trophyStatusIds !== null) { /* trophy scope: handled above */ }
          else if (p.activeFilter === 'new') q = q.eq('status', 'new')
          else if (p.activeFilter === 'canva') q = q.eq('status', 'canva')
          else if (p.activeFilter === 'likely_sale') q = q.eq('status', 'likely_sale')
          else if (p.activeFilter === 'likely_antisale') q = q.eq('status', 'likely_antisale')
          else if (p.activeFilter === 'another_time') q = q.eq('status', 'another_time')
          else if (p.activeFilter === 'email') q = q.eq('status', 'email')
          else if (p.activeFilter === 'no_answer') q = q.eq('status', 'no_answer')
          else if (p.activeFilter === 'not_buying') q = q.eq('status', 'not_buying')
          else if (p.activeFilter === 'bought') q = q.eq('status', 'bought')

          if (p.debouncedSearch) {
            const s = p.debouncedSearch.replace(/'/g, "''")
            q = q.or(`name.ilike.%${s}%,phone.ilike.%${s}%`)
          }
          if (p.categoryFilter !== 'all') {
            const cat = p.categoryFilter.replace(/'/g, "''")
            q = q.or(`job_title.ilike.%${cat}%,industry.ilike.%${cat}%`)
          }
          const start = (p.page - 1) * PAGE_SIZE
          q = q.range(start, start + PAGE_SIZE - 1)
        } else {
          // Kanban: load all statuses, up to 500
          q = q.range(0, 499)
        }
      }
      return q
    }

    try {
      // Admin: pre-fetch trophy session contact IDs.
      // ownerScope=trophy: always — finds contacts worked by ANY trophy telephonist regardless of owner_id.
      // ownerScope=all + probable: finds probable contacts in trophy sessions.
      if (isAdminRole(p.userRole) && !isKanban &&
          (p.ownerScope === 'trophy' || p.activeFilter === 'probable')) {
        let sessQ = supabase
          .from('trophy_contact_sessions')
          .select('contact_id, updated_at')
          .order('updated_at', { ascending: false })
        if (p.ownerScope === 'trophy') {
          // today: filter by session's next_action_date (trophy telephonists store dates in sessions, not contacts)
          if (p.activeFilter === 'today') sessQ = sessQ.eq('next_action_date', today)
          // specific status: filter by status; 'all' and 'high' need all IDs
          else if (p.activeFilter !== 'all' && p.activeFilter !== 'high') sessQ = sessQ.eq('status', p.activeFilter)
        } else {
          sessQ = sessQ.eq('status', 'probable')
        }
        const { data: troSessions } = await sessQ
        if (myId !== loadIdRef.current) return
        const seen = new Set<string>()
        trophyStatusIds = []
        for (const s of troSessions ?? []) {
          if (!seen.has(s.contact_id)) { seen.add(s.contact_id); trophyStatusIds.push(s.contact_id) }
        }
      }

      if (p.topLeadsAccess) {
        // Trophy: run contacts query + "locked by other trophy" query in parallel
        const [lockedRes, rawRes] = await Promise.all([
          supabase
            .from('trophy_contact_sessions')
            .select('contact_id')
            .neq('owner_id', p.currentUserId)
            .not('locked_until', 'is', null)
            .gte('locked_until', today),
          buildQuery(true),
        ])
        // Fallback if rating columns missing
        let contactsRes = rawRes
        if ((rawRes as any).error) {
          console.warn('[loadContacts] trophy retrying without rating:', (rawRes as any).error.message)
          contactsRes = await buildQuery(false)
        }
        if (myId !== loadIdRef.current) return
        const lockedByOtherTrophy = new Set(((lockedRes as any).data ?? []).map((s: any) => s.contact_id))
        const { data, error } = contactsRes as any
        if (!error && data) {
          const mapped = (data as any[]).map(rowToContact).filter(c => !lockedByOtherTrophy.has(c.id))
          setContacts(mapped)
          setTotalCount(mapped.length)
        } else if (error) {
          console.error('[loadContacts] trophy failed:', error.message)
        }
      } else {
        // Admin / regular telephonist
        let res = await buildQuery(true)
        if ((res as any).error) {
          console.warn('[loadContacts] retrying without rating/review_count:', (res as any).error.message)
          res = await buildQuery(false)
        }
        if (myId !== loadIdRef.current) return
        const { data, error } = res as any
        if (!error && data) {
          const mapped = (data as any[]).map(rowToContact)
          // Deduplicate by id — a telephonist contact can match multiple OR conditions
          // (e.g. sale_locked=true AND locked_until=null satisfies two arms of the compound or())
          const seen = new Set<string>()
          const deduped = mapped.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true })
          const visible = isAdminRole(p.userRole) && p.testUserIds.length > 0
            ? deduped.filter(c => !p.testUserIds.includes(c.ownerId ?? ''))
            : deduped

          // For admin: overlay trophy session statuses so trophy contacts show correct status
          if (isAdminRole(p.userRole) && visible.length > 0) {
            const { data: troData } = await supabase
              .from('trophy_contact_sessions')
              .select('contact_id, status, updated_at')
              .in('contact_id', visible.map(c => c.id))
              .order('updated_at', { ascending: false })
            if (myId !== loadIdRef.current) return
            const tMap = new Map<string, string>()
            for (const s of troData ?? []) {
              if (!tMap.has(s.contact_id)) tMap.set(s.contact_id, s.status)
            }
            if (tMap.size > 0) {
              setAdminTrophyMap(prev => { const next = new Map(prev); tMap.forEach((st, cid) => next.set(cid, st)); return next })
            }
            setContacts(visible.map(c => tMap.has(c.id) ? { ...c, status: tMap.get(c.id)! as LeadStatus } : c))
          } else {
            setContacts(visible)
          }

          if (isAdminRole(p.userRole) && !isKanban) {
            const serverCount = (res as any).count ?? 0
            setTotalCount(Math.max(0, serverCount - (deduped.length - visible.length)))
          } else {
            setTotalCount(visible.length)
          }
        } else if (error) {
          console.error('[loadContacts] failed:', error.message)
        }
      }
    } finally {
      if (myId === loadIdRef.current) setLoadingContacts(false)
    }
  }, []) // stable — reads from paramsRef

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
      // Trophy telephonists: load ALL sessions so each trophy can see what others have set.
      // Priority: current user's own session first, then most-recently-updated session from any other.
      if (tla && user.id) {
        const myId = user.id
        supabase
          .from('trophy_contact_sessions')
          .select('contact_id, status, next_action_date, owner_id, updated_at')
          .then(({ data: sessions }) => {
            const grouped = new Map<string, any[]>()
            for (const s of sessions ?? []) {
              const arr = grouped.get(s.contact_id) ?? []
              arr.push(s)
              grouped.set(s.contact_id, arr)
            }
            const m = new Map<string, { status: string; nextActionDate?: string | null }>()
            const ownIds = new Set<string>()
            for (const [contactId, rows] of grouped) {
              const own = rows.find(s => s.owner_id === myId)
              if (own) ownIds.add(contactId)
              const best = own ?? rows.sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))[0]
              m.set(contactId, { status: best.status, nextActionDate: best.next_action_date })
            }
            myTrophyContactIds.current = ownIds
            setTrophySessions(m)
          })
      }
      // Load telephonist list for admin reassignment + resolve test IDs + trophy user IDs
      const TEST_EMAILS = ['m0kis1991@gmail.com', 'm0kis@hotmail.com']
      let resolvedTestIds: string[] = []
      if (isAdminRole(role)) {
        const [{ data: tels }, { data: trophyProfiles }] = await Promise.all([
          supabase.from('profiles').select('id, name, email').eq('role', 'telephonist').eq('suspended', false),
          supabase.from('profiles').select('id').eq('top_leads_access', true),
        ])
        const allTels = tels ?? []
        const filtered = allTels.filter(t => role === 'superadmin' || !TEST_EMAILS.includes(t.email))
        setTelephonists(filtered.map(({ id, name }) => ({ id, name })))
        trophyUserIdsRef.current = (trophyProfiles ?? []).map((p: any) => p.id)
        // Load all trophy sessions so admin can see what trophy telephonists have done to each contact
        supabase.from('trophy_contact_sessions')
          .select('contact_id, status, updated_at')
          .order('updated_at', { ascending: false })
          .then(({ data: sessions }) => {
            const m = new Map<string, string>()
            for (const s of sessions ?? []) {
              if (!m.has(s.contact_id)) m.set(s.contact_id, s.status)
            }
            setAdminTrophyMap(m)
          })
        if (role !== 'superadmin') {
          resolvedTestIds = allTels.filter(t => TEST_EMAILS.includes(t.email)).map(t => t.id)
          setTestUserIds(resolvedTestIds)
        }
      }
      loadContacts({ userId: user.id, role, excludeIds: resolvedTestIds, tla })
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally once — auth state is bootstrapped here, loadContacts reads paramsRef

  // Refetch when page is restored from browser bfcache (back/forward navigation)
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) loadContacts()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // loadContacts is stable

  // Debounce search input → debouncedSearch (triggers server reload for admin)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  // Reset to page 1 on any filter/search/scope change
  useEffect(() => { setPage(1) }, [searchTerm, activeFilter, categoryFilter, ownerScope])

  // Persist navigation state to sessionStorage so Back button restores position
  useEffect(() => {
    try {
      sessionStorage.setItem('contacts-page', String(page))
      sessionStorage.setItem('contacts-filter', activeFilter)
      sessionStorage.setItem('contacts-category', categoryFilter)
      sessionStorage.setItem('contacts-scope', ownerScope)
    } catch {}
  }, [page, activeFilter, categoryFilter, ownerScope])

  // Admin: server-side reload when filters or page change
  useEffect(() => {
    if (!currentUserId || topLeadsAccess || !isAdminRole(userRole)) return
    loadContacts()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, debouncedSearch, categoryFilter, page, view, currentUserId, userRole, topLeadsAccess, ownerScope])

  // Admin: auto-refresh contacts every 60 s so regular telephonist status changes appear without manual refresh
  useEffect(() => {
    if (!currentUserId || topLeadsAccess || !isAdminRole(userRole)) return
    const t = setInterval(() => loadContacts(), 60_000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, userRole, topLeadsAccess])

  // Admin: subscribe to trophy_contact_sessions so trophy telephonist status changes appear in real-time
  useEffect(() => {
    if (!currentUserId || topLeadsAccess || !isAdminRole(userRole)) return
    const supabase = createClient()
    const channel = supabase
      .channel('admin-trophy-sessions-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trophy_contact_sessions' }, (payload: any) => {
        const row = payload.new ?? payload.old
        if (!row?.contact_id || !row.status) return
        // Update contacts array directly so status badge refreshes immediately
        setContacts(prev => prev.map(c =>
          c.id === row.contact_id ? { ...c, status: row.status } : c
        ))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, userRole, topLeadsAccess])

  // Trophy real-time: subscribe to ALL trophy_contact_sessions changes so every trophy
  // telephonist sees status updates from colleagues without refreshing.
  useEffect(() => {
    if (!topLeadsAccess || !currentUserId) return
    const supabase = createClient()
    const channel = supabase
      .channel('trophy-sessions-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trophy_contact_sessions' }, (payload: any) => {
        const row = payload.new ?? payload.old
        if (!row?.contact_id) return
        const isOwn = row.owner_id === currentUserId
        if (isOwn) {
          // Update from another device/tab for the current user — always apply
          myTrophyContactIds.current.add(row.contact_id)
          setTrophySessions(prev => {
            const next = new Map(prev)
            next.set(row.contact_id, { status: row.status ?? 'new', nextActionDate: row.next_action_date ?? null })
            return next
          })
        } else if (!myTrophyContactIds.current.has(row.contact_id)) {
          // Another trophy telephonist changed this contact and we don't have our own session — show their status
          setTrophySessions(prev => {
            const next = new Map(prev)
            next.set(row.contact_id, { status: row.status ?? 'new', nextActionDate: row.next_action_date ?? null })
            return next
          })
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topLeadsAccess, currentUserId])

  const handleViewToggle = (v: 'table' | 'kanban') => {
    setView(v)
    localStorage.setItem('contacts-view', v)
  }

  const isAdmin = userRole === 'admin' || userRole === 'superadmin'
  const canEdit = (contact: Contact) => topLeadsAccess || isAdmin || contact.ownerId === currentUserId || contact.ownerId === null || contact.createdBy === currentUserId

  // For trophy telephonists: show their own session status in the list
  // For admin: contact.status is already overlaid with trophy session status by loadContacts + realtime subscription
  const effectiveStatus = (contact: Contact): string => {
    if (topLeadsAccess) return trophySessions.get(contact.id)?.status ?? contact.status
    return contact.status
  }

  // Returns the most relevant date for display: trophy session date takes precedence over contact's raw dates
  const effectiveContactDate = (contact: Contact): ContactDateInfo | null => {
    if (topLeadsAccess) {
      const session = trophySessions.get(contact.id)
      if (session?.nextActionDate) return { date: session.nextActionDate.slice(0, 10), type: 'followup' }
    }
    return getContactDate(contact)
  }

  // True if this contact has a follow-up scheduled for today (trophy-aware)
  const isFollowupToday = (contact: Contact): boolean => {
    const nextDate = topLeadsAccess
      ? (trophySessions.get(contact.id)?.nextActionDate ?? contact.nextActionDate)
      : contact.nextActionDate
    return nextDate === todayISO()
  }

  // ── Filters ────────────────────────────────────────────────────────────────
  const applyFilter = (c: Contact): boolean => {
    const st = effectiveStatus(c)
    switch (activeFilter) {
      case 'today': {
        const nextDate = topLeadsAccess ? (trophySessions.get(c.id)?.nextActionDate ?? c.nextActionDate) : c.nextActionDate
        return nextDate === todayISO()
      }
      case 'high':            return (c.priorityScore ?? 0) >= 70
      case 'new':             return st === 'new'
      case 'canva':           return st === 'canva'
      case 'probable':        return st === 'probable'
      case 'likely_sale':     return topLeadsAccess ? (st === 'likely_sale' || st === 'likely_antisale') : st === 'likely_sale'
      case 'likely_antisale': return st === 'likely_antisale'
      case 'another_time':    return st === 'another_time'
      case 'email':           return st === 'email'
      case 'no_answer':       return st === 'no_answer'
      case 'not_buying':      return st === 'not_buying'
      case 'bought':          return st === 'bought'
      case 'few_reviews':     return st === 'few_reviews'
      default: return true
    }
  }

  const todayCount = useMemo(() => contacts.filter(c => {
    const nextDate = topLeadsAccess ? (trophySessions.get(c.id)?.nextActionDate ?? c.nextActionDate) : c.nextActionDate
    return nextDate === todayISO()
  }).length, [contacts, topLeadsAccess, trophySessions])

  // Distinct categories derived from contacts (jobTitle + industry)
  const categoryOptions = useMemo(() => {
    const cats = new Set<string>()
    for (const c of contacts) {
      if (c.jobTitle?.trim()) cats.add(c.jobTitle.trim())
      if (c.industry?.trim()) cats.add(c.industry.trim())
    }
    return Array.from(cats).sort((a, b) => a.localeCompare(b, 'el'))
  }, [contacts])

  const filtered = useMemo(() => {
    // Admin: server already filtered and paginated — contacts IS the current page
    if (isAdmin && !topLeadsAccess) return contacts
    return contacts.filter(c => {
      if (!applyFilter(c)) return false
      if (categoryFilter !== 'all') {
        const cat = categoryFilter.toLowerCase()
        if (!(
          (c.jobTitle ?? '').toLowerCase().includes(cat) ||
          (c.industry ?? '').toLowerCase().includes(cat)
        )) return false
      }
      // Trophy 'all' view: hide worked contacts so telephonists only see fresh leads.
      // Specific-status filters intentionally show worked contacts in that pipeline stage.
      const isGenericView = activeFilter === 'all' || activeFilter === 'new'
      if (topLeadsAccess && isGenericView && trophySessions.has(c.id)) return false
      if (!searchTerm) return true
      // When searching, always hide worked contacts (search is for finding fresh leads)
      if (topLeadsAccess && trophySessions.has(c.id)) return false
      return (
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        parsePhonesField(c.phone || '').join(' ').includes(searchTerm)
      )
    })
    // Trophy sort is done server-side (rating DESC, review_count DESC, created_at DESC)
  }, [contacts, searchTerm, activeFilter, categoryFilter, topLeadsAccess, trophySessions, isAdmin])

  // Admin: server provides total count; others: count is from filtered list
  const totalPages = Math.max(1, Math.ceil(
    (isAdmin && !topLeadsAccess) ? totalCount / PAGE_SIZE : filtered.length / PAGE_SIZE
  ))
  const safePage = Math.min(page, totalPages)
  // Admin: contacts is already the server-paginated page; others: slice client-side
  const paginated = (isAdmin && !topLeadsAccess)
    ? contacts
    : filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

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
    if (topLeadsAccess && currentUserId) {
      const { error } = await supabase
        .from('trophy_contact_sessions')
        .upsert({ contact_id: id, owner_id: currentUserId, status, updated_at: new Date().toISOString() }, { onConflict: 'contact_id,owner_id' })
      if (!error) {
        myTrophyContactIds.current.add(id)
        setTrophySessions(prev => {
          const next = new Map(prev)
          const existing = next.get(id) ?? {}
          next.set(id, { ...existing, status })
          return next
        })
      }
    } else {
      const { error } = await supabase.from('contacts').update({ status }).eq('id', id)
      if (!error) {
        setContacts(prev => prev.map(c => c.id === id ? { ...c, status } : c))
      }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'bought':          return <Badge className="bg-green-500 hover:bg-green-600 text-[10px]">{lang === 'el' ? 'Αγόρασε' : 'Bought'}</Badge>
      case 'canva':           return <Badge className="bg-purple-500 text-white text-[10px]">Canva</Badge>
      case 'probable':        return <Badge className="bg-teal-500 text-white text-[10px]">Πιθανός</Badge>
      case 'likely_sale':     return <Badge className="bg-amber-500 text-white text-[10px]">Sale</Badge>
      case 'likely_antisale': return <Badge className="bg-amber-800 text-white text-[10px]">Antisale</Badge>
      case 'another_time':    return <Badge className="bg-indigo-500 text-white text-[10px]">{lang === 'el' ? 'Άλλη Στιγμή' : 'Another Time'}</Badge>
      case 'email':           return <Badge className="bg-cyan-600 text-white text-[10px]">Email</Badge>
      case 'few_reviews':     return <Badge className="bg-sky-500 text-white text-[10px]">Λίγες Αξιολ.</Badge>
      case 'no_answer':       return <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-[10px]">{lang === 'el' ? 'Δεν Απάντησε' : 'No Answer'}</Badge>
      case 'not_buying':      return <Badge variant="destructive" className="text-[10px]">{lang === 'el' ? 'Όχι' : 'No'}</Badge>
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
  const handleExportCSV = async () => {
    const toRows = (rows: Contact[]) => {
      const cols = ['Όνομα', 'Τηλέφωνο', 'Email', 'Επάγγελμα', 'Κλάδος', 'Κατάσταση', 'Επένδυση', 'Σκορ', 'Ημερομηνία']
      const lines = rows.map(c => [
        c.name, c.phone, c.email, c.jobTitle ?? '', c.industry ?? '',
        c.status, c.investmentAmount, c.priorityScore, getContactDate(c)?.date ?? ''
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      return [cols.join(','), ...lines].join('\n')
    }
    let exportRows = filtered
    // Admin: filtered is only the current page — do a full DB query for export
    if (isAdmin && !topLeadsAccess) {
      const supabase = createClient()
      const today = new Date().toISOString().slice(0, 10)
      let q = supabase.from('contacts').select(CONTACT_BASE_COLUMNS).order('priority_score', { ascending: false }).range(0, 9999)
      if (paramsRef.current.activeFilter === 'today') q = q.eq('next_action_date', today)
      else if (paramsRef.current.activeFilter === 'high') q = q.gte('priority_score', 70)
      else if (paramsRef.current.activeFilter === 'new') q = q.eq('status', 'new')
      else if (paramsRef.current.activeFilter === 'likely_sale') q = q.in('status', ['likely_sale', 'likely_antisale'])
      else if (paramsRef.current.activeFilter === 'bought') q = q.eq('status', 'bought')
      if (paramsRef.current.debouncedSearch) {
        const s = paramsRef.current.debouncedSearch.replace(/'/g, "''")
        q = q.or(`name.ilike.%${s}%,phone.ilike.%${s}%`)
      }
      const { data } = await q
      exportRows = (data ?? []).map(rowToContact).filter(c => !testUserIds.includes(c.ownerId ?? ''))
    }
    const csv = toRows(exportRows)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `contacts-${todayISO()}.csv`
    a.click(); URL.revokeObjectURL(url)
    toast({ title: lang === 'el' ? `Εξαγωγή ${exportRows.length} επαφών` : `Exported ${exportRows.length} contacts` })
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
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''
      const BATCH = 50
      for (let i = 0; i < ids.length; i += BATCH) {
        const batch = ids.slice(i, i + BATCH)
        const res = await fetch('/api/contacts/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ids: batch }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Delete failed (${res.status})`)
        }
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
  // Trophy filter chips — used by trophy telephonists AND by admin when in trophy scope
  const TROPHY_FILTERS: { key: FilterKey; labelEl: string; labelEn: string; badge?: number }[] = [
    { key: 'all',           labelEl: 'Όλες',                 labelEn: 'All' },
    { key: 'today',         labelEl: 'Ακολούθηση σήμερα',    labelEn: "Today's Follow-ups", badge: todayCount },
    { key: 'new',           labelEl: 'Νέοι',                 labelEn: 'New' },
    { key: 'canva',         labelEl: 'Canva',                labelEn: 'Canva' },
    { key: 'probable',      labelEl: 'Πιθανός',              labelEn: 'Probable' },
    { key: 'another_time',  labelEl: 'Άλλη Στιγμή',          labelEn: 'Another Time' },
    { key: 'email',         labelEl: 'Email',                labelEn: 'Email' },
    { key: 'few_reviews',   labelEl: 'Λίγες Αξιολογήσεις',  labelEn: 'Few Reviews' },
    { key: 'no_answer',     labelEl: 'Δεν Απάντησε',         labelEn: 'No Answer' },
    { key: 'not_buying',    labelEl: 'Όχι',                  labelEn: 'Declined' },
    { key: 'bought',        labelEl: 'Αγόρασαν',             labelEn: 'Bought' },
  ]
  const FILTERS: { key: FilterKey; labelEl: string; labelEn: string; badge?: number }[] =
    (topLeadsAccess || (isAdmin && ownerScope === 'trophy')) ? TROPHY_FILTERS : [
      { key: 'all',            labelEl: 'Όλες',                 labelEn: 'All' },
      { key: 'today',          labelEl: 'Ακολούθηση σήμερα',    labelEn: "Today's Follow-ups", badge: todayCount },
      { key: 'high',           labelEl: 'Υψηλή Προτεραιότητα', labelEn: 'High Priority' },
      { key: 'new',            labelEl: 'Νέοι',                 labelEn: 'New' },
      { key: 'canva',          labelEl: 'Canva',                labelEn: 'Canva' },
      { key: 'probable',       labelEl: 'Πιθανός',              labelEn: 'Probable' },
      { key: 'likely_sale',    labelEl: 'Sale',                 labelEn: 'Sale' },
      { key: 'likely_antisale',labelEl: 'Antisale',             labelEn: 'Antisale' },
      { key: 'no_answer',      labelEl: 'Δεν Απάντησε',         labelEn: 'No Answer' },
      { key: 'not_buying',     labelEl: 'Δεν Αγοράζει',         labelEn: 'Not Buying' },
      { key: 'bought',         labelEl: 'Αγόρασαν',             labelEn: 'Bought' },
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
                {(isAdmin && !topLeadsAccess) ? totalCount : filtered.length} {lang === 'el' ? 'επαφές' : 'contacts'}
              </span>
            </div>

            {/* Owner scope toggle — admin only, separates trophy from regular contacts */}
            {isAdmin && !topLeadsAccess && (
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/60 border border-border/50 w-fit">
                {([
                  { key: 'all',     labelEl: 'Όλες',       icon: null },
                  { key: 'trophy',  labelEl: 'Trophy',     icon: 'crown' },
                  { key: 'regular', labelEl: 'Κανονικές',  icon: 'users' },
                ] as const).map(s => (
                  <button
                    key={s.key}
                    onClick={() => { setOwnerScope(s.key); setActiveFilter('all'); sessionStorage.setItem('contacts-scope', s.key) }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all",
                      ownerScope === s.key
                        ? "bg-background shadow-sm text-foreground border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s.icon === 'crown' && <Crown className="h-3 w-3 text-amber-500" />}
                    {s.icon === 'users' && <Users className="h-3 w-3" />}
                    {s.labelEl}
                  </button>
                ))}
              </div>
            )}

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
                        onClick={() => router.push(`/contacts/details?id=${contact.id}${ownerScope === 'trophy' ? '&scope=trophy' : ''}`)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              {isFollowupToday(contact) && (
                                <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                              )}
                              {locked && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                              <span className="font-semibold text-sm truncate">{contact.name}</span>
                            </div>
                            {(topLeadsAccess || isAdmin) && contact.rating != null ? (
                              <div className="flex items-center flex-wrap gap-1 mt-0.5">
                                <span className="flex items-center gap-0.5 text-amber-500 font-bold text-xs">
                                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                  {Number(contact.rating).toFixed(1)} ★
                                </span>
                                {contact.reviewCount != null && <span className="text-[10px] text-muted-foreground">({contact.reviewCount})</span>}
                                {contact.leadSource && (
                                  <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-1 py-0.5 rounded font-medium shrink-0">{contact.leadSource}</span>
                                )}
                              </div>
                            ) : contact.leadSource ? (
                              <span className="text-[10px] text-muted-foreground mt-0.5 truncate">{contact.leadSource}</span>
                            ) : null}
                          </div>
                          {getStatusBadge(effectiveStatus(contact))}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {(() => {
                            const di = effectiveContactDate(contact)
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
                        {topLeadsAccess && <TableHead className="text-center"><span className="flex items-center justify-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{lang === 'el' ? 'Βαθμολογία' : 'Rating'}</span></TableHead>}
                        {isAdmin && <TableHead>{lang === 'el' ? 'Τηλεφωνητής' : 'Assigned to'}</TableHead>}
                        <TableHead className="text-right">{lang === 'el' ? 'Ενέργειες' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={isAdmin ? 7 : topLeadsAccess ? 7 : 6} className="h-24 text-center text-muted-foreground">
                            {lang === 'el' ? 'Δεν βρέθηκαν επαφές.' : 'No contacts found.'}
                          </TableCell>
                        </TableRow>
                      ) : paginated.map(contact => {
                        const locked = !isAdmin && contact.ownerId !== null && contact.ownerId !== currentUserId
                        return (
                          <TableRow key={contact.id} className="cursor-pointer hover:bg-muted/50"
                            onClick={() => router.push(`/contacts/details?id=${contact.id}${ownerScope === 'trophy' ? '&scope=trophy' : ''}`)}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-1.5">
                                {isFollowupToday(contact) && (
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
                            <TableCell>{getStatusBadge(effectiveStatus(contact))}</TableCell>
                            <TableCell className="text-xs">
                              {(() => {
                                const di = effectiveContactDate(contact)
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
                            {topLeadsAccess && (
                              <TableCell className="text-center">
                                {contact.rating != null ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                      {Number(contact.rating).toFixed(1)} ★
                                    </span>
                                    {contact.reviewCount != null && (
                                      <span className="text-[11px] text-muted-foreground">{contact.reviewCount} {lang === 'el' ? 'αξιολογήσεις' : 'reviews'}</span>
                                    )}
                                    {contact.leadSource && (
                                      <span className="text-[11px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">{contact.leadSource}</span>
                                    )}
                                  </div>
                                ) : contact.leadSource ? (
                                  <span className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full whitespace-nowrap">{contact.leadSource}</span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </TableCell>
                            )}
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
                {(topLeadsAccess ? TROPHY_STATUS_COLS : STATUS_COLS).map(col => {
                  const colContacts = filtered
                    .filter(c => {
                      const st = effectiveStatus(c)
                      const mapped = topLeadsAccess && st === STATUS.LIKELY_ANTISALE ? STATUS.LIKELY_SALE : st
                      return mapped === col.key
                    })
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
                              onClick={() => router.push(`/contacts/details?id=${contact.id}${ownerScope === 'trophy' ? '&scope=trophy' : ''}`)}>
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
                                      const di = effectiveContactDate(contact)
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
                                  {isFollowupToday(contact) && (
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
                                    {(topLeadsAccess ? TROPHY_STATUS_COLS : STATUS_COLS).filter(s => s.key !== col.key).map(s => (
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
