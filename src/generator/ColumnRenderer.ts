import type { ColumnDef } from '../types/schema.js';
import type { MappedColumn } from '../mappers/mysql.mapper.js';

const INDENT = '            ';

export function renderColumn(col: ColumnDef, mapped: MappedColumn): string {
  if (mapped.useRaw) {
    const mods = mapped.modifiers.length ? '->' + mapped.modifiers.join('->') : '';
    return `${INDENT}${mapped.useRaw}${mods};`;
  }

  const formattedArgs = mapped.args.map(a => {
    if (typeof a === 'number') return String(a);
    if (String(a).startsWith('[')) return String(a);
    return `'${a}'`;
  });

  const allArgs = [`'${col.name}'`, ...formattedArgs].join(', ');
  const chain   = mapped.modifiers.length ? '->' + mapped.modifiers.join('->') : '';

  return `${INDENT}$table->${mapped.method}(${allArgs})${chain};`;
}
