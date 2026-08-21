import { LegalDocument } from '@/components/LegalDocument';
import { LegalPageLayout } from '@/components/LegalPageLayout';
import { termosDeUso } from '@/content/termosDeUso';
import { parseLegalDocument } from '@/lib/legalDoc';

const doc = parseLegalDocument(termosDeUso);

/** Rota pública — link no rodapé do login e acessível diretamente por URL. */
export function TermosDeUso() {
  return (
    <LegalPageLayout
      title="Termos de Uso"
      meta={doc.updatedAt ? `Última atualização: ${doc.updatedAt}${doc.version ? ` · Versão ${doc.version}` : ''}` : undefined}
      otherPage={{ to: '/politica-de-privacidade', label: 'Política de Privacidade' }}
    >
      <LegalDocument doc={doc} />
    </LegalPageLayout>
  );
}
