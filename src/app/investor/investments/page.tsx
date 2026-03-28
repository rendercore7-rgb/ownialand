'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { InvestmentForm } from '@/components/investor/investment-form'
import { PromissoryNote } from '@/components/investor/promissory-note'
import { formatKRW, formatDate } from '@/lib/utils'
import { INVESTMENT_OPTIONS } from '@/lib/constants'
import type { Investment } from '@/types'

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null)

  const loadInvestments = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setInvestments(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadInvestments()
  }, [loadInvestments])

  function handleFormSuccess() {
    setShowForm(false)
    loadInvestments()
  }

  function handleSigned() {
    setSelectedInvestment(null)
    loadInvestments()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">로딩 중...</p>
      </div>
    )
  }

  if (selectedInvestment) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="차용증 서명"
          action={
            <button
              onClick={() => setSelectedInvestment(null)}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors"
            >
              뒤로
            </button>
          }
        />
        <div className="max-w-lg mx-auto">
          <PromissoryNote investment={selectedInvestment} onSigned={handleSigned} />
        </div>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="새 투자 등록"
          action={
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors"
            >
              취소
            </button>
          }
        />
        <div className="max-w-lg mx-auto">
          <InvestmentForm onSuccess={handleFormSuccess} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="내 투자"
        description="투자 목록 및 새 투자를 등록하세요"
        action={
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium transition-colors"
          >
            + 새 투자
          </button>
        }
      />

      {investments.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[var(--color-text-muted)] mb-4">아직 등록된 투자가 없습니다.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium transition-colors"
          >
            첫 투자 등록하기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {investments.map((inv) => (
            <div
              key={inv.id}
              className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{INVESTMENT_OPTIONS[inv.option].label}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    등록일: {formatDate(inv.created_at)}
                  </p>
                </div>
                <StatusBadge status={inv.status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
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
                  <p className="text-white mt-0.5">{inv.bank_name}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                {inv.signed_at ? (
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-sm font-medium">
                      서명 완료
                    </span>
                    <button
                      onClick={() => setSelectedInvestment(inv)}
                      className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] text-xs hover:text-white transition-colors"
                    >
                      차용증 보기
                    </button>
                  </div>
                ) : inv.status === 'pending' ? (
                  <button
                    onClick={() => setSelectedInvestment(inv)}
                    className="px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium transition-colors"
                  >
                    차용증 서명하기
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
