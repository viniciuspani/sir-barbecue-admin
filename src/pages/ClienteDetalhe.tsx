import { ArrowLeft } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Layout, PageHeader } from '@/components/Layout';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { CenteredSpinner } from '@/components/ui/Spinner';
import { Switch } from '@/components/ui/Switch';
import {
  useActivateTenantSubscription,
  useCreatePayment,
  useExtendTenantTrial,
  useSetTenantAccess,
  useSetTenantTrialEndsAt,
  useTenantDetail,
} from '@/hooks/useAdmin';
import { currentMonth, formatBRL, formatDate } from '@/lib/format';
import type { PaymentMethod } from '@/types';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="break-words text-sm text-text-primary">{value}</p>
    </div>
  );
}

export function ClienteDetalhe() {
  const { tenantId = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useTenantDetail(tenantId);
  const setAccess = useSetTenantAccess();
  const createPayment = useCreatePayment();
  const extendTrial = useExtendTenantTrial();
  const setTrialEndsAt = useSetTenantTrialEndsAt();
  const activateSubscription = useActivateTenantSubscription();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [month, setMonth] = useState(currentMonth());
  const [trialAction, setTrialAction] = useState<'keep' | 'extend7'>('keep');
  const [manualDate, setManualDate] = useState('');

  useEffect(() => {
    setManualDate(data?.endsAt?.slice(0, 10) ?? '');
  }, [data?.endsAt]);

  function onLaunchPayment(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(',', '.'));
    if (!value || value <= 0) return;
    createPayment.mutate(
      { tenantId, amount: value, method, referenceMonth: month },
      { onSuccess: () => setAmount('') },
    );
  }

  function onApplyTrialAction() {
    if (trialAction !== 'extend7' || !data?.endsAt) return;
    const novaData = new Date(data.endsAt);
    novaData.setDate(novaData.getDate() + 7);
    if (!window.confirm(`Prorrogar o trial para ${formatDate(novaData.toISOString())}?`)) return;
    extendTrial.mutate(
      { tenantId, days: 7 },
      { onSuccess: () => setTrialAction('keep') },
    );
  }

  function onActivateSubscription() {
    const novoVencimento = new Date();
    novoVencimento.setMonth(novoVencimento.getMonth() + 1);
    if (
      !window.confirm(
        `Ativar a assinatura desta empresa? O vencimento ficará em ${formatDate(novoVencimento.toISOString())}.`,
      )
    ) {
      return;
    }
    activateSubscription.mutate({ tenantId });
  }

  function onSaveManualDate() {
    if (!manualDate || manualDate === data?.endsAt?.slice(0, 10)) return;
    if (!window.confirm(`Alterar a data final do trial para ${formatDate(manualDate)}?`)) return;
    // "YYYY-MM-DD" puro seria interpretado como meia-noite UTC pelo Postgres — em
    // fusos negativos isso volta um dia ao ser exibido depois. Envia a meia-noite
    // local do dia escolhido, já convertida para o instante UTC correspondente.
    setTrialEndsAt.mutate({ tenantId, trialEndsAt: new Date(`${manualDate}T00:00:00`).toISOString() });
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    <li key={d.deviceId} className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-bg px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs text-text-primary">{d.deviceId}</p>
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

          {data.status !== 'active' && (
            <div className="mt-4">
              <Card>
                <CardTitle className="mb-4">Ativar assinatura</CardTitle>
                <p className="mb-3 text-sm text-text-secondary">
                  Marca esta empresa como cliente pago (status "Active") e define o vencimento
                  para daqui a 1 mês, contado de hoje.
                </p>
                <Button onClick={onActivateSubscription} disabled={activateSubscription.isPending}>
                  {activateSubscription.isPending ? 'Ativando…' : 'Ativar assinatura'}
                </Button>
              </Card>
            </div>
          )}

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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          {data.status === 'trial' && (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardTitle className="mb-4">Prorrogar trial</CardTitle>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2 text-sm text-text-primary">
                    <input
                      type="radio"
                      name="trialAction"
                      checked={trialAction === 'keep'}
                      onChange={() => setTrialAction('keep')}
                    />
                    Manter data atual ({formatDate(data.endsAt)})
                  </label>
                  <label className="flex items-center gap-2 text-sm text-text-primary">
                    <input
                      type="radio"
                      name="trialAction"
                      checked={trialAction === 'extend7'}
                      onChange={() => setTrialAction('extend7')}
                    />
                    Prorrogar +7 dias
                  </label>
                  <Button
                    onClick={onApplyTrialAction}
                    disabled={trialAction !== 'extend7' || extendTrial.isPending}
                  >
                    {extendTrial.isPending ? 'Aplicando…' : 'Aplicar'}
                  </Button>
                </div>
              </Card>

              <Card>
                <CardTitle className="mb-4">Alterar data final do trial</CardTitle>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-text-secondary">Nova data final</label>
                    <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
                  </div>
                  <Button
                    onClick={onSaveManualDate}
                    disabled={!manualDate || manualDate === data.endsAt?.slice(0, 10) || setTrialEndsAt.isPending}
                  >
                    {setTrialEndsAt.isPending ? 'Salvando…' : 'Salvar nova data'}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
