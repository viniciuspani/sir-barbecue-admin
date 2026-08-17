import type {
  ErrorLog,
  ErrorLogDetail,
  ErrorLogFilters,
  Expense,
  FinanceSummary,
  HealthEvent,
  HealthNow,
  HealthSummary,
  Payment,
  PriceHistoryRetention,
  TenantDetail,
  TenantOverview,
} from '@/types';

// Dados de demonstração usados quando VITE_USE_MOCK=true (sem backend).

export const mockTenants: TenantOverview[] = [
  {
    tenantId: 't1',
    name: 'Churrasquinho do Zé',
    status: 'active',
    enabled: true,
    monthlyPrice: 79.9,
    paymentMethod: 'pix',
    trialStartedAt: '2026-05-18',
    contractStartedAt: '2026-06-01',
    endsAt: '2026-08-01',
    deviceCount: 2,
    lastPaymentAt: '2026-07-01',
  },
  {
    tenantId: 't2',
    name: 'Espetaria do João',
    status: 'trial',
    enabled: true,
    monthlyPrice: 0,
    paymentMethod: null,
    trialStartedAt: '2026-06-28',
    contractStartedAt: null,
    endsAt: '2026-07-12',
    deviceCount: 1,
    lastPaymentAt: null,
  },
  {
    tenantId: 't3',
    name: 'Brasa & Cia',
    status: 'past_due',
    enabled: false,
    monthlyPrice: 79.9,
    paymentMethod: 'boleto',
    trialStartedAt: '2026-05-01',
    contractStartedAt: '2026-05-15',
    endsAt: '2026-06-20',
    deviceCount: 3,
    lastPaymentAt: '2026-05-20',
  },
  {
    tenantId: 't4',
    name: 'Point do Espeto',
    status: 'canceled',
    enabled: false,
    monthlyPrice: 79.9,
    paymentMethod: 'credit_card',
    trialStartedAt: '2026-03-15',
    contractStartedAt: '2026-03-29',
    endsAt: '2026-05-01',
    deviceCount: 0,
    lastPaymentAt: '2026-04-01',
  },
];

const mockPayments: Payment[] = [
  { id: 'p1', tenantId: 't1', amount: 79.9, method: 'pix', paidAt: '2026-07-01', referenceMonth: '2026-07', status: 'paid' },
  { id: 'p2', tenantId: 't1', amount: 79.9, method: 'pix', paidAt: '2026-06-01', referenceMonth: '2026-06', status: 'paid' },
  { id: 'p3', tenantId: 't3', amount: 79.9, method: 'boleto', paidAt: '2026-05-20', referenceMonth: '2026-05', status: 'paid' },
];

export const mockExpenses: Expense[] = [
  { id: 'e1', name: 'Supabase Pro', category: 'Infraestrutura', amount: 25, incurredAt: '2026-07-01', recurring: true },
  { id: 'e2', name: 'Expo EAS', category: 'Build/Deploy', amount: 19, incurredAt: '2026-07-01', recurring: true },
  { id: 'e3', name: 'Domínio', category: 'Infraestrutura', amount: 4, incurredAt: '2026-07-01', recurring: true },
];

export function mockTenantDetail(tenantId: string): TenantDetail | null {
  const base = mockTenants.find((t) => t.tenantId === tenantId);
  if (!base) return null;
  return {
    ...base,
    cnpj: '12.345.678/0001-90',
    phone: '(54) 99999-0000',
    devices: Array.from({ length: base.deviceCount }, (_, i) => ({
      deviceId: `${tenantId}-device-${i + 1}`,
      platform: 'android',
      active: base.enabled,
      firstSeenAt: '2026-06-01',
      lastSeenAt: '2026-07-08',
    })),
    payments: mockPayments.filter((p) => p.tenantId === tenantId),
  };
}

export const mockPriceHistoryRetention: PriceHistoryRetention = {
  retentionMonths: 6,
};

// --- Log de erros -----------------------------------------------------------

const mockErrorList: ErrorLogDetail[] = [
  {
    id: 'e1',
    refCode: '7F3A2K',
    occurredAt: '2026-07-09T19:42:11.000Z',
    createdAt: '2026-07-09T19:48:03.000Z',
    severity: 'error',
    tenantId: 't1',
    tenantName: 'Churrasquinho do Zé',
    userId: 'u1',
    userEmail: 'caixa@churrasquinhodoze.com.br',
    screen: '/venda/fechar',
    action: 'Confirmar venda',
    message: 'new row for relation "stock_items" violates check constraint',
    detail:
      'PostgrestError: new row for relation "stock_items" violates check constraint "stock_items_quantity_check"\ncode: 23514\ndetails: Failing row contains (…, -2, …)',
    userMessage: 'Estoque insuficiente para concluir a venda. Confira o saldo do produto e tente de novo.',
    context: {
      breadcrumbs: [
        { at: 1783021300000, kind: 'screen', label: '/venda' },
        { at: 1783021320000, kind: 'action', label: 'Abriu comanda' },
        { at: 1783021331000, kind: 'screen', label: '/venda/fechar' },
      ],
      isOnline: true,
      role: 'employee',
      membershipStatus: 'member',
      preAuth: false,
      meta: { itemCount: 3, total: 42.5 },
    },
    appVersion: '0.1.0',
    platform: 'android',
    osVersion: '34',
  },
  {
    id: 'e2',
    refCode: 'QW9B4M',
    occurredAt: '2026-07-08T13:05:00.000Z',
    createdAt: '2026-07-08T13:05:12.000Z',
    severity: 'fatal',
    tenantId: 't2',
    tenantName: 'Espetaria do João',
    userId: 'u2',
    userEmail: 'joao@espetaria.com.br',
    screen: '/mais/relatorios',
    action: 'Exibir a tela',
    message: "Cannot read property 'map' of undefined",
    detail: "TypeError: Cannot read property 'map' of undefined\n    at Relatorios (relatorios.tsx:118)",
    userMessage: 'Tivemos um problema ao abrir esta tela.',
    context: {
      breadcrumbs: [
        { at: 1782910000000, kind: 'screen', label: '/mais' },
        { at: 1782910050000, kind: 'screen', label: '/mais/relatorios' },
      ],
      isOnline: false,
      role: 'owner',
      membershipStatus: 'member',
      preAuth: false,
      meta: null,
    },
    appVersion: '0.1.0',
    platform: 'android',
    osVersion: '33',
  },
  {
    id: 'e3',
    refCode: 'HK52TP',
    occurredAt: '2026-07-07T08:11:45.000Z',
    createdAt: '2026-07-07T09:02:00.000Z',
    severity: 'error',
    tenantId: null,
    tenantName: null,
    userId: 'u3',
    userEmail: 'novo@cliente.com.br',
    screen: 'auth',
    action: 'Entrar com e-mail e senha',
    message: 'Invalid login credentials',
    detail: 'AuthApiError: Invalid login credentials\nstatus: 400',
    userMessage: 'E-mail ou senha incorretos. Confira os dados e tente de novo.',
    context: {
      breadcrumbs: [{ at: 1782807105000, kind: 'screen', label: '/login' }],
      isOnline: true,
      role: null,
      membershipStatus: 'none',
      preAuth: true,
      meta: null,
    },
    appVersion: '0.1.0',
    platform: 'android',
    osVersion: '34',
  },
];

export function mockErrorLogs(filters: ErrorLogFilters): ErrorLog[] {
  const term = filters.search?.trim().toLowerCase();
  return mockErrorList.filter((l) => {
    if (filters.tenantId && l.tenantId !== filters.tenantId) return false;
    if (filters.severity && l.severity !== filters.severity) return false;
    if (!term) return true;
    return (
      l.refCode.toLowerCase().includes(term) ||
      (l.action ?? '').toLowerCase().includes(term) ||
      l.message.toLowerCase().includes(term)
    );
  });
}

export function mockErrorLogDetail(id: string): ErrorLogDetail | null {
  return mockErrorList.find((l) => l.id === id) ?? null;
}

// --- Saúde do sistema ---
// Horários relativos a "agora" para o mock não envelhecer na tela.
const minutosAtras = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export const mockHealthNow: HealthNow = {
  status: 'ok',
  service: 'sir-barbecue',
  version: '0.1.0',
  checks: { edge: { ok: true, latency_ms: 0 }, database: { ok: true, latency_ms: 41 } },
  ts: new Date().toISOString(),
};

export const mockHealthEvents: HealthEvent[] = [
  {
    id: 'h1',
    monitorName: 'Sir Barbecue Backend',
    status: 'online',
    occurredAt: minutosAtras(60 * 26),
    errors: [],
  },
  {
    id: 'h2',
    monitorName: 'Sir Barbecue Backend',
    status: 'offline',
    occurredAt: minutosAtras(60 * 26 + 7),
    errors: ['timeout', 'HTTP 503'],
  },
  {
    id: 'h3',
    monitorName: 'Sir Barbecue Backend',
    status: 'online',
    occurredAt: minutosAtras(60 * 24 * 9),
    errors: [],
  },
  {
    id: 'h4',
    monitorName: 'Sir Barbecue Backend',
    status: 'offline',
    occurredAt: minutosAtras(60 * 24 * 9 + 2),
    errors: ['keyword not found'],
  },
];

export const mockHealthSummary: HealthSummary = {
  days: 30,
  currentStatus: 'online',
  since: minutosAtras(60 * 26),
  incidents: 2,
  downtimeMinutes: 9,
  uptimePercent: 99.9792,
};

export const mockFinance: FinanceSummary = {
  monthlyRevenue: 159.8,
  monthlyExpense: 48,
  monthlyProfit: 111.8,
  activeCount: 1,
  trialCount: 1,
  pastDueCount: 1,
  series: [
    { month: '2026-02', revenue: 79.9, expense: 48 },
    { month: '2026-03', revenue: 159.8, expense: 48 },
    { month: '2026-04', revenue: 159.8, expense: 48 },
    { month: '2026-05', revenue: 239.7, expense: 48 },
    { month: '2026-06', revenue: 159.8, expense: 48 },
    { month: '2026-07', revenue: 159.8, expense: 48 },
  ],
};
