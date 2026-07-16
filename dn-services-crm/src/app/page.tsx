
"use client"

import { CRMSidebar } from "@/components/layout/crm-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  Users as UsersIcon,
  CheckCircle2,
  DollarSign,
  Target,
  Sparkles,
  Lightbulb,
  ArrowUpRight,
  RefreshCcw,
  Zap,
  Phone,
  Mail,
  Calendar as CalendarIcon,
  CalendarDays,
  Award,
  BookOpen,
  Eye,
  ArrowRight,
  History,
  Maximize2,
  Filter,
  Globe,
  Star,
  Clock,
  Briefcase,
  AlertCircle,
} from "lucide-react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line
} from "recharts"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useState, useMemo, useEffect, useRef } from "react"
import { Contact } from "./lib/types"
import { isAdmin, STATUS } from "./lib/constants"
import { getCompanyInsights, CompanyInsightsOutput } from "@/ai/flows/company-analytics-flow"
import { analyzeTelephonistPerformance, TelephonistAnalysisOutput } from "@/ai/flows/telephonist-analysis-flow"
import { getDailyPersonalizedPlan, DailyPlanOutput } from "@/ai/flows/daily-personalized-plan-flow"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { TelephonistDashboard } from "@/components/dashboard/telephonist-dashboard"
import { format } from "date-fns"
import { el, enUS } from "date-fns/locale"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))']

type TelephonistStat = {
  id: string
  name: string
  ownedContacts: number
  byStatus: { new: number; canva: number; probable: number; bought: number; not_buying: number; no_answer: number; likely_sale: number; likely_antisale: number; another_time: number; email: number; left: number; return: number }
  callsToday: number
  callsWeek: number
  callsDetail: Array<{ contact_id: string; contact_name: string; called_at: string }>
  callsTodayDetail: Array<{ contact_id: string; contact_name: string; called_at: string }>
  emailsToday: number
  emailsWeek: number
  emailsDetail: Array<{ contact_id: string; contact_name: string; sent_at: string; email_type: string }>
  followUpsToday: number
  followUpsNext7: Array<{ id: string; name: string; date: string; time: string }>
  totalSales: number
  salesDetail: Array<{ contact_id: string; contact_name: string; amount: number; logged_at: string }>
  contactsList: Array<{ id: string; name: string; status: string; lastContacted?: string | null }>
  conversionRate: number
}

const detailedHistoryData = [
  { date: '01/11', sales: 45000, leads: 12, conversion: 12.5, success: 3 },
  { date: '05/11', sales: 52000, leads: 15, conversion: 13.1, success: 4 },
  { date: '10/11', sales: 48000, leads: 14, conversion: 11.8, success: 3 },
  { date: '15/11', sales: 65000, leads: 22, conversion: 14.2, success: 5 },
  { date: '20/11', sales: 72000, leads: 25, conversion: 15.5, success: 6 },
  { date: '25/11', sales: 85000, leads: 30, conversion: 16.2, success: 8 },
  { date: '30/11', sales: 95000, leads: 35, conversion: 17.1, success: 10 },
]

function fmtLocalDateTime(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('el-GR', {
    timeZone: 'Europe/Athens',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function DashboardPage() {
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const [lang, setLang] = useState<'el' | 'en'>('el')
  const [dashboardLayout, setDashboardLayout] = useState<any[]>([])
  const [dailyPlan, setDailyPlan] = useState<DailyPlanOutput | null>(null)
  const [isPlanLoading, setIsPlanLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<{ id: string; name: string; role: string; show_leaderboard?: boolean } | null>(null)
  const testIdsRef = useRef<string[]>([])

  useEffect(() => {
    const savedLang = localStorage.getItem('app-lang') as 'el' | 'en'
    if (savedLang) setLang(savedLang)

    // Load real auth user — daily plan loads after profile resolves
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user
      if (!user) return
      const { data } = await supabase.from('profiles').select('id, name, role, show_leaderboard').eq('id', user.id).single()
      if (!data) return
      setUserProfile(data)
      if (data.role !== 'superadmin') {
        const TEST_EMAILS = ['m0kis1991@gmail.com', 'm0kis@hotmail.com']
        const { data: testProfiles } = await supabase.from('profiles').select('id').in('email', TEST_EMAILS)
        testIdsRef.current = (testProfiles ?? []).map((p: any) => p.id)
      }
    })

    const savedLayout = localStorage.getItem('dashboard-layout')
    if (savedLayout) {
      setDashboardLayout(JSON.parse(savedLayout))
    } else {
      setDashboardLayout([
        { id: 'dailyPlan', titleEl: 'Πλάνο Ημέρας', titleEn: 'Daily Plan', visible: true },
        { id: 'topLeads', titleEl: 'Κορυφαία Leads', titleEn: 'Top Leads', visible: true },
        { id: 'strategicTips', titleEl: 'Συμβουλές Στρατηγικής', titleEn: 'Strategic Tips', visible: true },
        { id: 'statsCards', titleEl: 'Κάρτες Στατιστικών', titleEn: 'Statistic Cards', visible: true },
        { id: 'companyGrowth', titleEl: 'Εξέλιξη Εταιρίας', titleEn: 'Company Growth', visible: true },
        { id: 'teamPerformance', titleEl: 'Απόδοση Ομάδας', titleEn: 'Team Performance', visible: true },
        { id: 'leadDistribution', titleEl: 'Κατανομή Leads', titleEn: 'Lead Distribution', visible: true },
      ])
    }
  }, [])

  const loadDailyPlan = async (force = false) => {
    if (!userProfile || !isAdmin(userProfile.role)) return
    const today = new Date().toISOString().slice(0, 10)
    const cacheKey = `daily-plan-admin-${userProfile.id}-${today}`
    if (!force) {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try { setDailyPlan(JSON.parse(cached)); setIsPlanLoading(false); return } catch {}
      }
    }
    setIsPlanLoading(true)
    try {
      const plan = await getDailyPersonalizedPlan({
        userName: userProfile.name,
        role: 'admin',
        stats: {
          totalSales: telephonistStats.reduce((s, t) => s + t.totalSales, 0),
          totalLeads: allContacts.length,
          likelyToBuy: allContacts.filter(c => c.status === 'likely_sale' || c.status === 'likely_antisale').length,
          conversionRate: allContacts.length > 0 ? Math.round((allContacts.filter(c => c.status === 'bought').length / allContacts.length) * 1000) / 10 : 0,
          teamPerformance: telephonistStats.map(t => ({ name: t.name, sales: t.totalSales, leads: t.ownedContacts })),
        },
        language: lang,
      })
      setDailyPlan(plan)
      localStorage.setItem(cacheKey, JSON.stringify(plan))
    } catch (err) {
      console.error('Failed to load daily plan', err)
    } finally {
      setIsPlanLoading(false)
    }
  }

  // Load daily plan with real user info once profile is available
  useEffect(() => {
    loadDailyPlan(false)
  }, [userProfile?.id])

  const t = {
    title: lang === 'el' ? 'Admin Dashboard' : 'Admin Dashboard',
    stratTips: lang === 'el' ? 'Συμβουλές Στρατηγικής' : 'Strategic Tips',
    analyzing: lang === 'el' ? 'Ανάλυση...' : 'Analyzing...',
    liveData: lang === 'el' ? 'Live Δεδομένα' : 'Live Data',
    topLeads: lang === 'el' ? 'Κορυφαία Leads' : 'Top Leads',
    priorityScore: lang === 'el' ? 'Σκορ Προτεραιότητας' : 'Priority Score',
    viewAllContacts: lang === 'el' ? 'Προβολή όλων των επαφών' : 'View all contacts',
    smartSummary: lang === 'el' ? 'Έξυπνη Σύνοψη Απόδοσης' : 'Smart Performance Summary',
    growthFocus: lang === 'el' ? 'Εστίαση Ανάπτυξης' : 'Growth Focus',
    adminTips: lang === 'el' ? 'Συμβουλές Διαχειριστή' : 'Admin Tips',
    sectorAnalysis: lang === 'el' ? 'Έξυπνη Ανάλυση Κλάδων' : 'Smart Sector Analysis',
    totalSales: lang === 'el' ? 'Συνολικά Έσοδα' : 'Total Revenue',
    activeLeads: lang === 'el' ? 'Ενεργά Leads' : 'Active Leads',
    convRate: lang === 'el' ? 'Ποσοστό Μετατροπής' : 'Conversion Rate',
    successSales: lang === 'el' ? 'Επιτυχείς Πωλήσεις' : 'Successful Sales',
    teamPerf: lang === 'el' ? 'Απόδοση Ομάδας' : 'Team Performance',
    teamPerfDesc: lang === 'el' ? 'Πατήστε πάνω σε έναν τηλεφωνητή για ανάλυση και ιστορικό.' : 'Click on a telephonist for analysis and history.',
    leadDist: lang === 'el' ? 'Κατανομή Leads' : 'Lead Distribution',
    dailyPlan: lang === 'el' ? 'Πλάνο Ημέρας & Έξυπνη Συμβουλή' : 'Daily Plan & Smart Tip',
  }

  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiInsights, setAiInsights] = useState<CompanyInsightsOutput | null>(null)
  const [dailyCallStats, setDailyCallStats] = useState<{ name: string; count: number }[]>([])
  const [realPerformanceData, setRealPerformanceData] = useState<{ name: string; sales: number; leads: number; id?: string; topLeadsAccess?: boolean }[]>([])
  const [performancePeriod, setPerformancePeriod] = useState("month")
  const [selectedStat, setSelectedStat] = useState<string | null>(null)
  const [selectedTelephonist, setSelectedTelephonist] = useState<any | null>(null)
  const [telephonistAnalysis, setTelephonistAnalysis] = useState<TelephonistAnalysisOutput | null>(null)
  const [isTelAnalysisLoading, setIsTelAnalysisLoading] = useState(false)
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [selectedPieSlice, setSelectedPieSlice] = useState<{ name: string; status: string; color: string } | null>(null)
  const [allFollowUps, setAllFollowUps] = useState<Array<{ id: string; name: string; phone: string; next_action_date: string; next_action_time?: string; ownerName: string; status: string }>>([])
  const [followUpSheetOpen, setFollowUpSheetOpen] = useState(false)
  const [telephonistStats, setTelephonistStats] = useState<TelephonistStat[]>([])
  const [growthData, setGrowthData] = useState<{ date: string; fullDate: string; dailyRevenue: number; cumRevenue: number; dailyLeads: number }[]>([])
  const [growthPeriod, setGrowthPeriod] = useState<'7D' | '30D' | '90D' | 'All'>('30D')
  const [statsRefreshKey, setStatsRefreshKey] = useState(0)
  const [lastStatsRefresh, setLastStatsRefresh] = useState<Date | null>(null)
  const [telDetailView, setTelDetailView] = useState<'sales' | 'contacts' | 'callsToday' | 'statusDetail' | null>(null)
  const [telStatusDetailKey, setTelStatusDetailKey] = useState<string | null>(null)
  const [statusDetailPeriod, setStatusDetailPeriod] = useState<'today' | '7d' | '30d' | 'custom' | 'all'>('all')
  const [statusDetailFrom, setStatusDetailFrom] = useState<string>('')
  const [statusDetailTo, setStatusDetailTo] = useState<string>('')

  useEffect(() => {
    const fetchStats = async () => {
      const sc = createClient()
      const today = new Date().toISOString().slice(0, 10)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

      const testIds = testIdsRef.current
      const isTest = (id: string) => testIds.includes(id)

      const [profilesRes, statsRpc, trophyStatsRpc, callsRes, salesRes, emailsRes] = await Promise.all([
        sc.from('profiles').select('id, name, role, top_leads_access').in('role', ['telephonist', 'admin']),
        sc.rpc('get_telephonist_contact_stats'),   // aggregated — no row-limit issue
        sc.rpc('get_trophy_telephonist_stats'),    // trophy telephonists write to trophy_contact_sessions, not contacts
        sc.from('call_logs').select('telephonist_id, telephonist_name, contact_id, contact_name, called_at').gte('called_at', weekAgo),
        sc.from('sales_logs').select('telephonist_id, telephonist_name, amount, contact_id, contact_name, logged_at').order('logged_at', { ascending: false }).limit(2000),
        sc.from('email_logs').select('telephonist_id, contact_id, contact_name, email_type, sent_at').gte('sent_at', weekAgo),
      ])

      const profiles = (profilesRes.data ?? [])
        .filter((p: any) => p.role !== 'superadmin')
        .filter((p: any) => testIds.length === 0 || !testIds.includes(p.id))

      // Build per-owner status maps from aggregated RPC result
      type UpcomingAction = { id: string; name: string; date: string; time: string }
      type StatRow = { owner_id: string; status: string; cnt: number; next_action_today: number; upcoming_actions: UpcomingAction[] | null }
      const statRows: StatRow[] = (statsRpc.data ?? []).filter((r: any) => !isTest(r.owner_id))
      const ownerStatusMap = new Map<string, Map<string, StatRow>>()
      for (const row of statRows) {
        if (!ownerStatusMap.has(row.owner_id)) ownerStatusMap.set(row.owner_id, new Map())
        ownerStatusMap.get(row.owner_id)!.set(row.status, row)
      }
      // Trophy telephonists write status to trophy_contact_sessions, never to contacts — use separate map
      const trophyStatRows: StatRow[] = (trophyStatsRpc.data ?? []).filter((r: any) => !isTest(r.owner_id))
      const trophyOwnerStatusMap = new Map<string, Map<string, StatRow>>()
      for (const row of trophyStatRows) {
        if (!trophyOwnerStatusMap.has(row.owner_id)) trophyOwnerStatusMap.set(row.owner_id, new Map())
        trophyOwnerStatusMap.get(row.owner_id)!.set(row.status, row)
      }

      const calls = (callsRes.data ?? []).filter((c: any) => !isTest(c.telephonist_id))
      const sales = (salesRes.data ?? []).filter((s: any) => !isTest(s.telephonist_id))
      const emails = (emailsRes.data ?? []).filter((e: any) => !isTest(e.telephonist_id))

      const stats: TelephonistStat[] = profiles.map((p: any) => {
        // Trophy telephonists: all their work is in trophy_contact_sessions, not contacts
        const statusMap = p.top_leads_access
          ? (trophyOwnerStatusMap.get(p.id) ?? new Map<string, StatRow>())
          : (ownerStatusMap.get(p.id) ?? new Map<string, StatRow>())
        const cnt = (s: string) => Number(statusMap.get(s)?.cnt ?? 0)
        const byStatus = {
          new: cnt('new'), canva: cnt('canva'), probable: cnt('probable'),
          likely_sale: cnt('likely_sale'), likely_antisale: cnt('likely_antisale'),
          another_time: cnt('another_time'),
          email: cnt('email'),
          bought: cnt('bought'), not_buying: cnt('not_buying'), no_answer: cnt('no_answer'),
          left: cnt('left'), return: cnt('return'),
        }
        const ownedContacts = Array.from(statusMap.values()).reduce((s, r) => s + Number(r.cnt), 0)
        const followUpsToday = Array.from(statusMap.values()).reduce((s, r) => s + Number(r.next_action_today), 0)
        const seen = new Set<string>()
        const followUpsNext7 = Array.from(statusMap.values())
          .flatMap(r => r.upcoming_actions ?? [])
          .filter(a => a?.id && !seen.has(a.id) && seen.add(a.id))
          .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time || '').localeCompare(b.time || ''))

        const pCalls = calls.filter((c: any) => c.telephonist_id === p.id)
        const pSales = sales.filter((s: any) => s.telephonist_id === p.id)
        const pEmails = emails.filter((e: any) => e.telephonist_id === p.id)
        const callsDeduped = (() => {
          const seen = new Map<string, any>()
          let noIdIdx = 0
          for (const c of [...pCalls].sort((a: any, b: any) => (b.called_at ?? '').localeCompare(a.called_at ?? ''))) {
            const key = c.contact_id ? String(c.contact_id) : `__noid_${noIdIdx++}`
            if (!seen.has(key)) seen.set(key, c)
          }
          return Array.from(seen.values())
        })()
        const callsDetail = [...callsDeduped]
          .sort((a: any, b: any) => (b.called_at ?? '').localeCompare(a.called_at ?? ''))
          .map((c: any) => ({ contact_id: c.contact_id || '', contact_name: c.contact_name || '—', called_at: c.called_at || '' }))
        const emailsDetail = [...pEmails]
          .sort((a: any, b: any) => b.sent_at.localeCompare(a.sent_at))
          .map((e: any) => ({ contact_id: e.contact_id || '', contact_name: e.contact_name || '—', sent_at: e.sent_at || '', email_type: e.email_type || 'follow_up' }))
        const totalSales = pSales.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0)
        const salesDetail = pSales.map((s: any) => ({
          contact_id: s.contact_id || '', contact_name: s.contact_name || '—',
          amount: Number(s.amount || 0), logged_at: s.logged_at || '',
        }))
        const callsTodayDetail = pCalls
          .filter((c: any) => (c.called_at ?? '').startsWith(today))
          .sort((a: any, b: any) => (b.called_at ?? '').localeCompare(a.called_at ?? ''))
          .map((c: any) => ({ contact_id: c.contact_id || '', contact_name: c.contact_name || '—', called_at: c.called_at || '' }))
        return {
          id: p.id, name: p.name, ownedContacts, byStatus,
          topLeadsAccess: p.top_leads_access ?? false,
          callsToday: (() => {
            const todayCalls = pCalls.filter((c: any) => (c.called_at ?? '').startsWith(today))
            const withId = new Set(todayCalls.filter((c: any) => c.contact_id).map((c: any) => String(c.contact_id)))
            const withoutId = todayCalls.filter((c: any) => !c.contact_id).length
            return withId.size + withoutId
          })(),
          callsWeek: callsDeduped.length, callsDetail, callsTodayDetail,
          emailsToday: pEmails.filter((e: any) => (e.sent_at ?? '').startsWith(today)).length,
          emailsWeek: pEmails.length, emailsDetail,
          followUpsToday, followUpsNext7,
          totalSales, salesDetail,
          contactsList: [],   // loaded lazily via RPC when admin drills down
          conversionRate: ownedContacts > 0 ? Math.round((byStatus.bought / ownedContacts) * 100) : 0,
        }
      }).sort((a, b) => b.totalSales - a.totalSales || b.callsWeek - a.callsWeek)

      setTelephonistStats(stats)

      // Feed the bar chart with real data
      const perfData = stats.filter(s => s.totalSales > 0 || s.callsWeek > 0)
        .map(s => ({ name: s.name, sales: s.totalSales, leads: s.byStatus.bought, id: s.id, topLeadsAccess: s.topLeadsAccess ?? false }))
      if (perfData.length > 0) setRealPerformanceData(perfData)

      // Keep dailyCallStats for any remaining references — unique contacts per telephonist
      const dayContactSets: Record<string, Set<string>> = {}
      calls.filter((c: any) => (c.called_at ?? '').startsWith(today)).forEach((c: any) => {
        const n = c.telephonist_name || 'Άγνωστος'
        if (!dayContactSets[n]) dayContactSets[n] = new Set()
        dayContactSets[n].add(c.contact_id)
      })
      setDailyCallStats(Object.entries(dayContactSets).map(([name, set]) => ({ name, count: set.size })).sort((a, b) => b.count - a.count))
      setLastStatsRefresh(new Date())
    }
    fetchStats()
    const interval = setInterval(fetchStats, 120_000)
    return () => clearInterval(interval)
  }, [statsRefreshKey])

  // Admin: subscribe to trophy_contact_sessions — when any trophy telephonist changes a status,
  // trigger a debounced stats refresh so the admin sees the update within ~5 seconds.
  useEffect(() => {
    if (!userProfile || !isAdmin(userProfile.role)) return
    const supabase = createClient()
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const channel = supabase
      .channel('admin-trophy-realtime-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trophy_contact_sessions' }, () => {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => setStatsRefreshKey(k => k + 1), 5_000)
      })
      .subscribe()
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      supabase.removeChannel(channel)
    }
  }, [userProfile])

  useEffect(() => {
    const sc = createClient()
    const run = async () => {
      try {
        // Run auth + all queries in parallel — no sequential waterfall
        const [sessRes, contactsRes, salesRes, testRes, trophySessionsRes] = await Promise.all([
          sc.auth.getSession(),
          // Direct lean query — uses covering index (Index Only Scan, no heap IO).
          // RLS contacts_select = true so no RPC needed; selecting only used columns.
          sc.from('contacts')
            .select('id, name, status, priority_score, job_title, next_action_date, owner_id, created_by, created_at')
            .order('priority_score', { ascending: false })
            .range(0, 9999),
          sc.from('sales_logs').select('amount, logged_at, telephonist_id').order('logged_at', { ascending: true }).limit(5000),
          sc.from('profiles').select('id').in('email', ['m0kis1991@gmail.com', 'm0kis@hotmail.com']),
          // Trophy telephonists write status to trophy_contact_sessions — overlay onto pie chart
          sc.from('trophy_contact_sessions').select('contact_id, status, updated_at').order('updated_at', { ascending: false }),
        ])

        const testIds = (testRes.data ?? []).map((p: any) => p.id)
        const isTest = (id: string) => testIds.includes(id)
        const contactsRaw = contactsRes.data
        const salesRaw = salesRes.data

        // Build contact_id → most-recent trophy session status (rows are already ordered desc by updated_at)
        const trophyStatusOverlay = new Map<string, string>()
        for (const ts of (trophySessionsRes.data ?? [])) {
          if (ts.contact_id && ts.status && !trophyStatusOverlay.has(ts.contact_id)) {
            trophyStatusOverlay.set(ts.contact_id, ts.status)
          }
        }

        const contacts = (contactsRaw ?? []).filter((c: any) => !isTest(c.owner_id) && !isTest(c.created_by))
        setAllContacts(contacts.map((r: any) => ({
          id: r.id, name: r.name ?? '', phone: r.phone ?? '', email: '',
          observations: '', investmentAmount: 0, ownerId: null, lastContacted: '',
          // Overlay trophy session status: trophy telephonists never write to contacts.status
          status: trophyStatusOverlay.get(r.id) ?? r.status ?? 'new',
          priorityScore: r.priority_score ?? 50,
          jobTitle: r.job_title ?? undefined, nextActionDate: r.next_action_date ?? undefined,
        })))

        const sales = (salesRaw ?? []).filter((s: any) => !isTest(s.telephonist_id))
        if (contacts.length === 0 && sales.length === 0) return

        const salesByDay: Record<string, number> = {}
        sales.forEach((s: any) => {
          const d = (s.logged_at ?? '').slice(0, 10)
          if (d) salesByDay[d] = (salesByDay[d] ?? 0) + Number(s.amount || 0)
        })
        const leadsByDay: Record<string, number> = {}
        contacts.forEach((c: any) => {
          const d = (c.created_at ?? '').slice(0, 10)
          if (d) leadsByDay[d] = (leadsByDay[d] ?? 0) + 1
        })

        const allDays = new Set([...Object.keys(salesByDay), ...Object.keys(leadsByDay)])
        if (allDays.size === 0) return
        const firstDay = [...allDays].sort()[0]
        const today = new Date().toISOString().slice(0, 10)

        const points: typeof growthData = []
        const cursor = new Date(firstDay)
        const end = new Date(today)
        let cum = 0
        while (cursor <= end) {
          const fd = cursor.toISOString().slice(0, 10)
          const daily = salesByDay[fd] ?? 0
          cum += daily
          const dd = cursor.getDate().toString().padStart(2, '0')
          const mm = (cursor.getMonth() + 1).toString().padStart(2, '0')
          points.push({ date: `${dd}/${mm}`, fullDate: fd, dailyRevenue: daily, cumRevenue: cum, dailyLeads: leadsByDay[fd] ?? 0 })
          cursor.setDate(cursor.getDate() + 1)
        }
        setGrowthData(points)
      } catch {
        setAllContacts([])
      }
    }
    run()
  }, [])

  useEffect(() => {
    const sc = createClient()
    Promise.all([
      sc.from('contacts')
        .select('id, name, phone, next_action_date, next_action_time, status, owner_id, profiles!owner_id(name)')
        .not('next_action_date', 'is', null)
        .not('status', 'in', '(bought,not_buying)')
        .order('next_action_date', { ascending: true })
        .limit(300),
      // Trophy telephonists store their follow-up date/time on trophy_contact_sessions,
      // not on the contacts row (pool leads keep contacts.status = 'new'), so those
      // follow-ups are invisible to the query above unless merged in separately.
      sc.from('trophy_contact_sessions')
        .select('contact_id, next_action_date, next_action_time, status, owner_id, updated_at')
        .not('next_action_date', 'is', null)
        .not('status', 'in', '(bought,not_buying)')
        .order('updated_at', { ascending: false })
        .limit(300),
    ]).then(async ([{ data }, { data: sessionRows }]) => {
      const base = (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name ?? '',
        phone: r.phone ?? '',
        next_action_date: r.next_action_date,
        next_action_time: r.next_action_time ? String(r.next_action_time).slice(0, 5) : undefined,
        ownerName: r.profiles?.name ?? '—',
        status: r.status ?? 'new',
      }))

      const seenIds = new Set(base.map(f => f.id))
      const latestSession = new Map<string, any>()
      for (const s of sessionRows ?? []) {
        if (!seenIds.has(s.contact_id) && !latestSession.has(s.contact_id)) latestSession.set(s.contact_id, s)
      }

      let sessionFollowUps: typeof base = []
      if (latestSession.size > 0) {
        const ids = [...latestSession.keys()]
        const ownerIds = [...new Set([...latestSession.values()].map(s => s.owner_id).filter(Boolean))]
        const [{ data: contactInfo }, { data: ownerInfo }] = await Promise.all([
          sc.from('contacts').select('id, name, phone').in('id', ids),
          ownerIds.length > 0 ? sc.from('profiles').select('id, name').in('id', ownerIds) : Promise.resolve({ data: [] as any[] }),
        ])
        const contactMap = new Map((contactInfo ?? []).map((c: any) => [c.id, c]))
        const ownerMap = new Map((ownerInfo ?? []).map((o: any) => [o.id, o.name]))
        sessionFollowUps = ids.map(id => {
          const s = latestSession.get(id)
          const c = contactMap.get(id)
          return {
            id,
            name: c?.name ?? '',
            phone: c?.phone ?? '',
            next_action_date: s.next_action_date,
            next_action_time: s.next_action_time ? String(s.next_action_time).slice(0, 5) : undefined,
            ownerName: ownerMap.get(s.owner_id) ?? '—',
            status: s.status ?? 'new',
          }
        })
      }

      setAllFollowUps([...base, ...sessionFollowUps].sort((a, b) => a.next_action_date.localeCompare(b.next_action_date)))
    })
  }, [])


  const PIE_SLICES = useMemo(() => [
    { status: 'bought',          nameEl: 'Αγόρασε',            nameEn: 'Bought',        color: COLORS[0] },
    { status: 'canva',           nameEl: 'Canva',              nameEn: 'Canva',         color: '#8b5cf6' },
    { status: 'probable',        nameEl: 'Πιθανός',            nameEn: 'Probable',      color: '#0d9488' },
    { status: 'likely_sale',     nameEl: 'Sale',               nameEn: 'Sale',          color: '#d97706' },
    { status: 'likely_antisale', nameEl: 'Antisale',           nameEn: 'Antisale',      color: '#92400e' },
    { status: 'another_time',    nameEl: 'Άλλη Στιγμή',        nameEn: 'Another Time',  color: '#6366f1' },
    { status: 'email',           nameEl: 'Email',              nameEn: 'Email',         color: '#0891b2' },
    { status: 'new',             nameEl: 'Νέοι',               nameEn: 'New',           color: COLORS[2] },
    { status: 'not_buying',      nameEl: 'Δεν Ενδιαφέρονται', nameEn: 'Not Interested', color: COLORS[3] },
    { status: 'no_answer',       nameEl: 'Δεν Απάντησε',       nameEn: 'No Answer',     color: '#f97316' },
    { status: 'left',            nameEl: 'Έφυγαν',             nameEn: 'Left',          color: '#64748b' },
    { status: 'return',          nameEl: 'Επιστροφή',          nameEn: 'Return',        color: '#06b6d4' },
  ], [])

  const pieData = useMemo(() =>
    PIE_SLICES
      .map(s => ({ ...s, name: lang === 'el' ? s.nameEl : s.nameEn, value: allContacts.filter(c => c.status === s.status).length }))
      .filter(d => d.value > 0),
  [allContacts, lang, PIE_SLICES])

  const sliceContacts = useMemo(() =>
    selectedPieSlice ? allContacts.filter(c => c.status === selectedPieSlice.status).sort((a, b) => b.priorityScore - a.priorityScore) : [],
  [selectedPieSlice, allContacts])

  const highPriorityLeads = useMemo(() =>
    [...allContacts]
      .filter(c => c.status !== 'bought')
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 3),
  [allContacts])

  const performanceData = useMemo(() => {
    return realPerformanceData
  }, [realPerformanceData])

  const filteredGrowthData = useMemo(() => {
    if (growthPeriod === 'All') return growthData
    const days = growthPeriod === '7D' ? 7 : growthPeriod === '30D' ? 30 : 90
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
    return growthData.filter(d => d.fullDate >= cutoff)
  }, [growthData, growthPeriod])

  const growthStats = useMemo(() => {
    if (filteredGrowthData.length === 0) return { current: 0, change: 0, absChange: 0, isPositive: true }
    const first = filteredGrowthData[0].cumRevenue
    const last = filteredGrowthData[filteredGrowthData.length - 1].cumRevenue
    const absChange = last - first
    const change = first > 0 ? (absChange / first) * 100 : (last > 0 ? 100 : 0)
    return { current: last, change, absChange, isPositive: absChange >= 0 }
  }, [filteredGrowthData])

  const handleSelectTelephonist = async (member: any, initialStatusKey?: string) => {
    setTelephonistAnalysis(null)
    setSelectedTelephonist({ ...member, contactsListLoading: true })
    setTelStatusDetailKey(initialStatusKey ?? null)
    setTelDetailView(initialStatusKey ? 'statusDetail' : null)
    setStatusDetailPeriod('all')
    setStatusDetailFrom('')
    setStatusDetailTo('')

    // Lazy-load individual contacts for drill-down
    if (member.id) {
      if (member.topLeadsAccess) {
        // Trophy telephonists: status + date live in trophy_contact_sessions, not contacts table
        const sc = createClient()
        sc.from('trophy_contact_sessions')
          .select('contact_id, status, updated_at')
          .eq('owner_id', member.id)
          .order('updated_at', { ascending: false })
          .then(async ({ data: sessions }) => {
            if (!sessions?.length) {
              setSelectedTelephonist((prev: any) => prev ? { ...prev, contactsList: [], contactsListLoading: false } : prev)
              return
            }
            const contactIds = [...new Set(sessions.map((s: any) => s.contact_id))]
            const { data: contactsData } = await sc.from('contacts').select('id, name').in('id', contactIds)
            const nameMap = new Map((contactsData ?? []).map((c: any) => [c.id, c.name ?? '']))
            const seen = new Set<string>()
            const contactsList = sessions
              .filter((s: any) => { if (seen.has(s.contact_id)) return false; seen.add(s.contact_id); return true })
              .map((s: any) => ({
                id: s.contact_id,
                name: nameMap.get(s.contact_id) ?? '',
                status: s.status ?? 'new',
                lastContacted: s.updated_at ? s.updated_at.slice(0, 10) : null,
              }))
            setSelectedTelephonist((prev: any) => prev ? { ...prev, contactsList, contactsListLoading: false } : prev)
          })
      } else {
        createClient().rpc('get_contacts_for_owner', { p_owner_id: member.id }).then(({ data }) => {
          const contactsList = (data as any[] ?? []).map((c: any) => ({
            id: c.id, name: c.name ?? '', status: c.status ?? 'new',
            lastContacted: c.last_contacted ?? null,
          }))
          setSelectedTelephonist((prev: any) => prev ? { ...prev, contactsList, contactsListLoading: false } : prev)
        })
      }
    }

    const today = new Date().toISOString().slice(0, 10)
    const cacheKey = `tel-analysis-${member.name}-${today}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try { setTelephonistAnalysis(JSON.parse(cached)); return } catch {}
    }

    setIsTelAnalysisLoading(true)
    try {
      const convRate = member.leads > 0 ? Math.round((member.sales / member.leads / 1000) * 10) / 10 : 0
      const result = await analyzeTelephonistPerformance({
        name: member.name,
        sales: member.sales,
        leads: member.leads,
        conversionRate: convRate,
        period: lang === 'el' ? 'Τελευταίος μήνας' : 'Last month',
        language: lang,
      })
      setTelephonistAnalysis(result)
      try { localStorage.setItem(cacheKey, JSON.stringify(result)) } catch {}
    } catch {
      // silently fail, dialog still shows raw stats
    } finally {
      setIsTelAnalysisLoading(false)
    }
  }

  const handleGenerateInsights = async () => {
    setIsAiLoading(true)
    try {
      const professions = allContacts.map(c => c.jobTitle || '').filter(Boolean).join(', ') || 'Επαγγελματίες'
      const realTotalSales = telephonistStats.reduce((s, t) => s + t.totalSales, 0)
      const insights = await getCompanyInsights({
        totalSales: realTotalSales,
        totalLeads: allContacts.length,
        likelyToBuy: allContacts.filter(c => c.status === 'likely_sale' || c.status === 'likely_antisale').length,
        conversionRate: allContacts.length > 0 ? Math.round((allContacts.filter(c => c.status === 'bought').length / allContacts.length) * 1000) / 10 : 0,
        teamPerformance: telephonistStats.map(t => ({ name: t.name, sales: t.totalSales, leads: t.ownedContacts })),
        contactDataSummary: professions,
        language: lang,
      })
      setAiInsights(insights)
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load insights." })
    } finally {
      setIsAiLoading(false)
    }
  }

  const renderDashboardSections = () => {
    return dashboardLayout
      .filter(section => section.visible)
      .map(section => {
        switch (section.id) {
          case 'dailyPlan':
            // Business Coach hidden for admin/superadmin
            return null
          case 'dailyPlan_unused':
            return (
              <Card key="dailyPlan" className="lg:col-span-2 border-accent/20 bg-accent/5 overflow-hidden">
                <CardHeader className="pb-2 bg-accent/10">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="h-5 w-5 text-accent fill-accent" /> {t.dailyPlan}
                    </CardTitle>
                    <Button
                      variant="ghost" size="sm" className="h-7 text-xs gap-1"
                      onClick={() => loadDailyPlan(true)}
                      disabled={isPlanLoading}
                    >
                      <RefreshCcw className={`h-3 w-3 ${isPlanLoading ? 'animate-spin' : ''}`} />
                      {lang === 'el' ? 'Ανανέωση' : 'Refresh'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {isPlanLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground"><RefreshCcw className="h-4 w-4 animate-spin" /> {lang === 'el' ? 'Δημιουργία πλάνου...' : 'Generating plan...'}</div>
                  ) : dailyPlan ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h3 className="text-base font-bold text-primary">{dailyPlan.greeting}</h3>
                        <p className="text-sm italic border-l-2 border-accent pl-3 text-muted-foreground">{dailyPlan.personalizedTip}</p>
                      </div>
                      <div className="bg-card/50 p-3 rounded-lg border">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {lang === 'el' ? 'ΠΡΟΤΕΙΝΟΜΕΝΕΣ ΕΝΕΡΓΕΙΕΣ' : 'SUGGESTED ACTIONS'}
                        </h4>
                        <ul className="space-y-2">
                          {dailyPlan.planItems.map((item, idx) => (
                            <li key={idx} className="text-xs flex gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )
          case 'topLeads': {
            const todayISO = new Date().toISOString().slice(0, 10)
            const fuOverdue = allFollowUps.filter(f => f.next_action_date < todayISO)
            const fuToday   = allFollowUps.filter(f => f.next_action_date === todayISO)
            const fuUpcoming = allFollowUps.filter(f => f.next_action_date > todayISO)
            const formatFuDate = (iso: string) => {
              if (iso === todayISO) return lang === 'el' ? 'Σήμερα' : 'Today'
              if (iso < todayISO) return lang === 'el' ? 'Καθυστ.' : 'Overdue'
              const d = new Date(iso + 'T00:00:00')
              return d.toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { day: 'numeric', month: 'short' })
            }
            return (
              <div key="topLeads" className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Top Leads */}
                <Card className="border-primary/20 bg-primary/5 flex flex-col lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-primary">
                      <Zap className="h-5 w-5 fill-primary" /> {t.topLeads}
                    </CardTitle>
                    <CardDescription>{lang === 'el' ? 'Επαφές με το υψηλότερο σκορ.' : 'Contacts with high priority.'}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 flex-1">
                    {highPriorityLeads.map((lead) => (
                      <div key={lead.id} className="flex items-center justify-between p-3 bg-card rounded-lg border shadow-sm group hover:border-primary transition-colors">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">{lead.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-[10px] h-4 px-1">{lead.priorityScore}/100</Badge>
                            <span className="text-[10px] text-muted-foreground">{lead.jobTitle || lead.phone}</span>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => router.push(`/contacts/details?id=${lead.id}`)}>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* All Follow-ups */}
                <Card className="border-amber-300/60 dark:border-amber-700/60 lg:col-span-2" style={{ background: 'hsl(var(--card))' }}>
                  <CardHeader className="pb-3 shrink-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <CalendarDays className="h-5 w-5" />
                          {lang === 'el' ? 'Follow-ups Ομάδας' : 'Team Follow-ups'}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {lang === 'el' ? 'Όλοι οι τηλεφωνητές' : 'All telephonists'}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        {fuOverdue.length > 0 && <Badge className="bg-red-500 text-white text-[10px] px-1.5">{fuOverdue.length} καθυστ.</Badge>}
                        {fuToday.length > 0 && <Badge className="bg-amber-500 text-white text-[10px] px-1.5">{fuToday.length} σήμερα</Badge>}
                        {fuUpcoming.length > 0 && <Badge variant="outline" className="text-[10px] px-1.5">{fuUpcoming.length} επερχ.</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4 space-y-3">
                    {allFollowUps.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">{lang === 'el' ? 'Δεν υπάρχουν προγραμματισμένα follow-ups.' : 'No scheduled follow-ups.'}</p>
                    ) : (
                      <>
                        <div className="rounded-lg border overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/40">
                                <th className="text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground px-3 py-2.5">
                                  {lang === 'el' ? 'Επαφή' : 'Contact'}
                                </th>
                                <th className="text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground px-2 py-2.5 w-[110px]">
                                  {lang === 'el' ? 'Ημ/νία' : 'Date'}
                                </th>
                                <th className="text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground px-2 py-2.5">
                                  {lang === 'el' ? 'Τηλεφωνητής' : 'Agent'}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {allFollowUps.slice(0, 6).map(f => (
                                <tr key={f.id}
                                  className={`hover:bg-muted/40 transition-colors cursor-pointer ${f.next_action_date < todayISO ? 'bg-red-50/40 dark:bg-red-950/20' : f.next_action_date === todayISO ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}`}
                                  onClick={() => router.push(`/contacts/details?id=${f.id}`)}>
                                  <td className="px-3 py-2.5">
                                    <p className="font-medium text-sm truncate max-w-[180px]">{f.name}</p>
                                  </td>
                                  <td className="px-2 py-2.5">
                                    <span className={`text-xs font-semibold whitespace-nowrap ${f.next_action_date < todayISO ? 'text-red-600 dark:text-red-400' : f.next_action_date === todayISO ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                      {formatFuDate(f.next_action_date)}
                                      {f.next_action_time ? ` ${f.next_action_time}` : ''}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2.5">
                                    <span className="text-xs text-muted-foreground truncate max-w-[110px] block">{f.ownerName}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-9 text-sm border-amber-300 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-2"
                          onClick={() => setFollowUpSheetOpen(true)}
                        >
                          <CalendarDays className="h-4 w-4" />
                          {lang === 'el' ? `Όλα τα follow-ups (${allFollowUps.length})` : `All follow-ups (${allFollowUps.length})`}
                          <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )
          }
          case 'strategicTips':
            return aiInsights && (
              <Card key="strategicTips" className="lg:col-span-full border-accent/20 bg-accent/5 animate-in fade-in slide-in-from-bottom-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-accent" /> {t.smartSummary}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">{aiInsights.performanceSummary}</p>
                    <div className="p-3 bg-card rounded-md border border-accent/20">
                      <h4 className="text-xs font-bold uppercase text-accent mb-2 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> {t.growthFocus}
                      </h4>
                      <p className="text-sm italic">{aiInsights.growthPotential}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase text-primary flex items-center gap-1"><Lightbulb className="h-3 w-3" /> {t.adminTips}</h4>
                    <ul className="space-y-2">
                      {aiInsights.strategicTips.map((tip, idx) => (
                        <li key={idx} className="text-xs flex gap-2"><ArrowUpRight className="h-3 w-3 text-primary shrink-0" /> {tip}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-3 p-4 bg-primary/10 rounded-xl border border-primary/20">
                    <h4 className="text-xs font-bold uppercase text-primary flex items-center gap-2"><Briefcase className="h-4 w-4" /> {t.sectorAnalysis}</h4>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {aiInsights.sectorAnalysis.topProfessions.map((prof, i) => (
                          <Badge key={i} className="bg-primary text-primary-foreground">{prof}</Badge>
                        ))}
                      </div>
                      <p className="text-xs leading-relaxed mt-2 text-foreground font-medium">{aiInsights.sectorAnalysis.advice}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          case 'statsCards': {
            const totalFollowUpsToday = telephonistStats.reduce((s, t) => s + t.followUpsToday, 0)
            const totalInterested = allContacts.filter(c => c.status === STATUS.LIKELY_SALE || c.status === STATUS.LIKELY_ANTISALE).length
            const totalClosed = allContacts.filter(c => c.status === STATUS.BOUGHT).length
            const totalNew = allContacts.filter(c => c.status === STATUS.NEW).length
            return (
              <div key="statsCards" className="lg:col-span-full space-y-4">
                {/* KPI row 1: activity overview */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card className="hover:shadow-lg transition-all border-l-4 border-l-blue-400">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Νέες Επαφές</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-blue-500">+{totalNew}</div></CardContent>
                  </Card>
                  <Card className="hover:shadow-lg transition-all border-l-4 border-l-orange-400">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Ακολούθηση Σήμερα</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-orange-500">{totalFollowUpsToday}</div></CardContent>
                  </Card>
                  <Card className="hover:shadow-lg transition-all border-l-4 border-l-amber-500">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Ενδιαφερόμενοι</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-amber-600">{totalInterested}</div></CardContent>
                  </Card>
                  <Card className="hover:shadow-lg transition-all border-l-4 border-l-green-500">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">Έκλεισαν</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{totalClosed}</div></CardContent>
                  </Card>
                </div>
                {/* KPI row 2: revenue & conversion */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:shadow-lg transition-all border-l-4 border-l-primary" onClick={() => setSelectedStat('sales')}>
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">{t.totalSales}</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold text-primary">€{realPerformanceData.reduce((s, r) => s + r.sales, 0).toLocaleString()}</div></CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-all border-l-4 border-l-accent" onClick={() => setSelectedStat('leads')}>
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">{t.activeLeads}</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold text-accent">+{allContacts.length}</div></CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-all border-l-4 border-l-primary" onClick={() => setSelectedStat('conversion')}>
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">{t.convRate}</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold text-primary">{allContacts.length > 0 ? (Math.round((allContacts.filter(c => c.status === 'bought').length / allContacts.length) * 1000) / 10) : 0}%</div></CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-all border-l-4 border-l-green-500" onClick={() => setSelectedStat('success')}>
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase text-muted-foreground">{t.successSales}</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold text-green-600">{allContacts.filter(c => c.status === 'bought').length}</div></CardContent>
                </Card>
                </div>
              </div>
            )
          }
          case 'companyGrowth':
            return (
              <Card key="companyGrowth" className="lg:col-span-full border-primary/20 overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        {lang === 'el' ? 'Εξέλιξη Εταιρίας' : 'Company Growth'}
                      </CardTitle>
                      <CardDescription>{lang === 'el' ? 'Σωρευτικά έσοδα — σαν γράφημα μετοχής' : 'Cumulative revenue — stock-style chart'}</CardDescription>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {(['7D', '30D', '90D', 'All'] as const).map(p => (
                        <Button key={p} size="sm" variant={growthPeriod === p ? 'default' : 'ghost'}
                          className="h-7 text-xs px-2.5" onClick={() => setGrowthPeriod(p)}>
                          {p === 'All' ? (lang === 'el' ? 'Όλα' : 'All') : p}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {/* Summary numbers */}
                  <div className="flex items-baseline gap-3 pt-1">
                    <span className="text-3xl font-bold text-primary">€{growthStats.current.toLocaleString()}</span>
                    <span className={cn('text-sm font-semibold px-1.5 py-0.5 rounded-md', growthStats.isPositive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400')}>
                      {growthStats.isPositive ? '+' : ''}{growthStats.change.toFixed(1)}%
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {growthStats.isPositive ? '+' : ''}€{growthStats.absChange.toLocaleString()} {lang === 'el' ? 'στην περίοδο' : 'in period'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="px-2 pb-4">
                  {filteredGrowthData.length < 2 ? (
                    <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                      {lang === 'el' ? 'Δεν υπάρχουν αρκετά δεδομένα πωλήσεων ακόμα.' : 'Not enough sales data yet.'}
                    </div>
                  ) : (
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredGrowthData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} minTickGap={50} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1000 ? `€${(v / 1000).toFixed(0)}k` : `€${v}`} width={48} />
                          <Tooltip
                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                            formatter={(v: any, name: any) => [`€${Number(v).toLocaleString()}`, lang === 'el' ? 'Σωρευτικά Έσοδα' : 'Cumulative Revenue']}
                            labelFormatter={(label: string) => label}
                          />
                          <Area type="monotone" dataKey="cumRevenue" stroke="hsl(var(--primary))" strokeWidth={2.5}
                            fill="url(#growthGrad)" dot={false} activeDot={{ r: 5, fill: 'hsl(var(--primary))', strokeWidth: 0 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          case 'teamPerformance':
            return (
              <Card key="teamPerformance" className="lg:col-span-3">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div><CardTitle className="text-xl">{t.teamPerf}</CardTitle><CardDescription>{t.teamPerfDesc}</CardDescription></div>
                  <div className="flex items-center gap-2">
                    {lastStatsRefresh && (
                      <span className="text-[10px] text-muted-foreground hidden sm:block">
                        {lang === 'el' ? 'Ενημ.' : 'Updated'} {lastStatsRefresh.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Athens' })}
                      </span>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" title={lang === 'el' ? 'Ανανέωση' : 'Refresh'} onClick={() => setStatsRefreshKey(k => k + 1)}>
                      <RefreshCcw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performanceData} style={{cursor:'pointer'}} onClick={(e) => { if (e?.activePayload?.[0]) { const d = e.activePayload[0].payload; handleSelectTelephonist(d) } }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                        <Tooltip formatter={(v: any) => `€${Number(v).toLocaleString()}`} />
                        <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={35} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {performanceData.map((member) => {
                      const totalSales = realPerformanceData.reduce((s, r) => s + r.sales, 0)
                      const pct = totalSales > 0 ? Math.round((member.sales / totalSales) * 100) : 0
                      return (
                        <div key={member.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors" onClick={() => handleSelectTelephonist(member)}>
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{member.name.split(' ')[0][0]}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium truncate">{member.name}</span>
                              <span className="text-xs text-muted-foreground ml-2 shrink-0">€{member.sales.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{width: `${pct}%`}} />
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0">{member.leads} leads</Badge>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          case 'leadDistribution':
            return (
              <Card key="leadDistribution" className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-xl">{t.leadDist}</CardTitle>
                  <CardDescription>{lang === 'el' ? 'Πατήστε σε ένα κομμάτι για λεπτομέρειες.' : 'Click a slice for details.'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%" cy="50%"
                          innerRadius={65} outerRadius={95}
                          paddingAngle={4}
                          dataKey="value"
                          onClick={(data) => setSelectedPieSlice({ name: data.name, status: data.status, color: data.color })}
                          style={{ cursor: 'pointer' }}
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color}
                              stroke={selectedPieSlice?.status === entry.status ? 'hsl(var(--foreground))' : 'transparent'}
                              strokeWidth={2}
                              opacity={selectedPieSlice && selectedPieSlice.status !== entry.status ? 0.5 : 1}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any, name: any) => [`${v} επαφές`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap justify-center gap-3 pt-2">
                    {pieData.map((entry) => (
                      <button
                        key={entry.status}
                        onClick={() => setSelectedPieSlice({ name: entry.name, status: entry.status, color: entry.color })}
                        className="flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity"
                      >
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
                        <span className="font-medium">{entry.name}</span>
                        <span className="text-muted-foreground">({entry.value})</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          default: return null
        }
      })
  }

  // Show loading screen while profile is being fetched — prevents admin dashboard flash for telephonists
  if (!userProfile) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <CRMSidebar />
          <SidebarInset className="flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <RefreshCcw className="h-6 w-6 animate-spin opacity-40" />
              <p className="text-sm">Φόρτωση...</p>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    )
  }

  // Telephonist sees their own performance dashboard — no €€€, no team stats
  if (userProfile.role === 'telephonist') {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full max-w-full bg-background overflow-x-hidden">
          <CRMSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
              <SidebarTrigger className="-ml-1" />
              <div className="flex-1">
                <h1 className="text-lg font-semibold text-primary">Dashboard</h1>
              </div>
            </header>
            <TelephonistDashboard name={userProfile.name} userId={userProfile.id} lang={lang} showLeaderboard={userProfile.show_leaderboard ?? false} />
          </SidebarInset>
        </div>
      </SidebarProvider>
    )
  }

  return (
    <>
    <SidebarProvider>
      <div className="flex min-h-screen w-full max-w-full bg-background overflow-x-hidden">
        <CRMSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1 overflow-hidden">
              <h1 className="text-lg font-semibold text-primary truncate">{t.title}</h1>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 border-primary text-primary h-9"
              onClick={handleGenerateInsights}
              disabled={isAiLoading}
            >
              {isAiLoading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isAiLoading ? t.analyzing : t.stratTips}
            </Button>
          </header>

          <main className="p-4 md:p-6 space-y-6 md:space-y-8 overflow-y-auto h-full">
            {/* ── Comprehensive Telephonist Statistics ──────────────────────── */}
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <UsersIcon className="h-4 w-4 text-primary" />
                    {lang === 'el' ? 'Στατιστικά Τηλεφωνητών' : 'Telephonist Statistics'}
                  </CardTitle>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />{lang === 'el' ? 'Νέοι' : 'New'}</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500 inline-block" />Canva</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-600 inline-block" />Sale</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-900 inline-block" />Anti</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-400 inline-block" />{lang === 'el' ? 'Δ.Απ.' : 'N.Ans.'}</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" />{lang === 'el' ? 'Αγόρασε' : 'Bought'}</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400 inline-block" />{lang === 'el' ? 'Όχι' : 'No'}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {telephonistStats.length === 0 ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-2">
                    <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-xs">{lang === 'el' ? 'Φόρτωση...' : 'Loading...'}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Column headers — desktop */}
                    <div className="hidden md:grid md:grid-cols-[1.8fr_1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.7fr] gap-2 text-[10px] uppercase font-bold text-muted-foreground px-3 pb-1 border-b">
                      <span>{lang === 'el' ? 'Τηλεφωνητής' : 'Telephonist'}</span>
                      <span>{lang === 'el' ? 'Επαφές & Κατάσταση' : 'Contacts & Status'}</span>
                      <span className="text-center">{lang === 'el' ? 'Κλήσεις' : 'Calls'}</span>
                      <span className="text-center">Email</span>
                      <span className="text-center">{lang === 'el' ? 'Follow-ups' : 'Follow-ups'}</span>
                      <span className="text-center">{lang === 'el' ? 'Πωλήσεις' : 'Sales'}</span>
                      <span className="text-center">Conv %</span>
                    </div>

                    {telephonistStats.map((stat, idx) => (
                      <div
                        key={stat.id}
                        className={cn(
                          "grid grid-cols-1 md:grid-cols-[1.8fr_1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.7fr] gap-2 items-center p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md",
                          idx === 0 && stat.totalSales > 0 ? "border-primary/40 bg-primary/5" : "bg-muted/20 hover:bg-muted/40"
                        )}
                        onClick={() => handleSelectTelephonist({
                          id: stat.id, name: stat.name, sales: stat.totalSales, leads: stat.ownedContacts,
                          callsToday: stat.callsToday, callsWeek: stat.callsWeek, callsDetail: stat.callsDetail,
                          callsTodayDetail: stat.callsTodayDetail,
                          emailsToday: stat.emailsToday, emailsWeek: stat.emailsWeek, emailsDetail: stat.emailsDetail,
                          followUpsNext7: stat.followUpsNext7,
                          byStatus: stat.byStatus, conversionRate: stat.conversionRate,
                          salesDetail: stat.salesDetail, contactsList: stat.contactsList,
                          topLeadsAccess: stat.topLeadsAccess ?? false,
                        })}
                        title={lang === 'el' ? 'Κλικ για AI ανάλυση & follow-ups' : 'Click for AI analysis & follow-ups'}
                      >
                        {/* Name + mobile summary */}
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                            stat.conversionRate >= 15 ? "bg-green-100 text-green-700" :
                            stat.conversionRate >= 5  ? "bg-primary/10 text-primary" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {stat.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-tight truncate">{stat.name}</p>
                            <p className="text-[10px] text-muted-foreground md:hidden">
                              {stat.callsToday} κλ. σήμ · {stat.emailsWeek > 0 ? `${stat.emailsWeek} email · ` : ''}{stat.followUpsToday > 0 ? `${stat.followUpsToday} follow-up · ` : ''}{stat.ownedContacts} επαφές · €{stat.totalSales.toLocaleString()} · {stat.conversionRate}% conv
                            </p>
                          </div>
                          {idx === 0 && stat.totalSales > 0 && (
                            <Badge className="bg-primary text-primary-foreground text-[9px] h-4 px-1.5 ml-auto md:hidden">#1</Badge>
                          )}
                        </div>

                        {/* Contacts + status dots (clickable) */}
                        <div className="hidden md:flex items-center gap-2">
                          <span className="text-sm font-bold w-6 text-right shrink-0">{stat.ownedContacts}</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(stat.topLeadsAccess ? [
                              { key: 'new',          count: stat.byStatus.new,          dot: 'bg-blue-400',   label: lang === 'el' ? 'Νέοι' : 'New',                       text: `${stat.byStatus.new}` },
                              { key: 'canva',        count: stat.byStatus.canva,        dot: 'bg-purple-500', label: 'Canva',                                              text: `${stat.byStatus.canva}` },
                              { key: 'probable',     count: stat.byStatus.probable,     dot: 'bg-teal-500',   label: lang === 'el' ? 'Πιθανός' : 'Probable',              text: `${stat.byStatus.probable}` },
                              { key: 'another_time', count: stat.byStatus.another_time, dot: 'bg-indigo-400', label: lang === 'el' ? 'Άλλη Στιγμή' : 'Another Time',      text: `${stat.byStatus.another_time}` },
                              { key: 'email',        count: stat.byStatus.email,        dot: 'bg-cyan-500',   label: 'Email',                                              text: `${stat.byStatus.email}` },
                              { key: 'bought',       count: stat.byStatus.bought,       dot: 'bg-green-500',  label: lang === 'el' ? 'Αγόρασε' : 'Bought',                text: `${stat.byStatus.bought}` },
                              { key: 'no_answer',    count: stat.byStatus.no_answer,    dot: 'bg-orange-400', label: lang === 'el' ? 'Δεν απάντησε' : 'No answer',        text: `${stat.byStatus.no_answer}` },
                              { key: 'not_buying',   count: stat.byStatus.not_buying,   dot: 'bg-red-400',    label: lang === 'el' ? 'Δεν αγοράζει' : 'Not buying',       text: `${stat.byStatus.not_buying}` },
                              { key: 'left',         count: stat.byStatus.left,         dot: 'bg-slate-500',  label: lang === 'el' ? 'Έφυγαν' : 'Left',                   text: `${stat.byStatus.left}` },
                              { key: 'return',       count: stat.byStatus.return,       dot: 'bg-cyan-500',   label: lang === 'el' ? 'Επιστροφή' : 'Return',              text: `${stat.byStatus.return}` },
                            ] : [
                              { key: 'new',             count: stat.byStatus.new,             dot: 'bg-blue-400',  label: lang === 'el' ? 'Νέοι' : 'New',                  text: `${stat.byStatus.new}` },
                              { key: 'canva',           count: stat.byStatus.canva,           dot: 'bg-purple-500',label: 'Canva',                                         text: `${stat.byStatus.canva}` },
                              { key: 'probable',        count: stat.byStatus.probable,        dot: 'bg-teal-500',  label: lang === 'el' ? 'Πιθανός' : 'Probable',          text: `${stat.byStatus.probable}` },
                              { key: 'likely_sale',     count: stat.byStatus.likely_sale,     dot: 'bg-amber-600', label: 'Sale',                                          text: `S:${stat.byStatus.likely_sale}` },
                              { key: 'likely_antisale', count: stat.byStatus.likely_antisale, dot: 'bg-amber-900', label: 'Antisale',                                      text: `A:${stat.byStatus.likely_antisale}` },
                              { key: 'bought',          count: stat.byStatus.bought,          dot: 'bg-green-500', label: lang === 'el' ? 'Αγόρασε' : 'Bought',            text: `${stat.byStatus.bought}` },
                              { key: 'no_answer',       count: stat.byStatus.no_answer,       dot: 'bg-orange-400',label: lang === 'el' ? 'Δεν απάντησε' : 'No answer',   text: `${stat.byStatus.no_answer}` },
                              { key: 'not_buying',      count: stat.byStatus.not_buying,      dot: 'bg-red-400',   label: lang === 'el' ? 'Δεν αγοράζει' : 'Not buying',  text: `${stat.byStatus.not_buying}` },
                            ]).filter(s => s.count > 0).map(({ key, dot, label, text }) => (
                              <button
                                key={key}
                                title={label}
                                className="flex items-center gap-0.5 hover:bg-muted/80 rounded px-0.5 py-0.5 transition-colors group"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSelectTelephonist({
                                    id: stat.id, name: stat.name, sales: stat.totalSales, leads: stat.ownedContacts,
                                    callsToday: stat.callsToday, callsWeek: stat.callsWeek, callsDetail: stat.callsDetail,
                                    callsTodayDetail: stat.callsTodayDetail,
                                    emailsToday: stat.emailsToday, emailsWeek: stat.emailsWeek, emailsDetail: stat.emailsDetail,
                                    followUpsNext7: stat.followUpsNext7,
                                    byStatus: stat.byStatus, conversionRate: stat.conversionRate,
                                    salesDetail: stat.salesDetail, contactsList: stat.contactsList,
                                    topLeadsAccess: stat.topLeadsAccess ?? false,
                                  }, key)
                                }}
                              >
                                <span className={`h-2 w-2 rounded-full shrink-0 ${dot} group-hover:scale-125 transition-transform`} />
                                <span className="text-[10px] text-muted-foreground">{text}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Calls today / week */}
                        <div className="hidden md:block text-center">
                          <div className={cn("text-base font-bold", stat.callsToday >= 10 ? "text-green-600" : stat.callsToday >= 5 ? "text-amber-600" : "text-foreground")}>
                            {stat.callsToday}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{stat.callsWeek} {lang === 'el' ? 'εβδ' : 'wk'}</div>
                        </div>

                        {/* Emails today / week */}
                        <div className="hidden md:block text-center">
                          <div className={cn("text-base font-bold text-blue-600", stat.emailsToday === 0 && "text-muted-foreground/50")}>
                            {stat.emailsToday}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{stat.emailsWeek} {lang === 'el' ? 'εβδ' : 'wk'}</div>
                        </div>

                        {/* Follow-ups today */}
                        <div className="hidden md:block text-center">
                          <div className={cn(
                            "text-base font-bold",
                            stat.followUpsToday > 0 ? "text-orange-500" : "text-muted-foreground/50"
                          )}>
                            {stat.followUpsToday}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{lang === 'el' ? 'σήμερα' : 'today'}</div>
                        </div>

                        {/* Total sales */}
                        <div className="hidden md:block text-center">
                          <div className="text-sm font-bold text-primary">
                            {stat.totalSales > 0 ? `€${stat.totalSales.toLocaleString()}` : '—'}
                          </div>
                        </div>

                        {/* Conversion rate */}
                        <div className="hidden md:flex justify-center">
                          <Badge className={cn("text-xs font-bold",
                            stat.conversionRate >= 15 ? "bg-green-500 text-white" :
                            stat.conversionRate >= 8  ? "bg-amber-500 text-white" :
                            stat.conversionRate > 0   ? "bg-muted text-foreground" :
                            "bg-muted/50 text-muted-foreground"
                          )}>
                            {stat.conversionRate}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Team Activity: Απόδοση & Δραστηριότητα ───────────────────── */}
            {telephonistStats.length > 0 && (
              <Card className="border-l-4 border-l-accent">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    {lang === 'el' ? 'Απόδοση & Δραστηριότητα' : 'Performance & Activity'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Phone className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">{lang === 'el' ? 'Κλήσεις Σήμερα' : 'Calls Today'}</span>
                      </div>
                      <div className="text-2xl font-bold text-primary">{telephonistStats.reduce((s, t) => s + t.callsToday, 0)}</div>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Phone className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">{lang === 'el' ? 'Κλήσεις Εβδ.' : 'Calls Week'}</span>
                      </div>
                      <div className="text-2xl font-bold text-primary">{telephonistStats.reduce((s, t) => s + t.callsWeek, 0)}</div>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Mail className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">{lang === 'el' ? 'Email Σήμερα' : 'Email Today'}</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">{telephonistStats.reduce((s, t) => s + t.emailsToday, 0)}</div>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Mail className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">{lang === 'el' ? 'Email Εβδ.' : 'Email Week'}</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">{telephonistStats.reduce((s, t) => s + t.emailsWeek, 0)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
              {renderDashboardSections()}
            </div>
          </main>
        </SidebarInset>
      </div>

      {/* ── Pie Slice Statistics Dialog ───────────────────────────────────── */}
      <Dialog open={!!selectedPieSlice} onOpenChange={(open) => { if (!open) setSelectedPieSlice(null) }}>
        <DialogContent className="max-w-lg max-h-[85dvh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ background: selectedPieSlice?.color }} />
              {selectedPieSlice?.name}
            </DialogTitle>
            <DialogDescription>
              {sliceContacts.length} {lang === 'el' ? 'επαφές στην κατηγορία' : 'contacts in this category'}
              {sliceContacts.some(c => c.investmentAmount > 0) && (
                <span className="ml-2 font-semibold text-foreground">
                  · €{sliceContacts.reduce((s, c) => s + (c.investmentAmount || 0), 0).toLocaleString()} {lang === 'el' ? 'σύνολο' : 'total'}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold">{sliceContacts.length}</div>
              <div className="text-[10px] text-muted-foreground uppercase">{lang === 'el' ? 'Επαφές' : 'Contacts'}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold">
                {allContacts.length > 0 ? Math.round((sliceContacts.length / allContacts.length) * 100) : 0}%
              </div>
              <div className="text-[10px] text-muted-foreground uppercase">{lang === 'el' ? 'Ποσοστό' : 'Share'}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold">
                {sliceContacts.length > 0 ? Math.round(sliceContacts.reduce((s, c) => s + c.priorityScore, 0) / sliceContacts.length) : 0}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase">{lang === 'el' ? 'Μέσο Σκορ' : 'Avg Score'}</div>
            </div>
          </div>

          {/* Contacts list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {sliceContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{lang === 'el' ? 'Δεν υπάρχουν επαφές.' : 'No contacts.'}</p>
            ) : sliceContacts.map(contact => (
              <div
                key={contact.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/40 cursor-pointer transition-colors"
                onClick={() => { setSelectedPieSlice(null); router.push(`/contacts/details?id=${contact.id}`) }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{contact.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{contact.phone || contact.email || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {contact.investmentAmount > 0 && (
                    <span className="text-xs font-medium text-primary">€{contact.investmentAmount.toLocaleString()}</span>
                  )}
                  <div className="flex items-center gap-1">
                    <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${contact.priorityScore}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{contact.priorityScore}%</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedTelephonist} onOpenChange={(open) => { if (!open) { setSelectedTelephonist(null); setTelephonistAnalysis(null); setTelDetailView(null); setTelStatusDetailKey(null); setStatusDetailPeriod('all'); setStatusDetailFrom(''); setStatusDetailTo('') } }}>
        <DialogContent className="max-w-lg max-h-[90dvh] flex flex-col overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              {selectedTelephonist?.name}
            </DialogTitle>
            <DialogDescription>
              {lang === 'el' ? 'Στατιστικά & Έξυπνη Ανάλυση Απόδοσης' : 'Performance Stats & Smart Analysis'}
            </DialogDescription>
          </DialogHeader>
          {selectedTelephonist && (
            <div className="space-y-4">

              {/* ── Drill-down: Status Detail ───────────────────────────────── */}
              {telDetailView === 'statusDetail' && telStatusDetailKey && (() => {
                const today = new Date().toISOString().slice(0, 10)
                const contacts: Array<{ id: string; name: string; status: string; lastContacted?: string | null }> =
                  (selectedTelephonist?.contactsList ?? []).filter((c: any) => c.status === telStatusDetailKey)

                const STATUS_META: Record<string, { label: string; colorClass: string; dotColor: string }> = {
                  new:             { label: lang === 'el' ? 'Νέοι' : 'New',              colorClass: 'text-blue-600',   dotColor: 'bg-blue-400' },
                  canva:           { label: 'Canva',                                      colorClass: 'text-purple-700', dotColor: 'bg-purple-500' },
                  likely_sale:     { label: 'Sale',                                       colorClass: 'text-amber-700',  dotColor: 'bg-amber-600' },
                  likely_antisale: { label: 'Antisale',                                   colorClass: 'text-amber-900',  dotColor: 'bg-amber-900' },
                  no_answer:       { label: lang === 'el' ? 'Δεν Απάντησε' : 'No Answer', colorClass: 'text-orange-600', dotColor: 'bg-orange-400' },
                  bought:          { label: lang === 'el' ? 'Αγόρασε' : 'Bought',         colorClass: 'text-green-700',  dotColor: 'bg-green-500' },
                  not_buying:      { label: lang === 'el' ? 'Δεν αγοράζει' : 'Not Buying', colorClass: 'text-red-600',  dotColor: 'bg-red-400' },
                }
                const meta = STATUS_META[telStatusDetailKey] ?? { label: telStatusDetailKey, colorClass: 'text-foreground', dotColor: 'bg-muted' }

                const getDateRange = () => {
                  if (statusDetailPeriod === 'today') return { from: today, to: today }
                  if (statusDetailPeriod === '7d') return { from: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10), to: today }
                  if (statusDetailPeriod === '30d') return { from: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10), to: today }
                  if (statusDetailPeriod === 'custom') return { from: statusDetailFrom, to: statusDetailTo }
                  return { from: '', to: '' }
                }
                const { from: fromDate, to: toDate } = getDateRange()

                const filteredContacts = statusDetailPeriod === 'all'
                  ? contacts
                  : contacts.filter((c: any) => {
                      if (!c.lastContacted) return false
                      if (fromDate && c.lastContacted < fromDate) return false
                      if (toDate && c.lastContacted > toDate) return false
                      return true
                    })

                const todayCount = contacts.filter((c: any) => c.lastContacted === today).length

                const byDate: Record<string, number> = {}
                filteredContacts.forEach((c: any) => {
                  if (c.lastContacted) byDate[c.lastContacted] = (byDate[c.lastContacted] ?? 0) + 1
                })
                const dailyRows = Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a)).slice(0, 14)

                const PERIOD_LABELS = {
                  today: lang === 'el' ? 'Σήμερα' : 'Today',
                  '7d': '7 ' + (lang === 'el' ? 'ημέρες' : 'days'),
                  '30d': '30 ' + (lang === 'el' ? 'ημέρες' : 'days'),
                  all: lang === 'el' ? 'Όλα' : 'All',
                  custom: lang === 'el' ? 'Προσ/σμένο' : 'Custom',
                }

                return (
                  <div className="space-y-3">
                    {/* Back + title */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setTelDetailView(null); setTelStatusDetailKey(null) }}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      >
                        <ArrowRight className="h-3 w-3 rotate-180" /> {lang === 'el' ? 'Πίσω' : 'Back'}
                      </button>
                      <span className={`h-2 w-2 rounded-full shrink-0 ${meta.dotColor}`} />
                      <span className={`text-xs font-bold uppercase ${meta.colorClass}`}>{meta.label}</span>
                      <span className="ml-auto text-sm font-bold">{contacts.length} {lang === 'el' ? 'επαφές' : 'contacts'}</span>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                        <div className="text-xl font-bold">{todayCount}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{lang === 'el' ? 'Σήμερα' : 'Today'}</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                        <div className="text-xl font-bold">{contacts.length}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{lang === 'el' ? 'Συνολικά' : 'Total'}</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                        <div className="text-xl font-bold">{selectedTelephonist?.leads > 0 ? Math.round((contacts.length / selectedTelephonist.leads) * 100) : 0}%</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{lang === 'el' ? 'Ποσοστό' : 'Share'}</div>
                      </div>
                    </div>

                    {/* Period filter pills */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        {(['today', '7d', '30d', 'all', 'custom'] as const).map(p => (
                          <button
                            key={p}
                            onClick={() => { setStatusDetailPeriod(p); if (p !== 'custom') { setStatusDetailFrom(''); setStatusDetailTo('') } }}
                            className={cn(
                              'text-[10px] px-2 py-1 rounded-full border transition-colors',
                              statusDetailPeriod === p
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'hover:bg-muted border-border text-muted-foreground'
                            )}
                          >
                            {PERIOD_LABELS[p]}
                          </button>
                        ))}
                      </div>
                      {statusDetailPeriod === 'custom' && (
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={statusDetailFrom}
                            onChange={e => setStatusDetailFrom(e.target.value)}
                            className="text-xs border rounded px-2 py-1 bg-background flex-1 min-w-0"
                          />
                          <span className="text-xs text-muted-foreground shrink-0">—</span>
                          <input
                            type="date"
                            value={statusDetailTo}
                            onChange={e => setStatusDetailTo(e.target.value)}
                            className="text-xs border rounded px-2 py-1 bg-background flex-1 min-w-0"
                          />
                        </div>
                      )}
                    </div>

                    {/* Daily breakdown */}
                    {dailyRows.length > 0 && (
                      <div className="bg-muted/30 rounded-lg p-2.5 border">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {lang === 'el' ? 'Ημερήσια' : 'Daily breakdown'}
                          <span className="ml-auto text-[9px] font-normal opacity-60">{filteredContacts.length} {lang === 'el' ? 'επαφές' : 'contacts'}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {dailyRows.map(([date, count]) => {
                            const [y, m, d] = date.split('-')
                            const isToday = date === today
                            return (
                              <div key={date} className={cn(
                                'flex items-center gap-1 text-[10px] rounded px-2 py-1 border font-medium',
                                isToday ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border'
                              )}>
                                <span>{d}/{m}</span>
                                <span className="text-muted-foreground">·</span>
                                <span className="font-bold">{count}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Contacts list */}
                    <div className="space-y-1 max-h-[38vh] overflow-y-auto pr-1">
                      {selectedTelephonist?.contactsListLoading ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                          <RefreshCcw className="h-4 w-4 animate-spin" />
                          <span className="text-sm">{lang === 'el' ? 'Φόρτωση...' : 'Loading...'}</span>
                        </div>
                      ) : filteredContacts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          {lang === 'el' ? 'Δεν βρέθηκαν επαφές για αυτή την περίοδο.' : 'No contacts found for this period.'}
                        </p>
                      ) : [...filteredContacts]
                        .sort((a: any, b: any) => (b.lastContacted ?? '').localeCompare(a.lastContacted ?? ''))
                        .map((c: any) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between gap-2 text-xs hover:bg-muted/60 rounded-lg px-2 py-1.5 cursor-pointer transition-colors border border-transparent hover:border-border"
                            onClick={() => { setSelectedTelephonist(null); router.push(`/contacts/details?id=${c.id}`) }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                                {(c.name || '?').charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium truncate">{c.name}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {c.lastContacted ? new Date(c.lastContacted + 'T00:00:00').toLocaleDateString('el-GR') : '—'}
                            </span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )
              })()}

              {/* ── Drill-down: Sales ────────────────────────────────────────── */}
              {telDetailView === 'sales' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTelDetailView(null)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                      <ArrowRight className="h-3 w-3 rotate-180" /> {lang === 'el' ? 'Πίσω' : 'Back'}
                    </button>
                    <span className="text-xs font-bold uppercase text-primary">{lang === 'el' ? 'Αναλυτικά Πωλήσεις' : 'Sales Detail'}</span>
                    <span className="ml-auto text-sm font-bold text-primary">€{selectedTelephonist.sales.toLocaleString()}</span>
                  </div>
                  {(!selectedTelephonist.salesDetail || selectedTelephonist.salesDetail.length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-6">{lang === 'el' ? 'Δεν υπάρχουν καταχωρήσεις πωλήσεων.' : 'No sales records found.'}</p>
                  ) : (
                    <div className="space-y-1 max-h-[55vh] overflow-y-auto pr-1">
                      {selectedTelephonist.salesDetail.map((s: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-2 text-xs hover:bg-muted/60 rounded-lg px-2 py-2 cursor-pointer transition-colors border border-transparent hover:border-border"
                          onClick={() => { s.contact_id && router.push(`/contacts/details?id=${s.contact_id}`); setSelectedTelephonist(null) }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                              {(s.contact_name || '?').charAt(0)}
                            </div>
                            <span className="font-medium truncate">{s.contact_name || '—'}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-bold text-primary">€{Number(s.amount).toLocaleString()}</span>
                            <span className="text-[10px] text-muted-foreground">{fmtLocalDateTime(s.logged_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Drill-down: Contacts ─────────────────────────────────────── */}
              {telDetailView === 'contacts' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTelDetailView(null)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                      <ArrowRight className="h-3 w-3 rotate-180" /> {lang === 'el' ? 'Πίσω' : 'Back'}
                    </button>
                    <span className="text-xs font-bold uppercase text-accent">{lang === 'el' ? 'Επαφές Τηλεφωνητή' : 'Telephonist Contacts'}</span>
                    <span className="ml-auto text-sm font-bold text-accent">{selectedTelephonist.leads}</span>
                  </div>
                  {(!selectedTelephonist.contactsList || selectedTelephonist.contactsList.length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-6">{lang === 'el' ? 'Δεν υπάρχουν επαφές.' : 'No contacts found.'}</p>
                  ) : (
                    <div className="space-y-1 max-h-[55vh] overflow-y-auto pr-1">
                      {selectedTelephonist.contactsList.map((c: any) => {
                        const statusMap: Record<string, { label: string; color: string }> = {
                          new: { label: lang === 'el' ? 'Νέος' : 'New', color: 'bg-blue-100 text-blue-700' },
                          canva: { label: 'Canva', color: 'bg-purple-100 text-purple-700' },
                          likely_sale: { label: 'Sale', color: 'bg-amber-200 text-amber-800' },
                          likely_antisale: { label: 'Antisale', color: 'bg-amber-900/20 text-amber-900' },
                          bought: { label: lang === 'el' ? 'Αγόρασε' : 'Bought', color: 'bg-green-100 text-green-700' },
                          not_buying: { label: lang === 'el' ? 'Όχι' : 'No', color: 'bg-red-100 text-red-700' },
                          no_answer: { label: lang === 'el' ? 'Δεν Απ.' : 'No Ans.', color: 'bg-orange-100 text-orange-700' },
                        }
                        const s = statusMap[c.status] ?? { label: c.status, color: 'bg-muted text-muted-foreground' }
                        return (
                          <div
                            key={c.id}
                            className="flex items-center justify-between gap-2 text-xs hover:bg-muted/60 rounded-lg px-2 py-1.5 cursor-pointer transition-colors border border-transparent hover:border-border"
                            onClick={() => { router.push(`/contacts/details?id=${c.id}`); setSelectedTelephonist(null) }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-6 w-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-bold shrink-0">
                                {(c.name || '?').charAt(0)}
                              </div>
                              <span className="font-medium truncate">{c.name}</span>
                            </div>
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0', s.color)}>{s.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Drill-down: Calls Today ──────────────────────────────────── */}
              {telDetailView === 'callsToday' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTelDetailView(null)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                      <ArrowRight className="h-3 w-3 rotate-180" /> {lang === 'el' ? 'Πίσω' : 'Back'}
                    </button>
                    <span className="text-xs font-bold uppercase text-blue-600">{lang === 'el' ? 'Κλήσεις Σήμερα' : 'Calls Today'}</span>
                    <span className="ml-auto text-sm font-bold text-blue-600">{selectedTelephonist.callsToday ?? 0}</span>
                  </div>
                  {(!selectedTelephonist.callsTodayDetail || selectedTelephonist.callsTodayDetail.length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-6">{lang === 'el' ? 'Καμία κλήση σήμερα.' : 'No calls today.'}</p>
                  ) : (
                    <div className="space-y-1 max-h-[55vh] overflow-y-auto pr-1">
                      {selectedTelephonist.callsTodayDetail.map((c: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg px-2 py-1.5 cursor-pointer transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-900"
                          onClick={() => { c.contact_id && router.push(`/contacts/details?id=${c.contact_id}`); setSelectedTelephonist(null) }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                              <Phone className="h-3 w-3" />
                            </div>
                            <span className="font-medium truncate">{c.contact_name}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">{fmtLocalDateTime(c.called_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Main stats view (hidden when drill-down is open) ─────────── */}
              {telDetailView === null && (<>

              {/* Main metric cards — clickable */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  className="bg-primary/10 rounded-lg p-3 text-center hover:bg-primary/20 hover:ring-2 ring-primary/30 transition-all cursor-pointer group"
                  onClick={() => setTelDetailView('sales')}
                  title={lang === 'el' ? 'Κλικ για αναλυτικά' : 'Click for detail'}
                >
                  <div className="text-lg font-bold text-primary">€{selectedTelephonist.sales.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-0.5">
                    {lang === 'el' ? 'Πωλήσεις' : 'Sales'}
                    <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
                <button
                  className="bg-accent/10 rounded-lg p-3 text-center hover:bg-accent/20 hover:ring-2 ring-accent/30 transition-all cursor-pointer group"
                  onClick={() => setTelDetailView('contacts')}
                  title={lang === 'el' ? 'Κλικ για αναλυτικά' : 'Click for detail'}
                >
                  <div className="text-lg font-bold text-accent">{selectedTelephonist.leads}</div>
                  <div className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-0.5">
                    {lang === 'el' ? 'Επαφές' : 'Contacts'}
                    <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
                <button
                  className="bg-blue-500/10 rounded-lg p-3 text-center hover:bg-blue-500/20 hover:ring-2 ring-blue-400/30 transition-all cursor-pointer group"
                  onClick={() => setTelDetailView('callsToday')}
                  title={lang === 'el' ? 'Κλικ για αναλυτικά' : 'Click for detail'}
                >
                  <div className="text-lg font-bold text-blue-600">{selectedTelephonist.callsToday ?? '—'}</div>
                  <div className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-0.5">
                    {lang === 'el' ? 'Κλήσεις σήμερα' : 'Calls today'}
                    <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
                <div className="bg-green-500/10 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-green-600">{selectedTelephonist.conversionRate != null ? `${selectedTelephonist.conversionRate}%` : '0%'}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Conv %</div>
                </div>
              </div>
              {/* Weekly calls + status breakdown */}
              {(selectedTelephonist.callsWeek != null || selectedTelephonist.byStatus) && (
                <div className="grid grid-cols-2 gap-3">
                  {selectedTelephonist.callsWeek != null && (
                    <div className="bg-muted/40 rounded-lg p-3">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2">{lang === 'el' ? 'Τελευταίες 7 ημέρες' : 'Last 7 days'}</div>
                      <div className="flex gap-6">
                        <div>
                          <div className="text-xl font-bold">{selectedTelephonist.callsWeek}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                            <Phone className="h-2.5 w-2.5" /> {lang === 'el' ? 'Μον. Επαφές' : 'Unique contacts'}
                          </div>
                        </div>
                        {selectedTelephonist.emailsWeek != null && (
                          <div>
                            <div className="text-xl font-bold text-blue-600">{selectedTelephonist.emailsWeek}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                              <Mail className="h-2.5 w-2.5" /> Email
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">{lang === 'el' ? 'τελ. 7 ημέρες' : 'last 7 days'}</div>
                    </div>
                  )}
                  {selectedTelephonist.byStatus && (
                    <div className="bg-muted/40 rounded-lg p-3">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex items-center gap-1">
                        {lang === 'el' ? 'Κατάσταση Επαφών' : 'Contact Status'}
                        <span className="ml-auto text-[9px] opacity-50">{lang === 'el' ? 'κλικ για ανάλυση' : 'click for detail'}</span>
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { key: 'new', label: lang === 'el' ? 'Νέοι' : 'New', color: 'bg-blue-400' },
                          { key: 'canva', label: 'Canva', color: 'bg-purple-500' },
                          { key: 'likely_sale', label: 'Sale', color: 'bg-amber-600' },
                          { key: 'likely_antisale', label: 'Antisale', color: 'bg-amber-900' },
                          { key: 'no_answer', label: lang === 'el' ? 'Δεν Απάντησε' : 'No Answer', color: 'bg-orange-400' },
                          { key: 'bought', label: lang === 'el' ? 'Αγόρασε' : 'Bought', color: 'bg-green-500' },
                          { key: 'not_buying', label: lang === 'el' ? 'Όχι' : 'No', color: 'bg-red-400' },
                        ].map(({ key, label, color }) => {
                          const count = selectedTelephonist.byStatus[key] ?? 0
                          const total = selectedTelephonist.leads || 1
                          return (
                            <button
                              key={key}
                              className="w-full flex items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/80 transition-colors cursor-pointer group"
                              onClick={() => { setTelStatusDetailKey(key); setTelDetailView('statusDetail'); setStatusDetailPeriod('all'); setStatusDetailFrom(''); setStatusDetailTo('') }}
                            >
                              <span className={`h-2 w-2 rounded-full shrink-0 ${color}`} />
                              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.round((count / total) * 100)}%` }} />
                              </div>
                              <span className="text-[10px] font-semibold w-4 text-right">{count}</span>
                              <span className="text-[10px] text-muted-foreground w-8 text-left">{label}</span>
                              <ArrowRight className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Calls detail */}
              {selectedTelephonist.callsDetail && selectedTelephonist.callsDetail.length > 0 && (
                <div className="bg-muted/30 rounded-lg p-3 border">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {lang === 'el' ? 'Μοναδικές Επαφές εβδομάδας' : 'Unique contacts this week'}
                    <span className="ml-auto bg-primary/20 text-primary rounded-full h-4 px-1.5 flex items-center text-[9px] font-bold">
                      {selectedTelephonist.callsDetail.length}
                    </span>
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {selectedTelephonist.callsDetail.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 text-xs hover:bg-muted/60 rounded px-1 py-0.5 cursor-pointer transition-colors"
                        onClick={() => { setSelectedTelephonist(null); c.contact_id && router.push(`/contacts/details?id=${c.contact_id}`) }}
                      >
                        <span className="font-medium truncate">{c.contact_name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{fmtLocalDateTime(c.called_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Emails detail */}
              {selectedTelephonist.emailsDetail && selectedTelephonist.emailsDetail.length > 0 && (
                <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-900/40">
                  <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {lang === 'el' ? 'Email εβδομάδας — Αναλυτικά' : 'Emails this week — Detail'}
                    <span className="ml-auto bg-blue-500 text-white rounded-full h-4 px-1.5 flex items-center text-[9px] font-bold">
                      {selectedTelephonist.emailsDetail.length}
                    </span>
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {selectedTelephonist.emailsDetail.map((e, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 text-xs hover:bg-blue-100/60 dark:hover:bg-blue-900/30 rounded px-1 py-0.5 cursor-pointer transition-colors"
                        onClick={() => { setSelectedTelephonist(null); e.contact_id && router.push(`/contacts/details?id=${e.contact_id}`) }}
                      >
                        <span className="font-medium truncate">{e.contact_name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 rounded px-1 py-0.5 uppercase">{e.email_type === 'j2t' ? 'J2T' : 'Follow-up'}</span>
                          <span className="text-[10px] text-muted-foreground">{fmtLocalDateTime(e.sent_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-ups next 7 days */}
              {selectedTelephonist.followUpsNext7 != null && (
                <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-3 border border-orange-200 dark:border-orange-900/40">
                  <div className="text-[10px] uppercase font-bold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {lang === 'el' ? 'Follow-ups επόμενες 7 μέρες' : 'Follow-ups next 7 days'}
                    <span className="ml-auto bg-orange-500 text-white rounded-full h-4 w-4 flex items-center justify-center text-[9px] font-bold">
                      {selectedTelephonist.followUpsNext7.length}
                    </span>
                  </div>
                  {selectedTelephonist.followUpsNext7.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{lang === 'el' ? 'Δεν υπάρχουν follow-ups.' : 'No follow-ups scheduled.'}</p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {selectedTelephonist.followUpsNext7.map((fu) => {
                        const isToday = fu.date === new Date().toISOString().slice(0, 10)
                        return (
                          <div
                            key={fu.id}
                            className="flex items-center justify-between gap-2 text-xs cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded px-1 py-0.5 transition-colors"
                            onClick={() => { setSelectedTelephonist(null); router.push(`/contacts/details?id=${fu.id}`) }}
                          >
                            <span className="font-medium truncate">{fu.name}</span>
                            <span className="shrink-0 flex flex-col items-end gap-0">
                              <span className={cn(
                                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                                isToday
                                  ? "bg-orange-500 text-white"
                                  : "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                              )}>
                                {isToday ? (lang === 'el' ? 'Σήμερα' : 'Today') : fu.date}
                              </span>
                              {fu.time && <span className="text-[9px] text-orange-500 pr-1">{fu.time}</span>}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {isTelAnalysisLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{lang === 'el' ? 'Ανάλυση...' : 'Analyzing...'}</span>
                </div>
              ) : telephonistAnalysis ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-muted-foreground">{lang === 'el' ? 'Σύσταση' : 'Recommendation'}</span>
                    <Badge className={cn('text-xs', {
                      'bg-green-500 text-white': telephonistAnalysis.recommendation === 'reward' || telephonistAnalysis.recommendation === 'promote',
                      'bg-amber-500 text-white': telephonistAnalysis.recommendation === 'train',
                      'bg-muted text-muted-foreground': telephonistAnalysis.recommendation === 'monitor',
                    })}>
                      {{ reward: '🏆 Επιβράβευση', promote: '⬆️ Προαγωγή', train: '📚 Εκπαίδευση', monitor: '👁️ Παρακολούθηση' }[telephonistAnalysis.recommendation]}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-bold uppercase text-green-600">{lang === 'el' ? 'Δυνατά Σημεία' : 'Strengths'}</h4>
                      <ul className="space-y-1">{telephonistAnalysis.strengths.map((s, i) => <li key={i} className="text-xs flex gap-1"><CheckCircle2 className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />{s}</li>)}</ul>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-bold uppercase text-amber-600">{lang === 'el' ? 'Βελτίωση' : 'Improvement'}</h4>
                      <ul className="space-y-1">{telephonistAnalysis.weaknesses.map((w, i) => <li key={i} className="text-xs flex gap-1"><AlertCircle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />{w}</li>)}</ul>
                    </div>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">{lang === 'el' ? 'Coaching' : 'Coaching Advice'}</h4>
                    <p className="text-xs leading-relaxed">{telephonistAnalysis.coachingAdvice}</p>
                  </div>
                </div>
              ) : null}
            </>)}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </SidebarProvider>

    {/* ── Follow-ups Team Sheet ─────────────────────────────────────────── */}
    <Sheet open={followUpSheetOpen} onOpenChange={setFollowUpSheetOpen}>
      <SheetContent side="right" className="w-full sm:max-w-3xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <CalendarDays className="h-5 w-5" />
            {lang === 'el' ? 'Όλα τα Follow-ups Ομάδας' : 'All Team Follow-ups'}
            <Badge className="ml-2 bg-amber-500 text-white">{allFollowUps.length}</Badge>
          </SheetTitle>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {(() => {
              const t2 = new Date().toISOString().slice(0, 10)
              const ov = allFollowUps.filter(f => f.next_action_date < t2).length
              const td = allFollowUps.filter(f => f.next_action_date === t2).length
              const up = allFollowUps.filter(f => f.next_action_date > t2).length
              return <>
                {ov > 0 && <Badge className="bg-red-500 text-white text-[10px] px-1.5">{ov} {lang === 'el' ? 'καθυστερημένα' : 'overdue'}</Badge>}
                {td > 0 && <Badge className="bg-amber-500 text-white text-[10px] px-1.5">{td} {lang === 'el' ? 'σήμερα' : 'today'}</Badge>}
                {up > 0 && <Badge variant="outline" className="text-[10px] px-1.5">{up} {lang === 'el' ? 'επερχόμενα' : 'upcoming'}</Badge>}
              </>
            })()}
          </div>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="px-4 py-3 overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '560px' }}>
              <thead className="sticky top-0 bg-background z-10">
                <tr className="border-b bg-muted/60">
                  <th className="text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground px-3 py-3">
                    {lang === 'el' ? 'Ονοματεπώνυμο' : 'Full Name'}
                  </th>
                  <th className="text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground px-3 py-3 whitespace-nowrap">
                    {lang === 'el' ? 'Ημερομηνία' : 'Date'}
                  </th>
                  <th className="text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground px-3 py-3 whitespace-nowrap w-16">
                    {lang === 'el' ? 'Ώρα' : 'Time'}
                  </th>
                  <th className="text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground px-3 py-3 whitespace-nowrap">
                    {lang === 'el' ? 'Τηλεφωνητής' : 'Agent'}
                  </th>
                  <th className="text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground px-3 py-3 w-16">
                    {lang === 'el' ? 'Κλήση' : 'Call'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allFollowUps.map(f => {
                  const t2 = new Date().toISOString().slice(0, 10)
                  const isOverdue = f.next_action_date < t2
                  const isToday   = f.next_action_date === t2
                  const d = new Date(f.next_action_date + 'T00:00:00')
                  const dateLabel = isToday
                    ? (lang === 'el' ? 'Σήμερα' : 'Today')
                    : d.toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { day: 'numeric', month: 'short', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })
                  return (
                    <tr key={f.id}
                      className={`hover:bg-muted/40 transition-colors cursor-pointer ${isOverdue ? 'bg-red-50/40 dark:bg-red-950/20' : isToday ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}`}
                      onClick={() => { router.push(`/contacts/details?id=${f.id}`); setFollowUpSheetOpen(false) }}>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-sm">{f.name}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          {isOverdue && <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />}
                          <span className={`text-sm font-semibold whitespace-nowrap ${isOverdue ? 'text-red-600 dark:text-red-400' : isToday ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                            {dateLabel}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm font-mono text-foreground">{f.next_action_time || '—'}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm font-medium">{f.ownerName}</span>
                      </td>
                      <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                        {f.phone ? (
                          <a href={`tel:${f.phone}`}>
                            <Button size="sm" className="h-9 w-9 p-0 bg-green-500 hover:bg-green-600 text-white rounded-full">
                              <Phone className="h-4 w-4" />
                            </Button>
                          </a>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
    </>
  )
}
