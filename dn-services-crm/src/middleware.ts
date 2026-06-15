import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  // Local JWT read — zero network calls. Pages enforce their own role checks.
  const { data: { session } } = await supabase.auth.getSession()
  const isAuthenticated = !!session?.user

  const path = request.nextUrl.pathname

  // Removed feature: always redirect away from /dial
  if (path === '/dial') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (!isAuthenticated && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthenticated && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
