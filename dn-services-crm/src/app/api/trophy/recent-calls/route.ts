import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/app/lib/constants'

export const runtime = 'nodejs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function safeFetch(url: string, init: RequestInit): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(url, init)
    const text = await res.text()
    let data: any = null
    try { data = text ? JSON.parse(text) : null } catch { data = { _raw: text } }
    return { ok: res.ok, status: res.status, data }
  } catch (e: any) {
    return { ok: false, status: 0, data: { message: e?.message ?? 'fetch failed' } }
  }
}

function decodeJwtUserId(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    return payload?.sub ?? null
  } catch { return null }
}

// call_logs RLS only lets a telephonist read their own rows (telephonist_id = auth.uid()), which
// is correct for regular telephonists but breaks the trophy 24h re-call lock: it must be visible
// to EVERY trophy telephonist regardless of who placed the original call. Trophy and regular
// telephonists must never see each other's data, so this route — using the service key to bypass
// RLS — scopes the result to calls placed by trophy telephonists only (top_leads_access = true),
// after verifying the caller is themselves a trophy telephonist (or admin).
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const userId = token ? decodeJwtUserId(token) : null
    if (!userId || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profileRes = await safeFetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=role,top_leads_access`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
    })
    if (!profileRes.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const profile = profileRes.data?.[0]
    const isCallerTrophy = !!profile?.top_leads_access || isAdmin(profile?.role)
    if (!isCallerTrophy) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const contactId = request.nextUrl.searchParams.get('contactId')
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const trophyIdsRes = await safeFetch(`${SUPABASE_URL}/rest/v1/profiles?top_leads_access=eq.true&select=id`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    })
    const trophyIds: string[] = (trophyIdsRes.data ?? []).map((p: any) => p.id)
    if (trophyIds.length === 0) return NextResponse.json({ calls: [] })

    const idFilter = `(${trophyIds.join(',')})`
    const contactFilter = contactId ? `&contact_id=eq.${contactId}` : ''
    const callsRes = await safeFetch(
      `${SUPABASE_URL}/rest/v1/call_logs?telephonist_id=in.${idFilter}&called_at=gte.${since}${contactFilter}&select=contact_id,called_at&order=called_at.desc`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    )
    if (!callsRes.ok) {
      return NextResponse.json({ error: callsRes.data?.message ?? 'Failed to load recent calls' }, { status: 500 })
    }
    return NextResponse.json({ calls: callsRes.data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
