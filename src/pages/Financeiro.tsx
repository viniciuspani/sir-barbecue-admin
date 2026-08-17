import { useState, type FormEvent } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Layout, PageHeader } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { CenteredSpinner } from '@/components/ui/Spinner';
import { useCreateExpense, useExpenses, useFinanceSummary } from '@/hooks/useAdmin';
import { formatBRL, formatMonth } from '@/lib/format';

export function Financeiro() {
  const finance = useFinanceSummary();
  const expenses = useExpenses();
  const createExpense = useCreateExpense();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');

  function onAddExpense(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(',', '.'));
    if (!name || !value || value <= 0) return;
    createExpense.mutate(
      { name, category: category || 'Geral', amount: value, recurring: true },
      {
        onSuccess: () => {
          setName('');
          setCategory('');
          setAmount('');
        },
      },
    );
  }

  const chartData = (finance.data?.series ?? []).map((s) => ({
    mes: formatMonth(s.month),
    Receita: s.revenue,
    Despesa: s.expense,
  }));

  return (
    <Layout>
      <PageHeader title="Financeiro" subtitle="Receita, despesas e lucro da aplicação" />

      {finance.isLoading || !finance.data ? (
        <CenteredSpinner />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-sm text-text-secondary">Receita (mês)</p>
              <p className="text-xl font-bold text-green">{formatBRL(finance.data.monthlyRevenue)}</p>
            </Card>
            <Card>
              <p className="text-sm text-text-secondary">Despesa (mês)</p>
              <p className="text-xl font-bold text-danger">{formatBRL(finance.data.monthlyExpense)}</p>
            </Card>
            <Card>
              <p className="text-sm text-text-secondary">Lucro (mês)</p>
              <p className="text-xl font-bold text-gold">{formatBRL(finance.data.monthlyProfit)}</p>
            </Card>
          </div>

          <Card className="mt-4">
            <CardTitle className="mb-4">Receita × Despesa (mensal)</CardTitle>
            <div className="h-60 w-full sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
                  <XAxis dataKey="mes" stroke="#B0B0B0" fontSize={12} />
                  <YAxis stroke="#B0B0B0" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: '#252525', border: '1px solid #333333', borderRadius: 12, color: '#fff' }}
                    formatter={(v) => formatBRL(Number(v))}
                  />
                  <Legend />
                  <Bar dataKey="Receita" fill="#27AE60" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesa" fill="#E74C3C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle className="mb-4">Despesas</CardTitle>
              {expenses.isLoading ? (
                <CenteredSpinner />
              ) : (
                <ul className="flex flex-col gap-2">
                  {(expenses.data ?? []).map((ex) => (
                    <li key={ex.id} className="flex items-center justify-between gap-3 border-b border-divider py-2 last:border-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-text-primary">{ex.name}</p>
                        <p className="truncate text-xs text-text-secondary">{ex.category}{ex.recurring ? ' · recorrente' : ''}</p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-danger">{formatBRL(ex.amount)}</span>
                    </li>
                  ))}
                  {(expenses.data ?? []).length === 0 ? (
                    <p className="text-sm text-text-secondary">Nenhuma despesa cadastrada.</p>
                  ) : null}
                </ul>
              )}
            </Card>

            <Card>
              <CardTitle className="mb-4">Nova despesa</CardTitle>
              <form onSubmit={onAddExpense} className="flex flex-col gap-3">
                <div>
                  <label className="mb-1 block text-xs text-text-secondary">Serviço</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Supabase Pro" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-text-secondary">Categoria</label>
                    <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Infraestrutura" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-text-secondary">Valor (R$)</label>
                    <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="25,00" />
                  </div>
                </div>
                <Button type="submit" disabled={createExpense.isPending}>
                  {createExpense.isPending ? 'Salvando…' : 'Adicionar despesa'}
                </Button>
              </form>
            </Card>
          </div>
        </>
      )}
    </Layout>
  );
}
