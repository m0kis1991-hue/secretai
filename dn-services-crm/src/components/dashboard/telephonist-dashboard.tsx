"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles, CheckCircle2, Target, CalendarDays, RefreshCcw, ArrowRight, Clock, UserPlus, Phone, Trophy, Mail, TrendingUp, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import { getDailyPersonalizedPlan, DailyPlanOutput } from "@/ai/flows/daily-personalized-plan-flow"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { logCallKeepAlive } from "@/lib/call-log"

type Props = { name: string; userId: string; lang: 'el' | 'en'; showLeaderboard?: boolean }

type Contact = {
  id: string; name: string; phone: string; status: string
  next_action_date?: string; next_action_time?: string; priorityScore: number; jobTitle?: string; industry?: string
}

type LeaderEntry   = { telephonist_id: string; telephonist_name: string; salesCount: number }
type CallEntry     = { contact_id: string; contact_name: string; called_at: string }
type EmailEntry    = { contact_id: string; contact_name: string; sent_at: string; email_type: string }

const todayISO = new Date().toISOString().slice(0, 10)
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

// Phone can be stored as plain string OR JSON array (e.g. '["6912345678","2101234567"]')
function firstPhone(raw: string): string {
  if (!raw) return ''
  if (raw.startsWith('[')) {
    try { const a = JSON.parse(raw); return Array.isArray(a) && a[0] ? String(a[0]) : raw } catch {}
  }
  return raw
}

export function TelephonistDashboard({ name, userId, lang, showLeaderboard = false }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [plan, setPlan] = useState<DailyPlanOutput | null>(null)
  const [isPlanLoading, setIsPlanLoading] = useState(true)
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([])
  const [followUpExpanded, setFollowUpExpanded] = useState(true)
  const [upcomingShowAll, setUpcomingShowAll] = useState(false)
  // Cached JWT for keepalive call-log writes — must be available synchronously at click time so
  // logging a call never delays the tel: navigation that has to fire in the same user gesture.
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => setAccessToken(session?.access_token ?? null))
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null)
    })
    return () => { authSub.subscription.unsubscribe() }
  }, [])

  // Quick-dial buttons here previously just used a bare `<a href="tel:...">`, which fires the
  // call but never logs it — the telephonist's own "calls today" stat and admin's dashboard both
  // read from call_logs, so those calls were invisible everywhere despite genuinely happening.
  const handleQuickCall = (c: Contact) => {
    const phone = firstPhone(c.phone)
    if (!phone) return
    window.location.href = `tel:${phone}`
    logCallKeepAlive({
      accessToken,
      telephonistId: userId,
      telephonistName: name,
      contactId: c.id,
      contactName: c.name,
      calledAt: new Date().toISOString(),
    })
  }

  // ── Performance stats ────────────────────────────────────────────────────
  const [callsToday, setCallsToday]           = useState(0)
  const [callsWeek, setCallsWeek]             = useState(0)
  const [callsTodayDetail, setCallsTodayDetail] = useState<CallEntry[]>([])
  const [callsWeekDetail, setCallsWeekDetail]  = useState<CallEntry[]>([])
  const [emailsToday, setEmailsToday]         = useState(0)
  const [emailsWeek, setEmailsWeek]           = useState(0)
  const [emailsDetail, setEmailsDetail]       = useState<EmailEntry[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('contacts')
      .select('id, name, phone, status, next_action_date, next_action_time, priority_score, job_title, industry')
      .or(`owner_id.eq.${userId},created_by.eq.${userId}`)
      .then(({ data }) => {
        if (data) {
          const mapped: Contact[] = data.map(r => ({
            id: r.id,
            name: r.name ?? '',
            phone: r.phone ?? '',
            status: r.status ?? 'new',
            next_action_date: r.next_action_date ?? undefined,
            next_action_time: r.next_action_time ? String(r.next_action_time).slice(0, 5) : undefined,
            priorityScore: r.priority_score ?? 50,
            jobTitle: r.job_title ?? undefined,
            industry: r.industry ?? undefined,
          }))
          setContacts(mapped)
          generatePlan(mapped, false)
        } else {
          generatePlan([], false)
        }
      })
  }, [userId])

  useEffect(() => {
    if (!showLeaderboard) return
    const supabase = createClient()
    supabase.from('sales_logs')
      .select('telephonist_id, telephonist_name')
      .gte('logged_at', monthStart)
      .then(({ data }) => {
        if (!data) return
        const counts: Record<string, { name: string; count: number }> = {}
        for (const row of data) {
          const id = row.telephonist_id
          if (!id) continue
          if (!counts[id]) counts[id] = { name: row.telephonist_name ?? '—', count: 0 }
          counts[id].count++
        }
        const sorted = Object.entries(counts)
          .map(([id, v]) => ({ telephonist_id: id, telephonist_name: v.name, salesCount: v.count }))
          .sort((a, b) => b.salesCount - a.salesCount)
          .slice(0, 3)
        setLeaderboard(sorted)
      })
  }, [showLeaderboard])

  useEffect(() => {
    const supabase = createClient()
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    Promise.all([
      supabase.from('call_logs')
        .select('contact_id, contact_name, called_at')
        .eq('telephonist_id', userId)
        .gte('called_at', weekAgo)
        .order('called_at', { ascending: false }),
      supabase.from('email_logs')
        .select('contact_id, contact_name, sent_at, email_type')
        .eq('telephonist_id', userId)
        .gte('sent_at', weekAgo)
        .order('sent_at', { ascending: false }),
    ]).then(([callsRes, emailsRes]) => {
      const rawCalls = callsRes.data ?? []
      // Deduplicate: keep most recent call per contact
      const seen = new Map<string, any>()
      let noIdIdx = 0
      for (const c of rawCalls) {
        const key = c.contact_id ? String(c.contact_id) : `__noid_${noIdIdx++}`
        if (!seen.has(key)) seen.set(key, c)
      }
      const deduped = Array.from(seen.values()) as CallEntry[]

      const todayCalls  = deduped.filter(c => c.called_at.startsWith(todayISO))
      const weekCalls   = deduped

      setCallsToday(todayCalls.length)
      setCallsWeek(weekCalls.length)
      setCallsTodayDetail(todayCalls)
      setCallsWeekDetail(weekCalls)

      const rawEmails = (emailsRes.data ?? []) as EmailEntry[]
      setEmailsToday(rawEmails.filter(e => e.sent_at.startsWith(todayISO)).length)
      setEmailsWeek(rawEmails.length)
      setEmailsDetail(rawEmails)
    })
  }, [userId])

  const isLikely = (s: string) => s === 'likely_sale' || s === 'likely_antisale' || s === 'probable'

  const generatePlan = async (c: Contact[], force = false) => {
    const cacheKey = `daily-plan-tel-${userId}-${todayISO}`
    if (!force) {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try { setPlan(JSON.parse(cached)); setIsPlanLoading(false); return } catch {}
      }
    }
    setIsPlanLoading(true)
    try {
      const result = await getDailyPersonalizedPlan({
        userName: name,
        role: 'telephonist',
        stats: {
          newLeads: c.filter(x => x.status === 'new').length,
          unclosedLeads: c.filter(x => isLikely(x.status)).length,
          followUpsToday: c.filter(x => x.next_action_date === todayISO && x.status !== 'bought').length,
        },
        language: lang,
      })
      setPlan(result)
      localStorage.setItem(cacheKey, JSON.stringify(result))
    } catch {
      // default message via flow's catch block
    } finally {
      setIsPlanLoading(false)
    }
  }

  const newLeads = contacts
    .filter(c => c.status === 'new')
    .sort((a, b) => b.priorityScore - a.priorityScore)

  const unclosedLeads = contacts
    .filter(c => isLikely(c.status))
    .sort((a, b) => b.priorityScore - a.priorityScore)

  const activeStatuses = (c: Contact) => c.status !== 'bought' && c.status !== 'not_buying'

  const followUpsOverdue = contacts
    .filter(c => c.next_action_date && c.next_action_date < todayISO && activeStatuses(c))
    .sort((a, b) => (a.next_action_date ?? '').localeCompare(b.next_action_date ?? ''))

  const followUpsToday = contacts
    .filter(c => c.next_action_date === todayISO && activeStatuses(c))
    .sort((a, b) => (a.next_action_time ?? '99:99').localeCompare(b.next_action_time ?? '99:99'))

  const followUpsUpcoming = contacts
    .filter(c => c.next_action_date && c.next_action_date > todayISO && activeStatuses(c))
    .sort((a, b) => {
      const dateComp = (a.next_action_date ?? '').localeCompare(b.next_action_date ?? '')
      if (dateComp !== 0) return dateComp
      return (a.next_action_time ?? '99:99').localeCompare(b.next_action_time ?? '99:99')
    })

  const totalFollowUps = followUpsOverdue.length + followUpsToday.length + followUpsUpcoming.length

  // Group upcoming by date
  const upcomingByDate = followUpsUpcoming.reduce<Record<string, Contact[]>>((acc, c) => {
    const d = c.next_action_date!
    if (!acc[d]) acc[d] = []
    acc[d].push(c)
    return acc
  }, {})

  const formatDate = (iso: string) => {
    const d = new Date(iso + 'T00:00:00')
    const diffDays = Math.round((d.getTime() - new Date(todayISO + 'T00:00:00').getTime()) / 86400000)
    if (diffDays === 1) return lang === 'el' ? 'Αύριο' : 'Tomorrow'
    if (diffDays <= 7) return d.toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
    return d.toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const noAnswerLeads = contacts
    .filter(c => c.status === 'no_answer')
    .sort((a, b) => b.priorityScore - a.priorityScore)

  const closedCount = contacts.filter(c => c.status === 'bought').length

  const today = new Date().toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">
          {lang === 'el' ? `Καλημέρα, ${name}!` : `Good morning, ${name}!`}
        </h2>
        <p className="text-muted-foreground capitalize">{today}</p>
      </div>

      {/* KPI Cards — no monetary values */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">{lang === 'el' ? 'Νέες Επαφές' : 'New Leads'}</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{newLeads.length}</div>
          </CardContent>
        </Card>
        <Card className={cn("border-l-4 cursor-pointer", followUpsOverdue.length > 0 ? "border-l-red-500" : followUpsToday.length > 0 ? "border-l-amber-500" : "border-l-amber-300")}
          onClick={() => setFollowUpExpanded(v => !v)}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">{lang === 'el' ? 'Follow-ups' : 'Follow-ups'}</span>
            </div>
            <div className={cn("text-2xl font-bold", followUpsOverdue.length > 0 ? "text-red-500" : totalFollowUps > 0 ? "text-amber-500" : "")}>
              {totalFollowUps}
            </div>
            {followUpsOverdue.length > 0 && (
              <p className="text-[10px] text-red-500 font-medium mt-0.5">{followUpsOverdue.length} {lang === 'el' ? 'καθυστερ.' : 'overdue'}</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-400">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">{lang === 'el' ? 'Ενδιαφερόμενοι' : 'Interested'}</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{unclosedLeads.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">{lang === 'el' ? 'Έκλεισαν' : 'Closed'}</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{closedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Follow-up Ταμπλό ─────────────────────────────────────────────────── */}
      {totalFollowUps > 0 && (
        <Card className={cn("border-2", followUpsOverdue.length > 0 ? "border-red-300 dark:border-red-700" : "border-amber-300 dark:border-amber-700")}>
          <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setFollowUpExpanded(v => !v)}>
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <CalendarDays className={cn("h-5 w-5 shrink-0", followUpsOverdue.length > 0 ? "text-red-500" : "text-amber-500")} />
                <span>{lang === 'el' ? 'Ταμπλό Follow-ups' : 'Follow-up Board'}</span>
                <div className="flex items-center gap-1">
                  {followUpsOverdue.length > 0 && (
                    <Badge className="bg-red-500 text-white text-[10px] px-1.5">{followUpsOverdue.length} {lang === 'el' ? 'καθυστ.' : 'overdue'}</Badge>
                  )}
                  {followUpsToday.length > 0 && (
                    <Badge className="bg-amber-500 text-white text-[10px] px-1.5">{followUpsToday.length} {lang === 'el' ? 'σήμερα' : 'today'}</Badge>
                  )}
                  {followUpsUpcoming.length > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5">{followUpsUpcoming.length} {lang === 'el' ? 'επερχ.' : 'upcoming'}</Badge>
                  )}
                </div>
              </div>
              {followUpExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
            </CardTitle>
          </CardHeader>

          {followUpExpanded && (
            <CardContent className="pt-0 px-0 pb-2">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground px-4 py-2 w-[40%]">
                        {lang === 'el' ? 'Επαφή' : 'Contact'}
                      </th>
                      <th className="text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground px-3 py-2">
                        {lang === 'el' ? 'Ημερομηνία' : 'Date'}
                      </th>
                      <th className="text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground px-3 py-2 w-16">
                        {lang === 'el' ? 'Ώρα' : 'Time'}
                      </th>
                      <th className="text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground px-3 py-2 w-20">
                        {lang === 'el' ? 'Κλήση' : 'Call'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {/* Overdue rows */}
                    {followUpsOverdue.map(c => (
                      <tr key={c.id} className="bg-red-50/40 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/contacts/details?id=${c.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                            <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-xs font-bold text-red-700 dark:text-red-400 shrink-0">
                              {c.name[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate leading-tight">{c.name}</p>
                              {c.jobTitle && <p className="text-[11px] text-muted-foreground truncate">{c.jobTitle}</p>}
                            </div>
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            <span className="text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">{formatDate(c.next_action_date!)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs font-mono text-muted-foreground">{c.next_action_time || '—'}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {c.phone ? (
                            <Button size="sm" className="h-9 w-9 p-0 bg-green-500 hover:bg-green-600 text-white rounded-full" onClick={() => handleQuickCall(c)}>
                              <Phone className="h-4 w-4" />
                            </Button>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                      </tr>
                    ))}

                    {/* Today rows */}
                    {followUpsToday.map(c => (
                      <tr key={c.id} className="bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/contacts/details?id=${c.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                            <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-400 shrink-0">
                              {c.name[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate leading-tight">{c.name}</p>
                              {c.jobTitle && <p className="text-[11px] text-muted-foreground truncate">{c.jobTitle}</p>}
                            </div>
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 text-[10px] font-semibold whitespace-nowrap">
                            {lang === 'el' ? 'Σήμερα' : 'Today'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs font-mono text-amber-600 dark:text-amber-400">{c.next_action_time || '—'}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {c.phone ? (
                            <Button size="sm" className="h-9 w-9 p-0 bg-green-500 hover:bg-green-600 text-white rounded-full" onClick={() => handleQuickCall(c)}>
                              <Phone className="h-4 w-4" />
                            </Button>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                      </tr>
                    ))}

                    {/* Upcoming rows */}
                    {(upcomingShowAll ? followUpsUpcoming : followUpsUpcoming.slice(0, 10)).map(c => (
                      <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/contacts/details?id=${c.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-400 shrink-0">
                              {c.name[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate leading-tight">{c.name}</p>
                              {c.jobTitle && <p className="text-[11px] text-muted-foreground truncate">{c.jobTitle}</p>}
                            </div>
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">{formatDate(c.next_action_date!)}</span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs font-mono text-muted-foreground">{c.next_action_time || '—'}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {c.phone ? (
                            <Button size="sm" variant="outline" className="h-9 w-9 p-0 text-green-600 border-green-300 hover:bg-green-50 rounded-full" onClick={() => handleQuickCall(c)}>
                              <Phone className="h-4 w-4" />
                            </Button>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {followUpsUpcoming.length > 10 && (
                <div className="px-4 pt-2">
                  <Button variant="ghost" size="sm" className="w-full text-xs h-8 text-blue-600"
                    onClick={() => setUpcomingShowAll(v => !v)}>
                    {upcomingShowAll
                      ? (lang === 'el' ? 'Λιγότερα' : 'Show less')
                      : (lang === 'el' ? `+${followUpsUpcoming.length - 10} ακόμα επερχόμενα` : `+${followUpsUpcoming.length - 10} more upcoming`)}
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Performance Stats ─────────────────────────────────────────────────── */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
            <TrendingUp className="h-4 w-4 text-primary" />
            {lang === 'el' ? 'Απόδοση & Δραστηριότητα' : 'Performance & Activity'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mini KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Phone className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] text-muted-foreground uppercase font-bold">
                  {lang === 'el' ? 'Κλήσεις σήμερα' : 'Calls today'}
                </span>
              </div>
              <div className={cn("text-2xl font-black", callsToday >= 10 ? "text-green-600" : callsToday >= 5 ? "text-amber-500" : "text-foreground")}>
                {callsToday}
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Phone className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-[10px] text-muted-foreground uppercase font-bold">
                  {lang === 'el' ? 'Κλήσεις εβδομάδα' : 'Calls this week'}
                </span>
              </div>
              <div className="text-2xl font-black text-blue-600">{callsWeek}</div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Mail className="h-3.5 w-3.5 text-violet-500" />
                <span className="text-[10px] text-muted-foreground uppercase font-bold">
                  {lang === 'el' ? 'Email σήμερα' : 'Emails today'}
                </span>
              </div>
              <div className={cn("text-2xl font-black", emailsToday > 0 ? "text-violet-600" : "text-muted-foreground/50")}>
                {emailsToday}
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Mail className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-[10px] text-muted-foreground uppercase font-bold">
                  {lang === 'el' ? 'Email εβδομάδα' : 'Emails this week'}
                </span>
              </div>
              <div className={cn("text-2xl font-black", emailsWeek > 0 ? "text-violet-500" : "text-muted-foreground/50")}>
                {emailsWeek}
              </div>
            </div>
          </div>

          {/* Call history today */}
          {callsTodayDetail.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> {lang === 'el' ? 'Κλήσεις σήμερα — Ώρα & Επαφή' : "Today's Calls — Time & Contact"}
              </p>
              <div className="divide-y rounded-lg border overflow-hidden">
                {callsTodayDetail.slice(0, 8).map((c, i) => {
                  const time = c.called_at ? new Date(c.called_at).toLocaleTimeString(lang === 'el' ? 'el-GR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'
                  return (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 bg-background hover:bg-muted/40 transition-colors">
                      <span className="text-xs font-mono text-muted-foreground w-10 shrink-0">{time}</span>
                      {c.contact_id ? (
                        <Link href={`/contacts/details?id=${c.contact_id}`} className="flex-1 min-w-0 flex items-center gap-1.5 hover:text-primary transition-colors">
                          <Phone className="h-3 w-3 shrink-0 text-primary" />
                          <span className="text-sm truncate font-medium">{c.contact_name || '—'}</span>
                          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground ml-auto" />
                        </Link>
                      ) : (
                        <span className="flex-1 text-sm text-muted-foreground truncate">{c.contact_name || '—'}</span>
                      )}
                    </div>
                  )
                })}
                {callsTodayDetail.length > 8 && (
                  <div className="px-3 py-2 text-center text-xs text-muted-foreground bg-muted/20">
                    +{callsTodayDetail.length - 8} {lang === 'el' ? 'ακόμα σήμερα' : 'more today'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Emails sent this week */}
          {emailsDetail.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> {lang === 'el' ? 'Email που στάλθηκαν (εβδομάδα)' : 'Emails sent (this week)'}
              </p>
              <div className="divide-y rounded-lg border overflow-hidden">
                {emailsDetail.slice(0, 5).map((e, i) => {
                  const when = e.sent_at ? new Date(e.sent_at).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
                  return (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 bg-background hover:bg-muted/40 transition-colors">
                      <span className="text-[10px] font-mono text-muted-foreground w-24 shrink-0">{when}</span>
                      {e.contact_id ? (
                        <Link href={`/contacts/details?id=${e.contact_id}`} className="flex-1 min-w-0 flex items-center gap-1.5 hover:text-primary transition-colors">
                          <Mail className="h-3 w-3 shrink-0 text-violet-500" />
                          <span className="text-sm truncate font-medium">{e.contact_name || '—'}</span>
                          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground ml-auto" />
                        </Link>
                      ) : (
                        <span className="flex-1 text-sm text-muted-foreground truncate">{e.contact_name || '—'}</span>
                      )}
                    </div>
                  )
                })}
                {emailsDetail.length > 5 && (
                  <div className="px-3 py-2 text-center text-xs text-muted-foreground bg-muted/20">
                    +{emailsDetail.length - 5} {lang === 'el' ? 'ακόμα' : 'more'}
                  </div>
                )}
              </div>
            </div>
          )}

          {callsToday === 0 && callsWeek === 0 && emailsWeek === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              {lang === 'el' ? 'Δεν υπάρχει δραστηριότητα αυτή την εβδομάδα ακόμα.' : 'No activity recorded this week yet.'}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Lead sections */}
        <div className="lg:col-span-2 space-y-4">

          {/* New Leads — potential investors not yet contacted */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-blue-500" />
                {lang === 'el' ? `Νέοι Επενδυτές προς Επικοινωνία (${newLeads.length})` : `New Leads to Contact (${newLeads.length})`}
              </CardTitle>
              <Link href="/contacts">
                <Button variant="outline" size="sm" className="text-xs h-7">
                  {lang === 'el' ? 'Όλες οι Επαφές' : 'All Contacts'}
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {newLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {lang === 'el' ? 'Δεν υπάρχουν νέες επαφές.' : 'No new leads.'}
                </p>
              ) : newLeads.slice(0, 5).map(c => (
                <Link key={c.id} href={`/contacts/details?id=${c.id}`}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                      {c.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.jobTitle || c.phone}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">{c.priorityScore}/100</Badge>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
              {newLeads.length > 5 && (
                <Link href="/contacts">
                  <p className="text-xs text-center text-muted-foreground pt-1 hover:text-primary cursor-pointer">
                    {lang === 'el' ? `+${newLeads.length - 5} ακόμα` : `+${newLeads.length - 5} more`}
                  </p>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Unclosed Leads — interested but haven't committed */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-500" />
                {lang === 'el' ? `Ενδιαφερόμενοι χωρίς Συμφωνία (${unclosedLeads.length})` : `Interested — No Deal Yet (${unclosedLeads.length})`}
              </CardTitle>
              <Link href="/contacts">
                <Button variant="outline" size="sm" className="text-xs h-7">
                  {lang === 'el' ? 'Όλες' : 'All'}
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {unclosedLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {lang === 'el' ? 'Δεν υπάρχουν ανοιχτές επαφές.' : 'No open leads.'}
                </p>
              ) : unclosedLeads.slice(0, 5).map(c => (
                <Link key={c.id} href={`/contacts/details?id=${c.id}`}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors">
                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700 shrink-0">
                      {c.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.jobTitle || c.phone}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge className={cn(
                        "text-[10px] h-4 px-1",
                        c.status === 'probable'      ? "bg-teal-500 text-white" :
                        c.status === 'likely_sale'   ? "bg-amber-500 text-white" :
                        "bg-amber-800 text-white"
                      )}>
                        {c.status === 'probable' ? 'Πιθανός' : c.status === 'likely_sale' ? 'Sale' : 'Antisale'}
                      </Badge>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
              {unclosedLeads.length > 5 && (
                <Link href="/contacts">
                  <p className="text-xs text-center text-muted-foreground pt-1 hover:text-primary cursor-pointer">
                    {lang === 'el' ? `+${unclosedLeads.length - 5} ακόμα` : `+${unclosedLeads.length - 5} more`}
                  </p>
                </Link>
              )}
            </CardContent>
          </Card>
          {/* No Answer Leads */}
          {noAnswerLeads.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/40 dark:bg-orange-950/20">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <Phone className="h-4 w-4" />
                  {lang === 'el' ? `Δεν Απάντησε — Επανακλήση (${noAnswerLeads.length})` : `No Answer — Call Back (${noAnswerLeads.length})`}
                </CardTitle>
                <Link href="/contacts">
                  <Button variant="outline" size="sm" className="text-xs h-7 border-orange-300 text-orange-700 hover:bg-orange-100">
                    {lang === 'el' ? 'Όλες' : 'All'}
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-2">
                {noAnswerLeads.slice(0, 4).map(c => (
                  <Link key={c.id} href={`/contacts/details?id=${c.id}`}>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-background hover:bg-muted/60 cursor-pointer border transition-colors">
                      <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-700 shrink-0">
                        {c.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.jobTitle || c.phone}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                    </div>
                  </Link>
                ))}
                {noAnswerLeads.length > 4 && (
                  <Link href="/contacts">
                    <p className="text-xs text-center text-muted-foreground pt-1 hover:text-primary cursor-pointer">
                      {lang === 'el' ? `+${noAnswerLeads.length - 4} ακόμα` : `+${noAnswerLeads.length - 4} more`}
                    </p>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Leaderboard (optional) + AI Coach */}
        <div className="space-y-4">
          {showLeaderboard && leaderboard.length > 0 && (
            <Card className="border-amber-300 bg-amber-50/40 dark:bg-amber-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Trophy className="h-4 w-4" />
                  {lang === 'el' ? 'Top 3 Τηλεφωνητές (μήνας)' : 'Top 3 This Month'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {leaderboard.map((entry, i) => {
                  const isMe = entry.telephonist_id === userId
                  const medals = ['🥇', '🥈', '🥉']
                  return (
                    <div key={entry.telephonist_id} className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm",
                      isMe ? "bg-amber-200/60 dark:bg-amber-800/40 font-semibold" : "bg-background"
                    )}>
                      <span className="text-base w-5 shrink-0">{medals[i]}</span>
                      <span className="flex-1 truncate">{isMe ? (lang === 'el' ? 'Εσύ' : 'You') : entry.telephonist_name}</span>
                      <Badge className="bg-amber-500 text-white text-[10px] h-4 px-1.5">{entry.salesCount}</Badge>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
          <Card className="bg-primary/5 border-primary/20 sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
                <Sparkles className="h-4 w-4 text-accent" /> Business Coach
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isPlanLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                  {lang === 'el' ? 'Δημιουργία πλάνου...' : 'Generating plan...'}
                </div>
              ) : plan ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium leading-relaxed">{plan.personalizedTip}</p>
                  <div className="space-y-2 border-t pt-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {lang === 'el' ? 'Πλάνο Ημέρας' : 'Daily Plan'}
                    </h4>
                    {plan.planItems.map((item, i) => (
                      <div key={i} className="flex gap-2 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost" size="sm" className="w-full text-xs h-7"
                    onClick={() => generatePlan(contacts, true)} disabled={isPlanLoading}
                  >
                    <RefreshCcw className="h-3 w-3 mr-1" />
                    {lang === 'el' ? 'Ανανέωση' : 'Refresh'}
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full text-xs h-9" onClick={() => generatePlan(contacts)}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {lang === 'el' ? 'Φόρτωση Πλάνου' : 'Load Plan'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
