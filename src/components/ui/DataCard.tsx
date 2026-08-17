import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Cartão de lista para o mobile: substitui a linha da tabela nas telas estreitas,
 * onde 7–9 colunas não cabem. Nas telas grandes a tabela continua sendo usada.
 */
export function DataCard({
  onClick,
  className,
  children,
}: {
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}) {
  const classes = cn(
    'w-full rounded-[var(--radius-lg)] border border-divider bg-surface px-4 py-3 text-left',
    onClick && 'transition-colors active:bg-surface-hover',
    className,
  );

  if (!onClick) return <div className={classes}>{children}</div>;

  return (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  );
}

/** Linha rótulo → valor dentro do cartão. */
export function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="shrink-0 text-xs text-text-secondary">{label}</span>
      <span className="min-w-0 truncate text-right text-sm text-text-primary">{value}</span>
    </div>
  );
}

/** Estado vazio das listas, usado no lugar da linha "nenhum registro". */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-divider bg-bg px-4 py-8 text-center text-sm text-text-secondary">
      {children}
    </div>
  );
}
