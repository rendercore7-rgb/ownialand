import { getStatusColor, getStatusLabel } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {getStatusLabel(status)}
    </span>
  )
}
