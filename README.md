# Sir Barbecue — Painel do Dono

Painel web de administração do SaaS Sir Barbecue: gestão de clientes (empresas assinantes),
botão **on/off** de liberação de acesso, lançamento manual de pagamentos e controle financeiro
(receita × despesa × lucro).

Consome o **MESMO projeto Supabase** do app mobile (outro cliente da mesma URL/anon key; a RLS +
`is_platform_admin()` separam o dono dos clientes comuns).

## Stack

Vite + React 19 + TypeScript · Tailwind v4 · TanStack Query · TanStack Table · Recharts ·
React Router · Supabase JS.

## Rodando

```bash
npm install
cp .env.example .env   # e preencha as chaves (ou deixe VITE_USE_MOCK=true)
npm run dev
```

- **Modo mock** (`VITE_USE_MOCK=true`): sobe com dados de demonstração, sem backend — qualquer
  credencial entra. Ideal para desenvolver a UI antes do backend de licenciamento existir.
- **Modo real**: `VITE_USE_MOCK=false` + `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`. Requer o
  backend de licenciamento aplicado (ver `docs/assinatura-app/licenciamento-saas.md` no repo mobile):
  RPCs `is_platform_admin`, `admin_list_tenants_overview`, `admin_tenant_detail`,
  `admin_set_tenant_access`, `admin_finance_summary` e tabelas `payments`/`app_expenses`.

## Telas

| Rota | Descrição |
|---|---|
| `/login` | Autenticação + gate super-admin (`is_platform_admin`). |
| `/` | Dashboard: KPIs (MRR, lucro, ativos, trial, atraso). |
| `/clientes` | Tabela de clientes + busca/filtro + **switch on/off**. |
| `/clientes/:id` | Assinatura, dispositivos, histórico e lançamento de pagamentos. |
| `/financeiro` | Receita × despesa × lucro (gráfico) + CRUD de despesas. |

## Build

```bash
npm run build     # tsc + vite build → dist/
```

Deploy estático (Vercel/Netlify). Segurança depende de Supabase Auth + gate super-admin + **RLS**.
