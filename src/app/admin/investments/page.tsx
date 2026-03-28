'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatKRW, formatKRWShort, formatDate } from '@/lib/utils'
import type { Investment, InvestmentStatus } from '@/types'

type FilterStatus = 'all' | InvestmentStatus

interface EditForm {
  full_name: string
  phone: string
  bank_name: string
  account_number: string
  account_holder: string
  start_date: string
  end_date: string
}

export default function AdminInvestmentsPage() {
  const [allInvestments, setAllInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [processing, setProcessing] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    full_name: '', phone: '', bank_name: '', account_number: '', account_holder: '',
    start_date: '', end_date: '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadInvestments = useCallback(async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from('investments')
      .select('*, profiles(full_name, phone, email)')
      .order('created_at', { ascending: false })

    if (data) setAllInvestments(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadInvestments()
  }, [loadInvestments])

  const filtered = useMemo(() => {
    if (filter === 'all') return allInvestments
    return allInvestments.filter((inv) => inv.status === filter)
  }, [allInvestments, filter])

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const totalCount = allInvestments.length
    const totalAmount = allInvestments.reduce((sum, inv) => sum + inv.amount, 0)
    const activeCount = allInvestments.filter((inv) => inv.status === 'active').length
    const todayPaymentCount = allInvestments.filter(
      (inv) => inv.status === 'active' && inv.start_date && inv.start_date <= today
    ).length
    return { totalCount, totalAmount, activeCount, todayPaymentCount }
  }, [allInvestments])

  async function handleActivate(investmentId: string) {
    setProcessing(investmentId)
    const supabase = createClient()

    const { error } = await supabase
      .from('investments')
      .update({
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', investmentId)

    if (!error) await loadInvestments()
    setProcessing(null)
  }

  async function handleDelete(investmentId: string) {
    if (!confirm('이 투자를 삭제하시겠습니까? 관련 지급 요청도 함께 삭제됩니다.')) return
    setDeleting(investmentId)
    const supabase = createClient()

    await supabase.from('payment_requests').delete().eq('investment_id', investmentId)
    const { error } = await supabase.from('investments').delete().eq('id', investmentId)

    if (!error) {
      await loadInvestments()
    } else {
      setError('삭제에 실패했습니다.')
    }
    setDeleting(null)
  }

  async function handleComplete(investmentId: string) {
    setProcessing(investmentId)
    const supabase = createClient()

    const { error } = await supabase
      .from('investments')
      .update({
        status: 'completed',
        end_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', investmentId)

    if (!error) await loadInvestments()
    setProcessing(null)
  }

  function startEdit(inv: Investment) {
    const profile = inv.profiles as unknown as { full_name: string; phone: string } | undefined
    setEditingId(inv.id)
    setEditForm({
      full_name: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      bank_name: inv.bank_name,
      account_number: inv.account_number,
      account_holder: inv.account_holder,
      start_date: inv.start_date ?? '',
      end_date: inv.end_date ?? '',
    })
    setError('')
  }

  async function handleSaveEdit(inv: Investment) {
    setSaving(true)
    setError('')
    const supabase = createClient()

    try {
      // 프로필 수정 (이름, 전화번호)
      const profileRes = await fetch(`/api/admin/members/${inv.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editForm.full_name,
          phone: editForm.phone,
        }),
      })
      const profileJson = await profileRes.json()
      if (!profileJson.success) {
        setError(profileJson.error ?? '프로필 수정 실패')
        setSaving(false)
        return
      }

      // 계좌 정보 수정 (investments 테이블)
      const { error: invError } = await supabase
        .from('investments')
        .update({
          bank_name: editForm.bank_name,
          account_number: editForm.account_number,
          account_holder: editForm.account_holder,
          start_date: editForm.start_date || null,
          end_date: editForm.end_date || null,
        })
        .eq('id', inv.id)

      if (invError) {
        setError('계좌 정보 수정 실패')
        setSaving(false)
        return
      }

      setEditingId(null)
      await loadInvestments()
    } catch {
      setError('저장에 실패했습니다.')
    }
    setSaving(false)
  }

  const filters: { label: string; value: FilterStatus }[] = [
    { label: '전체', value: 'all' },
    { label: '대기', value: 'pending' },
    { label: '운용중', value: 'active' },
    { label: '완료', value: 'completed' },
    { label: '취소', value: 'cancelled' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="투자 관리" description="전체 투자 내역을 조회하고 상태를 관리하세요" />

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="전체 투자건수" value={`${stats.totalCount}건`} />
        <StatCard label="총 투자금액" value={formatKRWShort(stats.totalAmount)} accent />
        <StatCard label="활성 투자건수" value={`${stats.activeCount}건`} />
        <StatCard label="오늘 지급 예정" value={`${stats.todayPaymentCount}건`} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
              filter === f.value
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] p-5">해당하는 투자 내역이 없습니다.</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.map((inv) => {
              const profile = inv.profiles as unknown as { full_name: string; phone: string; email: string } | undefined
              const isEditing = editingId === inv.id

              return (
                <div key={inv.id} className="p-5">
                  {isEditing ? (
                    <div className="space-y-4">
                      <p className="text-xs text-[var(--color-text-muted)]">투자자 정보 수정</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                          <label className="block text-xs text-[var(--color-text-muted)] mb-1">은행명</label>
                          <input
                            value={editForm.bank_name}
                            onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--color-text-muted)] mb-1">계좌번호</label>
                          <input
                            value={editForm.account_number}
                            onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--color-text-muted)] mb-1">예금주</label>
                          <input
                            value={editForm.account_holder}
                            onChange={(e) => setEditForm({ ...editForm, account_holder: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--color-text-muted)] mb-1">시작일</label>
                          <input
                            type="date"
                            value={editForm.start_date}
                            onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--color-text-muted)] mb-1">종료일</label>
                          <input
                            type="date"
                            value={editForm.end_date}
                            onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(inv)}
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
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <p className="text-sm font-medium text-white">{profile?.full_name ?? '—'}</p>
                          {profile?.phone && (
                            <span className="text-xs text-[var(--color-text-muted)]">{profile.phone}</span>
                          )}
                          <StatusBadge status={inv.status} />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
                          <div>
                            <span className="text-[var(--color-text-muted)]">투자금액</span>
                            <p className="text-white font-medium mt-0.5">{formatKRWShort(inv.amount)}</p>
                            <p className="text-[var(--color-text-muted)] mt-0.5">{formatKRW(inv.amount)}</p>
                          </div>
                          <div>
                            <span className="text-[var(--color-text-muted)]">일일지급액</span>
                            <p className="text-[var(--color-accent)] font-medium mt-0.5">{formatKRW(inv.daily_payment)}</p>
                          </div>
                          <div>
                            <span className="text-[var(--color-text-muted)]">계좌정보</span>
                            <p className="text-white mt-0.5">{inv.bank_name} {inv.account_number}</p>
                            <p className="text-[var(--color-text-muted)] mt-0.5">예금주: {inv.account_holder}</p>
                          </div>
                          <div>
                            <span className="text-[var(--color-text-muted)]">시작일</span>
                            <p className="text-white mt-0.5">{inv.start_date ? formatDate(inv.start_date) : '—'}</p>
                          </div>
                          <div>
                            <span className="text-[var(--color-text-muted)]">계약기간</span>
                            <p className="text-white mt-0.5">{inv.contract_days}일</p>
                            <p className="text-[var(--color-text-muted)] mt-0.5">등록 {formatDate(inv.created_at)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => startEdit(inv)}
                          className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] text-xs hover:text-white transition-colors"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(inv.id)}
                          disabled={deleting === inv.id}
                          className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        >
                          {deleting === inv.id ? '삭제중...' : '삭제'}
                        </button>
                        {inv.status === 'pending' && (
                          <button
                            onClick={() => handleActivate(inv.id)}
                            disabled={processing === inv.id}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            {processing === inv.id ? '처리중...' : '활성화'}
                          </button>
                        )}
                        {inv.status === 'active' && (
                          <button
                            onClick={() => handleComplete(inv.id)}
                            disabled={processing === inv.id}
                            className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            {processing === inv.id ? '처리중...' : '완료처리'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4">
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p className={`text-lg font-semibold mt-1 ${accent ? 'text-[var(--color-accent)]' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}
