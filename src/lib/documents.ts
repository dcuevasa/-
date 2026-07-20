type ContentFormat = 'markdown' | 'text';
export type DocumentKind = 'dibujo' | 'texto';

export type PersonalDocument = {
  title: string;
  kind: DocumentKind;
  format: ContentFormat;
  content: string;
};

const documentModules = import.meta.glob('../../docs/{dibujo,texto}/*.{md,txt}', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

function toTitle(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function toDocument(path: string, content: string): PersonalDocument {
  const parts = path.split('/');
  const kind = parts.at(-2) as DocumentKind;
  const fileName = parts.at(-1) ?? 'documento.txt';

  return {
    title: toTitle(fileName),
    kind,
    format: fileName.endsWith('.md') ? 'markdown' : 'text',
    content,
  };
}

const kindOrder: Record<DocumentKind, number> = {
  dibujo: 0,
  texto: 1,
};

export const documents = Object.entries(documentModules)
  .map(([path, content]) => toDocument(path, content))
  .sort((left, right) => kindOrder[left.kind] - kindOrder[right.kind] || left.title.localeCompare(right.title));