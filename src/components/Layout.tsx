import { Activity, AlertTriangle, BarChart3, LayoutDashboard, LogOut, Settings, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/clientes', label: 'Clientes', icon: Users, end: false },
  { to: '/financeiro', label: 'Financeiro', icon: BarChart3, end: false },
  { to: '/erros', label: 'Erros', icon: AlertTriangle, end: false },
  { to: '/saude', label: 'Saúde', icon: Activity, end: false },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, end: false },
];

export function Layout({ children }: { children: ReactNode }) {
  const { email, signOut } = useAuth();

  return (
    <div className="flex h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-divider bg-surface">
        <div className="px-5 py-6">
          <p className="text-lg font-bold text-gold">Sir Barbecue</p>
          <p className="text-xs text-text-secondary">Painel do dono</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-surface-hover text-gold'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-divider p-3">
          <p className="mb-2 truncate px-2 text-xs text-text-secondary">{email}</p>
          <button
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-danger"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-text-secondary">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
