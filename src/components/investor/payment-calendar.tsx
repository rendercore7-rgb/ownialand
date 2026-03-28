'use client'

import { useState, useMemo } from 'react'
import { formatKRW } from '@/lib/utils'
import type { PaymentRequest } from '@/types'

interface PaymentCalendarProps {
  payments: PaymentRequest[]
  startDate: string
  months?: number
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

const STATUS_COLORS: Record<string, string> = {
  requested: 'bg-yellow-500/60',
  confirmed: 'bg-blue-500/60',
  transferred: 'bg-green-500/60',
}

export function PaymentCalendar({ payments, startDate, months = 12 }: PaymentCalendarProps) {
  const start = new Date(startDate)
  const [selectedMonth, setSelectedMonth] = useState(start.getMonth())
  const [selectedYear, setSelectedYear] = useState(start.getFullYear())

  const monthOptions = useMemo(() => {
    const options: { year: number; month: number; label: string }[] = []
    const d = new Date(start)
    for (let i = 0; i < months; i++) {
      options.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${d.getFullYear()}년 ${d.getMonth() + 1}월`,
      })
      d.setMonth(d.getMonth() + 1)
    }
    return options
  }, [startDate, months])

  const paymentMap = useMemo(() => {
    const map: Record<string, PaymentRequest> = {}
    for (const p of payments) {
      map[p.payment_date] = p
    }
    return map
  }, [payments])

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth)
  const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth)

  const monthPayments = payments.filter((p) => {
    const d = new Date(p.payment_date)
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
  })

  const monthTotal = monthPayments.reduce((sum, p) => sum + p.amount, 0)
  const transferred = monthPayments.filter((p) => p.status === 'transferred')
  const transferredTotal = transferred.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-4">
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

      <div className="flex gap-4 text-xs mb-3">
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

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <div key={d} className="py-2 text-[var(--color-text-muted)] font-medium">{d}</div>
        ))}

        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const payment = paymentMap[dateStr]
          const isSun = new Date(selectedYear, selectedMonth, day).getDay() === 0

          return (
            <div
              key={day}
              className={`relative py-2 rounded-md text-xs ${
                payment
                  ? `${STATUS_COLORS[payment.status] ?? 'bg-gray-500/30'} text-white`
                  : isSun
                    ? 'text-red-400/50'
                    : 'text-[var(--color-text-muted)]'
              }`}
            >
              {day}
            </div>
          )
        })}
      </div>

      <div className="bg-[var(--color-bg-hover)] rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-text-muted)]">이번 달 예정액</span>
          <span className="text-white">{formatKRW(monthTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-text-muted)]">송금 완료</span>
          <span className="text-green-400">{formatKRW(transferredTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-text-muted)]">지급 건수</span>
          <span className="text-white">{monthPayments.length}건 (완료 {transferred.length}건)</span>
        </div>
      </div>

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
                  {p.status === 'transferred' ? '완료' : p.status === 'confirmed' ? '확인' : '요청'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
