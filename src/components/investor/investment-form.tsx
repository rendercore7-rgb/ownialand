'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { INVESTMENT_AMOUNTS, INVESTMENT_OPTIONS } from '@/lib/constants'
import { formatKRW, addDays } from '@/lib/utils'
import type { InvestmentOption } from '@/types'

interface InvestmentFormProps {
  onSuccess: () => void
}

export function InvestmentForm({ onSuccess }: InvestmentFormProps) {
  const [step, setStep] = useState<'select' | 'bank' | 'sign'>('select')
  const [amount, setAmount] = useState<number>(INVESTMENT_AMOUNTS[1])
  const [option, setOption] = useState<InvestmentOption>('option1')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const dailyPayment = INVESTMENT_OPTIONS[option].getDailyPayment(amount)
  const contractDays = INVESTMENT_OPTIONS[option].contractDays

  async function handleSubmit() {
    if (!bankName || !accountNumber || !accountHolder) {
      setError('은행 정보를 모두 입력하세요.')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('인증 오류')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('investments').insert({
      user_id: user.id,
      amount,
      option,
      daily_payment: dailyPayment,
      contract_days: contractDays,
      bank_name: bankName,
      account_number: accountNumber,
      account_holder: accountHolder,
      status: 'pending',
    })

    if (insertError) {
      setError('투자 등록 실패: ' + insertError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    onSuccess()
  }

  if (step === 'select') {
    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-3">투자 금액</label>
          <div className="grid grid-cols-3 gap-3">
            {INVESTMENT_AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(a)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  amount === a
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-white'
                }`}
              >
                {formatKRW(a)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-3">투자 옵션</label>
          <div className="space-y-3">
            {(Object.entries(INVESTMENT_OPTIONS) as [InvestmentOption, typeof INVESTMENT_OPTIONS[InvestmentOption]][]).map(
              ([key, opt]) => {
                const payment = opt.getDailyPayment(amount)
                return (
                  <button
                    key={key}
                    onClick={() => setOption(key)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      option === key
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                        : 'border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-text-muted)]'
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{opt.label}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">{opt.description}</p>
                    <p className="text-sm text-[var(--color-accent)] mt-2">
                      일일 지급: {formatKRW(payment)} × {opt.contractDays}일
                    </p>
                  </button>
                )
              }
            )}
          </div>
        </div>

        <div className="bg-[var(--color-bg-hover)] rounded-lg p-4">
          <h4 className="text-sm font-medium text-white mb-2">투자 요약</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="text-[var(--color-text-muted)]">투자 금액</span>
            <span className="text-white text-right">{formatKRW(amount)}</span>
            <span className="text-[var(--color-text-muted)]">일일 지급액</span>
            <span className="text-white text-right">{formatKRW(dailyPayment)}</span>
            <span className="text-[var(--color-text-muted)]">계약 기간</span>
            <span className="text-white text-right">{contractDays}일</span>
            <span className="text-[var(--color-text-muted)]">총 지급 예정액</span>
            <span className="text-[var(--color-accent)] text-right font-medium">
              {formatKRW(dailyPayment * contractDays)}
            </span>
          </div>
        </div>

        <button
          onClick={() => setStep('bank')}
          className="w-full py-3 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium transition-colors"
        >
          다음: 은행 정보 입력
        </button>
      </div>
    )
  }

  if (step === 'bank') {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">입금 받을 은행 정보</h3>

        <div>
          <label className="block text-xs text-[var(--color-text-muted)] mb-1">은행명</label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="예: 국민은행"
            className="w-full px-4 py-3 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        <div>
          <label className="block text-xs text-[var(--color-text-muted)] mb-1">계좌번호</label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="- 없이 입력"
            className="w-full px-4 py-3 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        <div>
          <label className="block text-xs text-[var(--color-text-muted)] mb-1">예금주</label>
          <input
            type="text"
            value={accountHolder}
            onChange={(e) => setAccountHolder(e.target.value)}
            placeholder="예금주명"
            className="w-full px-4 py-3 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={() => setStep('select')}
            className="flex-1 py-3 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white transition-colors"
          >
            이전
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium transition-colors disabled:opacity-50"
          >
            {loading ? '등록 중...' : '투자 등록'}
          </button>
        </div>
      </div>
    )
  }

  return null
}
