import { AlertTriangle } from 'lucide-react';
import { Fragment } from 'react';

import { cn } from '@/lib/cn';
import type { LegalBlock, LegalDocument as LegalDoc } from '@/lib/legalDoc';

function Segment({ text }: { text: string }) {
  const m = text.match(/^([^:]{2,40}):\s(.*)$/);
  if (!m) return <>{text}</>;
  return (
    <>
      <span className="font-medium text-text-primary">{m[1]}:</span> {m[2]}
    </>
  );
}

function Blocks({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'paragraph':
            return (
              <p key={i} className="mb-3 text-sm leading-relaxed text-text-secondary">
                {block.text}
              </p>
            );
          case 'label':
            return (
              <p key={i} className="mb-2 mt-4 text-sm font-semibold text-text-primary">
                {block.text}
              </p>
            );
          case 'keyvalue':
            return (
              <p key={i} className="mb-1 text-sm text-text-secondary">
                <Segment text={block.text} />
              </p>
            );
          case 'subheading':
            return (
              <h3 key={i} className="mb-2 mt-5 text-sm font-bold text-gold">
                {block.text}
              </h3>
            );
          case 'warning':
            return (
              <div
                key={i}
                className="mb-3 flex gap-2 rounded-[var(--radius-md)] border border-danger/40 bg-danger/10 p-3 text-sm leading-relaxed text-text-primary"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                <p>{block.text}</p>
              </div>
            );
          case 'list':
            return (
              <ul key={i} className="mb-3 space-y-2 text-sm leading-relaxed text-text-secondary">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className={cn('flex gap-2', item.nested && 'ml-5')}>
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                    <span>
                      {item.segments.map((seg, segIdx) => (
                        <Fragment key={segIdx}>
                          {segIdx > 0 ? <br /> : null}
                          <Segment text={seg} />
                        </Fragment>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            );
          default:
            return null;
        }
      })}
    </>
  );
}

function sectionParts(heading: string): { number: string; title: string } {
  const m = heading.match(/^(\d+\.)\s*(.*)$/);
  return m ? { number: m[1], title: m[2] } : { number: '', title: heading };
}

export function LegalDocument({ doc }: { doc: LegalDoc }) {
  return (
    <div>
      <Blocks blocks={doc.intro} />

      {doc.sections.map((section, i) => {
        const { number, title } = sectionParts(section.heading);
        return (
          <section key={i} className={cn('mt-8 border-t border-divider pt-6', i === 0 && 'mt-6')}>
            <h2 className="mb-3 flex items-baseline gap-2 text-base font-bold text-text-primary">
              {number ? <span className="text-gold">{number}</span> : null}
              {title}
            </h2>
            <Blocks blocks={section.blocks} />
          </section>
        );
      })}

      {doc.footer.length ? (
        <div className="mt-8 border-t border-divider pt-4 text-xs text-text-secondary">
          {doc.footer.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
