import type { IndexDef } from '../types/schema.js';

const INDENT = '            ';

export function renderIndex(idx: IndexDef): string {
  const cols =
    idx.columns.length === 1
      ? `'${idx.columns[0]}'`
      : `['${idx.columns.join("', '")}']`;

  if (idx.indexType === 'fulltext') {
    return `${INDENT}$table->fullText(${cols}, '${idx.name}');`;
  }

  if (idx.unique) {
    return `${INDENT}$table->unique(${cols}, '${idx.name}');`;
  }

  return `${INDENT}$table->index(${cols}, '${idx.name}');`;
}
