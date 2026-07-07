import { NextResponse, type NextRequest } from 'next/server'

// Check for a Supabase session cookie locally — no network call.
// Security is enforced by Supabase RLS on every DB query; the middleware
// only needs to decide "show the app or redirect to /login".
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    c => /^sb-.+-auth-token/.test(c.name) && c.value.length > 20
  )
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  const authenticated = hasSessionCookie(request)

  if (!authenticated && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (authenticated && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
