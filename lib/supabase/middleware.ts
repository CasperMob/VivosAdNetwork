import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/signin', '/api/ads', '/api/ads/all', '/api/waitlist']
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/api/ads') || pathname.startsWith('/api/waitlist')

  // Protected routes
  const adminRoutes = ['/admin']
  const advertiserRoutes = ['/onboard', '/analytics']
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))
  const isAdvertiserRoute = advertiserRoutes.some(route => pathname.startsWith(route))

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    const redirectUrl = url.clone()
    redirectUrl.pathname = '/signin'
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated, check role-based access
  if (user) {
    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = userData?.role || 'advertiser'

    // Redirect based on role if accessing root
    if (pathname === '/') {
      if (userRole === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url))
      } else {
        // Check if advertiser has campaigns
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)

        if (campaigns && campaigns.length > 0) {
          return NextResponse.redirect(new URL('/analytics', request.url))
        } else {
          return NextResponse.redirect(new URL('/onboard', request.url))
        }
      }
    }

    // Check admin route access
    if (isAdminRoute && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/onboard', request.url))
    }

    // Check advertiser route access
    if (isAdvertiserRoute && userRole !== 'advertiser') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    // Redirect authenticated users away from signin
    if (pathname === '/signin') {
      if (userRole === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url))
      } else {
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)

        if (campaigns && campaigns.length > 0) {
          return NextResponse.redirect(new URL('/analytics', request.url))
        } else {
          return NextResponse.redirect(new URL('/onboard', request.url))
        }
      }
    }
  }

  return response
}

