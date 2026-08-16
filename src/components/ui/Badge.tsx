import { cn } from '@/lib/cn';
import type { SubscriptionStatus } from '@/types';

const statusMap: Record<SubscriptionStatus, { label: string; className: string }> = {
  trial: { label: 'Trial', className: 'bg-yellow/15 text-yellow' },
  active: { label: 'Ativo', className: 'bg-green/15 text-green' },
  past_due: { label: 'Atrasado', className: 'bg-danger/15 text-danger' },
  canceled: { label: 'Cancelado', className: 'bg-text-secondary/15 text-text-secondary' },
};

export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const s = statusMap[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        s.className,
      )}
    >
      {s.label}
    </span>
  );
}
