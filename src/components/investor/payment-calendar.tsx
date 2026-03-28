'use client'

import { useState, useMemo } from 'react'
import { formatKRW } from '@/lib/utils'
import type { PaymentRequest, Investment } from '@/types'

interface PaymentCalendarProps {
  payments: PaymentRequest[]
  investment: Investment
  onRequestPayment: (date: string) => Promise<void>
  todayRequested: boolean
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const STATUS_COLORS: Record<string, string> = {
  requested: 'bg-yellow-500/60',
  confirmed: 'bg-blue-500/60',
  transferred: 'bg-green-500/60',
}

const STATUS_LABELS: Record<string, string> = {
  requested: '요청됨',
  confirmed: '확인됨',
  transferred: '송금완료',
}

export function PaymentCalendar({ payments, investment, onRequestPayment, todayRequested }: PaymentCalendarProps) {
  const startDate = investment.start_date ?? investment.created_at
  const start = new Date(startDate)
  const [selectedYear, setSelectedYear] = useState(start.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(start.getMonth())
  const [requesting, setRequesting] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const paymentStartDate = useMemo(() => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + 7)
    return d
  }, [startDate])

  const paymentEndDate = useMemo(() => {
    const d = new Date(paymentStartDate)
    d.setDate(d.getDate() + investment.contract_days)
    return d
  }, [paymentStartDate, investment.contract_days])

  const eligibleDates = useMemo(() => {
    const dates = new Set<string>()
    const d = new Date(paymentStartDate)
    const end = paymentEndDate

    while (d <= end) {
      const isSunday = d.getDay() === 0
      if (investment.option === 'option2' && isSunday) {
        d.setDate(d.getDate() + 1)
        continue
      }
      dates.add(d.toISOString().split('T')[0])
      d.setDate(d.getDate() + 1)
    }
    return dates
  }, [paymentStartDate, paymentEndDate, investment.option])

  const monthOptions = useMemo(() => {
    const options: { year: number; month: number; label: string }[] = []
    const d = new Date(start)
    const monthCount = investment.option === 'option1' ? 14 : 6
    for (let i = 0; i < monthCount; i++) {
      options.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${d.getFullYear()}년 ${d.getMonth() + 1}월`,
      })
      d.setMonth(d.getMonth() + 1)
    }
    return options
  }, [startDate, investment.option])

  const paymentMap = useMemo(() => {
    const map: Record<string, PaymentRequest> = {}
    for (const p of payments) {
      map[p.payment_date] = p
    }
    return map
  }, [payments])

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth)
  const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth)
  const todayStr = new Date().toISOString().split('T')[0]

  const monthPayments = payments.filter((p) => {
    const d = new Date(p.payment_date)
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
  })

  const monthEligibleCount = Array.from(eligibleDates).filter((d) => {
    const date = new Date(d)
    return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth
  }).length

  const monthTotal = monthEligibleCount * investment.daily_payment
  const transferred = monthPayments.filter((p) => p.status === 'transferred')
  const transferredTotal = transferred.reduce((sum, p) => sum + p.amount, 0)

  async function handleDateClick(dateStr: string) {
    if (dateStr !== todayStr) return
    if (todayRequested) return
    if (!eligibleDates.has(dateStr)) return
    if (paymentMap[dateStr]) return

    setSelectedDate(dateStr)
  }

  async function confirmRequest() {
    if (!selectedDate) return
    setRequesting(true)
    await onRequestPayment(selectedDate)
    setRequesting(false)
    setSelectedDate(null)
  }

  return (
    <div className="space-y-4">
      {/* 월 선택 */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {monthOptions.map((opt) => (
          <button
            key={`${opt.year}-${opt.month}`}
            onClick={() => {
              setSelectedYear(opt.year)
              setSelectedMonth(opt.month)
            }}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
              selectedYear === opt.year && selectedMonth === opt.month
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 범례 */}
      <div className="flex gap-4 text-xs mb-3 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/20" /> 지급 가능
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-yellow-500/60" /> 요청됨
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-500/60" /> 확인됨
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-500/60" /> 송금완료
        </span>
      </div>

      {/* 캘린더 그리드 */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <div key={d} className="py-2 text-[var(--color-text-muted)] font-medium">{d}</div>
        ))}

        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = toDateStr(selectedYear, selectedMonth, day)
          const payment = paymentMap[dateStr]
          const isEligible = eligibleDates.has(dateStr)
          const isSun = new Date(selectedYear, selectedMonth, day).getDay() === 0
          const isToday = dateStr === todayStr
          const canClick = isToday && isEligible && !payment && !todayRequested

          let cellClass = 'text-[var(--color-text-muted)]'

          if (payment) {
            cellClass = `${STATUS_COLORS[payment.status] ?? 'bg-gray-500/30'} text-white`
          } else if (isEligible) {
            cellClass = 'bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-[var(--color-accent)]'
          } else if (isSun) {
            cellClass = 'text-red-400/50'
          }

          return (
            <button
              key={day}
              type="button"
              onClick={() => canClick && handleDateClick(dateStr)}
              disabled={!canClick}
              className={`relative py-2 rounded-md text-xs transition-all ${cellClass} ${
                isToday ? 'ring-2 ring-white/70' : ''
              } ${canClick ? 'cursor-pointer hover:ring-2 hover:ring-[var(--color-accent)]' : ''}`}
            >
              {day}
              {payment && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-white/80" />
              )}
            </button>
          )
        })}
      </div>

      {/* 지급 요청 확인 팝업 */}
      {selectedDate && (
        <div className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 rounded-xl p-5 space-y-3">
          <p className="text-sm text-white font-medium">지급 요청 확인</p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {selectedDate} · {formatKRW(investment.daily_payment)}
            {new Date().getHours() < 12 ? ' · 당일 송금' : ' · 익일 송금'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmRequest}
              disabled={requesting}
              className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
            >
              {requesting ? '요청 중...' : '지급 요청'}
            </button>
            <button
              onClick={() => setSelectedDate(null)}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] text-sm hover:text-white transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 지급 시작일 안내 */}
      <div className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-hover)] rounded-lg px-4 py-3">
        지급 시작일: <span className="text-white">{paymentStartDate.toLocaleDateString('ko-KR')}</span>
        {' '}(투자일로부터 7일 후)
        {investment.option === 'option2' && <span> · 일요일 제외</span>}
      </div>

      {/* 이번 달 요약 */}
      <div className="bg-[var(--color-bg-hover)] rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-text-muted)]">이번 달 지급 가능일</span>
          <span className="text-white">{monthEligibleCount}일</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-text-muted)]">이번 달 예정액</span>
          <span className="text-white">{formatKRW(monthTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-text-muted)]">요청 완료</span>
          <span className="text-white">{monthPayments.length}건</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-text-muted)]">송금 완료</span>
          <span className="text-green-400">{formatKRW(transferredTotal)}</span>
        </div>
      </div>

      {/* 상세 내역 */}
      {monthPayments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-white">상세 내역</h4>
          <div className="space-y-1">
            {monthPayments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--color-bg-card)] text-xs"
              >
                <span className="text-[var(--color-text-secondary)]">{p.payment_date}</span>
                <span className="text-white">{formatKRW(p.amount)}</span>
                <span
                  className={`px-2 py-0.5 rounded-full ${
                    p.status === 'transferred'
                      ? 'bg-green-500/20 text-green-400'
                      : p.status === 'confirmed'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {STATUS_LABELS[p.status] ?? p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
