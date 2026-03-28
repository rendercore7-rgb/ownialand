interface StatCardProps {
  label: string
  value: string
  sub?: string
  accent?: boolean
}

export function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className="bg-[var(--color-bg-card)] rounded-xl p-5 border border-[var(--color-border)]">
      <p className="text-xs text-[var(--color-text-muted)] mb-2">{label}</p>
      <p className={`text-xl font-bold ${accent ? 'text-[var(--color-accent)]' : 'text-white'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-[var(--color-text-secondary)] mt-1">{sub}</p>}
    </div>
  )
}
