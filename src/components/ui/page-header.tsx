interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
