'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatKRW, formatDate } from '@/lib/utils'
import { INVESTMENT_OPTIONS, LAND_GRADES } from '@/lib/constants'
import type { Investment, LandTransaction, LandGrade } from '@/types'

type Tab = 'investments' | 'land'

export default function AdminInvestmentsPage() {
  const [tab, setTab] = useState<Tab>('investments')
  const [investments, setInvestments] = useState<Investment[]>([])
  const [landTxs, setLandTxs] = useState<LandTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    const supabase = createClient()

    const [invRes, landRes] = await Promise.all([
      supabase
        .from('investments')
        .select('*, profiles(full_name, phone, email)')
        .order('created_at', { ascending: false }),
      supabase
        .from('land_transactions')
        .select('*, profiles(full_name, phone, email)')
        .order('created_at', { ascending: false }),
    ])

    if (invRes.data) setInvestments(invRes.data)
    if (landRes.data) setLandTxs(landRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleUpdateStatus(investmentId: string) {
    setSaving(true)
    const supabase = createClient()

    const updateData: Record<string, unknown> = { status: editStatus }
    if (editStatus === 'active') {
      updateData.start_date = new Date().toISOString().split('T')[0]
    }

    const { error } = await supabase
      .from('investments')
      .update(updateData)
      .eq('id', investmentId)

    if (!error) {
      setEditingId(null)
      await loadData()
    }
    setSaving(false)
  }

  const statuses = ['pending', 'confirmed', 'active', 'completed', 'cancelled']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="투자 관리" description="전체 투자 기록과 LAND 거래를 관리하세요" />

      <div className="flex gap-2">
        <button
          onClick={() => setTab('investments')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            tab === 'investments'
              ? 'bg-[var(--color-accent)] text-white'
              : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-white'
          }`}
        >
          투자 ({investments.length})
        </button>
        <button
          onClick={() => setTab('land')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            tab === 'land'
              ? 'bg-[var(--color-accent)] text-white'
              : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-white'
          }`}
        >
          LAND 거래 ({landTxs.length})
        </button>
      </div>

      {tab === 'investments' && (
        <div className="space-y-3">
          {investments.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">투자 내역이 없습니다.</p>
          ) : (
            investments.map((inv) => {
              const profile = inv.profiles as unknown as { full_name: string; phone: string; email: string } | undefined

              return (
                <div
                  key={inv.id}
                  className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-white">{profile?.full_name ?? '—'}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {profile?.phone} · {profile?.email}
                      </p>
                    </div>
                    <StatusBadge status={inv.status} />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    <div>
                      <span className="text-[var(--color-text-muted)]">옵션</span>
                      <p className="text-white mt-0.5">{INVESTMENT_OPTIONS[inv.option].label.split('—')[0].trim()}</p>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-muted)]">투자 금액</span>
                      <p className="text-white mt-0.5">{formatKRW(inv.amount)}</p>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-muted)]">일일 지급</span>
                      <p className="text-[var(--color-accent)] mt-0.5">{formatKRW(inv.daily_payment)}</p>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-muted)]">계약 기간</span>
                      <p className="text-white mt-0.5">{inv.contract_days}일</p>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-muted)]">은행</span>
                      <p className="text-white mt-0.5">{inv.bank_name} · {inv.account_number}</p>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-[var(--color-text-muted)]">
                    등록: {formatDate(inv.created_at)}
                    {inv.signed_at && ` · 서명: ${formatDate(inv.signed_at)}`}
                    {inv.start_date && ` · 시작: ${formatDate(inv.start_date)}`}
                  </div>

                  <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center gap-2">
                    {editingId === inv.id ? (
                      <>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-xs"
                        >
                          {statuses.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleUpdateStatus(inv.id)}
                          disabled={saving}
                          className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-xs font-medium disabled:opacity-50"
                        >
                          {saving ? '저장중...' : '저장'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] text-xs hover:text-white"
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(inv.id)
                          setEditStatus(inv.status)
                        }}
                        className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] text-xs hover:text-white transition-colors"
                      >
                        상태 변경
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'land' && (
        <div className="space-y-3">
          {landTxs.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">LAND 거래가 없습니다.</p>
          ) : (
            landTxs.map((tx) => {
              const profile = tx.profiles as unknown as { full_name: string; phone: string; email: string } | undefined
              const grade = LAND_GRADES[tx.grade as LandGrade]

              return (
                <div
                  key={tx.id}
                  className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: grade?.color }} />
                        <p className="text-sm font-medium text-white">{grade?.label ?? tx.grade}</p>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {profile?.full_name ?? '—'} · {profile?.phone} · {profile?.email}
                      </p>
                    </div>
                    <StatusBadge status={tx.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                    <div>
                      <span className="text-[var(--color-text-muted)]">금액</span>
                      <p className="text-[var(--color-accent)] mt-0.5">${tx.price.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-muted)]">결제 방법</span>
                      <p className="text-white mt-0.5">{tx.payment_method === 'usdt' ? 'USDT' : '계좌이체'}</p>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-muted)]">신청일</span>
                      <p className="text-white mt-0.5">{formatDate(tx.created_at)}</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
