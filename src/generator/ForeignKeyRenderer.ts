import type { ForeignKeyDef } from '../types/schema.js';

const INDENT = '            ';

export function renderForeignKey(fk: ForeignKeyDef): string {
  const localCols =
    fk.localColumns.length === 1
      ? `'${fk.localColumns[0]}'`
      : `['${fk.localColumns.join("', '")}']`;

  const foreignCols =
    fk.foreignColumns.length === 1
      ? `'${fk.foreignColumns[0]}'`
      : `['${fk.foreignColumns.join("', '")}']`;

  const onDelete =
    fk.onDelete && fk.onDelete !== 'NO ACTION' && fk.onDelete !== 'RESTRICT'
      ? `->onDelete('${fk.onDelete.toLowerCase().replace(/_/g, ' ')}')`
      : '';

  const onUpdate =
    fk.onUpdate && fk.onUpdate !== 'NO ACTION' && fk.onUpdate !== 'RESTRICT'
      ? `->onUpdate('${fk.onUpdate.toLowerCase().replace(/_/g, ' ')}')`
      : '';

  return `${INDENT}$table->foreign(${localCols})->references(${foreignCols})->on('${fk.foreignTable}')${onDelete}${onUpdate};`;
}
