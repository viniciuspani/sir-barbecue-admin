import {
  Activity,
  AlertTriangle,
  BarChart3,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // No celular o menu é um drawer sobreposto: navegar tem que fechá-lo, senão a
  // página nova abre escondida atrás dele.
  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Barra superior: só existe no mobile, onde a sidebar fica escondida. */}
      <header className="flex shrink-0 items-center gap-3 border-b border-divider bg-surface px-4 py-3 lg:hidden">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          className="-ml-2 rounded-[var(--radius-md)] p-2 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          <Menu className="h-5 w-5" />
        </button>
        <p className="text-base font-bold text-gold">Sir Barbecue</p>
      </header>

      {menuOpen ? (
        <div
          onClick={() => setMenuOpen(false)}
          aria-hidden
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-divider bg-surface transition-transform duration-200',
          'lg:static lg:z-auto lg:w-60 lg:shrink-0 lg:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-start justify-between px-5 py-6">
          <div>
            <p className="text-lg font-bold text-gold">Sir Barbecue</p>
            <p className="text-xs text-text-secondary">Painel do dono</p>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
            className="-mr-2 rounded-[var(--radius-md)] p-2 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-surface-hover text-gold'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-divider p-3">
          <p className="mb-2 truncate px-2 text-xs text-text-secondary">{email}</p>
          <button
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-danger"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sair
          </button>
        </div>
      </aside>

      <main className={cn('flex-1 overflow-auto', menuOpen && 'overflow-hidden lg:overflow-auto')}>
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-text-primary sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-text-secondary">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
