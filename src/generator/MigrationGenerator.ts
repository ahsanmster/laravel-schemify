import type { TableSchema } from '../types/schema.js';
import type { SupportedDriver } from '../types/config.js';
import { mapMySQLColumn } from '../mappers/mysql.mapper.js';
import { mapPgColumn }    from '../mappers/postgres.mapper.js';
import { renderColumn }   from './ColumnRenderer.js';
import { renderIndex }    from './IndexRenderer.js';
import { renderForeignKey } from './ForeignKeyRenderer.js';
import { migrationTemplate } from './templates/migration.template.js';
import { toStudlyCase } from '../utils/naming.js';

const INDENT = '            ';

export class MigrationGenerator {
  constructor(private driver: SupportedDriver) {}

  generate(schema: TableSchema): string {
    const lines: string[] = [];

    const hasCreatedAt  = schema.columns.some(c => c.name === 'created_at');
    const hasUpdatedAt  = schema.columns.some(c => c.name === 'updated_at');
    const hasTimestamps = hasCreatedAt && hasUpdatedAt;
    const hasDeletedAt  = schema.columns.some(c => c.name === 'deleted_at');

    const idCol = schema.primaryKey.length === 1
      ? schema.columns.find(c => c.name === schema.primaryKey[0] && c.autoIncrement)
      : undefined;

    for (const col of schema.columns) {
      if (hasTimestamps && (col.name === 'created_at' || col.name === 'updated_at')) continue;
      if (hasDeletedAt && col.name === 'deleted_at') continue;

      // $table->id() shorthand for single auto-increment PK named "id"
      if (idCol && col.name === 'id') {
        const isBigUnsigned =
          (col.type === 'bigint' || col.type === 'int8') && col.unsigned;
        if (isBigUnsigned || col.type === 'bigint' || col.type === 'int8') {
          lines.push(`${INDENT}$table->id();`);
          continue;
        }
      }

      const mapped = this.driver === 'mysql' ? mapMySQLColumn(col) : mapPgColumn(col);

      // Add ->primary() for non-id primary key columns
      if (col.isPrimary && !(idCol && col.name === 'id')) {
        if (!mapped.modifiers.includes('primary()')) {
          mapped.modifiers.push('primary()');
        }
      }

      lines.push(renderColumn(col, mapped));
    }

    // Composite primary key (not handled by individual columns)
    if (schema.primaryKey.length > 1) {
      const cols = `['${schema.primaryKey.join("', '")}']`;
      lines.push(`${INDENT}$table->primary(${cols});`);
    }

    if (hasTimestamps) lines.push(`${INDENT}$table->timestamps();`);
    if (hasDeletedAt)  lines.push(`${INDENT}$table->softDeletes();`);

    if (schema.indexes.length > 0) {
      lines.push('');
      for (const idx of schema.indexes) {
        lines.push(renderIndex(idx));
      }
    }

    if (schema.foreignKeys.length > 0) {
      lines.push('');
      for (const fk of schema.foreignKeys) {
        lines.push(renderForeignKey(fk));
      }
    }

    const className = `Create${toStudlyCase(schema.name)}Table`;
    return migrationTemplate(className, schema.name, lines.join('\n'));
  }
}
