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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { full_name, phone, role, sales_team, is_team_leader } = body as {
    full_name?: string
    phone?: string
    role?: UserRole
    sales_team?: SalesTeam | null
    is_team_leader?: boolean
  }

  const updateData: Record<string, unknown> = {}
  if (full_name !== undefined) updateData.full_name = full_name
  if (phone !== undefined) updateData.phone = phone
  if (role !== undefined) {
    updateData.role = role
    updateData.is_admin = role === 'admin'
  }
  if (sales_team !== undefined) updateData.sales_team = sales_team || null
  if (is_team_leader !== undefined) updateData.is_team_leader = is_team_leader

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
