'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { formatDate } from '@/lib/utils'
import type { SalesJournal } from '@/types'

export default function SalesJournalPage() {
  const [journals, setJournals] = useState<SalesJournal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    journal_date: new Date().toISOString().split('T')[0],
    content: '',
    consultation_count: 0,
  })

  const loadJournals = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('sales_journals')
      .select('*')
      .eq('user_id', user.id)
      .order('journal_date', { ascending: false })

    if (data) setJournals(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadJournals()
  }, [loadJournals])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.content.trim()) return

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('sales_journals').insert({
      user_id: user.id,
      journal_date: form.journal_date,
      content: form.content,
      consultation_count: form.consultation_count,
    })

    if (!error) {
      setForm({
        journal_date: new Date().toISOString().split('T')[0],
        content: '',
        consultation_count: 0,
      })
      setShowForm(false)
      await loadJournals()
    }
    setSaving(false)
  }

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthlyCount = journals.filter((j) => j.journal_date.startsWith(currentMonth)).length
  const journalGoal = 20
  const progressPercent = Math.min((monthlyCount / journalGoal) * 100, 100)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="영업 일지"
        description="매일 영업 활동을 기록하세요 (월 20건 기본급 조건)"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium"
          >
            {showForm ? '취소' : '일지 작성'}
          </button>
        }
      />

      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-[var(--color-text-muted)]">이번 달 작성 현황</p>
          <p className="text-sm font-medium text-white">
            {monthlyCount}/{journalGoal}
            {monthlyCount >= journalGoal && (
              <span className="ml-2 text-green-400 text-xs">달성</span>
            )}
          </p>
        </div>
        <div className="h-2 rounded-full bg-[var(--color-bg-hover)] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              monthlyCount >= journalGoal ? 'bg-green-500' : 'bg-[var(--color-accent)]'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">날짜</label>
              <input
                type="date"
                value={form.journal_date}
                onChange={(e) => setForm({ ...form, journal_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">상담 건수</label>
              <input
                type="number"
                min={0}
                value={form.consultation_count}
                onChange={(e) => setForm({ ...form, consultation_count: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">활동 내용</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={5}
              placeholder="오늘의 영업 활동을 기록하세요..."
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)] resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !form.content.trim()}
            className="px-6 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </form>
      )}

      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
        {journals.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] p-5">작성된 일지가 없습니다.</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {journals.map((j) => (
              <div key={j.id} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-white">{formatDate(j.journal_date)}</p>
                  <span className="text-xs text-[var(--color-text-muted)]">상담 {j.consultation_count}건</span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">{j.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
