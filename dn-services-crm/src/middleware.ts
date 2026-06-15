import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const path = request.nextUrl.pathname

  if (path === '/dial') {
    return NextResponse.redirect(new URL('/', request.url))
  }

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

  // getUser() validates the JWT server-side. If Supabase is slow we fail-open
  // (let the request through) rather than false-redirecting everyone to /login.
  // Data is still protected by RLS regardless of what the middleware decides.
  let user: { id: string } | null = null
  try {
    const result = await Promise.race<ReturnType<typeof supabase.auth.getUser> | never>([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('auth_timeout')), 5000)
      ),
    ])
    user = (result as Awaited<ReturnType<typeof supabase.auth.getUser>>).data.user
  } catch {
    // Supabase auth timeout or error → fail open: pass request through.
    return response
  }

  if (!user && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
