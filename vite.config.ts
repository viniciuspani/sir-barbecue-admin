import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Travas de build (achado de 04/09/2026, seção 5 da auditoria de segurança).
// São variáveis de BUILD do Vite: definidas por engano no painel da Netlify, ficam
// COMPILADAS no bundle e valem para todo visitante até o próximo deploy. Melhor o
// deploy falhar aqui, alto e claro, do que descobrir depois.
//
// VITE_USE_MOCK não troca só os dados: o modo mock dispensa a checagem de
// super-admin (`checkIsAdmin` em src/lib/auth.tsx), ou seja, publicaria o painel
// do dono aberto a qualquer pessoa. Mesmo padrão do VITE_ACCESS_BYPASS no PWA.
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  if (mode === 'production' && process.env.VITE_USE_MOCK === 'true') {
    throw new Error(
      'VITE_USE_MOCK=true em build de produção: o painel sairia com dados fabricados e ' +
        'SEM checagem de super-admin. Defina como false no painel da Netlify e refaça o deploy.',
    );
  }

  // Sem credencial o painel se recusa a abrir (ver src/main.tsx). Falhar já no
  // build evita publicar uma tela de erro e só descobrir isso ao acessar.
  if (
    mode === 'production' &&
    (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY)
  ) {
    throw new Error(
      'VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY ausentes em build de produção: ' +
        'o painel não teria como autenticar ninguém. Configure-as no painel da Netlify.',
    );
  }

  return {
    plugins: [react(), tailwindcss()],
    // host: true expõe o dev server na rede local, para abrir no celular pelo IP da máquina.
    server: { host: true },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});
