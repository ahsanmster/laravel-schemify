import type { ColumnDef } from '../types/schema.js';

export interface MappedColumn {
  method: string;
  args: (string | number)[];
  modifiers: string[];
  useRaw?: string;
}

export function mapMySQLColumn(col: ColumnDef): MappedColumn {
  const modifiers: string[] = [];
  const args: (string | number)[] = [];

  if (col.nullable) modifiers.push('nullable()');
  if (col.unsigned) modifiers.push('unsigned()');
  if (col.comment)  modifiers.push(`comment('${col.comment.replace(/'/g, "\\'")}')`);

  if (col.default !== undefined && col.default !== null && !col.autoIncrement) {
    const def = String(col.default);
    if (def === 'CURRENT_TIMESTAMP' || def.startsWith('CURRENT_TIMESTAMP')) {
      modifiers.push('useCurrent()');
    } else if (def === '1' || def === 'true') {
      modifiers.push('default(true)');
    } else if (def === '0' || def === 'false') {
      modifiers.push('default(false)');
    } else if (!isNaN(Number(def)) && def !== '') {
      modifiers.push(`default(${def})`);
    } else {
      modifiers.push(`default('${def.replace(/'/g, "\\'")}')`);
    }
  }

  switch (col.type) {
    case 'tinyint':
      if (col.length === 1) {
        return { method: col.autoIncrement ? 'tinyIncrements' : 'boolean', args, modifiers: col.autoIncrement ? [] : modifiers };
      }
      return { method: col.autoIncrement ? 'tinyIncrements' : 'tinyInteger', args, modifiers: col.autoIncrement ? [] : modifiers };

    case 'smallint':
      return { method: col.autoIncrement ? 'smallIncrements' : 'smallInteger', args, modifiers: col.autoIncrement ? [] : modifiers };

    case 'mediumint':
      return { method: col.autoIncrement ? 'mediumIncrements' : 'mediumInteger', args, modifiers: col.autoIncrement ? [] : modifiers };

    case 'int':
    case 'integer':
      return { method: col.autoIncrement ? 'increments' : 'integer', args, modifiers: col.autoIncrement ? [] : modifiers };

    case 'bigint':
      return { method: col.autoIncrement ? 'bigIncrements' : 'bigInteger', args, modifiers: col.autoIncrement ? [] : modifiers };

    case 'float':
      if (col.precision != null) args.push(col.precision, col.scale ?? 0);
      return { method: 'float', args, modifiers };

    case 'double':
    case 'double precision':
      if (col.precision != null) args.push(col.precision, col.scale ?? 0);
      return { method: 'double', args, modifiers };

    case 'decimal':
    case 'numeric':
      args.push(col.precision ?? 8, col.scale ?? 2);
      return { method: 'decimal', args, modifiers };

    case 'char':
      args.push(col.length ?? 255);
      return { method: 'char', args, modifiers };

    case 'varchar':
      if (col.length != null && col.length !== 255) args.push(col.length);
      return { method: 'string', args, modifiers };

    case 'tinytext':   return { method: 'tinyText',   args, modifiers };
    case 'text':       return { method: 'text',       args, modifiers };
    case 'mediumtext': return { method: 'mediumText', args, modifiers };
    case 'longtext':   return { method: 'longText',   args, modifiers };

    case 'binary':
      args.push(col.length ?? 255);
      return { method: 'binary', args, modifiers };

    case 'varbinary':
    case 'tinyblob':
    case 'blob':
    case 'mediumblob':
    case 'longblob':
      return { method: 'binary', args, modifiers };

    case 'date':      return { method: 'date', args, modifiers };

    case 'datetime':
      if (col.precision != null) args.push(col.precision);
      return { method: 'dateTime', args, modifiers };

    case 'timestamp':
      if (col.precision != null) args.push(col.precision);
      return { method: 'timestamp', args, modifiers };

    case 'time':
      if (col.precision != null) args.push(col.precision);
      return { method: 'time', args, modifiers };

    case 'year': return { method: 'year', args, modifiers };

    case 'json': return { method: 'json', args, modifiers };

    case 'enum':
      if (col.enumValues?.length) {
        args.push(`[${col.enumValues.map(v => `'${v}'`).join(', ')}]`);
      }
      return { method: 'enum', args, modifiers };

    case 'set':
      args.push(col.enumValues?.length ? `[${col.enumValues.map(v => `'${v}'`).join(', ')}]` : '[]');
      return { method: 'set', args, modifiers };

    case 'point':              return { method: 'point',             args, modifiers };
    case 'linestring':         return { method: 'lineString',        args, modifiers };
    case 'polygon':            return { method: 'polygon',           args, modifiers };
    case 'geometry':           return { method: 'geometry',          args, modifiers };
    case 'multipoint':         return { method: 'multiPoint',        args, modifiers };
    case 'multipolygon':       return { method: 'multiPolygon',      args, modifiers };
    case 'geometrycollection': return { method: 'geometryCollection', args, modifiers };

    default:
      return {
        method:  '',
        args:    [],
        modifiers,
        useRaw: `$table->addColumn('${col.type}', '${col.name}')`,
      };
  }
}
