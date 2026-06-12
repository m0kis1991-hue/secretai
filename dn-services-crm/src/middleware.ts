import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ROLE } from './app/lib/constants'

// Wraps a promise with a timeout; resolves to fallback value on timeout
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ])
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Use getSession() (local JWT validation — no network call to Supabase auth server).
  // getUser() makes a network round-trip on every page load and causes 307 redirects
  // whenever Supabase auth is slow (observed 1-7s spikes). getSession() is safe for
  // routing decisions; actual data APIs still validate via RLS with the user's JWT.
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

  const path = request.nextUrl.pathname
  const isLoginPage = path === '/login'
  const isSuspendedPage = path === '/suspended'

  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // For all authenticated, non-login pages: fetch profile once for all checks.
  // 4-second timeout so a slow DB doesn't block the page.
  if (user && !isSuspendedPage) {
    const profileResult = await withTimeout(
      supabase.from('profiles').select('role, suspended').eq('id', user.id).single(),
      4000,
      { data: null, error: null },
    )
    const profile = profileResult?.data

    // Ghost freeze: suspended non-superadmin users → /suspended
    if (profile?.suspended && profile?.role !== ROLE.SUPERADMIN) {
      return NextResponse.redirect(new URL('/suspended', request.url))
    }

    // /clients: superadmin only
    if (path === '/clients' && profile?.role !== ROLE.SUPERADMIN) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    // /chat: superadmin cannot access
    if (path === '/chat' && profile?.role === ROLE.SUPERADMIN) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    // /dial: removed feature
    if (path === '/dial') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
