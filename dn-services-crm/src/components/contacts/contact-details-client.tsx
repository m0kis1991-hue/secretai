"use client"

import { useState, useEffect } from "react"
import { CRMSidebar } from "@/components/layout/crm-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Phone,
  Mail,
  Save,
  Sparkles,
  ArrowLeft,
  Zap,
  Briefcase,
  Building2,
  MessageCircle,
  PhoneCall,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Lock,
  RefreshCcw,
  Send,
  Bell,
  XCircle,
  ShieldCheck,
  Trash2,
  Plus,
  X,
  Globe,
  Star,
  MapPin,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Contact } from "@/app/lib/types"
import { isAdmin as isAdminRole, LeadStatus } from "@/app/lib/constants"
import { rowToContact } from "@/app/lib/contact-utils"
import { useRouter } from "next/navigation"
import { intelligentObservationSummary, IntelligentObservationSummaryOutput } from "@/ai/flows/intelligent-observation-summary-flow"
import { draftFollowUpEmail, DraftFollowUpEmailOutput } from "@/ai/flows/ai-powered-follow-up-email"
import { generateCallScript, CallScriptOutput } from "@/ai/flows/call-script-flow"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

function parsePhones(raw: string): string[] {
  if (!raw) return ['']
  if (raw.startsWith('[')) {
    try { const a = JSON.parse(raw); return a.length ? a : [''] } catch {}
  }
  return [raw]
}

function serializePhones(phones: string[]): string {
  const filtered = phones.filter(Boolean)
  if (filtered.length === 0) return ''
  if (filtered.length === 1) return filtered[0]
  return JSON.stringify(filtered)
}

function isMobile(phone: string): boolean {
  const clean = phone.replace(/[\s\-\+\(\)]/g, '')
  return /^(69\d|3069\d|00306[0-9])/.test(clean)
}

function sortMobileFirst(phones: string[]): string[] {
  return [...phones].sort((a, b) => (isMobile(a) ? 0 : 1) - (isMobile(b) ? 0 : 1))
}


type AccessRequest = {
  id: string
  requester_id: string
  requester_name: string
  status: string
}

export function ContactDetailsClient({ id, scope }: { id: string; scope?: string }) {
  const router = useRouter()
  const { toast } = useToast()

  const [lang, setLang] = useState<'el' | 'en'>('el')
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [isCallScriptLoading, setIsCallScriptLoading] = useState(false)
  const [emailLanguage, setEmailLanguage] = useState<'el' | 'en'>('el')
  const [aiSummary, setAiSummary] = useState<IntelligentObservationSummaryOutput | null>(null)
  const [draftEmail, setDraftEmail] = useState<DraftFollowUpEmailOutput | null>(null)
  const [callScript, setCallScript] = useState<CallScriptOutput | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('telephonist')
  const [userName, setUserName] = useState<string>('')
  const [saleAmount, setSaleAmount] = useState<number>(0)
  const [ownerName, setOwnerName] = useState<string | null>(null)
  const [isTrophyMode, setIsTrophyMode] = useState(false)
  const [trophySessionId, setTrophySessionId] = useState<string | null>(null)
  const [trophySessionOwnerId, setTrophySessionOwnerId] = useState<string | null>(null)
  const [myRequest, setMyRequest] = useState<{ id: string; status: string } | null>(null)
  const [incomingRequests, setIncomingRequests] = useState<AccessRequest[]>([])
  const [isRequesting, setIsRequesting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [phoneDeleteConfirm, setPhoneDeleteConfirm] = useState(false)
  const [showEmailAfterCall, setShowEmailAfterCall] = useState(false)
  const [phoneList, setPhoneList] = useState<string[]>([''])
  const [selectedPhoneIdx, setSelectedPhoneIdx] = useState(0)
  const [addingPhone, setAddingPhone] = useState<string | null>(null)
  const [trophyObs, setTrophyObs] = useState<{ observations: string; ownerName: string } | null>(null)

  useEffect(() => {
    const savedLang = localStorage.getItem('app-lang') as 'el' | 'en'
    if (savedLang) { setLang(savedLang); setEmailLanguage(savedLang) }

    if (id === 'new') {
      setContact({
        id: `c-${Date.now()}`, name: '', phone: '', email: '', industry: '',
        jobTitle: '', observations: '', investmentAmount: 0, status: 'new',
        ownerId: null, lastContacted: '', priorityScore: 50,
      })
      setPhoneList([''])
      setLoading(false)
      return
    }

    const supabase = createClient()

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return
      setCurrentUserId(user.id)

      const [profileResult, contactResult] = await Promise.all([
        supabase.from('profiles').select('role, name, top_leads_access').eq('id', user.id).single(),
        supabase.from('contacts').select('*').eq('id', id).single(),
      ])

      const role = profileResult.data?.role ?? 'telephonist'
      const isTrophy = !!(profileResult.data?.top_leads_access)
      setUserRole(role)
      setUserName(profileResult.data?.name ?? '')
      setIsTrophyMode(isTrophy)
      const isAdm = isAdminRole(role)

      const { data: row, error } = contactResult
      if (error || !row) {
        toast({ variant: 'destructive', title: 'Επαφή δεν βρέθηκε' })
        router.push('/contacts')
        return
      }
      const c = rowToContact(row)
      const phones = sortMobileFirst(parsePhones(c.phone || ''))
      setContact({ ...c, phone: serializePhones(phones) })
      setPhoneList(phones)
      setSelectedPhoneIdx(0)

      // Trophy telephonist: load their own session overlay
      if (isTrophy) {
        const { data: session } = await supabase
          .from('trophy_contact_sessions')
          .select('*')
          .eq('contact_id', id)
          .eq('owner_id', user.id)
          .maybeSingle()
        if (session) {
          setTrophySessionId(session.id)
          setContact(prev => prev ? {
            ...prev,
            observations: session.observations ?? '',
            status: session.status ?? 'new',
            nextActionDate: session.next_action_date ?? undefined,
            nextActionTime: session.next_action_time ?? undefined,
            lastContacted: session.last_contacted ?? '',
            investmentAmount: session.investment_amount ?? 0,
          } : prev)
          setSaleAmount(session.investment_amount ?? 0)
        } else {
          setTrophySessionId(null)
          // If the trophy telephonist owns this contact (created it directly), keep the
          // contacts table values as the starting point — they wrote those on creation.
          // For imported pool leads owned by others, start fresh to avoid leaking
          // regular telephonist observations into the trophy workflow.
          const isMyOwnContact = c.ownerId === user.id
          if (!isMyOwnContact) {
            setContact(prev => prev ? {
              ...prev,
              observations: '',
              status: 'new' as LeadStatus,
              nextActionDate: undefined,
              nextActionTime: undefined,
              lastContacted: '',
              investmentAmount: 0,
            } : prev)
            setSaleAmount(0)
          } else {
            setSaleAmount(c.investmentAmount ?? 0)
          }
        }
        setLoading(false)
        return
      }

      // Pre-fill sale amount for owners/admins; non-owners start fresh
      const isOwnerOrAdmin = isAdm || c.ownerId === user.id || c.ownerId === null
      setSaleAmount(isOwnerOrAdmin ? (c.investmentAmount ?? 0) : 0)

      // Owner name + access requests in parallel
      const lockedByOther = !!(c.ownerId && c.ownerId !== user.id && !isAdm)
      const isMineOrAdmin = c.ownerId === user.id || isAdm

      const [ownerResult, accessResult] = await Promise.all([
        c.ownerId
          ? supabase.from('profiles').select('name').eq('id', c.ownerId).single()
          : Promise.resolve({ data: null, error: null }),
        lockedByOther
          ? supabase.from('contact_access_requests').select('id, status').eq('contact_id', id).eq('requester_id', user.id).maybeSingle()
          : isMineOrAdmin
            ? supabase.from('contact_access_requests').select('id, requester_id, requester_name, status').eq('contact_id', id).eq('status', 'pending')
            : Promise.resolve({ data: null, error: null }),
      ])

      if (ownerResult.data) setOwnerName((ownerResult.data as any).name)
      if (lockedByOther) setMyRequest((accessResult.data as any) ?? null)
      else if (isMineOrAdmin) setIncomingRequests((accessResult.data as any[]) ?? [])

      // Admin in trophy scope: load the most recent trophy session — the source of truth for
      // status/observations/next-action/investment on trophy-worked contacts.
      if (isAdm && scope === 'trophy') {
        const { data: sessions } = await supabase
          .from('trophy_contact_sessions')
          .select('observations, owner_id, status, next_action_date, next_action_time, last_contacted, investment_amount')
          .eq('contact_id', id)
          .order('updated_at', { ascending: false })
          .limit(1)
        const latestSession = sessions?.[0]
        if (latestSession) {
          const { data: ownerProfile } = await supabase
            .from('profiles').select('name').eq('id', latestSession.owner_id).single()
          setTrophySessionOwnerId(latestSession.owner_id ?? null)
          setTrophyObs({
            observations: latestSession.observations ?? '',
            ownerName: (ownerProfile as any)?.name ?? 'Trophy Τηλεφωνητής',
          })
          // Overlay the full session state so admin sees (and, on save, round-trips) the
          // telephonist's real pipeline data instead of the raw/stale contacts row — otherwise
          // saving would silently blank out the session's real next-action date/time/investment.
          setContact(prev => prev ? {
            ...prev,
            status: (latestSession.status as LeadStatus) ?? prev.status,
            observations: latestSession.observations ?? '',
            nextActionDate: latestSession.next_action_date ?? undefined,
            nextActionTime: latestSession.next_action_time ?? undefined,
            lastContacted: latestSession.last_contacted ?? '',
          } : prev)
          setSaleAmount(latestSession.investment_amount ?? 0)
        }
      }

      setLoading(false)
    }

    init()
  }, [id])

  if (loading) return <div className="p-10 text-center"><RefreshCcw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
  if (!contact) return null

  const isAdmin = userRole === 'admin' || userRole === 'superadmin'
  const isOwner = contact.ownerId === currentUserId
  const isCreator = contact.createdBy === currentUserId
  const today = new Date().toISOString().slice(0, 10)
  const lockIsActive = !!(contact.lockedUntil && contact.lockedUntil >= today)
  const isUnclaimed = contact.ownerId === null || (!lockIsActive && !contact.saleLocked)
  const isPermanentLock = contact.saleLocked === true
  const lockedByOther = !isTrophyMode && !isAdmin && !isOwner && !isCreator && lockIsActive && id !== 'new'
  // Trophy telephonists always have full access to their own session
  const canEdit = isTrophyMode ? true : !lockedByOther

  // ── Auto-claim on save when notes are written ──────────────────────────────
  const handleSave = async () => {
    if (!contact) return
    setIsSaving(true)
    try {
    const supabase = createClient()

    // Trophy telephonist: save to their own session, never touch the contacts table
    if (isTrophyMode && id !== 'new' && currentUserId) {
      const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const sessionRow = {
        contact_id: contact.id,
        owner_id: currentUserId,
        observations: contact.observations || null,
        status: contact.status,
        next_action_date: contact.nextActionDate?.slice(0, 10) || null,
        next_action_time: contact.nextActionTime || null,
        last_contacted: contact.lastContacted || null,
        investment_amount: saleAmount || 0,
        locked_until: twoDaysFromNow,
        updated_at: new Date().toISOString(),
      }
      const { data: saved, error } = await supabase
        .from('trophy_contact_sessions')
        .upsert(sessionRow, { onConflict: 'contact_id,owner_id' })
        .select('id')
        .single()
      setIsSaving(false)
      if (error) {
        toast({ variant: 'destructive', title: lang === 'el' ? 'Σφάλμα αποθήκευσης' : 'Save error', description: error.message })
        return
      }
      if (saved) setTrophySessionId(saved.id)
      if (contact.status === 'bought' && saleAmount > 0) {
        await supabase.from('sales_logs').insert({
          contact_id: contact.id,
          contact_name: contact.name,
          telephonist_id: currentUserId,
          telephonist_name: userName,
          amount: saleAmount,
        })
      }
      toast({ title: lang === 'el' ? 'Η καρτέλα αποθηκεύτηκε' : 'Session saved' })
      return
    }

    // Commit any pending phone input that the user typed but didn't press Enter on
    let effectivePhone = contact.phone
    if (addingPhone !== null && addingPhone.trim()) {
      const committed = [...phoneList.filter(Boolean), addingPhone.trim()]
      effectivePhone = serializePhones(committed)
      setPhoneList(committed)
      setAddingPhone(null)
      setContact(c => c ? { ...c, phone: effectivePhone } : c)
    }

    const hasNotes = (contact.observations ?? '').trim().length > 0
    const shouldClaim = (isUnclaimed || isCreator) && !isAdmin && id !== 'new'

    const isSaver = isAdmin || isOwner || isCreator || isUnclaimed
    const isBuying = contact.status === 'bought'
    const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    // Admin editing a trophy-scope contact: EVERY pipeline field (status, observations,
    // next-action date/time, last-contacted, investment amount) goes through
    // trophy_contact_sessions — the sole source of truth for trophy-worked contacts — never
    // the contacts row. Trophy telephonists' own view ignores these contacts-row fields for
    // pool contacts (to avoid inheriting stale/foreign data), so writing them here would be
    // saved but permanently invisible. Locking fields are skipped too: contacts.sale_locked /
    // locked_until drive the REGULAR (non-trophy) pool's visibility — setting sale_locked=true
    // here (as "mark bought" does below for regular contacts) silently vanishes the contact
    // from every trophy telephonist's pool query, since trophy locking is a separate mechanism
    // on the session row itself. Attribute the sync to the existing session's owner if there is
    // one, else the contact's own owner (if it's a trophy telephonist), else admin's own id —
    // trophySync upserts, so this always lands somewhere the telephonists' "most recent
    // session" lookup will pick up.
    const trophyScopeSync = isAdmin && scope === 'trophy'
    const trophySyncOwnerId = trophySessionOwnerId ?? contact.ownerId ?? currentUserId

    // Admin: only touch locked_until when marking as bought (permanent lock). Never reset a
    // telephonist's active lock — admin edits content only, lock metadata belongs to the owner.
    const newLockedUntil = trophyScopeSync ? undefined : (isBuying ? '2099-12-31' : (isAdmin ? undefined : (isSaver || shouldClaim ? tenDaysFromNow : undefined)))
    const newSaleLocked = trophyScopeSync ? undefined : (isBuying ? true : (contact.saleLocked ? true : undefined))

    const row: any = {
      name: contact.name,
      phone: effectivePhone,
      email: contact.email || null,
      address: contact.address || null,
      company_name: contact.companyName || null,
      industry: contact.industry || null,
      job_title: contact.jobTitle || null,
      observations: trophyScopeSync ? undefined : (contact.observations || null),
      investment_amount: trophyScopeSync ? undefined : (isSaver ? (saleAmount || 0) : undefined),
      status: trophyScopeSync ? undefined : contact.status,
      owner_id: shouldClaim ? currentUserId : (isAdmin ? undefined : (contact.ownerId ?? null)),
      priority_score: contact.priorityScore,
      next_action_date: trophyScopeSync ? undefined : (contact.nextActionDate?.slice(0, 10) || null),
      next_action_time: trophyScopeSync ? undefined : (contact.nextActionTime || null),
      last_contacted: trophyScopeSync ? undefined : (contact.lastContacted || null),
      locked_until: newLockedUntil,
      sale_locked: newSaleLocked,
    }
    // Remove undefined keys so Supabase doesn't try to null them out
    Object.keys(row).forEach(k => row[k] === undefined && delete row[k])

    // Log sale if status is "bought" and there's an amount
    const logSale = async (contactId: string) => {
      if (contact.status === 'bought' && saleAmount > 0 && currentUserId) {
        await supabase.from('sales_logs').insert({
          contact_id: contactId,
          contact_name: contact.name,
          telephonist_id: currentUserId,
          telephonist_name: userName,
          amount: saleAmount,
        })
      }
    }

    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token ?? ''

    const authHeaders = {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }

    if (id === 'new') {
      const res = await fetch('/api/contacts/save', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          isNew: true,
          userId: currentUserId,
          row: { ...row, owner_id: hasNotes ? currentUserId : null },
          createdBy: currentUserId,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ variant: 'destructive', title: lang === 'el' ? 'Σφάλμα αποθήκευσης' : 'Save error', description: json?.error })
        setIsSaving(false)
        return
      }
      if (json.data) {
        await logSale(json.data.id)
        setContact(rowToContact(json.data))
      }
      toast({ title: lang === 'el' ? 'Η επαφή αποθηκεύτηκε' : 'Contact Saved' })
      setIsSaving(false)
      router.push('/contacts')
      return
    }

    const res = await fetch('/api/contacts/save', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
          isNew: false,
          userId: currentUserId,
          contactId: contact.id,
          row,
          // Admin in trophy scope: sync the full pipeline state into trophy_contact_sessions
          // (upserted server-side) so the trophy telephonist sees the change via their subscription.
          ...(trophyScopeSync
            ? { trophySync: {
                ownerId: trophySyncOwnerId,
                status: contact.status,
                observations: contact.observations || null,
                nextActionDate: contact.nextActionDate?.slice(0, 10) || null,
                nextActionTime: contact.nextActionTime || null,
                lastContacted: contact.lastContacted || null,
                investmentAmount: isSaver ? (saleAmount || 0) : undefined,
              } }
            : {}),
        }),
    })
    const saveJson = await res.json()
    if (!res.ok) {
      setIsSaving(false)
      toast({ variant: 'destructive', title: lang === 'el' ? 'Σφάλμα αποθήκευσης' : 'Save error', description: saveJson?.error })
      return
    }
    await logSale(contact.id)
    setIsSaving(false)
    if (shouldClaim) {
      setContact(c => c ? { ...c, ownerId: currentUserId } : c)
      // Fetch own name to display
      const { data: me } = await supabase.from('profiles').select('name').eq('id', currentUserId!).single()
      if (me) setOwnerName(me.name)
    }
    toast({ title: lang === 'el' ? 'Η επαφή αποθηκεύτηκε' : 'Contact Saved',
      description: shouldClaim ? (lang === 'el' ? 'Η επαφή κλειδώθηκε στον λογαριασμό σας.' : 'Contact locked to your account.') : undefined })
    } catch (err) {
      console.error('[handleSave]', err)
      toast({ variant: 'destructive', title: lang === 'el' ? 'Σφάλμα δικτύου' : 'Network error', description: String(err) })
    } finally {
      setIsSaving(false)
    }
  }

  // ── Access request ─────────────────────────────────────────────────────────
  const handleRequestAccess = async () => {
    if (!contact || !currentUserId) return
    setIsRequesting(true)
    const supabase = createClient()
    const { data: me } = await supabase.from('profiles').select('name').eq('id', currentUserId).single()
    const { data, error } = await supabase.from('contact_access_requests').insert({
      contact_id: contact.id,
      requester_id: currentUserId,
      owner_id: contact.ownerId!,
      requester_name: me?.name ?? '',
      contact_name: contact.name,
    }).select('id, status').single()
    setIsRequesting(false)
    if (error) {
      toast({ variant: 'destructive', title: lang === 'el' ? 'Σφάλμα αποστολής' : 'Request error' })
      return
    }
    setMyRequest(data)
    toast({ title: lang === 'el' ? 'Αίτημα Εστάλη' : 'Request Sent',
      description: lang === 'el' ? `Ο ${ownerName || 'κάτοχος'} θα ενημερωθεί.` : `${ownerName || 'The owner'} will be notified.` })
  }

  const handleGrantAccess = async (requestId: string, requesterId: string) => {
    const supabase = createClient()
    await supabase.from('contacts').update({ owner_id: requesterId }).eq('id', contact!.id)
    await supabase.from('contact_access_requests').update({ status: 'granted' }).eq('id', requestId)
    setContact(c => c ? { ...c, ownerId: requesterId } : c)
    setIncomingRequests(prev => prev.filter(r => r.id !== requestId))
    toast({ title: lang === 'el' ? 'Πρόσβαση Δόθηκε' : 'Access Granted' })
  }

  const handleDenyAccess = async (requestId: string) => {
    const supabase = createClient()
    await supabase.from('contact_access_requests').update({ status: 'denied' }).eq('id', requestId)
    setIncomingRequests(prev => prev.filter(r => r.id !== requestId))
    toast({ title: lang === 'el' ? 'Αίτημα Απορρίφθηκε' : 'Request Denied' })
  }

  // ── Delete (admin only) ────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!contact) return
    setIsDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('contacts').delete().eq('id', contact.id)
    setIsDeleting(false)
    if (error) {
      toast({ variant: 'destructive', title: lang === 'el' ? 'Σφάλμα Διαγραφής' : 'Delete Error' })
      return
    }
    toast({ title: lang === 'el' ? 'Επαφή Διαγράφηκε' : 'Contact Deleted' })
    router.push('/contacts')
  }

  // ── AI / communication helpers ─────────────────────────────────────────────
  const handleAiSummary = async () => {
    if (!contact.observations) {
      toast({ variant: 'destructive', title: lang === 'el' ? 'Κενό' : 'Empty',
        description: lang === 'el' ? 'Εισάγετε σημειώσεις.' : 'Please enter notes.' })
      return
    }
    setIsAiLoading(true)
    try {
      const result = await intelligentObservationSummary({ observations: contact.observations, language: lang })
      setAiSummary(result)
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'AI Summary failed.' })
    } finally { setIsAiLoading(false) }
  }

  const handleDraftEmail = async () => {
    if (!contact.observations) return
    setIsAiLoading(true)
    try {
      const result = await draftFollowUpEmail({
        customerEmail: contact.email || 'client@example.com',
        callNotes: contact.observations,
        customerStatus: contact.status as any,
        investmentAmount: contact.investmentAmount,
        language: emailLanguage,
      })
      setDraftEmail(result)
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Email draft failed.' })
    } finally { setIsAiLoading(false) }
  }

  const handleGenerateCallScript = async () => {
    setIsCallScriptLoading(true)
    try {
      const result = await generateCallScript({
        name: contact.name, jobTitle: contact.jobTitle,
        industry: contact.industry || contact.companyName,
        status: contact.status, investmentAmount: contact.investmentAmount,
        observations: contact.observations, language: lang,
      })
      setCallScript(result)
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Call script failed.' })
    } finally { setIsCallScriptLoading(false) }
  }

  const handleMakeCall = (specificPhone?: string) => {
    if (!contact) return
    const phones = phoneList.filter(Boolean)
    const phoneToCall = specificPhone ?? phones[selectedPhoneIdx] ?? phones[0] ?? ''
    if (!phoneToCall) return
    // Fire tel: immediately — mobile browsers block tel: navigation after any await (user gesture expires)
    window.location.href = `tel:${phoneToCall.replace(/\s+/g, '')}`
    setShowEmailAfterCall(true)
    if (currentUserId) {
      const supabase = createClient()
      const today = new Date().toISOString().slice(0, 10)
      if (isTrophyMode) {
        Promise.all([
          supabase.from('call_logs').insert({
            telephonist_id: currentUserId,
            telephonist_name: userName,
            contact_id: contact.id,
            contact_name: contact.name,
            called_at: new Date().toISOString(),
          }),
          supabase.from('trophy_contact_sessions').upsert({
            contact_id: contact.id,
            owner_id: currentUserId,
            last_contacted: today,
            locked_until: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'contact_id,owner_id' }),
        ]).then(() => {
          setContact(c => c ? { ...c, lastContacted: today } : c)
        }).catch(() => {})
      } else {
        const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        Promise.all([
          supabase.from('call_logs').insert({
            telephonist_id: currentUserId,
            telephonist_name: userName,
            contact_id: contact.id,
            contact_name: contact.name,
            called_at: new Date().toISOString(),
          }),
          supabase.from('contacts').update({
            last_contacted: today,
            ...(!contact.saleLocked && (contact.ownerId === null || contact.ownerId === currentUserId)
              ? { owner_id: currentUserId, locked_until: tenDaysFromNow }
              : {}),
          }).eq('id', contact.id),
        ]).then(() => {
          setContact(c => c ? { ...c, ownerId: currentUserId, lockedUntil: tenDaysFromNow, lastContacted: today } : c)
        }).catch(() => {})
      }
    }
  }

  const handleWhatsApp = () => {
    const phones = parsePhones(contact.phone).filter(Boolean)
    const raw = (phones[0] || '').replace(/\s+/g, '').replace(/^\+/, '')
    const waNumber = raw.startsWith('30') ? raw : `30${raw}`
    const message = lang === 'el'
      ? `Γεια σας ${contact.name}, σας καλώ από DN Services Capital σχετικά με επενδυτικές ευκαιρίες.`
      : `Hello ${contact.name}, I'm calling from DN Services Capital regarding investment opportunities.`
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const logEmailSent = async (type: 'follow_up' | 'j2t') => {
    if (!currentUserId || !contact) return
    const supabase = createClient()
    await supabase.from('email_logs').insert({
      telephonist_id: currentUserId,
      contact_id: contact.id,
      contact_name: contact.name,
      contact_email: contact.email || null,
      email_type: type,
    })
  }

  const openMailApp = (to: string, subject: string, body: string) => {
    const a = document.createElement('a')
    a.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleSendEmailAction = () => {
    if (draftEmail && contact.email) {
      openMailApp(contact.email, draftEmail.subject, draftEmail.body)
    } else if (contact.email) {
      const a = document.createElement('a')
      a.href = `mailto:${contact.email}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    if (contact?.email) logEmailSent('follow_up')
  }

  const handleSendJ2TEmail = () => {
    const body = emailLanguage === 'el'
      ? `Αξιότιμε/η ${contact.name},\n\nΣε συνέχεια της επικοινωνίας μας, σας αποστέλλουμε τα αναλυτικά στοιχεία της επενδυτικής πλατφόρμας που συζητήσαμε.\n\nΜπορείτε να ενημερωθείτε πλήρως μέσω του ακόλουθου συνδέσμου, όπου αναγράφονται λεπτομερώς όλες οι διαθέσιμες επιλογές και οι όροι συμμετοχής:\n\nhttps://j2t.com/el/ref/7rni1Vwzbh-forexstandard\n\nΣχετικά με την αξιοπιστία και αδειοδότηση της εταιρείας:\nΗ Lime Trading (CY) Ltd λειτουργεί βάσει άδειας της Επιτροπής Κεφαλαιαγοράς Κύπρου (CySEC) με αριθμό αδείας 281/15, χορηγηθείσα στις 25/09/2015. Το εμπορικό σήμα "Just2Trade" ανήκει αποκλειστικά στη Lime Trading (CY) Ltd.\nΑριθμός Μητρώου: HE 341520\n\nΠαραμένουμε στη διάθεσή σας για οποιαδήποτε διευκρίνιση ή πρόσθετη πληροφορία επί της επένδυσης.\n\nΣας ευχαριστούμε θερμά για το ενδιαφέρον σας και την εμπιστοσύνη που μας δείχνετε.\n\nΜε εκτίμηση,\nDN Services Capital | Just2Trade (J2T)`
      : `Dear ${contact.name},\n\nFollowing our conversation, please find below the detailed information regarding the investment platform we discussed.\n\nYou can review all available options and participation terms in full at the following link:\n\nhttps://j2t.com/el/ref/7rni1Vwzbh-forexstandard\n\nRegarding company authorization:\nLime Trading (CY) Ltd operates under a license granted by the Cyprus Securities and Exchange Commission (CySEC), license number 281/15, issued on 25/09/2015. The trademark "Just2Trade" belongs exclusively to Lime Trading (CY) Ltd.\nRegistration Number: HE 341520\n\nWe remain at your disposal for any clarification or additional information.\n\nThank you sincerely for your interest and trust.\n\nKind regards,\nDN Services Capital | Just2Trade (J2T)`
    const subject = 'DN Services Capital / Just2Trade'
    openMailApp(contact.email || '', subject, body)
    if (contact?.email) logEmailSent('j2t')
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const nextDate = contact.nextActionDate?.slice(0, 10) || ''
  const nextTime = contact.nextActionTime || ''
  const followUpIsToday = nextDate === todayStr
  const followUpIsPast = !!(nextDate && nextDate < todayStr)

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full max-w-full bg-background overflow-x-hidden">
        <CRMSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 md:px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
            <SidebarTrigger className="-ml-1" />
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground p-0 md:px-2" title={lang === 'el' ? 'Πίσω στη λίστα επαφών' : 'Back to contacts list'}>
              <ArrowLeft className="h-4 w-4 md:mr-2" /> <span className="hidden sm:inline">{lang === 'el' ? 'Πίσω' : 'Back'}</span>
            </Button>
            <h1 className="text-sm md:text-lg font-semibold text-primary ml-2 md:ml-4 truncate max-w-[120px] md:max-w-none">
              {contact.name || (lang === 'el' ? 'Νέα Επαφή' : 'New Contact')}
            </h1>
            {contact.ownerId && (
              <Badge variant="outline" className={cn("ml-2 text-[10px] gap-1 hidden sm:flex",
                isOwner ? "border-green-400 text-green-600" : "border-amber-400 text-amber-600")}>
                <Lock className="h-3 w-3" />
                {isOwner
                  ? (lang === 'el' ? 'Δική σας' : 'Yours')
                  : (ownerName ? ownerName : (lang === 'el' ? 'Κλειδωμένη' : 'Locked'))}
              </Badge>
            )}
            <div className="ml-auto flex gap-1 md:gap-2">
              {canEdit && (
                <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 md:h-9" title={lang === 'el' ? 'Αποθήκευση αλλαγών' : 'Save changes'}>
                  <Save className="h-4 w-4 md:mr-2" />
                  <span className="hidden sm:inline">{lang === 'el' ? 'Αποθήκευση' : 'Save'}</span>
                </Button>
              )}
              {isAdmin && id !== 'new' && (
                <Button size="sm" variant="outline" className="h-8 md:h-9 text-destructive border-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteConfirmOpen(true)}
                  title={lang === 'el' ? 'Διαγραφή επαφής' : 'Delete contact'}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </header>

          {/* ── Email after call prompt ──────────────────────────────────── */}
          {showEmailAfterCall && contact.email && (
            <div className="mx-4 mt-4 md:mx-6 rounded-xl border border-blue-300 bg-blue-50/80 dark:bg-blue-950/20 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <Mail className="h-5 w-5 text-blue-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {lang === 'el' ? 'Θέλετε να στείλετε αυτοματοποιημένο email;' : 'Would you like to send an automated email?'}
                </p>
                <p className="text-xs text-blue-600/70 dark:text-blue-400">{contact.email}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="h-8 border-blue-400 text-blue-700 hover:bg-blue-100"
                  onClick={() => { handleSendJ2TEmail(); setShowEmailAfterCall(false) }}>
                  <Mail className="h-3.5 w-3.5 mr-1" /> {lang === 'el' ? 'Στείλε Αυτόματο Email' : 'Send Automated Email'}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-muted-foreground"
                  onClick={() => setShowEmailAfterCall(false)}>
                  {lang === 'el' ? 'Όχι' : 'Skip'}
                </Button>
              </div>
            </div>
          )}

          {/* ── Incoming access requests (visible to owner) ──────────────── */}
          {incomingRequests.length > 0 && (
            <div className="mx-4 mt-4 md:mx-6 rounded-xl border border-amber-300 bg-amber-50/70 dark:bg-amber-950/20 p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <Bell className="h-4 w-4" />
                {lang === 'el' ? 'Αιτήματα Πρόσβασης για αυτή την Επαφή' : 'Access Requests for this Contact'}
              </p>
              {incomingRequests.map(req => (
                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-background rounded-lg p-3 border">
                  <p className="text-sm">
                    <span className="font-semibold text-primary">{req.requester_name}</span>
                    {lang === 'el' ? ' ζητά πρόσβαση σε αυτήν την επαφή.' : ' is requesting access to this contact.'}
                  </p>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-xs border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => handleDenyAccess(req.id)}>
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      {lang === 'el' ? 'Απόρριψη' : 'Deny'}
                    </Button>
                    <Button size="sm" className="h-7 text-xs bg-green-500 hover:bg-green-600 text-white"
                      onClick={() => handleGrantAccess(req.id, req.requester_id)}>
                      <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                      {lang === 'el' ? 'Παραχώρηση' : 'Grant'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Trophy mode banner ──────────────────────────────────────── */}
          {isTrophyMode && id !== 'new' && (
            <div className="mx-4 mt-4 md:mx-6 rounded-xl border border-yellow-300 bg-yellow-50/70 dark:bg-yellow-950/20 p-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-400 shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {lang === 'el'
                  ? 'Δουλεύετε σε ανεξάρτητη καρτέλα τροπαίου. Οι σημειώσεις και η κατάστασή σας αποθηκεύονται χωριστά.'
                  : 'You are working in an independent trophy session. Your notes and status are stored separately.'}
              </p>
            </div>
          )}

          {/* ── Locked by other: request access banner ──────────────────── */}
          {lockedByOther && (
            <div className="mx-4 mt-4 md:mx-6 rounded-xl border border-amber-300 bg-amber-50/70 dark:bg-amber-950/20 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                  <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="text-sm">
                    {lang === 'el'
                      ? isPermanentLock
                        ? `Αυτή η επαφή είναι μόνιμα κλειδωμένη στον/στη ${ownerName || 'άλλο τηλεφωνητή'} (έχει γίνει πώληση).`
                        : `Αυτή η επαφή ανήκει στον/στη ${ownerName || 'άλλο τηλεφωνητή'} έως ${contact.lockedUntil}. Μπορείτε να τη δείτε αλλά όχι να την επεξεργαστείτε.`
                      : isPermanentLock
                        ? `This contact is permanently locked to ${ownerName || 'another telephonist'} (sale recorded).`
                        : `This contact belongs to ${ownerName || 'another telephonist'} until ${contact.lockedUntil}. You can view but not edit.`}
                  </p>
                </div>
                {!myRequest && (
                  <Button size="sm" variant="outline" className="h-8 text-xs shrink-0 border-amber-500 text-amber-700 hover:bg-amber-100"
                    onClick={handleRequestAccess} disabled={isRequesting}>
                    <Bell className="h-3.5 w-3.5 mr-1" />
                    {isRequesting ? '...' : (lang === 'el' ? 'Ζητήστε Πρόσβαση' : 'Request Access')}
                  </Button>
                )}
                {myRequest?.status === 'pending' && (
                  <Badge variant="outline" className="border-amber-400 text-amber-600 text-xs">
                    {lang === 'el' ? 'Αίτημα σε Αναμονή' : 'Request Pending'}
                  </Badge>
                )}
                {myRequest?.status === 'denied' && (
                  <Badge variant="outline" className="border-destructive text-destructive text-xs">
                    {lang === 'el' ? 'Αίτημα Απορρίφθηκε' : 'Request Denied'}
                  </Badge>
                )}
              </div>
            </div>
          )}

          <main className="p-4 md:p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-base md:text-lg">{lang === 'el' ? 'Πληροφορίες Επαφής' : 'Contact Details'}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">{lang === 'el' ? 'Όνομα' : 'Name'}</Label>
                        <Input value={contact.name} onChange={(e) => setContact({...contact, name: e.target.value})} className="h-9 text-sm" disabled={lockedByOther || isTrophyMode} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Email</Label>
                        <div className="flex gap-2">
                          <Input value={contact.email} onChange={(e) => setContact({...contact, email: e.target.value})} className="h-9 text-sm flex-1" disabled={lockedByOther || isTrophyMode} />
                          <Button size="icon" variant="outline" className="h-9 w-9" title={lang === 'el' ? 'Άνοιγμα Gmail' : 'Open Gmail'}
                            onClick={isTrophyMode && contact.email
                              ? () => window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(contact.email)}`, '_blank')
                              : handleSendEmailAction
                            }>
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label className="text-xs flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{lang === 'el' ? 'Διεύθυνση' : 'Address'}</Label>
                        <div className="flex gap-2">
                          <Input
                            value={contact.address || ''}
                            onChange={(e) => setContact({...contact, address: e.target.value})}
                            className="h-9 text-sm flex-1"
                            placeholder={lang === 'el' ? 'π.χ. Λεωφόρος Κηφισίας 10, Αθήνα' : 'e.g. 10 Main St, Athens'}
                            disabled={lockedByOther || isTrophyMode}
                          />
                          {contact.address && (
                            <Button
                              size="icon" variant="outline"
                              className="h-9 w-9 shrink-0 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/30"
                              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address!)}`, '_blank')}
                              title={lang === 'el' ? 'Άνοιγμα στο Google Maps' : 'Open in Google Maps'}
                            >
                              <MapPin className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">{lang === 'el' ? 'Τηλέφωνο' : 'Phone'}</Label>
                        {/* Dropdown + call + delete */}
                        <div className="flex gap-2">
                          <Select
                            value={String(selectedPhoneIdx)}
                            onValueChange={v => setSelectedPhoneIdx(Number(v))}
                          >
                            <SelectTrigger className="h-9 text-sm flex-1">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {phoneList.filter(Boolean).map((ph, idx) => (
                                <SelectItem key={idx} value={String(idx)} className="font-mono text-sm">
                                  <span className="flex items-center gap-1.5">
                                    {isMobile(ph) && <Phone className="h-3 w-3 text-green-500 shrink-0" />}
                                    <span>{ph}</span>
                                    {isMobile(ph) && <span className="text-[9px] text-green-600 bg-green-50 px-1 rounded">κινητό</span>}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="outline" className="h-9 w-9 text-accent shrink-0"
                            onClick={() => handleMakeCall()}
                            title={lang === 'el' ? 'Κλήση & καταγραφή' : 'Call & log'}>
                            <Phone className="h-4 w-4" />
                          </Button>
                          {!lockedByOther && phoneList.filter(Boolean).length > 0 && (
                            <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                              title={lang === 'el' ? 'Διαγραφή επιλεγμένου' : 'Delete selected'}
                              onClick={() => setPhoneDeleteConfirm(true)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {/* Add new phone */}
                        {!lockedByOther && (
                          <div className="space-y-1.5 pt-1">
                            {addingPhone !== null && (
                              <div className="flex gap-2">
                                <Input
                                  value={addingPhone}
                                  onChange={(e) => setAddingPhone(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && addingPhone.trim()) {
                                      const updated = [...phoneList.filter(Boolean), addingPhone.trim()]
                                      setPhoneList(updated)
                                      setSelectedPhoneIdx(updated.length - 1)
                                      setContact(c => c ? { ...c, phone: serializePhones(updated) } : c)
                                      setAddingPhone(null)
                                    } else if (e.key === 'Escape') {
                                      setAddingPhone(null)
                                    }
                                  }}
                                  className="h-8 text-xs flex-1 font-mono"
                                  placeholder={lang === 'el' ? 'Νέος αριθμός — πατήστε Enter' : 'New number — press Enter'}
                                  autoFocus
                                />
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                  onClick={() => setAddingPhone(null)}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                            {addingPhone === null && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground"
                                onClick={() => setAddingPhone('')}>
                                <Plus className="h-3 w-3" />
                                {lang === 'el' ? 'Προσθήκη τηλεφώνου' : 'Add phone'}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">{lang === 'el' ? 'Ιδιότητα / Επάγγελμα' : 'Profession / Job Title'}</Label>
                        <div className="relative">
                          <Briefcase className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input value={contact.jobTitle || ''} onChange={(e) => setContact({...contact, jobTitle: e.target.value})} className="h-9 text-sm pl-9" placeholder="π.χ. Γιατρός" disabled={lockedByOther || isTrophyMode} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">{lang === 'el' ? 'Κλάδος / Εταιρεία' : 'Industry / Company'}</Label>
                        <div className="relative">
                          <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input value={contact.industry || contact.companyName || ''} onChange={(e) => setContact({...contact, industry: e.target.value})} className="h-9 text-sm pl-9" placeholder="π.χ. Υγεία" disabled={lockedByOther || isTrophyMode} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {lang === 'el' ? 'Επόμενη Ενέργεια' : 'Follow-up Date'}
                          {followUpIsToday && <Badge className="ml-1 text-[9px] h-4 px-1 bg-amber-500 text-white">Σήμερα</Badge>}
                          {followUpIsPast && !followUpIsToday && <Badge className="ml-1 text-[9px] h-4 px-1 bg-red-500 text-white">{lang === 'el' ? 'Καθυστερεί' : 'Overdue'}</Badge>}
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={nextDate}
                            onChange={(e) => setContact({...contact, nextActionDate: e.target.value || undefined})}
                            className={cn('h-9 text-sm flex-1', followUpIsToday && 'border-amber-400', followUpIsPast && !followUpIsToday && 'border-red-400')}
                            disabled={lockedByOther}
                          />
                          <Input
                            type="time"
                            value={nextTime}
                            onChange={(e) => setContact({...contact, nextActionTime: e.target.value || undefined})}
                            className="h-9 text-sm w-28 shrink-0"
                            disabled={lockedByOther}
                            placeholder="--:--"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">
                          {lang === 'el' ? 'Κατάσταση' : 'Status'}
                        </Label>
                        <Select
                          value={isTrophyMode && (contact.status === 'likely_sale' || contact.status === 'likely_antisale') ? 'another_time' : contact.status}
                          onValueChange={(v) => setContact({ ...contact, status: v as any })}
                          disabled={lockedByOther}
                        >
                          <>
                            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">{lang === 'el' ? 'Νέος' : 'New'}</SelectItem>
                              <SelectItem value="canva">Canva</SelectItem>
                              <SelectItem value="probable">{lang === 'el' ? 'Πιθανός' : 'Probable'}</SelectItem>
                              {(isTrophyMode || scope === 'trophy')
                                ? <SelectItem value="another_time">{lang === 'el' ? 'Άλλη Στιγμή' : 'Another Time'}</SelectItem>
                                : <><SelectItem value="likely_sale">Sale</SelectItem><SelectItem value="likely_antisale">Antisale</SelectItem></>
                              }
                              {(isTrophyMode || scope === 'trophy') && <SelectItem value="few_reviews">Λίγες Αξιολογήσεις</SelectItem>}
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="no_answer">{lang === 'el' ? 'Δεν Απάντησε' : 'No Answer'}</SelectItem>
                              <SelectItem value="not_buying">{lang === 'el' ? 'Δεν Αγοράζει' : 'Not Buying'}</SelectItem>
                              <SelectItem value="bought">{lang === 'el' ? 'Αγόρασε' : 'Bought'}</SelectItem>
                            </SelectContent>
                          </>
                        </Select>
                        {(contact.leadSource || contact.rating != null) && (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            {contact.leadSource && (
                              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <Globe className="h-3 w-3 shrink-0" />
                                <span className="font-medium">{lang === 'el' ? 'Πηγή εύρεσης:' : 'Lead source:'}</span>
                                {contact.leadSource}
                              </p>
                            )}
                            {contact.rating != null && (
                              <p className="flex items-center gap-1.5 text-[11px]">
                                <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                                <span className="font-bold text-amber-600">{Number(contact.rating).toFixed(1)} ★</span>
                                {contact.reviewCount != null && (
                                  <span className="text-muted-foreground">({contact.reviewCount} {lang === 'el' ? 'αξιολογήσεις' : 'reviews'})</span>
                                )}
                              </p>
                            )}
                          </div>
                        )}
                        {(() => {
                          const isGoogleContact = contact.mapsUrl || contact.rating != null || contact.leadSource?.toLowerCase().includes('google')
                          if (!isGoogleContact) return null
                          const gmUrl = contact.mapsUrl ||
                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.name + (contact.address ? ' ' + contact.address : ''))}`
                          return (
                            <a
                              href={gmUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 flex items-center gap-2 w-full rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 px-3 py-2 text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            >
                              <MapPin className="h-4 w-4 shrink-0 text-red-500" />
                              <span className="font-medium">{lang === 'el' ? 'Άνοιγμα στο Google Maps' : 'Open in Google Maps'}</span>
                              <Globe className="h-3.5 w-3.5 ml-auto shrink-0 opacity-60" />
                            </a>
                          )
                        })()}
                      </div>

                      {contact.status === 'bought' && canEdit && (
                        <div className="space-y-2 sm:col-span-2">
                          <Label className="text-xs flex items-center gap-1.5 text-green-700 dark:text-green-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {lang === 'el' ? 'Ποσό Επένδυσης (€) — Πώλησή μου' : 'Investment Amount (€) — My Sale'}
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">€</span>
                            <Input
                              type="number"
                              min={0}
                              value={saleAmount || ''}
                              onChange={(e) => setSaleAmount(Number(e.target.value))}
                              className="h-9 text-sm pl-7 border-green-300 focus-visible:ring-green-400"
                              placeholder="0"
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {lang === 'el'
                              ? 'Αποθηκεύστε για να καταγραφεί το ποσό στο σκορ σας.'
                              : 'Save to record this amount in your personal score.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base md:text-lg flex items-center gap-2">
                      {lang === 'el' ? 'Σημειώσεις Κλήσης' : 'Call Notes'}
                      {isUnclaimed && id !== 'new' && !isTrophyMode && (
                        <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600">
                          {lang === 'el' ? 'Η αποθήκευση σημειώσεων κλειδώνει την επαφή σε εσάς' : 'Saving notes locks this contact to you'}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {trophyObs !== null ? (
                      <div className="space-y-2">
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 text-amber-500 shrink-0" />
                          {lang === 'el' ? `Σχόλια Trophy τηλεφωνητή: ${trophyObs.ownerName}` : `Trophy telephonist notes by: ${trophyObs.ownerName}`}
                        </p>
                        <Textarea
                          className="min-h-[150px] md:min-h-[200px] text-sm bg-muted/30"
                          value={trophyObs.observations}
                          readOnly
                          placeholder={lang === 'el' ? 'Δεν υπάρχουν σχόλια...' : 'No notes yet...'}
                        />
                      </div>
                    ) : (
                      <Textarea
                        className="min-h-[150px] md:min-h-[200px] text-sm"
                        value={contact.observations}
                        onChange={(e) => setContact({...contact, observations: e.target.value})}
                        placeholder={lang === 'el' ? 'Γράψτε εδώ τις σημειώσεις σας...' : 'Write your notes here...'}
                        disabled={lockedByOther}
                      />
                    )}
                  </CardContent>
                </Card>

                {aiSummary && (
                  <Card className="bg-accent/5 border-accent/20 animate-in fade-in slide-in-from-bottom-4">
                    <CardHeader><CardTitle className="text-base md:text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-accent" /> {lang === 'el' ? 'Έξυπνη Σύνοψη' : 'Smart Summary'}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm leading-relaxed">{aiSummary.summary}</p>
                      <div className="space-y-2 pt-2 border-t border-accent/10">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-accent">{lang === 'el' ? 'Προτεινόμενες Ερωτήσεις' : 'Suggested Questions'}</h4>
                        <ul className="text-xs md:text-sm space-y-2">{aiSummary.followUpQuestions.map((q, i) => <li key={i} className="flex gap-2"><div className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5 shrink-0" /> {q}</li>)}</ul>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {callScript && (
                  <Card className="bg-primary/5 border-primary/20 animate-in fade-in slide-in-from-bottom-4">
                    <CardHeader><CardTitle className="text-base md:text-lg flex items-center gap-2"><PhoneCall className="h-5 w-5 text-primary" /> {lang === 'el' ? 'Script Κλήσης' : 'Call Script'}</CardTitle></CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary">{lang === 'el' ? 'Χαιρετισμός' : 'Greeting'}</h4>
                        <p className="leading-relaxed text-muted-foreground bg-card p-3 rounded-lg border">{callScript.greeting}</p>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary">{lang === 'el' ? 'Παρουσίαση' : 'Pitch'}</h4>
                        <p className="leading-relaxed text-muted-foreground bg-card p-3 rounded-lg border">{callScript.pitch}</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary">{lang === 'el' ? 'Αντιρρήσεις & Απαντήσεις' : 'Objections & Answers'}</h4>
                        {callScript.objections.map((o, i) => (
                          <div key={i} className="bg-card p-3 rounded-lg border space-y-1">
                            <p className="text-xs font-semibold flex items-start gap-1"><AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />{o.objection}</p>
                            <p className="text-xs text-muted-foreground pl-4"><CheckCircle2 className="h-3 w-3 text-green-500 inline mr-1" />{o.answer}</p>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary">{lang === 'el' ? 'Κλείσιμο' : 'Closing'}</h4>
                        <p className="leading-relaxed text-muted-foreground bg-card p-3 rounded-lg border">{callScript.closing}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

              </div>

              <div className="space-y-6">
                <Card className="sticky top-20">
                  <CardHeader><CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-muted-foreground"><Zap className="h-4 w-4 text-accent" /> {lang === 'el' ? 'Έξυπνος Βοηθός' : 'Smart Assistant'}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start gap-2 h-10 text-xs" onClick={handleAiSummary} disabled={isAiLoading}
                      title={lang === 'el' ? 'AI ανάλυση σημειώσεων & προτάσεις επόμενης κίνησης' : 'AI analysis of notes & next-step suggestions'}>
                      <Sparkles className={cn('h-4 w-4 text-accent', isAiLoading && 'animate-spin')} />
                      {isAiLoading ? '...' : (lang === 'el' ? 'Σύνοψη & Στρατηγική' : 'Summary & Strategy')}
                    </Button>

                    <Button variant="outline" className="w-full justify-start gap-2 h-10 text-xs" onClick={handleGenerateCallScript} disabled={isCallScriptLoading}
                      title={lang === 'el' ? 'Δημιουργία AI script για την επόμενη κλήση' : 'Generate AI script for the next call'}>
                      <PhoneCall className={cn('h-4 w-4 text-primary', isCallScriptLoading && 'animate-pulse')} />
                      {isCallScriptLoading ? '...' : (lang === 'el' ? 'Script Κλήσης' : 'Call Script')}
                    </Button>

                    {contact.phone && (
                      <Button variant="outline" className="w-full justify-start gap-2 h-10 text-xs text-green-600 border-green-200 hover:bg-green-50" onClick={handleWhatsApp}
                        title={lang === 'el' ? 'Αποστολή αυτοματοποιημένου WhatsApp μηνύματος' : 'Send automated WhatsApp message'}>
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 h-10 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={handleSendJ2TEmail}
                      disabled={!contact.email}
                      title={lang === 'el' ? 'Αποστολή αυτοματοποιημένου email Just2Trade' : 'Send automated Just2Trade email'}
                    >
                      <Send className="h-4 w-4" />
                      {lang === 'el' ? 'Email J2T' : 'J2T Email'}
                    </Button>

                    <div className="pt-3 border-t space-y-3">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">{lang === 'el' ? 'Γλώσσα Email J2T' : 'J2T Email Language'}</Label>
                      <Select value={emailLanguage} onValueChange={(val: any) => setEmailLanguage(val)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="el" className="text-xs">Ελληνικά</SelectItem>
                          <SelectItem value="en" className="text-xs">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>

      {/* ── Delete Confirmation Dialog ──────────────────────────────────────── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              {lang === 'el' ? 'Διαγραφή Επαφής;' : 'Delete Contact?'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {lang === 'el'
              ? `Είστε σίγουρος/η ότι θέλετε να διαγράψετε την επαφή "${contact?.name}"; Αυτή η ενέργεια είναι μη αναστρέψιμη.`
              : `Are you sure you want to delete "${contact?.name}"? This action cannot be undone.`}
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={isDeleting}>
              {lang === 'el' ? 'Άκυρο' : 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting
                ? <RefreshCcw className="h-4 w-4 animate-spin mr-2" />
                : <Trash2 className="h-4 w-4 mr-2" />}
              {lang === 'el' ? 'Διαγραφή' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Phone Delete Confirmation ──────────────────────────────────────── */}
      <AlertDialog open={phoneDeleteConfirm} onOpenChange={setPhoneDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lang === 'el' ? 'Διαγραφή αριθμού;' : 'Delete number?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lang === 'el'
                ? `Θέλετε να διαγράψετε τον αριθμό "${phoneList.filter(Boolean)[selectedPhoneIdx] ?? ''}"; Η ενέργεια δεν αναιρείται αυτόματα — θα χρειαστεί αποθήκευση για να οριστικοποιηθεί.`
                : `Delete "${phoneList.filter(Boolean)[selectedPhoneIdx] ?? ''}"? This won't be permanent until you save.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === 'el' ? 'Ακύρωση' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const existing = phoneList.filter(Boolean)
                const updated = existing.filter((_, i) => i !== selectedPhoneIdx)
                setPhoneList(updated.length ? updated : [''])
                setSelectedPhoneIdx(0)
                setContact(c => c ? { ...c, phone: serializePhones(updated) } : c)
              }}
            >
              {lang === 'el' ? 'Διαγραφή' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </SidebarProvider>
  )
}
