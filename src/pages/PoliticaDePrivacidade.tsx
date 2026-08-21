import { LegalDocument } from '@/components/LegalDocument';
import { LegalPageLayout } from '@/components/LegalPageLayout';
import { politicaDePrivacidade } from '@/content/politicaDePrivacidade';
import { parseLegalDocument } from '@/lib/legalDoc';

const doc = parseLegalDocument(politicaDePrivacidade);

/** Rota pública — link no rodapé do login e acessível diretamente por URL. */
export function PoliticaDePrivacidade() {
  return (
    <LegalPageLayout
      title="Política de Privacidade"
      meta={doc.updatedAt ? `Última atualização: ${doc.updatedAt}${doc.version ? ` · Versão ${doc.version}` : ''}` : undefined}
      otherPage={{ to: '/termos-de-uso', label: 'Termos de Uso' }}
    >
      <LegalDocument doc={doc} />
    </LegalPageLayout>
  );
}
