import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

/**
 * Modo MOCK: hooks devolvem dados fabricados e o gate de admin é dispensado
 * (`checkIsAdmin` em lib/auth.tsx). Existe para desenvolver sem backend — era o
 * andaime de antes do banco estar ligado.
 *
 * DUAS TRAVAS, de propósito. A versão anterior era
 *   `VITE_USE_MOCK === 'true' || !url || !anonKey`
 * e tinha dois defeitos graves (achado de 04/09/2026, seção 5 da auditoria):
 *
 *   1) Credencial AUSENTE virava modo mock — ou seja, esquecer uma variável de
 *      ambiente num deploy DESLIGAVA a autenticação do painel, deixando-o aberto
 *      a qualquer visitante como super-admin. Fail-OPEN, com um console.warn como
 *      único sinal. Agora credencial ausente é erro (ver MISSING_CREDENTIALS) e o
 *      painel se recusa a abrir.
 *   2) A flag sozinha bastava, inclusive em build de produção. Agora exige também
 *      build de desenvolvimento — e o vite.config.ts derruba o build de produção
 *      se a flag estiver ligada, então este caminho é inalcançável em produção.
 */
export const USE_MOCK = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true';

/**
 * Sem credencial e sem mock explícito não há painel possível: falha FECHADA.
 * Quem trata isto é o main.tsx, que mostra uma tela de erro em vez de montar o app.
 */
export const MISSING_CREDENTIALS = !USE_MOCK && (!url || !anonKey);

if (USE_MOCK) {
  console.warn('[supabase] Rodando em modo MOCK (sem backend, dados fabricados).');
}

// Mesmo projeto do sir-barbecue; sessão persiste no localStorage do browser.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'public-anon-placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
