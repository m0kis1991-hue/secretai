import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, ALL_STATUSES } from '@/app/lib/constants'

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
    console.error('[safeFetch] error:', url, e?.message)
    return { ok: false, status: 0, data: { message: e?.message ?? 'fetch failed' } }
  }
}

async function adminWrite(path: string, method: 'PATCH' | 'POST', body: object) {
  return safeFetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'return=representation' : 'return=minimal',
    },
    body: JSON.stringify(body),
  })
}

async function userRead(path: string, token: string) {
  return safeFetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  })
}

// Decode JWT payload locally — no network call. The sub claim is the Supabase user ID.
// Auth is still validated by Supabase when userRead() is called with the same token.
function decodeJwtUserId(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    return payload?.sub ?? null
  } catch { return null }
}

// Per-user rate limit: max 300 saves per hour
const saveRlMap = new Map<string, { count: number; resetAt: number }>()
function checkSaveRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = saveRlMap.get(userId)
  if (!entry || now > entry.resetAt) { saveRlMap.set(userId, { count: 1, resetAt: now + 3600000 }); return true }
  if (entry.count >= 300) return false
  entry.count++; return true
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contactId, row, isNew, createdBy, trophySync } = body

    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    const userId = token ? decodeJwtUserId(token) : null
    if (!userId || !token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!checkSaveRateLimit(userId)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    if (isNew) {
      // Validate JWT by doing a quick profile read before allowing insert
      const profileRes = await userRead(`profiles?id=eq.${userId}&select=role`, token)
      if (!profileRes.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const result = await adminWrite('contacts', 'POST', { ...row, created_by: createdBy ?? userId })
      if (!result.ok) return NextResponse.json({ error: result.data?.message ?? 'Insert failed' }, { status: 500 })
      const record = Array.isArray(result.data) ? result.data[0] : result.data
      return NextResponse.json({ data: record })
    }

    // Fetch profile and contact in parallel — Supabase validates the JWT on both calls
    const [profileRes, contactRes] = await Promise.all([
      userRead(`profiles?id=eq.${userId}&select=role`, token),
      userRead(`contacts?id=eq.${contactId}&select=owner_id,created_by,locked_until,sale_locked`, token),
    ])

    if (!profileRes.ok && profileRes.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = profileRes.data?.[0]?.role ?? 'telephonist'
    const isAdm = isAdmin(role)

    if (!contactRes.ok || !contactRes.data?.[0]) {
      const detail = contactRes.data?.message ?? contactRes.data?._raw ?? contactRes.status
      console.error('[save] contact fetch failed:', JSON.stringify(contactRes))
      return NextResponse.json({ error: `Contact not found (${detail})` }, { status: 404 })
    }

    const existing = contactRes.data[0]
    const isOwner = existing.owner_id === userId
    const isCreator = existing.created_by === userId
    const today = new Date().toISOString().slice(0, 10)
    const lockIsActive = !!(existing.locked_until && existing.locked_until >= today)
    const isUnclaimed = existing.owner_id === null || (!lockIsActive && !existing.sale_locked)

    if (!isAdm && !isOwner && !isCreator && !isUnclaimed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Helper: sync trophy session fields so the telephonist sees admin's change in real-time.
    // Upsert (not PATCH) — a PATCH silently updates zero rows when this contact has never had
    // a session for that owner yet, which made admin's changes invisible to the trophy
    // telephonist forever (no session row to override the 'new' fallback in their own view).
    // trophy_contact_sessions is the sole source of truth for status/observations/next-action/
    // investment on trophy-scope contacts — contacts.status etc. are never written for these
    // (see handleSave in contact-details-client.tsx). Returns an error string on failure, null
    // on success/skip.
    const syncTrophySession = async (): Promise<string | null> => {
      if (!isAdm || !trophySync?.ownerId || !trophySync?.status) return null
      const sessionBody: any = {
        contact_id: contactId,
        owner_id: trophySync.ownerId,
        status: trophySync.status,
        updated_at: new Date().toISOString(),
      }
      if (trophySync.observations !== undefined) sessionBody.observations = trophySync.observations
      if (trophySync.nextActionDate !== undefined) sessionBody.next_action_date = trophySync.nextActionDate
      if (trophySync.nextActionTime !== undefined) sessionBody.next_action_time = trophySync.nextActionTime
      if (trophySync.lastContacted !== undefined) sessionBody.last_contacted = trophySync.lastContacted
      if (trophySync.investmentAmount !== undefined) sessionBody.investment_amount = trophySync.investmentAmount
      const res = await safeFetch(
        `${SUPABASE_URL}/rest/v1/trophy_contact_sessions?on_conflict=contact_id,owner_id`,
        {
          method: 'POST',
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify(sessionBody),
        }
      )
      if (!res.ok) {
        console.error('[syncTrophySession] failed:', JSON.stringify(res.data))
        return res.data?.message ?? 'Trophy session sync failed'
      }
      return null
    }

    // Callers like the kanban quick-status-change send an empty row (they only want to sync
    // the trophy session, not touch the contacts row). PostgREST rejects a PATCH with zero
    // columns to set, so skip the contacts table write entirely when there's nothing in it.
    if (Object.keys(row).length === 0) {
      const syncErr = await syncTrophySession()
      if (syncErr) return NextResponse.json({ error: syncErr }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    // Try with user JWT first (RLS-based); fall back to service key if RLS blocks it
    const jwtPatch = await safeFetch(`${SUPABASE_URL}/rest/v1/contacts?id=eq.${contactId}`, {
      method: 'PATCH',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    })

    if (jwtPatch.ok) {
      const syncErr = await syncTrophySession()
      if (syncErr) return NextResponse.json({ error: syncErr }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    const patch = await adminWrite(`contacts?id=eq.${contactId}`, 'PATCH', row)
    if (!patch.ok) {
      const errMsg = patch.data?.message ?? patch.data?._raw ?? ''
      console.error('[save] PATCH failed (JWT + service key):', JSON.stringify(patch))
      const isConstraint = errMsg.includes('violates check constraint') || errMsg.includes('invalid input value for enum') || errMsg.includes('invalid input syntax for type')
      return NextResponse.json({
        error: isConstraint
          ? `Η βάση δεν δέχεται την κατάσταση "${row.status ?? ''}". Τρέξτε στο Supabase SQL Editor: ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_status_check; ALTER TABLE contacts ADD CONSTRAINT contacts_status_check CHECK (status IN (${ALL_STATUSES.map(s => `'${s}'`).join(',')}));`
          : (errMsg || 'Update failed'),
      }, { status: 500 })
    }
    const syncErr = await syncTrophySession()
    if (syncErr) return NextResponse.json({ error: syncErr }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[save] unhandled exception:', e?.message, e?.stack)
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
