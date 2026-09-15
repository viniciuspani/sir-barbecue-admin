import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from '@/App';
import { AuthProvider } from '@/lib/auth';
import { MISSING_CREDENTIALS } from '@/lib/supabase';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const root = createRoot(document.getElementById('root')!);

/**
 * Falha FECHADA: sem credenciais do Supabase o painel NÃO monta.
 *
 * Antes, credencial faltando caía em modo mock — e o modo mock dispensa a
 * checagem de super-admin, o que deixava o painel do dono aberto a qualquer
 * visitante. Uma variável de ambiente esquecida num deploy bastava. Agora a
 * ausência de configuração é uma parede visível, não um caminho alternativo.
 */
if (MISSING_CREDENTIALS) {
  root.render(
    <StrictMode>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#0b0b0d',
          color: '#e5e5e5',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: '480px' }}>
          <h1 style={{ fontSize: '20px', marginBottom: '12px' }}>Painel indisponível</h1>
          <p style={{ lineHeight: 1.6, color: '#a3a3a3' }}>
            As credenciais do Supabase não foram configuradas neste ambiente. Defina{' '}
            <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> e publique
            novamente.
          </p>
        </div>
      </div>
    </StrictMode>,
  );
} else {
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}
