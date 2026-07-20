import type { PersonalDocument } from '../lib/documents';

type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'code'; text: string };

type DocumentContentProps = {
  document: PersonalDocument;
};

function renderInline(text: string) {
  const parts = text.split(/(_[^_]+_)/g);

  return parts.map((part, index) => {
    if (part.startsWith('_') && part.endsWith('_')) {
      return <em key={`${part}-${index}`}>{part.slice(1, -1)}</em>;
    }

    return part;
  });
}

function parseMarkdown(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = content.trimEnd().split('\n');
  let paragraph: string[] = [];
  let code: string[] | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ type: 'paragraph', text: paragraph.join('\n') });
    paragraph = [];
  };

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (code) {
        blocks.push({ type: 'code', text: code.join('\n') });
        code = null;
      } else {
        flushParagraph();
        code = [];
      }
      continue;
    }

    if (code) {
      code.push(line);
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({ type: 'heading', level: heading[1].length as 1 | 2 | 3, text: heading[2] });
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  if (code) blocks.push({ type: 'code', text: code.join('\n') });

  return blocks;
}

export function DocumentContent({ document }: DocumentContentProps) {
  if (document.format === 'text') {
    return <pre className="document-pre">{document.content.trimEnd()}</pre>;
  }

  return (
    <div className="markdown-document">
      {parseMarkdown(document.content).map((block, index) => {
        if (block.type === 'code') {
          return <pre className="document-pre" key={`${block.type}-${index}`}>{block.text}</pre>;
        }

        if (block.type === 'heading') {
          const Heading = `h${block.level + 2}` as 'h3' | 'h4' | 'h5';
          return <Heading key={`${block.type}-${index}`}>{renderInline(block.text)}</Heading>;
        }

        return <p key={`${block.type}-${index}`}>{renderInline(block.text)}</p>;
      })}
    </div>
  );
}