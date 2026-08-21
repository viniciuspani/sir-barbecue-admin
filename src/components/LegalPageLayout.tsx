import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@/components/ui/Card';

export function LegalPageLayout({
  title,
  meta,
  otherPage,
  children,
}: {
  title: string;
  meta?: string;
  otherPage: { to: string; label: string };
  children: ReactNode;
}) {
  return (
    <div className="min-h-full">
      <header className="border-b border-divider bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" className="text-lg font-bold text-gold">
            Sir Barbecue
          </Link>
          <Link to="/" className="text-sm text-text-secondary transition-colors hover:text-text-primary">
            Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">{title}</h1>
        {meta ? <p className="mt-1 text-xs text-text-secondary">{meta}</p> : null}

        <Card className="mt-6 sm:p-8">{children}</Card>

        <footer className="mt-6 flex flex-col items-center gap-1 pb-4 text-center text-xs text-text-secondary">
          <p>
            Veja também:{' '}
            <Link to={otherPage.to} className="text-gold hover:text-gold-light">
              {otherPage.label}
            </Link>
          </p>
          <p>Sir Barbecue</p>
        </footer>
      </main>
    </div>
  );
}
