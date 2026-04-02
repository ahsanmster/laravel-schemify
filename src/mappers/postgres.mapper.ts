import type { ColumnDef } from '../types/schema.js';
import type { MappedColumn } from './mysql.mapper.js';

export function mapPgColumn(col: ColumnDef): MappedColumn {
  const modifiers: string[] = [];
  const args: (string | number)[] = [];

  if (col.nullable) modifiers.push('nullable()');
  if (col.comment)  modifiers.push(`comment('${col.comment.replace(/'/g, "\\'")}')`);

  if (col.default !== undefined && col.default !== null && !col.autoIncrement) {
    const def = String(col.default);
    if (def.startsWith('nextval(')) {
      // handled by method choice
    } else if (def === 'true' || def === 'false') {
      modifiers.push(`default(${def})`);
    } else if (!isNaN(Number(def)) && def !== '') {
      modifiers.push(`default(${def})`);
    } else if (def.includes('now()') || def.includes('CURRENT_TIMESTAMP')) {
      modifiers.push('useCurrent()');
    } else {
      const stripped = def.replace(/::[\w\s\[\]]+$/, '').replace(/^'|'$/g, '');
      modifiers.push(`default('${stripped.replace(/'/g, "\\'")}')`);
    }
  }

  const pgType = col.udtName ?? col.type;

  switch (pgType) {
    case 'int2':
    case 'smallint':
      return { method: col.autoIncrement ? 'smallIncrements' : 'smallInteger', args, modifiers: col.autoIncrement ? [] : modifiers };

    case 'int4':
    case 'int':
    case 'integer':
      return { method: col.autoIncrement ? 'increments' : 'integer', args, modifiers: col.autoIncrement ? [] : modifiers };

    case 'int8':
    case 'bigint':
      return { method: col.autoIncrement ? 'bigIncrements' : 'bigInteger', args, modifiers: col.autoIncrement ? [] : modifiers };

    case 'serial':  return { method: 'increments',      args, modifiers: [] };
    case 'serial2': return { method: 'smallIncrements', args, modifiers: [] };
    case 'serial4': return { method: 'increments',      args, modifiers: [] };
    case 'serial8': return { method: 'bigIncrements',   args, modifiers: [] };

    case 'float4':
    case 'real':
      return { method: 'float', args: [8, 2], modifiers };

    case 'float8':
    case 'float':
    case 'double precision':
      return { method: 'double', args: [16, 8], modifiers };

    case 'numeric':
    case 'decimal':
      args.push(col.precision ?? 8, col.scale ?? 2);
      return { method: 'decimal', args, modifiers };

    case 'money':
      return { method: 'decimal', args: [19, 4], modifiers };

    case 'bpchar':
      args.push(col.length ?? 1);
      return { method: 'char', args, modifiers };

    case 'varchar':
    case 'character varying':
      if (col.length != null && col.length !== 255) args.push(col.length);
      return { method: 'string', args, modifiers };

    case 'text':
    case 'citext':
      return { method: 'text', args, modifiers };

    case 'bytea':
      return { method: 'binary', args, modifiers };

    case 'bool':
    case 'boolean':
      return { method: 'boolean', args, modifiers };

    case 'date':
      return { method: 'date', args, modifiers };

    case 'timestamp':
    case 'timestamp without time zone':
      return { method: 'dateTime', args, modifiers };

    case 'timestamptz':
    case 'timestamp with time zone':
      return { method: 'dateTimeTz', args, modifiers };

    case 'time':
    case 'time without time zone':
      return { method: 'time', args, modifiers };

    case 'timetz':
    case 'time with time zone':
      return { method: 'timeTz', args, modifiers };

    case 'json':  return { method: 'json',  args, modifiers };
    case 'jsonb': return { method: 'jsonb', args, modifiers };

    case 'uuid':    return { method: 'uuid',      args, modifiers };
    case 'inet':    return { method: 'ipAddress',  args, modifiers };
    case 'macaddr':
    case 'macaddr8':
      return { method: 'macAddress', args, modifiers };

    case '_text':
    case '_varchar':
    case '_int4':
    case '_int8':
      return { method: 'json', args, modifiers };

    case 'point':   return { method: 'point',      args, modifiers };
    case 'polygon': return { method: 'polygon',    args, modifiers };
    case 'line':
    case 'lseg':    return { method: 'lineString', args, modifiers };

    default:
      return {
        method:  '',
        args:    [],
        modifiers,
        useRaw: `$table->addColumn('${col.type}', '${col.name}')`,
      };
  }
}
