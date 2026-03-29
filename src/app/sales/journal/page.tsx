'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { formatDate } from '@/lib/utils'
import type { SalesJournal, ConsultationType } from '@/types'

const CONSULTATION_TYPES: { value: ConsultationType; label: string }[] = [
  { value: 'call', label: '전화 상담' },
  { value: 'meeting', label: '대면 미팅' },
  { value: 'online', label: '온라인 상담' },
  { value: 'referral', label: '소개/추천' },
  { value: 'other', label: '기타' },
]

type ViewMode = 'daily' | 'weekly' | 'monthly'

export default function SalesJournalPage() {
  const [journals, setJournals] = useState<SalesJournal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('daily')
  const [form, setForm] = useState({
    journal_date: new Date().toISOString().split('T')[0],
    content: '',
    consultation_count: 0,
    consultation_type: 'call' as ConsultationType,
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

  function resetForm() {
    setForm({
      journal_date: new Date().toISOString().split('T')[0],
      content: '',
      consultation_count: 0,
      consultation_type: 'call',
    })
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(j: SalesJournal) {
    setEditingId(j.id)
    setForm({
      journal_date: j.journal_date,
      content: j.content,
      consultation_count: j.consultation_count,
      consultation_type: j.consultation_type ?? 'call',
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.content.trim()) return

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    if (editingId) {
      const { error } = await supabase
        .from('sales_journals')
        .update({
          journal_date: form.journal_date,
          content: form.content,
          consultation_count: form.consultation_count,
          consultation_type: form.consultation_type,
        })
        .eq('id', editingId)

      if (!error) {
        resetForm()
        await loadJournals()
      }
    } else {
      const { error } = await supabase.from('sales_journals').insert({
        user_id: user.id,
        journal_date: form.journal_date,
        content: form.content,
        consultation_count: form.consultation_count,
        consultation_type: form.consultation_type,
      })

      if (!error) {
        resetForm()
        await loadJournals()
      }
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('이 일지를 삭제하시겠습니까?')) return
    setDeleting(id)
    const supabase = createClient()
    const { error } = await supabase.from('sales_journals').delete().eq('id', id)
    if (!error) await loadJournals()
    setDeleting(null)
  }

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthlyJournals = journals.filter((j) => j.journal_date.startsWith(currentMonth))
  const journalGoal = 20
  const progressPercent = Math.min((monthlyJournals.length / journalGoal) * 100, 100)

  // 주간/월간 리포트
  const report = useMemo(() => {
    const targetJournals = viewMode === 'monthly'
      ? monthlyJournals
      : viewMode === 'weekly'
        ? (() => {
            const today = new Date()
            const dayOfWeek = today.getDay()
            const weekStart = new Date(today)
            weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
            const weekStartStr = weekStart.toISOString().split('T')[0]
            return journals.filter((j) => j.journal_date >= weekStartStr)
          })()
        : journals

    const totalConsultations = targetJournals.reduce((sum, j) => sum + j.consultation_count, 0)
    const avgConsultations = targetJournals.length > 0 ? Math.round(totalConsultations / targetJournals.length) : 0

    const typeBreakdown: Record<string, number> = {}
    for (const j of targetJournals) {
      const type = j.consultation_type ?? 'other'
      typeBreakdown[type] = (typeBreakdown[type] ?? 0) + j.consultation_count
    }

    return {
      count: targetJournals.length,
      totalConsultations,
      avgConsultations,
      typeBreakdown,
    }
  }, [journals, monthlyJournals, viewMode])

  const typeLabel = (type: string) => CONSULTATION_TYPES.find((t) => t.value === type)?.label ?? '기타'

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
            onClick={() => { if (showForm) resetForm(); else setShowForm(true) }}
            className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium"
          >
            {showForm ? '취소' : '일지 작성'}
          </button>
        }
      />

      {/* 월간 진행 */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-[var(--color-text-muted)]">이번 달 작성 현황</p>
          <p className="text-sm font-medium text-white">
            {monthlyJournals.length}/{journalGoal}
            {monthlyJournals.length >= journalGoal && (
              <span className="ml-2 text-green-400 text-xs">달성</span>
            )}
          </p>
        </div>
        <div className="h-2 rounded-full bg-[var(--color-bg-hover)] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              monthlyJournals.length >= journalGoal ? 'bg-green-500' : 'bg-[var(--color-accent)]'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 리포트 */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">리포트</h3>
          <div className="flex gap-1">
            {(['daily', 'weekly', 'monthly'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                  viewMode === mode
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-white'
                }`}
              >
                {mode === 'daily' ? '전체' : mode === 'weekly' ? '주간' : '월간'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs text-[var(--color-text-muted)]">일지 수</p>
            <p className="text-lg font-semibold text-white">{report.count}건</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[var(--color-text-muted)]">총 상담</p>
            <p className="text-lg font-semibold text-[var(--color-accent)]">{report.totalConsultations}건</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[var(--color-text-muted)]">일평균</p>
            <p className="text-lg font-semibold text-white">{report.avgConsultations}건</p>
          </div>
        </div>

        {/* 상담 유형 분류 */}
        {Object.keys(report.typeBreakdown).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-[var(--color-text-muted)]">상담 유형별</p>
            {Object.entries(report.typeBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => {
                const total = report.totalConsultations || 1
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xs text-[var(--color-text-secondary)] w-20">{typeLabel(type)}</span>
                    <div className="flex-1 h-2 rounded-full bg-[var(--color-bg-hover)] overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--color-accent)] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)] w-16 text-right">{count}건 ({pct}%)</span>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* 작성/수정 폼 */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5 space-y-4">
          <h3 className="text-sm font-medium text-white">{editingId ? '일지 수정' : '새 일지 작성'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">상담 유형</label>
              <select
                value={form.consultation_type}
                onChange={(e) => setForm({ ...form, consultation_type: e.target.value as ConsultationType })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-sm"
              >
                {CONSULTATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
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
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !form.content.trim()}
              className="px-6 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? '저장 중...' : editingId ? '수정' : '저장'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] text-sm hover:text-white">
                취소
              </button>
            )}
          </div>
        </form>
      )}

      {/* 일지 목록 */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
        {journals.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] p-5">작성된 일지가 없습니다.</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {journals.map((j) => (
              <div key={j.id} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-white">{formatDate(j.journal_date)}</p>
                    {j.consultation_type && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-400">
                        {typeLabel(j.consultation_type)}
                      </span>
                    )}
                    <span className="text-xs text-[var(--color-text-muted)]">상담 {j.consultation_count}건</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(j)}
                      className="px-3 py-1 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] text-xs hover:text-white transition-colors"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(j.id)}
                      disabled={deleting === j.id}
                      className="px-3 py-1 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      {deleting === j.id ? '삭제중...' : '삭제'}
                    </button>
                  </div>
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
