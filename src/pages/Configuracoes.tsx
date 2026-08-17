import { useEffect, useState, type FormEvent } from 'react';

import { Layout, PageHeader } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { CenteredSpinner } from '@/components/ui/Spinner';
import { usePriceHistoryRetention, useRunPriceHistoryCleanup, useSetPriceHistoryRetention } from '@/hooks/useAdmin';

export function Configuracoes() {
  const retention = usePriceHistoryRetention();
  const setRetention = useSetPriceHistoryRetention();
  const runCleanup = useRunPriceHistoryCleanup();

  const [months, setMonths] = useState('');
  const [runMonths, setRunMonths] = useState('');
  const [runResult, setRunResult] = useState<string | null>(null);

  useEffect(() => {
    if (retention.data) setMonths(String(retention.data.retentionMonths));
  }, [retention.data]);

  function onSaveRetention(e: FormEvent) {
    e.preventDefault();
    const value = Number(months);
    if (!Number.isInteger(value) || value <= 0) return;
    setRetention.mutate(value);
  }

  function onRunNow(e: FormEvent) {
    e.preventDefault();
    setRunResult(null);
    const trimmed = runMonths.trim();
    const value = trimmed === '' ? undefined : Number(trimmed);
    if (value !== undefined && (!Number.isInteger(value) || value <= 0)) return;
    runCleanup.mutate(value, {
      onSuccess: (res) => {
        setRunResult(`Removidos ${res.deletedCount} registro(s) com mais de ${res.retentionMonths} mes(es).`);
      },
    });
  }

  return (
    <Layout>
      <PageHeader title="Configurações" subtitle="Manutenção da plataforma" />

      <Card className="max-w-xl">
        <CardTitle>Limpeza do histórico de preço de compra</CardTitle>
        <p className="mt-1 break-words text-sm text-text-secondary">
          Registros de <code className="text-xs">product_supplier_price_history</code> mais antigos que a retenção
          configurada são apagados automaticamente (agendamento pg_cron) e podem também ser limpos na hora.
        </p>

        {retention.isLoading ? (
          <div className="mt-4">
            <CenteredSpinner />
          </div>
        ) : (
          <>
            <form onSubmit={onSaveRetention} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div>
                <label className="mb-1 block text-xs text-text-secondary">Retenção (meses)</label>
                <Input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={months}
                  onChange={(e) => setMonths(e.target.value)}
                  className="w-full sm:w-32"
                />
              </div>
              <Button type="submit" disabled={setRetention.isPending}>
                {setRetention.isPending ? 'Salvando…' : 'Salvar'}
              </Button>
              {setRetention.isSuccess ? <span className="text-sm text-green">Salvo.</span> : null}
              {setRetention.isError ? <span className="text-sm text-danger">Erro ao salvar.</span> : null}
            </form>

            <form onSubmit={onRunNow} className="mt-6 flex flex-col gap-3 border-t border-divider pt-4 sm:flex-row sm:items-end">
              <div>
                <label className="mb-1 block text-xs text-text-secondary">Rodar agora com (opcional)</label>
                <Input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder={String(retention.data?.retentionMonths ?? '')}
                  value={runMonths}
                  onChange={(e) => setRunMonths(e.target.value)}
                  className="w-full sm:w-32"
                />
              </div>
              <Button type="submit" variant="outline" disabled={runCleanup.isPending}>
                {runCleanup.isPending ? 'Rodando…' : 'Rodar limpeza agora'}
              </Button>
            </form>
            {runResult ? <p className="mt-2 text-sm text-text-secondary">{runResult}</p> : null}
            {runCleanup.isError ? <p className="mt-2 text-sm text-danger">Erro ao rodar a limpeza.</p> : null}
          </>
        )}
      </Card>
    </Layout>
  );
}
