const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Logs a placed call without blocking the tel: navigation that must fire synchronously from the
// click (mobile browsers refuse tel: navigation once the user gesture "expires" after an await).
// A regular supabase-js insert is a plain fetch with no such guarantee: on mobile, `tel:` opens
// the native dialer and can suspend/unload the page before the insert's response comes back,
// silently dropping the call log. `keepalive: true` is the browser's contract that the request
// is still sent even as the page navigates away — this is what analytics beacons use for the
// exact same "log this as the user leaves" situation.
export function logCallKeepAlive(params: {
  accessToken: string | null | undefined
  telephonistId: string
  telephonistName: string
  contactId: string
  contactName: string
  calledAt: string
}) {
  const { accessToken, telephonistId, telephonistName, contactId, contactName, calledAt } = params
  if (!accessToken) return

  fetch(`${SUPABASE_URL}/rest/v1/call_logs`, {
    method: 'POST',
    keepalive: true,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      telephonist_id: telephonistId,
      telephonist_name: telephonistName,
      contact_id: contactId,
      contact_name: contactName,
      called_at: calledAt,
    }),
  }).catch(() => {})

  fetch(`${SUPABASE_URL}/rest/v1/contacts?id=eq.${contactId}`, {
    method: 'PATCH',
    keepalive: true,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ last_contacted: calledAt.slice(0, 10) }),
  }).catch(() => {})
}
