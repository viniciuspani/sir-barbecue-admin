import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Layout, PageHeader } from '@/components/Layout';
import { StatusBadge } from '@/components/ui/Badge';
import { DataCard, DataRow, EmptyState } from '@/components/ui/DataCard';
import { Input, Select } from '@/components/ui/Input';
import { CenteredSpinner } from '@/components/ui/Spinner';
import { Switch } from '@/components/ui/Switch';
import { useSetTenantAccess, useTenantsOverview } from '@/hooks/useAdmin';
import { formatBRL, formatDate } from '@/lib/format';
import type { SubscriptionStatus } from '@/types';

export function Clientes() {
  const navigate = useNavigate();
  const { data, isLoading } = useTenantsOverview();
  const setAccess = useSetTenantAccess();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SubscriptionStatus | 'all'>('all');

  const rows = useMemo(() => {
    const list = data ?? [];
    return list.filter((t) => {
      const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = status === 'all' || t.status === status;
      return matchSearch && matchStatus;
    });
  }, [data, search, status]);

  return (
    <Layout>
      <PageHeader title="Clientes" subtitle="Empresas assinantes e trials" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Buscar por nome…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as SubscriptionStatus | 'all')}
          className="sm:max-w-[180px]"
        >
          <option value="all">Todos os status</option>
          <option value="trial">Trial</option>
          <option value="active">Ativo</option>
          <option value="past_due">Atrasado</option>
          <option value="canceled">Cancelado</option>
        </Select>
      </div>

      {isLoading ? (
        <CenteredSpinner />
      ) : (
        <>
        {/* Mobile: cartões empilhados — as 9 colunas da tabela não cabem no celular. */}
        <div className="flex flex-col gap-3 lg:hidden">
          {rows.map((t) => (
            <DataCard key={t.tenantId}>
              <button
                type="button"
                onClick={() => navigate(`/clientes/${t.tenantId}`)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 truncate font-medium text-text-primary">{t.name}</p>
                  <StatusBadge status={t.status} />
                </div>
                <div className="mt-2 border-t border-divider pt-1">
                  <DataRow
                    label="Mensalidade"
                    value={t.monthlyPrice > 0 ? formatBRL(t.monthlyPrice) : '—'}
                  />
                  <DataRow label="Vencimento" value={formatDate(t.endsAt)} />
                  <DataRow label="Últ. pagamento" value={formatDate(t.lastPaymentAt)} />
                  <DataRow label="Devices" value={t.deviceCount} />
                </div>
              </button>
              <div className="mt-2 flex items-center justify-between border-t border-divider pt-3">
                <span className="text-xs text-text-secondary">Acesso liberado</span>
                <Switch
                  checked={t.enabled}
                  disabled={setAccess.isPending}
                  onChange={(next) => setAccess.mutate({ tenantId: t.tenantId, enabled: next })}
                  aria-label={`Acesso de ${t.name}`}
                />
              </div>
            </DataCard>
          ))}
          {rows.length === 0 ? <EmptyState>Nenhum cliente encontrado.</EmptyState> : null}
        </div>

        <div className="hidden overflow-hidden rounded-[var(--radius-lg)] border border-divider lg:block">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Mensalidade</th>
                <th className="px-4 py-3 font-medium">Início trial</th>
                <th className="px-4 py-3 font-medium">Início contrato</th>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium">Devices</th>
                <th className="px-4 py-3 font-medium">Últ. pgto</th>
                <th className="px-4 py-3 text-right font-medium">Acesso</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr
                  key={t.tenantId}
                  onClick={() => navigate(`/clientes/${t.tenantId}`)}
                  className="cursor-pointer border-t border-divider bg-bg transition-colors hover:bg-surface-hover"
                >
                  <td className="px-4 py-3 font-medium text-text-primary">{t.name}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-text-secondary">
                    {t.monthlyPrice > 0 ? formatBRL(t.monthlyPrice) : '—'}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{formatDate(t.trialStartedAt)}</td>
                  <td className="px-4 py-3 text-text-secondary">{formatDate(t.contractStartedAt)}</td>
                  <td className="px-4 py-3 text-text-secondary">{formatDate(t.endsAt)}</td>
                  <td className="px-4 py-3 text-text-secondary">{t.deviceCount}</td>
                  <td className="px-4 py-3 text-text-secondary">{formatDate(t.lastPaymentAt)}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end">
                      <Switch
                        checked={t.enabled}
                        disabled={setAccess.isPending}
                        onChange={(next) => setAccess.mutate({ tenantId: t.tenantId, enabled: next })}
                        aria-label={`Acesso de ${t.name}`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr className="border-t border-divider bg-bg">
                  <td colSpan={9} className="px-4 py-8 text-center text-text-secondary">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        </>
      )}
    </Layout>
  );
}
