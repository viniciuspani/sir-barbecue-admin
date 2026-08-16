import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

const base =
  'min-h-10 w-full rounded-[var(--radius-md)] border border-divider bg-bg px-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-gold focus:outline-none';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(base, className)} {...props} />;
}
