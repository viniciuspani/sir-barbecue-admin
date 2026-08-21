/**
 * Parser dos documentos jurídicos em texto plano (docs/juridico no repo mobile)
 * para blocos estruturados, renderizados por LegalDocument.tsx.
 *
 * Convenções do texto-fonte:
 * - bloco título/rodapé: linha de "=" acima e abaixo
 * - cabeçalho de seção numerada ("1. TÍTULO"): linha de "━" acima e abaixo
 * - subtítulo: "N.N TÍTULO" (Termos) ou "--- N.N TÍTULO ---" (Privacidade)
 * - listas: "•", "a)", "I." ou continuação indentada sem marcador
 * - "Rótulo:  valor" (2+ espaços) vira um par chave/valor isolado
 */

export type LegalBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'warning'; text: string }
  | { kind: 'label'; text: string }
  | { kind: 'keyvalue'; text: string }
  | { kind: 'subheading'; text: string }
  | { kind: 'list'; items: { segments: string[]; nested: boolean }[] };

export type LegalSection = { heading: string; blocks: LegalBlock[] };

export type LegalDocument = {
  title: string;
  updatedAt?: string;
  version?: string;
  appVersion?: string;
  intro: LegalBlock[];
  sections: LegalSection[];
  footer: string[];
};

function isDivider(line: string): boolean {
  const t = line.trim();
  return t.length >= 10 && (/^=+$/.test(t) || /^━+$/.test(t));
}

function isNumberedSubheading(line: string): boolean {
  return /^\d+\.\d+\s+\S/.test(line.trim());
}

function dashSubheadingText(line: string): string | null {
  const m = line.trim().match(/^---\s*(.+?)\s*---$/);
  return m ? m[1] : null;
}

function isLabelLine(text: string): boolean {
  return text.endsWith(':') && text.length <= 60;
}

function isWarningStart(text: string): boolean {
  return /^(ATEN[ÇC]ÃO|IMPORTANTE)\b/i.test(text);
}

function isKeyValueLine(line: string): boolean {
  return /^\s*[^\n:]+:\s{2,}\S/.test(line);
}

function fieldLine(line: string): { label: string; value: string } | null {
  const m = line.match(/^([^:]{2,40}):\s+(.*)$/);
  return m ? { label: m[1], value: m[2] } : null;
}

function bulletMatch(line: string): { text: string; indent: number } | null {
  const indent = line.length - line.trimStart().length;
  const t = line.trim();
  const bullet = t.match(/^•\s*(.+)$/);
  if (bullet) return { text: bullet[1], indent };
  if (/^[a-z]\)\s*\S/.test(t)) return { text: t, indent };
  if (/^[IVXLCM]+\.\s+\S/.test(t)) return { text: t, indent };
  return null;
}

function parseContentLines(lines: string[]): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  let para: string[] = [];
  let list: { segments: string[]; nested: boolean }[] | null = null;

  function flushPara() {
    if (para.length) {
      const text = para.join(' ').replace(/\s+/g, ' ').trim();
      if (text) {
        if (isWarningStart(text)) blocks.push({ kind: 'warning', text });
        else if (para.length === 1 && isLabelLine(text)) blocks.push({ kind: 'label', text });
        else blocks.push({ kind: 'paragraph', text });
      }
      para = [];
    }
  }
  function flushList() {
    if (list) {
      blocks.push({ kind: 'list', items: list });
      list = null;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    const trimmed = line.trim();

    if (!trimmed) {
      flushPara();
      flushList();
      continue;
    }

    const dashHeading = dashSubheadingText(line);
    if (dashHeading) {
      flushPara();
      flushList();
      blocks.push({ kind: 'subheading', text: dashHeading });
      continue;
    }
    if (isNumberedSubheading(line)) {
      flushPara();
      flushList();
      blocks.push({ kind: 'subheading', text: trimmed });
      continue;
    }

    const bullet = bulletMatch(line);
    if (bullet) {
      flushPara();
      if (!list) list = [];
      list.push({ segments: [bullet.text], nested: bullet.indent > 2 });
      continue;
    }

    if (list) {
      const current = list[list.length - 1];
      const field = fieldLine(trimmed);
      if (field) current.segments.push(`${field.label}: ${field.value}`);
      else current.segments[current.segments.length - 1] += ` ${trimmed}`;
      continue;
    }

    if (isKeyValueLine(line)) {
      flushPara();
      blocks.push({ kind: 'keyvalue', text: trimmed.replace(/\s{2,}/g, ' ') });
      continue;
    }

    para.push(trimmed);
  }
  flushPara();
  flushList();
  return blocks;
}

export function parseLegalDocument(raw: string): LegalDocument {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');

  const dividerIdx: number[] = [];
  lines.forEach((l, i) => {
    if (isDivider(l)) dividerIdx.push(i);
  });

  const pairs: [number, number][] = [];
  for (let i = 0; i < dividerIdx.length; i += 2) {
    if (dividerIdx[i + 1] !== undefined) pairs.push([dividerIdx[i], dividerIdx[i + 1]]);
  }

  const headingBlocks = pairs.map(([a, b]) => ({
    start: a,
    end: b,
    lines: lines.slice(a + 1, b).filter((l) => l.trim()),
  }));

  const title = headingBlocks[0]?.lines[0] ?? '';
  const footerBlock = headingBlocks[headingBlocks.length - 1];
  const hasFooter = footerBlock !== undefined && footerBlock.lines.length > 1;

  const sectionHeadingBlocks = headingBlocks.slice(1, hasFooter ? -1 : undefined);

  const introStart = (headingBlocks[0]?.end ?? -1) + 1;
  const introEnd = sectionHeadingBlocks.length
    ? sectionHeadingBlocks[0].start
    : hasFooter
      ? footerBlock.start
      : lines.length;
  const introLines = lines.slice(introStart, introEnd);

  const metaRegex = /^(Última atualização|Versão|Versão do aplicativo):\s*(.+)$/;
  let updatedAt: string | undefined;
  let version: string | undefined;
  let appVersion: string | undefined;
  const restIntro: string[] = [];
  introLines.forEach((l) => {
    const m = l.trim().match(metaRegex);
    if (m) {
      if (m[1] === 'Última atualização') updatedAt = m[2];
      else if (m[1] === 'Versão') version = m[2];
      else appVersion = m[2];
    } else {
      restIntro.push(l);
    }
  });

  const sections: LegalSection[] = sectionHeadingBlocks.map((hb, idx) => {
    const heading = hb.lines[0];
    const contentStart = hb.end + 1;
    const contentEnd =
      idx + 1 < sectionHeadingBlocks.length
        ? sectionHeadingBlocks[idx + 1].start
        : hasFooter
          ? footerBlock.start
          : lines.length;
    return { heading, blocks: parseContentLines(lines.slice(contentStart, contentEnd)) };
  });

  return {
    title,
    updatedAt,
    version,
    appVersion,
    intro: parseContentLines(restIntro),
    sections,
    footer: hasFooter ? footerBlock.lines : [],
  };
}
