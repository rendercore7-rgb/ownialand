import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { UserRole, SalesTeam } from '@/types'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin' ? user : null
}

export async function GET() {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
  }

  const body = await request.json()
  const { email, password, full_name, phone, role, sales_team, is_team_leader } = body as {
    email: string
    password: string
    full_name: string
    phone?: string
    role: UserRole
    sales_team?: SalesTeam | null
    is_team_leader?: boolean
  }

  if (!email || !password || !full_name || !role) {
    return NextResponse.json(
      { success: false, error: '필수 항목을 입력하세요. (이메일, 비밀번호, 이름, 역할)' },
      { status: 400 }
    )
  }

  // 1. Create auth user via Admin API
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  })

  if (authError) {
    return NextResponse.json({ success: false, error: authError.message }, { status: 400 })
  }

  const userId = authData.user.id

  // 2. Update profile with additional fields (trigger already created the profile)
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      phone: phone ?? '',
      role,
      is_admin: role === 'admin',
      sales_team: sales_team ?? null,
      is_team_leader: is_team_leader ?? false,
    })
    .eq('id', userId)

  if (profileError) {
    return NextResponse.json({ success: false, error: profileError.message }, { status: 500 })
  }

  // 3. Fetch the updated profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return NextResponse.json({ success: true, data: profile }, { status: 201 })
}
