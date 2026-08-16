import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

/** true quando não há credenciais ou VITE_USE_MOCK=true → hooks usam dados mock. */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || !url || !anonKey;

if (USE_MOCK) {
  console.warn('[supabase] Rodando em modo MOCK (sem backend). Configure o .env para usar dados reais.');
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
