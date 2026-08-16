import { ArrowLeft } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Layout, PageHeader } from '@/components/Layout';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { CenteredSpinner } from '@/components/ui/Spinner';
import { Switch } from '@/components/ui/Switch';
import { useCreatePayment, useSetTenantAccess, useTenantDetail } from '@/hooks/useAdmin';
import { currentMonth, formatBRL, formatDate } from '@/lib/format';
import type { PaymentMethod } from '@/types';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="text-sm text-text-primary">{value}</p>
    </div>
  );
}

export function ClienteDetalhe() {
  const { tenantId = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useTenantDetail(tenantId);
  const setAccess = useSetTenantAccess();
  const createPayment = useCreatePayment();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [month, setMonth] = useState(currentMonth());

  function onLaunchPayment(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(',', '.'));
    if (!value || value <= 0) return;
    createPayment.mutate(
      { tenantId, amount: value, method, referenceMonth: month },
      { onSuccess: () => setAmount('') },
    );
  }

  return (
    <Layout>
      <button
        onClick={() => navigate('/clientes')}
        className="mb-4 flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      {isLoading ? (
        <CenteredSpinner />
      ) : !data ? (
        <p className="text-text-secondary">Cliente não encontrado.</p>
      ) : (
        <>
          <PageHeader
            title={data.name}
            subtitle={data.cnpj ?? undefined}
            action={
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-secondary">Acesso</span>
                <Switch
                  checked={data.enabled}
                  disabled={setAccess.isPending}
                  onChange={(next) => setAccess.mutate({ tenantId, enabled: next })}
                  aria-label="Acesso do cliente"
                />
              </div>
            }
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle className="mb-4">Assinatura</CardTitle>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-secondary">Status</p>
                  <StatusBadge status={data.status} />
                </div>
                <Field label="Mensalidade" value={data.monthlyPrice > 0 ? formatBRL(data.monthlyPrice) : '—'} />
                <Field label="Forma de pagamento" value={data.paymentMethod ?? '—'} />
                <Field label="Vencimento" value={formatDate(data.endsAt)} />
                <Field label="Início do trial" value={formatDate(data.trialStartedAt)} />
                <Field label="Início do contrato" value={formatDate(data.contractStartedAt)} />
                <Field label="Telefone" value={data.phone ?? '—'} />
              </div>
            </Card>

            <Card>
              <CardTitle className="mb-4">Dispositivos ({data.devices.length})</CardTitle>
              {data.devices.length === 0 ? (
                <p className="text-sm text-text-secondary">Nenhum dispositivo vinculado.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.devices.map((d) => (
                    <li key={d.deviceId} className="flex items-center justify-between rounded-[var(--radius-md)] bg-bg px-3 py-2">
                      <div>
                        <p className="font-mono text-xs text-text-primary">{d.deviceId}</p>
                        <p className="text-xs text-text-secondary">
                          {d.platform ?? '—'} · visto em {formatDate(d.lastSeenAt)}
                        </p>
                      </div>
                      <StatusBadge status={d.active ? 'active' : 'canceled'} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle className="mb-4">Histórico de pagamentos</CardTitle>
              {data.payments.length === 0 ? (
                <p className="text-sm text-text-secondary">Sem pagamentos registrados.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between border-b border-divider py-2 last:border-0">
                      <span className="text-sm text-text-secondary">
                        {p.referenceMonth} · {p.method}
                      </span>
                      <span className="text-sm font-medium text-text-primary">{formatBRL(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardTitle className="mb-4">Lançar pagamento</CardTitle>
              <form onSubmit={onLaunchPayment} className="flex flex-col gap-3">
                <div>
                  <label className="mb-1 block text-xs text-text-secondary">Valor (R$)</label>
                  <Input
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="79,90"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-text-secondary">Forma</label>
                    <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                      <option value="pix">Pix</option>
                      <option value="cash">Dinheiro</option>
                      <option value="credit_card">Cartão crédito</option>
                      <option value="debit_card">Cartão débito</option>
                      <option value="boleto">Boleto</option>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-text-secondary">Mês ref. (YYYY-MM)</label>
                    <Input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="2026-07" />
                  </div>
                </div>
                <Button type="submit" disabled={createPayment.isPending}>
                  {createPayment.isPending ? 'Registrando…' : 'Registrar pagamento'}
                </Button>
              </form>
            </Card>
          </div>
        </>
      )}
    </Layout>
  );
}
