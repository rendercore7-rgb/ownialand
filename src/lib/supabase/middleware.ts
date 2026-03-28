import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  const protectedPaths = ['/investor', '/admin', '/sales']
  const isProtected = protectedPaths.some((p) => path.startsWith(p))

  // 미인증 → 로그인으로
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // 인증된 사용자 → role 기반 접근 제어
  if (user && isProtected) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    const role = profile.role

    // DEBUG: 미들웨어 role 확인
    console.log(`[middleware] path=${path}, role=${role}`)

    // 각 경로에 허용된 role 매핑
    const allowed =
      (path.startsWith('/admin') && role === 'admin') ||
      (path.startsWith('/sales') && (role === 'sales' || role === 'admin')) ||
      (path.startsWith('/investor') && (role === 'investor' || role === 'admin'))

    console.log(`[middleware] allowed=${allowed}`)

    if (!allowed) {
      const redirectMap: Record<string, string> = {
        admin: '/admin',
        sales: '/sales',
        investor: '/investor',
      }
      const dest = redirectMap[role] ?? '/'
      console.log(`[middleware] REDIRECTING to ${dest}`)
      const url = request.nextUrl.clone()
      url.pathname = dest
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
