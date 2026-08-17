import { X } from 'lucide-react';
import { useState } from 'react';

import { Layout, PageHeader } from '@/components/Layout';
import { DataCard, EmptyState } from '@/components/ui/DataCard';
import { Input, Select } from '@/components/ui/Input';
import { CenteredSpinner } from '@/components/ui/Spinner';
import { useErrorLogDetail, useErrorLogs, useTenantsOverview } from '@/hooks/useAdmin';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import type { ErrorBreadcrumb, ErrorSeverity } from '@/types';

function SeverityBadge({ severity }: { severity: ErrorSeverity }) {
  const isFatal = severity === 'fatal';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        isFatal ? 'bg-danger/15 text-danger' : 'bg-yellow/15 text-yellow',
      )}
    >
      {isFatal ? 'Grave' : 'Erro'}
    </span>
  );
}

/** Trilha do usuário até o erro — responde "o que ele estava fazendo". */
function Breadcrumbs({ items }: { items: ErrorBreadcrumb[] }) {
  return (
    <ol className="space-y-1">
      {items.map((b, i) => (
        <li key={`${b.at}-${i}`} className="flex gap-2 text-sm">
          <span className="w-16 shrink-0 text-text-secondary">
            {new Date(b.at).toLocaleTimeString('pt-BR')}
          </span>
          <span className={b.kind === 'action' ? 'text-gold' : 'text-text-secondary'}>
            {b.kind === 'action' ? '▸' : '›'}
          </span>
          <span className="text-text-primary">{b.label}</span>
        </li>
      ))}
    </ol>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="break-words text-sm text-text-primary">{value}</p>
    </div>
  );
}

function DetailPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useErrorLogDetail(id);

  return (
    <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-divider bg-surface shadow-2xl">
      <div className="flex items-start justify-between border-b border-divider px-4 py-4 sm:px-6">
        <div>
          <p className="text-xs text-text-secondary">Código de referência</p>
          <p className="font-mono text-lg font-bold tracking-widest text-gold">
            {data?.refCode ?? '…'}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar detalhe"
          className="rounded-[var(--radius-md)] p-2 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isLoading || !data ? (
        <CenteredSpinner />
      ) : (
        <div className="flex-1 space-y-6 overflow-auto px-4 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Quando aconteceu" value={formatDateTime(data.occurredAt)} />
            <Field label="Chegou ao servidor" value={formatDateTime(data.createdAt)} />
            <Field label="Empresa" value={data.tenantName ?? 'Sem empresa (antes do vínculo)'} />
            <Field label="Usuário" value={data.userEmail ?? '—'} />
            <Field label="Tela" value={data.screen ?? '—'} />
            <Field label="Ação" value={data.action ?? '—'} />
            <Field
              label="Aparelho"
              value={[data.platform, data.osVersion].filter(Boolean).join(' ') || '—'}
            />
            <Field label="Versão do app" value={data.appVersion ?? '—'} />
          </div>

          {data.context?.preAuth ? (
            <p className="rounded-[var(--radius-md)] bg-yellow/10 px-3 py-2 text-sm text-yellow">
              Ocorreu antes de o usuário ter empresa vinculada. A empresa acima foi carimbada no
              envio, não no momento do erro.
            </p>
          ) : null}

          <div>
            <p className="mb-1 text-xs text-text-secondary">Mensagem exibida ao usuário</p>
            <p className="rounded-[var(--radius-md)] border border-divider bg-bg px-3 py-2 text-sm text-text-primary">
              {data.userMessage ?? '—'}
            </p>
          </div>

          <div>
            <p className="mb-1 text-xs text-text-secondary">Mensagem completa do erro</p>
            <pre className="max-h-80 overflow-auto rounded-[var(--radius-md)] border border-divider bg-bg px-3 py-2 font-mono text-xs leading-relaxed text-text-primary">
              {data.detail ?? data.message}
            </pre>
          </div>

          {data.context?.breadcrumbs?.length ? (
            <div>
              <p className="mb-2 text-xs text-text-secondary">O que o usuário fez antes</p>
              <Breadcrumbs items={data.context.breadcrumbs} />
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Papel" value={data.context?.role ?? '—'} />
            <Field
              label="Conexão"
              value={data.context?.isOnline === undefined ? '—' : data.context.isOnline ? 'Online' : 'Offline'}
            />
            <Field label="Gravidade" value={data.severity === 'fatal' ? 'Grave' : 'Erro'} />
          </div>

          {data.context?.meta && Object.keys(data.context.meta).length > 0 ? (
            <div>
              <p className="mb-1 text-xs text-text-secondary">Dados da tela</p>
              <pre className="overflow-auto rounded-[var(--radius-md)] border border-divider bg-bg px-3 py-2 font-mono text-xs text-text-primary">
                {JSON.stringify(data.context.meta, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      )}
    </aside>
  );
}

export function Erros() {
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<ErrorSeverity | 'all'>('all');
  const [tenantId, setTenantId] = useState<string | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: tenants } = useTenantsOverview();
  const { data, isLoading } = useErrorLogs({
    tenantId: tenantId === 'all' ? null : tenantId,
    severity: severity === 'all' ? null : severity,
    search: search.trim() || null,
  });

  const rows = data ?? [];

  return (
    <Layout>
      <PageHeader
        title="Erros"
        subtitle="Falhas registradas pelo aplicativo, com data, hora e o que o usuário estava fazendo"
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Input
          placeholder="Buscar por código, ação ou mensagem…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-sm"
        />
        <Select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as ErrorSeverity | 'all')}
          className="sm:max-w-[180px]"
        >
          <option value="all">Todas as gravidades</option>
          <option value="error">Erro</option>
          <option value="fatal">Grave</option>
        </Select>
        <Select
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          className="sm:max-w-[220px]"
        >
          <option value="all">Todas as empresas</option>
          {(tenants ?? []).map((t) => (
            <option key={t.tenantId} value={t.tenantId}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <CenteredSpinner />
      ) : (
        <>
        {/* Mobile: cartões empilhados — a tabela de 7 colunas não cabe no celular. */}
        <div className="flex flex-col gap-3 lg:hidden">
          {rows.map((l) => (
            <DataCard key={l.id} onClick={() => setSelectedId(l.id)}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm font-medium tracking-wider text-gold">
                  {l.refCode}
                </span>
                <SeverityBadge severity={l.severity} />
              </div>
              <p className="mt-1 text-xs text-text-secondary">{formatDateTime(l.occurredAt)}</p>
              <p className="mt-2 line-clamp-2 text-sm text-text-primary">{l.message}</p>
              <p className="mt-2 border-t border-divider pt-2 text-xs text-text-secondary">
                {l.tenantName ?? 'Sem empresa'}
                {l.userEmail ? ` · ${l.userEmail}` : ''}
              </p>
              {l.action || l.screen ? (
                <p className="mt-0.5 text-xs text-text-secondary">
                  {[l.action, l.screen].filter(Boolean).join(' · ')}
                </p>
              ) : null}
            </DataCard>
          ))}
          {rows.length === 0 ? (
            <EmptyState>Nenhum erro registrado com estes filtros. 🎉</EmptyState>
          ) : null}
        </div>

        <div className="hidden overflow-hidden rounded-[var(--radius-lg)] border border-divider lg:block">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Data e hora</th>
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">O que fazia</th>
                <th className="px-4 py-3 font-medium">Mensagem</th>
                <th className="px-4 py-3 font-medium">Gravidade</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  className="cursor-pointer border-t border-divider bg-bg transition-colors hover:bg-surface-hover"
                >
                  <td className="px-4 py-3 font-mono font-medium tracking-wider text-gold">
                    {l.refCode}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                    {formatDateTime(l.occurredAt)}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{l.tenantName ?? '—'}</td>
                  <td className="px-4 py-3 text-text-secondary">{l.userEmail ?? '—'}</td>
                  <td className="px-4 py-3 text-text-primary">
                    {l.action ?? '—'}
                    {l.screen ? (
                      <span className="block text-xs text-text-secondary">{l.screen}</span>
                    ) : null}
                  </td>
                  <td className="max-w-sm truncate px-4 py-3 text-text-secondary" title={l.message}>
                    {l.message}
                  </td>
                  <td className="px-4 py-3">
                    <SeverityBadge severity={l.severity} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr className="border-t border-divider bg-bg">
                  <td colSpan={7} className="px-4 py-8 text-center text-text-secondary">
                    Nenhum erro registrado com estes filtros. 🎉
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        </>
      )}

      {selectedId ? <DetailPanel id={selectedId} onClose={() => setSelectedId(null)} /> : null}
    </Layout>
  );
}
