'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { formatDate } from '@/lib/utils'
import type { Profile, UserRole, SalesTeam } from '@/types'

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', role: '' as UserRole, sales_team: '' as SalesTeam | '' })
  const [saving, setSaving] = useState(false)
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')

  const loadMembers = useCallback(async () => {
    const supabase = createClient()

    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (roleFilter !== 'all') {
      query = query.eq('role', roleFilter)
    }

    const { data } = await query
    if (data) setMembers(data)
    setLoading(false)
  }, [roleFilter])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  function startEdit(member: Profile) {
    setEditingId(member.id)
    setEditForm({
      full_name: member.full_name,
      phone: member.phone,
      role: member.role,
      sales_team: member.sales_team ?? '',
    })
  }

  async function handleSave(memberId: string) {
    setSaving(true)
    const supabase = createClient()

    const updateData: Record<string, unknown> = {
      full_name: editForm.full_name,
      phone: editForm.phone,
      role: editForm.role,
      sales_team: editForm.sales_team || null,
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', memberId)

    if (!error) {
      setEditingId(null)
      await loadMembers()
    }
    setSaving(false)
  }

  const roleFilters: { label: string; value: 'all' | UserRole }[] = [
    { label: '전체', value: 'all' },
    { label: '투자자', value: 'investor' },
    { label: '관리자', value: 'admin' },
    { label: '영업', value: 'sales' },
  ]

  const roleLabel = (role: UserRole) => {
    const labels: Record<UserRole, string> = { investor: '투자자', admin: '관리자', sales: '영업' }
    return labels[role]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="회원 관리" description="전체 회원 정보를 확인하고 수정하세요" />

      <div className="flex gap-2 overflow-x-auto pb-2">
        {roleFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setRoleFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
              roleFilter === f.value
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
        {members.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] p-5">회원이 없습니다.</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {members.map((m) => (
              <div key={m.id} className="p-5">
                {editingId === m.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-[var(--color-text-muted)] mb-1">이름</label>
                        <input
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--color-text-muted)] mb-1">전화번호</label>
                        <input
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--color-text-muted)] mb-1">역할</label>
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-sm"
                        >
                          <option value="investor">투자자</option>
                          <option value="admin">관리자</option>
                          <option value="sales">영업</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--color-text-muted)] mb-1">영업 팀</label>
                        <select
                          value={editForm.sales_team}
                          onChange={(e) => setEditForm({ ...editForm, sales_team: e.target.value as SalesTeam | '' })}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-sm"
                        >
                          <option value="">없음</option>
                          <option value="team1">Team 1</option>
                          <option value="team2">Team 2</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(m.id)}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-xs font-medium disabled:opacity-50"
                      >
                        {saving ? '저장중...' : '저장'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] text-xs hover:text-white"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-white">{m.full_name || '(이름 없음)'}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                          m.role === 'admin'
                            ? 'bg-red-500/20 text-red-400'
                            : m.role === 'sales'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {roleLabel(m.role)}
                        </span>
                        {m.sales_team && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-orange-500/20 text-orange-400">
                            {m.sales_team}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {m.email} · {m.phone || '—'} · 가입: {formatDate(m.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => startEdit(m)}
                      className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] text-xs hover:text-white transition-colors"
                    >
                      수정
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
