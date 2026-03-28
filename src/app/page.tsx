'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'investor' | 'sales' | 'admin'>('investor')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('로그인에 실패했습니다.')
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      setError(`프로필 조회 실패: ${profileError?.message ?? '데이터 없음'} (uid: ${user.id})`)
      setLoading(false)
      return
    }

    const redirectMap: Record<string, string> = {
      admin: '/admin',
      sales: '/sales',
      investor: '/investor',
    }

    window.location.href = redirectMap[profile.role] ?? '/investor'
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg-primary)] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-white mb-2">
            OWNIA LAND
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Digital Land Investment Platform
          </p>
        </div>

        {/* Role Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode('investor')}
            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              mode === 'investor'
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
            }`}
          >
            투자자 로그인
          </button>
          <button
            type="button"
            onClick={() => setMode('sales')}
            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              mode === 'sales'
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
            }`}
          >
            영업팀 로그인
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-[var(--color-border)]">
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
                  이메일
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="email@example.com"
                  className="w-full px-4 py-3 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors text-sm"
                />
              </div>
            </div>

            {error && (
              <p className="mt-3 text-red-400 text-xs">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-5 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 text-sm"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </form>

        <p className="text-center text-[var(--color-text-muted)] text-xs mt-6">
          © {new Date().getFullYear()} OWNIA LAND. All rights reserved.
        </p>
      </div>
    </div>
  )
}
