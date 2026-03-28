import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_admin')
          .eq('id', user.id)
          .single()

        if (profile) {
          if (profile.is_admin) {
            return NextResponse.redirect(`${origin}/admin`)
          }
          if (profile.role === 'sales') {
            return NextResponse.redirect(`${origin}/sales`)
          }
          return NextResponse.redirect(`${origin}/investor`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`)
}
