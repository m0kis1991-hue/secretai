"use client"

import { CRMSidebar } from "@/components/layout/crm-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Globe,
  MapPin,
  Phone,
  Plus,
  Sparkles,
  Loader2,
  Building2,
  CheckCircle2,
  UserCheck,
  Briefcase,
  Target,
  CopyPlus,
  Mail,
  ChevronLeft,
  ChevronRight,
  Lock,
  TrendingUp,
  Users,
  Stethoscope,
  Scale,
  Home,
  Cpu,
  Star,
  Square,
  CheckSquare,
  Trophy,
  ExternalLink,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { useState, useEffect, useRef } from "react"
import type { PublicLead } from "@/ai/flows/find-public-leads-flow"

// Extends the AI flow's lead with local dedup state — set when a lead's phone matches a contact
// already in the CRM, so the result can say why it can't be imported instead of just vanishing,
// and link straight to it (otherwise "already in CRM" still reads as "can't find it").
type DiscoverLead = PublicLead & { alreadyInCRM?: { id: string; name: string } }
type FindPublicLeadsOutput = { leads: DiscoverLead[]; summary: string; topLeadsMode?: boolean }
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

const PAGE_SIZE = 30

// ── Phone dedup helpers ───────────────────────────────────────────────────────
// Compare on the last 10 digits so a stored "6912345678" still matches a freshly
// found "+30 691 234 5678" or "0030-691-234-5678" — country-code/formatting
// differences were letting already-saved contacts slip through as "new" leads.
function normalizePhone(p: string): string {
  const digits = p.replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}

function buildPhoneSet(rows: Array<{ phone?: string | null }>): Set<string> {
  const s = new Set<string>()
  for (const r of rows) {
    if (!r.phone) continue
    const phones: string[] = r.phone.startsWith('[')
      ? (() => { try { return JSON.parse(r.phone) as string[] } catch { return [r.phone] } })()
      : [r.phone]
    phones.forEach(p => { if (p) s.add(normalizePhone(p)) })
  }
  return s
}

// Same as buildPhoneSet but keeps the matched contact's id/name, so an "already in CRM" result
// can say which existing contact it collides with — and link straight to it — instead of just
// vanishing from the results.
function buildPhoneMap(rows: Array<{ id: string; name?: string | null; phone?: string | null }>): Map<string, { id: string; name: string }> {
  const m = new Map<string, { id: string; name: string }>()
  for (const r of rows) {
    if (!r.phone) continue
    const phones: string[] = r.phone.startsWith('[')
      ? (() => { try { return JSON.parse(r.phone) as string[] } catch { return [r.phone] } })()
      : [r.phone]
    phones.forEach(p => { if (p) m.set(normalizePhone(p), { id: r.id, name: r.name ?? '' }) })
  }
  return m
}

// ── Investor profile quick-select chips ──────────────────────────────────────
type ProfileChip = {
  id: string
  labelEl: string
  labelEn: string
  descEl: string
  descEn: string
  searchTerm: string
  icon: React.ReactNode
  color: string
}

const INVESTOR_PROFILES: ProfileChip[] = [
  {
    id: 'medics',
    labelEl: 'Ιατρικό',
    labelEn: 'Medical',
    descEl: 'Γιατροί, Οδοντίατροι, Χειρουργοί',
    descEn: 'Doctors, Dentists, Surgeons',
    searchTerm: 'γιατρός',
    icon: <Stethoscope className="h-3.5 w-3.5" />,
    color: 'border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300',
  },
  {
    id: 'legal_finance',
    labelEl: 'Νομικό & Λογιστικό',
    labelEn: 'Legal & Finance',
    descEl: 'Δικηγόροι, Λογιστές, Φοροτεχνικοί',
    descEn: 'Lawyers, Accountants, Tax Advisors',
    searchTerm: 'δικηγόρος',
    icon: <Scale className="h-3.5 w-3.5" />,
    color: 'border-violet-400 text-violet-700 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-300',
  },
  {
    id: 'engineering',
    labelEl: 'Τεχνικό',
    labelEn: 'Engineering',
    descEl: 'Μηχανικοί, Αρχιτέκτονες, Εργολάβοι',
    descEn: 'Engineers, Architects, Contractors',
    searchTerm: 'μηχανικός',
    icon: <Cpu className="h-3.5 w-3.5" />,
    color: 'border-orange-400 text-orange-700 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-300',
  },
  {
    id: 'executives',
    labelEl: 'Στελέχη Επιχειρήσεων',
    labelEn: 'Business Executives',
    descEl: 'Διευθυντές, CEO, Γεν. Διευθυντές',
    descEn: 'Directors, CEOs, General Managers',
    searchTerm: 'διευθυντής επιχείρηση',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    color: 'border-emerald-400 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300',
  },
  {
    id: 'entrepreneurs',
    labelEl: 'Επιχειρηματίες',
    labelEn: 'Entrepreneurs',
    descEl: 'Ιδιοκτήτες, ΑΕ, ΕΠΕ, ΙΚΕ',
    descEn: 'Business owners, Companies',
    searchTerm: 'επιχειρηματίας',
    icon: <Building2 className="h-3.5 w-3.5" />,
    color: 'border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300',
  },
  {
    id: 'realestate',
    labelEl: 'Ακίνητα',
    labelEn: 'Real Estate',
    descEl: 'Κτηματομεσίτες, Εργολάβοι, Επενδυτές',
    descEn: 'Real estate agents, Developers',
    searchTerm: 'κτηματομεσίτης',
    icon: <Home className="h-3.5 w-3.5" />,
    color: 'border-cyan-400 text-cyan-700 bg-cyan-50 dark:bg-cyan-950/30 dark:text-cyan-300',
  },
  {
    id: 'pharma',
    labelEl: 'Φαρμακευτικό',
    labelEn: 'Pharmacy',
    descEl: 'Φαρμακοποιοί, Φαρμακεία',
    descEn: 'Pharmacists, Pharmacies',
    searchTerm: 'φαρμακοποιός',
    icon: <Star className="h-3.5 w-3.5" />,
    color: 'border-pink-400 text-pink-700 bg-pink-50 dark:bg-pink-950/30 dark:text-pink-300',
  },
]

export default function DiscoverLeadsPage() {
  const { toast } = useToast()
  const [lang, setLang] = useState<'el' | 'en'>('el')
  const [category, setCategory] = useState("")
  const [location, setLocation] = useState("")
  const [activeProfile, setActiveProfile] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<FindPublicLeadsOutput | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [pageJumpActive, setPageJumpActive] = useState(false)
  const [pageJumpValue, setPageJumpValue] = useState('')
  const pageJumpRef = useRef<HTMLInputElement>(null)
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [topLeadsAccess, setTopLeadsAccess] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const savedLang = localStorage.getItem('app-lang') as 'el' | 'en'
    if (savedLang) setLang(savedLang)

    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user
      if (!user) return
      setCurrentUserId(user.id)
      const { data } = await supabase
        .from('profiles')
        .select('role, discover_access, top_leads_access')
        .eq('id', user.id)
        .single()
      if (data) {
        const isAdmin = data.role === 'admin' || data.role === 'superadmin'
        setHasAccess(isAdmin || data.discover_access === true)
        setTopLeadsAccess(isAdmin || data.top_leads_access === true)
      }
    })
  }, [])

  const handleProfileChip = (chip: ProfileChip) => {
    if (activeProfile === chip.id) {
      // deselect
      setActiveProfile(null)
      setCategory("")
    } else {
      setActiveProfile(chip.id)
      setCategory(chip.searchTerm)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResults(null)
    setAddedIds(new Set())
    setSelectedIds(new Set())
    setPage(1)

    const cacheKey = `leads-cache-${category.trim().toLowerCase()}-${location.trim().toLowerCase()}`
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const { timestamp, data } = JSON.parse(cached)
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setResults(data)
          setIsLoading(false)
          return
        }
      }
    } catch {}

    try {
      const res = await fetch('/api/find-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: category || undefined,
          location: location || undefined,
          language: lang,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Search failed')
      }
      const data: FindPublicLeadsOutput = await res.json()

      // Mark (never silently drop) leads whose phone already exists in the CRM — a business the
      // telephonist found via Google and searched for here should still show up in the results
      // even if it can't be re-imported, otherwise a hit that's already in the CRM looks
      // identical to a search that found nothing at all.
      const supabase = createClient()
      const { data: existingContacts } = await supabase.from('contacts').select('id, name, phone')
      const existingMap = buildPhoneMap(existingContacts ?? [])
      const markedLeads: DiscoverLead[] = data.leads.map(l => {
        const lPhones = l.phones ?? [l.phone]
        const match = lPhones.map(p => existingMap.get(normalizePhone(p))).find(Boolean)
        return match ? { ...l, alreadyInCRM: match } : l
      })
      // New leads first so they're not pushed to a later page by duplicates.
      markedLeads.sort((a, b) => Number(!!a.alreadyInCRM) - Number(!!b.alreadyInCRM))
      const dupCount = markedLeads.filter(l => l.alreadyInCRM).length
      const dedupeNote = dupCount > 0
        ? (lang === 'el'
            ? ` · ${dupCount} υπάρχουν ήδη στο CRM σας (επισημασμένες παρακάτω).`
            : ` · ${dupCount} are already in your CRM (marked below).`)
        : ''
      const filtered: FindPublicLeadsOutput = {
        ...data,
        leads: markedLeads,
        summary: data.summary + dedupeNote,
      }
      setResults(filtered)
      try { localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: filtered })) } catch {}
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: lang === 'el' ? "Δεν βρέθηκαν αποτελέσματα" : "No results",
        description: error?.message || (lang === 'el' ? "Δοκιμάστε διαφορετικούς όρους αναζήτησης." : "Try different search terms."),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const saveLeadToCRM = async (lead: PublicLead): Promise<'added' | 'duplicate'> => {
    const supabase = createClient()
    const leadPhones = (lead.phones ?? [lead.phone]).map(normalizePhone)
    const { data: allPhones } = await supabase.from('contacts').select('phone')
    const existingSet = buildPhoneSet(allPhones ?? [])
    if (leadPhones.some(p => existingSet.has(p))) return 'duplicate'

    const phoneToStore = leadPhones.length > 1 ? JSON.stringify(leadPhones) : leadPhones[0]
    const row = {
      name: lead.name,
      phone: phoneToStore,
      email: lead.email || null,
      address: lead.address || null,
      industry: lead.industry,
      job_title: lead.profile,
      observations: null,
      investment_amount: 0,
      status: 'new',
      owner_id: currentUserId || null,
      created_by: currentUserId || null,
      priority_score: (() => {
        const r = typeof lead.rating === 'number' ? lead.rating : null
        const rc = typeof lead.reviewCount === 'number' ? lead.reviewCount : null
        if (r == null) return 50
        // Rating 4.0→72 … 5.0→86, plus log-scale review bonus up to +14
        let s = Math.round(r * 14 + 16)
        if (rc != null && rc > 0) s += Math.min(14, Math.round(Math.log10(rc) * 6))
        return Math.min(100, s)
      })(),
      lead_source: lead.source || null,
      rating: typeof lead.rating === 'number' ? lead.rating : null,
      review_count: typeof lead.reviewCount === 'number' ? lead.reviewCount : null,
      maps_url: lead.mapsUrl || null,
    }
    const { error } = await supabase.from('contacts').insert(row)
    if (error) throw error
    return 'added'
  }

  const handleAddToCRM = async (lead: PublicLead, index: number) => {
    try {
      const result = await saveLeadToCRM(lead)
      if (result === 'duplicate') {
        toast({
          variant: 'destructive',
          title: lang === 'el' ? 'Η επαφή υπάρχει ήδη' : 'Contact already exists',
          description: lang === 'el'
            ? `Ο/Η ${lead.name} υπάρχει ήδη στις επαφές σας.`
            : `${lead.name} is already in your contacts.`,
        })
        return
      }
      setAddedIds(prev => new Set(prev).add(index.toString()))
      toast({
        title: lang === 'el' ? "Επαφή Προστέθηκε" : "Contact Added",
        description: `${lead.name} ${lang === 'el' ? 'προστέθηκε στις επαφές σας.' : 'was added to your contacts.'}`,
      })
    } catch {
      toast({ variant: 'destructive', title: lang === 'el' ? 'Σφάλμα αποθήκευσης' : 'Save error' })
    }
  }

  const handleAddSelected = async () => {
    if (!results || selectedIds.size === 0) return
    let added = 0
    let dupes = 0
    const newAdded = new Set(addedIds)
    const newSelected = new Set(selectedIds)
    for (const idxStr of Array.from(selectedIds)) {
      const idx = parseInt(idxStr)
      const lead = results.leads[idx]
      if (!lead || addedIds.has(idxStr)) continue
      try {
        const result = await saveLeadToCRM(lead)
        if (result === 'added') { newAdded.add(idxStr); added++ }
        else dupes++
        newSelected.delete(idxStr)
      } catch {}
    }
    setAddedIds(newAdded)
    setSelectedIds(newSelected)
    toast({
      title: lang === 'el' ? "Εισαγωγή Ολοκληρώθηκε" : "Import Complete",
      description: lang === 'el'
        ? `${added} νέες επαφές εισήχθησαν.${dupes > 0 ? ` ${dupes} υπήρχαν ήδη.` : ''}`
        : `${added} contacts imported.${dupes > 0 ? ` ${dupes} already existed.` : ''}`,
    })
  }

  const toggleSelectPage = () => {
    const selectablePageIds = paginated
      .map((lead, relIdx) => ({ lead, id: ((safePage - 1) * PAGE_SIZE + relIdx).toString() }))
      .filter(({ lead }) => !lead.alreadyInCRM)
      .map(({ id }) => id)
    const allPageSelected = selectablePageIds.every(id => selectedIds.has(id) || addedIds.has(id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allPageSelected) {
        selectablePageIds.forEach(id => next.delete(id))
      } else {
        selectablePageIds.filter(id => !addedIds.has(id)).forEach(id => next.add(id))
      }
      return next
    })
  }

  const t = {
    title: lang === 'el' ? 'Έξυπνη Εύρεση Επενδυτών' : 'Smart Investor Discovery',
    desc: lang === 'el' ? 'Εντοπίστε ιδιώτες και επαγγελματίες με υψηλό επενδυτικό προφίλ από δημόσιες πηγές.' : 'Identify individuals and professionals with high investment profiles from public sources.',
    profileLabel: lang === 'el' ? 'Επενδυτικό Προφίλ' : 'Investor Profile',
    profileDesc: lang === 'el' ? 'Επιλέξτε κατηγορία ή πληκτρολογήστε ελεύθερα παρακάτω' : 'Select a category or type freely below',
    category: lang === 'el' ? 'Ειδικότητα / Κλάδος' : 'Specialty / Industry',
    categoryPlaceholder: lang === 'el' ? 'π.χ. Γιατροί, Δικηγόροι — ή το ακριβές όνομα μιας επιχείρησης' : 'e.g. Doctors, Lawyers — or a specific business name',
    location: lang === 'el' ? 'Περιοχή (κενό = όλη η Ελλάδα)' : 'Location (empty = all Greece)',
    locationPlaceholder: lang === 'el' ? 'π.χ. Αθήνα, Θεσσαλονίκη, Κηφισιά' : 'e.g. Athens, Thessaloniki',
    searchBtn: lang === 'el' ? 'Έξυπνη Εύρεση' : 'Smart Search',
    results: lang === 'el' ? 'Πιθανοί Επενδυτές' : 'Potential Investors',
    addToCrm: lang === 'el' ? 'Εισαγωγή' : 'Import',
    added: lang === 'el' ? 'Εισήχθη' : 'Imported',
    addSelected: lang === 'el' ? 'Προσθήκη Επιλεγμένων' : 'Add Selected',
    selectPage: lang === 'el' ? 'Επιλογή Σελίδας' : 'Select Page',
    deselectPage: lang === 'el' ? 'Αποεπιλογή Σελίδας' : 'Deselect Page',
  }

  const allLeads = results?.leads ?? []
  const totalPages = Math.max(1, Math.ceil(allLeads.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = allLeads.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  if (hasAccess === null) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full max-w-full bg-background overflow-x-hidden">
          <CRMSidebar />
          <SidebarInset>
            <div className="flex items-center justify-center h-full p-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    )
  }

  if (!hasAccess) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full max-w-full bg-background overflow-x-hidden">
          <CRMSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
              <SidebarTrigger className="-ml-1" />
              <h1 className="text-lg font-semibold text-primary">{t.title}</h1>
            </header>
            <main className="flex flex-col items-center justify-center p-20 text-center">
              <Lock className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {lang === 'el' ? 'Χωρίς Πρόσβαση' : 'No Access'}
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                {lang === 'el'
                  ? 'Δεν έχετε πρόσβαση στη Έξυπνη Εύρεση Leads. Επικοινωνήστε με τον διαχειριστή.'
                  : 'You do not have access to Smart Lead Discovery. Contact your administrator.'}
              </p>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full max-w-full bg-background overflow-x-hidden">
        <CRMSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-primary">{t.title}</h1>
            </div>
          </header>

          <main className="p-4 md:p-6 space-y-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" /> {t.title}
                </CardTitle>
                <CardDescription>{t.desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* ── Investor Profile Chips ───────────────────────────────── */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    {t.profileLabel}
                  </Label>
                  <p className="text-[11px] text-muted-foreground">{t.profileDesc}</p>
                  <div className="flex flex-wrap gap-2">
                    {INVESTOR_PROFILES.map(chip => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => handleProfileChip(chip)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                          activeProfile === chip.id
                            ? chip.color + " ring-2 ring-offset-1 ring-primary/40 shadow-sm"
                            : "border-border text-muted-foreground bg-background hover:border-primary/40 hover:text-foreground"
                        )}
                        title={lang === 'el' ? chip.descEl : chip.descEn}
                      >
                        {chip.icon}
                        {lang === 'el' ? chip.labelEl : chip.labelEn}
                      </button>
                    ))}
                  </div>
                  {activeProfile && (
                    <p className="text-[11px] text-muted-foreground italic">
                      {lang === 'el'
                        ? `Προφίλ: ${INVESTOR_PROFILES.find(p => p.id === activeProfile)?.[lang === 'el' ? 'descEl' : 'descEn']}`
                        : `Profile: ${INVESTOR_PROFILES.find(p => p.id === activeProfile)?.descEn}`}
                    </p>
                  )}
                </div>

                <Separator />

                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase">{t.category}</Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t.categoryPlaceholder}
                          className="pl-9"
                          value={category}
                          onChange={(e) => {
                            setCategory(e.target.value)
                            if (!e.target.value) setActiveProfile(null)
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase">{t.location}</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t.locationPlaceholder}
                          className="pl-9"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 gap-2 h-11" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {isLoading
                      ? (lang === 'el' ? 'Αναζήτηση σε όλη την Ελλάδα...' : 'Searching all of Greece...')
                      : t.searchBtn}
                  </Button>
                </form>

                {/* ── Legal Disclaimer ─────────────────────────────────── */}
                <div className="mt-4 rounded-lg border border-muted bg-muted/30 px-4 py-3 text-[11px] text-muted-foreground leading-relaxed space-y-1">
                  <p className="font-semibold text-foreground/70">
                    {lang === 'el' ? '⚖️ Νομική Σημείωση' : '⚖️ Legal Notice'}
                  </p>
                  {lang === 'el' ? (
                    <p>
                      Η εφαρμογή αναζητά και εμφανίζει αποκλειστικά στοιχεία επιχειρήσεων και επαγγελματιών
                      τα οποία είναι <strong>δημοσίως διαθέσιμα</strong> σε επαγγελματικούς καταλόγους
                      και δημόσιες βάσεις δεδομένων. Τα στοιχεία αυτά έχουν καταχωρηθεί εθελοντικά από
                      τους ίδιους τους επαγγελματίες/επιχειρήσεις για σκοπούς επαγγελματικής προβολής.
                      Η εταιρεία δεν φέρει ευθύνη για την ακρίβεια ή πληρότητα των πληροφοριών. Η χρήση
                      των δεδομένων πρέπει να συμμορφώνεται με τον Κανονισμό GDPR (ΕΕ 2016/679) και την
                      ισχύουσα ελληνική νομοθεσία περί προστασίας προσωπικών δεδομένων.
                    </p>
                  ) : (
                    <p>
                      This application retrieves and displays only information about businesses and
                      professionals that is <strong>publicly available</strong> in professional directories
                      and public databases. This information has been voluntarily submitted by the
                      professionals/businesses themselves for the purpose of commercial visibility.
                      The company accepts no responsibility for the accuracy or completeness of the
                      information. Use of this data must comply with GDPR Regulation (EU 2016/679)
                      and applicable Greek personal data protection legislation.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {results && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-accent" /> {t.results}
                    </h2>
                    <Badge variant="outline" className="border-accent text-accent">
                      {allLeads.length} {lang === 'el' ? 'Αποτελέσματα' : 'Results'}
                    </Badge>
                    {(results.topLeadsMode || topLeadsAccess) && (
                      <Badge className="bg-amber-500 text-white gap-1 font-bold">
                        <Trophy className="h-3 w-3" />
                        {lang === 'el' ? 'Κορυφαίες Επαφές' : 'Top Leads'}
                      </Badge>
                    )}
                    {selectedIds.size > 0 && (
                      <Badge className="bg-primary text-primary-foreground">
                        {selectedIds.size} {lang === 'el' ? 'Επιλεγμένα' : 'Selected'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none h-9 text-xs"
                      onClick={toggleSelectPage}
                    >
                      {paginated
                        .map((lead, relIdx) => ({ lead, id: ((safePage - 1) * PAGE_SIZE + relIdx).toString() }))
                        .filter(({ lead }) => !lead.alreadyInCRM)
                        .every(({ id }) => selectedIds.has(id) || addedIds.has(id)) ? (
                        <><CheckSquare className="mr-1.5 h-3.5 w-3.5" /> {t.deselectPage}</>
                      ) : (
                        <><Square className="mr-1.5 h-3.5 w-3.5" /> {t.selectPage}</>
                      )}
                    </Button>
                    <Button
                      className="flex-1 sm:flex-none h-9 bg-primary hover:bg-primary/90 font-bold gap-2"
                      onClick={handleAddSelected}
                      disabled={selectedIds.size === 0}
                    >
                      <CopyPlus className="h-4 w-4" />
                      {t.addSelected}{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground italic">{results.summary}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {paginated.map((lead, relIdx) => {
                    const absIdx = (safePage - 1) * PAGE_SIZE + relIdx
                    const idxStr = absIdx.toString()
                    const isAdded = addedIds.has(idxStr)
                    const isSelected = selectedIds.has(idxStr)
                    const isDup = !!lead.alreadyInCRM
                    const leadPhones = lead.phones ?? [lead.phone]
                    const isMobile = leadPhones.some(ph => /^(\+30)?69\d{8}$/.test(ph.replace(/\s/g, '')))
                    return (
                      <Card
                        key={absIdx}
                        className={cn(
                          "transition-all group overflow-hidden border-l-4",
                          isDup ? "border-l-muted-foreground/30 opacity-70" :
                          isAdded ? "border-l-green-500 opacity-60" :
                          isSelected ? "border-l-primary border-primary/50 bg-primary/5 shadow-md" :
                          "border-l-accent hover:border-primary"
                        )}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {!isAdded && !isDup && (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    setSelectedIds(prev => {
                                      const next = new Set(prev)
                                      if (checked) next.add(idxStr)
                                      else next.delete(idxStr)
                                      return next
                                    })
                                  }}
                                  className="shrink-0"
                                />
                              )}
                              <CardTitle className="text-base font-bold truncate group-hover:text-primary transition-colors">{lead.name}</CardTitle>
                            </div>
                            <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                              {isDup && (
                                <Badge variant="outline" className="text-[9px] px-1.5 text-muted-foreground border-muted-foreground/40">
                                  {lang === 'el' ? 'Ήδη στο CRM' : 'Already in CRM'}
                                </Badge>
                              )}
                              {topLeadsAccess && lead.rating !== undefined && lead.reviewCount !== undefined && lead.rating >= 4.5 && lead.reviewCount >= 90 && (
                                <Badge className="text-[9px] bg-amber-500 text-white px-1.5 gap-0.5 font-bold">
                                  <Star className="h-2.5 w-2.5 fill-white" />{lead.rating.toFixed(1)}
                                </Badge>
                              )}
                              {isMobile && (
                                <Badge className="text-[9px] bg-green-500 text-white px-1.5">Mobile</Badge>
                              )}
                              <Badge variant="secondary" className="text-[9px] uppercase font-black">{lead.source}</Badge>
                            </div>
                          </div>
                          <CardDescription className="text-[11px] flex items-center gap-1 font-bold text-primary">
                            <Briefcase className="h-3 w-3" /> {lead.profile}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex flex-col gap-1">
                            {leadPhones.map((ph, phIdx) => (
                              <div key={phIdx} className="flex items-center gap-2 text-sm font-bold text-accent">
                                <Phone className="h-4 w-4 shrink-0" /> {ph}
                              </div>
                            ))}
                            {lead.email && (
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <Mail className="h-3 w-3" /> {lead.email}
                              </div>
                            )}
                            {topLeadsAccess && lead.rating !== undefined && (
                              <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                                <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                {lead.rating.toFixed(1)}
                                {lead.reviewCount !== undefined && (
                                  <span className="text-muted-foreground">({lead.reviewCount} {lang === 'el' ? 'κριτικές' : 'reviews'})</span>
                                )}
                              </div>
                            )}
                            {isDup && (
                              <p className="text-[11px] text-muted-foreground italic pt-1">
                                {lang === 'el' ? `Υπάρχει ήδη στο CRM ως: ${lead.alreadyInCRM!.name}` : `Already saved in your CRM as: ${lead.alreadyInCRM!.name}`}
                              </p>
                            )}
                          </div>
                          <Separator className="bg-muted/50" />
                          {isDup ? (
                            <Link href={`/contacts/details?id=${lead.alreadyInCRM!.id}`}>
                              <Button variant="outline" className="w-full gap-2 h-11">
                                <ExternalLink className="h-4 w-4" /> {lang === 'el' ? 'Άνοιγμα στο CRM' : 'Open in CRM'}
                              </Button>
                            </Link>
                          ) : (
                            <Button
                              className={cn(
                                "w-full gap-2 h-11",
                                isAdded ? "bg-green-500 hover:bg-green-500" : ""
                              )}
                              onClick={() => handleAddToCRM(lead, absIdx)}
                              disabled={isAdded}
                            >
                              {isAdded ? (
                                <><CheckCircle2 className="h-4 w-4" /> {t.added}</>
                              ) : (
                                <><Plus className="h-4 w-4" /> {t.addToCrm}</>
                              )}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-2 pt-2 flex-wrap">
                    <Button variant="outline" size="sm" className="h-10 w-10 p-0" disabled={safePage === 1}
                      onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo(0, 0) }}>
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
                            className="h-10 w-10 p-0 text-xs" onClick={() => { setPage(item as number); window.scrollTo(0, 0) }}>{item}</Button>
                      )}
                    <Button variant="outline" size="sm" className="h-10 w-10 p-0" disabled={safePage === totalPages}
                      onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo(0, 0) }}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    {pageJumpActive ? (
                      <form
                        className="flex items-center gap-1"
                        onSubmit={(e) => {
                          e.preventDefault()
                          const n = parseInt(pageJumpValue)
                          if (!isNaN(n) && n >= 1 && n <= totalPages) { setPage(n); window.scrollTo(0, 0) }
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
              </div>
            )}

            {!results && !isLoading && (
              <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed rounded-xl bg-muted/10 opacity-60">
                <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">
                  {lang === 'el' ? 'Έτοιμο για αναζήτηση επενδυτών' : 'Ready for investor search'}
                </h3>
                <p className="text-sm text-center max-w-sm mt-2 text-muted-foreground">
                  {lang === 'el'
                    ? 'Επιλέξτε επενδυτικό προφίλ ή πληκτρολογήστε ειδικότητα. Χωρίς περιοχή → αναζητά σε όλη την Ελλάδα.'
                    : 'Select an investor profile or type a specialty. No location → searches all of Greece.'}
                </p>
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
