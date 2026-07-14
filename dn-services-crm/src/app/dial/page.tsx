
"use client"

import { CRMSidebar } from "@/components/layout/crm-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, PhoneOff, User, History, MessageSquare, Play, SkipForward, RefreshCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { DIALABLE_STATUSES, isAdmin as isAdminRole } from "@/app/lib/constants"
import { logCallKeepAlive } from "@/lib/call-log"

function parsePhonesField(raw: string): string[] {
  if (!raw) return []
  if (raw.startsWith("[")) {
    try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr.filter(Boolean) : [raw] } catch {}
  }
  return [raw]
}

type Lead = { id: string; name: string; phone: string; status: string; observations?: string; lastContacted?: string }

export default function DialPage() {
  const { toast } = useToast()
  const [isDialing, setIsDialing] = useState(false)
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0)
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [phonePickerOpen, setPhonePickerOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  // Cached JWT for keepalive call-log writes — must be available synchronously at click time so
  // logging a call never delays the tel: navigation that has to fire in the same user gesture.
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    // Keep the cached access token fresh across the session (Supabase auto-refreshes it
    // periodically) so a keepalive call-log write hours into a shift doesn't fail with a stale JWT.
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null)
    })
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return
      setCurrentUserId(user.id)
      setAccessToken(session?.access_token ?? null)
      const { data: profile } = await supabase.from('profiles').select('name, role').eq('id', user.id).single()
      setUserName(profile?.name ?? '')

      const query = supabase
        .from('contacts')
        .select('id, name, phone, status, observations, last_contacted')
        .in('status', DIALABLE_STATUSES)
        .order('priority_score', { ascending: false })

      const isAdm = isAdminRole(profile?.role)
      const { data } = isAdm
        ? await query
        : await query.or(`owner_id.eq.${user.id},created_by.eq.${user.id}`)

      setAllLeads((data ?? []).map(r => ({
        id: r.id,
        name: r.name ?? '',
        phone: r.phone ?? '',
        status: r.status ?? 'new',
        observations: r.observations ?? undefined,
        lastContacted: r.last_contacted ?? undefined,
      })))
      setLoading(false)
    }
    init()
    return () => { authSub.subscription.unsubscribe() }
  }, [])

  const currentLead = allLeads[currentLeadIndex]

  const handleNext = () => {
    if (allLeads.length === 0) return
    setCurrentLeadIndex((prev) => (prev + 1) % allLeads.length)
    setIsDialing(false)
  }

  const dialNumber = (phone: string) => {
    if (!currentLead) return
    setIsDialing(true)
    setPhonePickerOpen(false)
    // Fire tel: immediately — mobile browsers block tel: navigation after any await (user gesture expires)
    window.location.href = `tel:${phone.replace(/\s+/g, "")}`
    toast({ title: "Έναρξη Κλήσης", description: `Καλείτε τον/την ${currentLead.name}` })
    if (currentUserId) {
      logCallKeepAlive({
        accessToken,
        telephonistId: currentUserId,
        telephonistName: userName,
        contactId: currentLead.id,
        contactName: currentLead.name,
        calledAt: new Date().toISOString(),
      })
    }
  }

  const handleStartCall = () => {
    if (!currentLead?.phone) return
    const phones = parsePhonesField(currentLead.phone)
    if (phones.length === 1) {
      dialNumber(phones[0])
    } else {
      setPhonePickerOpen(true)
    }
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full max-w-full bg-background overflow-x-hidden">
        <CRMSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-6 sticky top-0 bg-background/80 backdrop-blur-md z-10">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-primary">Ουρά Κλήσεων</h1>
            </div>
            <Badge className="bg-accent text-accent-foreground">Σε σύνδεση</Badge>
          </header>

          <main className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-t-4 border-t-primary overflow-hidden shadow-lg">
                <CardHeader className="bg-muted/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-xl md:text-2xl">
                        {loading ? 'Φόρτωση...' : (currentLead?.name || "Τέλος Ουράς")}
                      </CardTitle>
                      <CardDescription>
                        {loading ? '' : (currentLead?.phone || "Δεν υπάρχουν άλλες επαφές")}
                      </CardDescription>
                    </div>
                    {currentLead && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-card">
                          {currentLead.status === 'new' ? 'Νέα Επαφή' : currentLead.status === 'no_answer' ? 'Δεν Απάντησε' : currentLead.status === 'canva' ? 'Canva' : currentLead.status === 'likely_sale' ? 'Sale' : 'Antisale'}
                        </Badge>
                        <Link href={`/contacts/details?id=${currentLead.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs h-9 px-3">Άνοιγμα</Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6 md:p-10 flex flex-col items-center justify-center space-y-8">
                  <div className={`h-24 w-24 md:h-32 md:w-32 rounded-full flex items-center justify-center border-4 ${isDialing ? 'border-accent animate-pulse' : 'border-muted'} transition-all shadow-inner`}>
                    <User className={`h-12 w-12 md:h-16 md:w-16 ${isDialing ? 'text-accent' : 'text-muted-foreground'}`} />
                  </div>

                  <div className="text-center space-y-2">
                    <h3 className="text-lg md:text-xl font-bold">{isDialing ? "Κλήση σε εξέλιξη..." : "Έτοιμος για κλήση"}</h3>
                    <p className="text-muted-foreground text-xs md:text-sm">Προετοιμαστείτε για την επόμενη επικοινωνία.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                    {!isDialing ? (
                      <Button size="lg" className="h-14 md:h-16 px-8 bg-green-500 hover:bg-green-600 text-white rounded-full text-base md:text-lg shadow-md" onClick={handleStartCall} disabled={!currentLead || loading}>
                        <Phone className="mr-2 h-5 w-5 md:h-6 md:w-6" /> Έναρξη Κλήσης
                      </Button>
                    ) : (
                      <Button size="lg" className="h-14 md:h-16 px-8 bg-destructive hover:bg-destructive/90 text-white rounded-full text-base md:text-lg shadow-md" onClick={() => setIsDialing(false)}>
                        <PhoneOff className="mr-2 h-5 w-5 md:h-6 md:w-6" /> Τερματισμός
                      </Button>
                    )}
                    <Button variant="outline" size="lg" className="h-14 md:h-16 px-8 rounded-full text-base md:text-lg border-primary text-primary hover:bg-primary/5 shadow-sm" onClick={handleNext} disabled={allLeads.length <= 1}>
                      <SkipForward className="mr-2 h-5 w-5 md:h-6 md:w-6" /> Επόμενη Επαφή
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" /> Ιστορικό
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{currentLead?.lastContacted ? `Τελευταία κλήση: ${new Date(currentLead.lastContacted).toLocaleDateString('el-GR')}` : 'Καμία προηγούμενη κλήση.'}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" /> Σημειώσεις
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground italic line-clamp-2">
                      {currentLead?.observations || "Δεν υπάρχουν σημειώσεις για αυτή την επαφή."}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="space-y-6">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                    Ουρά Κλήσεων ({allLeads.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                      <RefreshCcw className="h-3 w-3 animate-spin" /> Φόρτωση...
                    </div>
                  ) : (
                    <div className="divide-y max-h-[400px] overflow-y-auto">
                      {allLeads.length > 0 ? allLeads.map((contact, idx) => (
                        <div
                          key={contact.id}
                          className={cn(
                            "p-4 flex items-center justify-between transition-colors",
                            idx === currentLeadIndex ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-muted/50 cursor-pointer'
                          )}
                          onClick={() => { setCurrentLeadIndex(idx); setIsDialing(false) }}
                        >
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold truncate">{contact.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {(() => { const ph = parsePhonesField(contact.phone || ""); return ph.length > 1 ? `${ph[0]} +${ph.length - 1}` : ph[0] || "—" })()}
                            </p>
                          </div>
                          {idx === currentLeadIndex && <Play className="h-3 w-3 text-primary fill-current shrink-0" />}
                        </div>
                      )) : (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                          Δεν βρέθηκαν επαφές στην ουρά.
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </SidebarInset>
      </div>

      {/* Phone picker — shown when contact has multiple numbers */}
      <Dialog open={phonePickerOpen} onOpenChange={setPhonePickerOpen}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle>Επιλογή αριθμού</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2 mb-2">{currentLead?.name}</p>
          <div className="flex flex-col gap-2">
            {parsePhonesField(currentLead?.phone ?? "").map((p, i) => (
              <Button
                key={i}
                variant="outline"
                className="justify-start font-mono text-sm h-11"
                onClick={() => dialNumber(p)}
              >
                <Phone className="mr-3 h-4 w-4 text-accent" />
                {p}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
