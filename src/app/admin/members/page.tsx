'use client'

import { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { formatDate } from '@/lib/utils'
import type { Profile, UserRole, SalesTeam } from '@/types'

interface CreateForm {
  email: string
  password: string
  full_name: string
  phone: string
  role: UserRole
  sales_team: SalesTeam | ''
}

const initialCreateForm: CreateForm = {
  email: '',
  password: '',
  full_name: '',
  phone: '',
  role: 'investor',
  sales_team: '',
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', role: '' as UserRole, sales_team: '' as SalesTeam | '' })
  const [saving, setSaving] = useState(false)
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<CreateForm>(initialCreateForm)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/members')
      const json = await res.json()
      if (json.success) {
        const filtered = roleFilter === 'all'
          ? json.data
          : json.data.filter((m: Profile) => m.role === roleFilter)
        setMembers(filtered)
      }
    } catch {
      setError('회원 목록을 불러오는데 실패했습니다.')
    }
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
    setError('')

    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editForm.full_name,
          phone: editForm.phone,
          role: editForm.role,
          sales_team: editForm.sales_team || null,
        }),
      })

      const json = await res.json()
      if (json.success) {
        setEditingId(null)
        await loadMembers()
      } else {
        setError(json.error ?? '수정에 실패했습니다.')
      }
    } catch {
      setError('수정 요청에 실패했습니다.')
    }
    setSaving(false)
  }

  async function handleCreate() {
    setCreating(true)
    setError('')

    try {
      const res = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          sales_team: createForm.sales_team || null,
        }),
      })

      const json = await res.json()
      if (json.success) {
        setShowCreate(false)
        setCreateForm(initialCreateForm)
        await loadMembers()
      } else {
        setError(json.error ?? '회원 생성에 실패했습니다.')
      }
    } catch {
      setError('회원 생성 요청에 실패했습니다.')
    }
    setCreating(false)
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
      <div className="flex items-center justify-between">
        <PageHeader title="회원 관리" description="전체 회원 정보를 확인하고 수정하세요" />
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {showCreate ? '취소' : '+ 회원 추가'}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {showCreate && (
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5 space-y-4">
          <h3 className="text-sm font-medium text-white">새 회원 등록</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">이름 *</label>
              <input
                value={createForm.full_name}
                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                placeholder="홍길동"
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">이메일 *</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="user@example.com"
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">비밀번호 *</label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="6자 이상"
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">전화번호</label>
              <input
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="010-1234-5678"
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">역할 *</label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
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
                value={createForm.sales_team}
                onChange={(e) => setCreateForm({ ...createForm, sales_team: e.target.value as SalesTeam | '' })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-sm"
              >
                <option value="">없음</option>
                <option value="team1">Team 1</option>
                <option value="team2">Team 2</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !createForm.email || !createForm.password || !createForm.full_name}
            className="px-6 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {creating ? '생성 중...' : '회원 생성'}
          </button>
        </div>
      )}

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
