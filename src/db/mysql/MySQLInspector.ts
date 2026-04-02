import type mysql from 'mysql2/promise';
import type { TableSchema, ColumnDef, IndexDef, ForeignKeyDef } from '../../types/schema.js';

export class MySQLInspector {
  constructor(
    private pool: mysql.Pool,
    private database: string,
  ) {}

  async getTables(): Promise<string[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
      [this.database],
    );
    return rows.map(r => r['TABLE_NAME'] as string);
  }

  async getColumns(table: string): Promise<ColumnDef[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT
         COLUMN_NAME, DATA_TYPE, COLUMN_TYPE,
         CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE,
         IS_NULLABLE, COLUMN_DEFAULT, EXTRA, COLUMN_KEY, COLUMN_COMMENT
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [this.database, table],
    );

    return rows.map(r => {
      const colType = String(r['COLUMN_TYPE']).toLowerCase();
      const dataType = String(r['DATA_TYPE']).toLowerCase();

      const enumValues: string[] | undefined =
        dataType === 'enum' || dataType === 'set'
          ? colType
              .replace(/^(?:enum|set)\(/, '')
              .replace(/\)$/, '')
              .split(',')
              .map(v => v.replace(/^'|'$/g, '').trim())
          : undefined;

      return {
        name:          String(r['COLUMN_NAME']),
        type:          dataType,
        length:        r['CHARACTER_MAXIMUM_LENGTH'] != null ? Number(r['CHARACTER_MAXIMUM_LENGTH']) : undefined,
        precision:     r['NUMERIC_PRECISION'] != null ? Number(r['NUMERIC_PRECISION']) : undefined,
        scale:         r['NUMERIC_SCALE'] != null ? Number(r['NUMERIC_SCALE']) : undefined,
        nullable:      r['IS_NULLABLE'] === 'YES',
        unsigned:      colType.includes('unsigned'),
        default:       r['COLUMN_DEFAULT'] as string | null | undefined,
        autoIncrement: String(r['EXTRA']).includes('auto_increment'),
        isPrimary:     r['COLUMN_KEY'] === 'PRI',
        comment:       r['COLUMN_COMMENT'] ? String(r['COLUMN_COMMENT']) : undefined,
        enumValues,
      };
    });
  }

  async getIndexes(table: string): Promise<IndexDef[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE, INDEX_TYPE, SEQ_IN_INDEX
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
      [this.database, table],
    );

    const map = new Map<string, { columns: string[]; unique: boolean; indexType: string }>();
    for (const r of rows) {
      const key = String(r['INDEX_NAME']);
      if (!map.has(key)) {
        map.set(key, { columns: [], unique: r['NON_UNIQUE'] === 0, indexType: String(r['INDEX_TYPE']) });
      }
      map.get(key)!.columns.push(String(r['COLUMN_NAME']));
    }

    return Array.from(map.entries()).map(([name, def]) => ({
      name,
      columns:   def.columns,
      unique:    def.unique,
      isPrimary: name === 'PRIMARY',
      indexType: def.indexType.toLowerCase(),
    }));
  }

  async getForeignKeys(table: string): Promise<ForeignKeyDef[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT
         kcu.CONSTRAINT_NAME, kcu.COLUMN_NAME, kcu.ORDINAL_POSITION,
         kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME,
         rc.DELETE_RULE, rc.UPDATE_RULE
       FROM information_schema.KEY_COLUMN_USAGE kcu
       JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
         ON rc.CONSTRAINT_NAME    = kcu.CONSTRAINT_NAME
         AND rc.CONSTRAINT_SCHEMA = kcu.TABLE_SCHEMA
       WHERE kcu.TABLE_SCHEMA = ? AND kcu.TABLE_NAME = ?
         AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
       ORDER BY kcu.CONSTRAINT_NAME, kcu.ORDINAL_POSITION`,
      [this.database, table],
    );

    const map = new Map<string, ForeignKeyDef>();
    for (const r of rows) {
      const key = String(r['CONSTRAINT_NAME']);
      if (!map.has(key)) {
        map.set(key, {
          constraintName: key,
          localColumns:   [],
          foreignTable:   String(r['REFERENCED_TABLE_NAME']),
          foreignColumns: [],
          onDelete:       String(r['DELETE_RULE']),
          onUpdate:       String(r['UPDATE_RULE']),
        });
      }
      const fk = map.get(key)!;
      fk.localColumns.push(String(r['COLUMN_NAME']));
      fk.foreignColumns.push(String(r['REFERENCED_COLUMN_NAME']));
    }

    return Array.from(map.values());
  }

  async inspectTable(table: string): Promise<TableSchema> {
    const [columns, indexes, foreignKeys] = await Promise.all([
      this.getColumns(table),
      this.getIndexes(table),
      this.getForeignKeys(table),
    ]);

    const primaryIndex = indexes.find(i => i.isPrimary);

    return {
      name:       table,
      columns,
      indexes:    indexes.filter(i => !i.isPrimary),
      foreignKeys,
      primaryKey: primaryIndex?.columns ?? [],
    };
  }
}
