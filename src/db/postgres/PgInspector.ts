import type pg from 'pg';
import type { TableSchema, ColumnDef, IndexDef, ForeignKeyDef } from '../../types/schema.js';

export class PgInspector {
  constructor(
    private pool: pg.Pool,
    private schema = 'public',
  ) {}

  async getTables(): Promise<string[]> {
    const { rows } = await this.pool.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename`,
      [this.schema],
    );
    return rows.map(r => r.tablename);
  }

  async getColumns(table: string): Promise<ColumnDef[]> {
    const { rows } = await this.pool.query(
      `SELECT
         c.column_name,
         c.data_type,
         c.udt_name,
         c.character_maximum_length,
         c.numeric_precision,
         c.numeric_scale,
         c.is_nullable,
         c.column_default,
         c.is_identity,
         EXISTS (
           SELECT 1
           FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu2
             ON kcu2.constraint_name = tc.constraint_name
             AND kcu2.table_schema   = tc.table_schema
           WHERE tc.constraint_type = 'PRIMARY KEY'
             AND tc.table_name      = c.table_name
             AND kcu2.column_name   = c.column_name
             AND tc.table_schema    = $1
         ) AS is_primary
       FROM information_schema.columns c
       WHERE c.table_name = $2 AND c.table_schema = $1
       ORDER BY c.ordinal_position`,
      [this.schema, table],
    );

    return rows.map(r => {
      const colDefault = r.column_default as string | null;
      return {
        name:          String(r.column_name),
        type:          String(r.data_type).toLowerCase(),
        udtName:       String(r.udt_name),
        length:        r.character_maximum_length != null ? Number(r.character_maximum_length) : undefined,
        precision:     r.numeric_precision != null ? Number(r.numeric_precision) : undefined,
        scale:         r.numeric_scale != null ? Number(r.numeric_scale) : undefined,
        nullable:      r.is_nullable === 'YES',
        unsigned:      false,
        default:       colDefault,
        autoIncrement: r.is_identity === 'YES' || (colDefault != null && colDefault.startsWith('nextval(')),
        isPrimary:     Boolean(r.is_primary),
        enumValues:    undefined,
      };
    });
  }

  async getIndexes(table: string): Promise<IndexDef[]> {
    const { rows } = await this.pool.query(
      `SELECT
         i.relname                                                       AS index_name,
         ix.indisunique                                                  AS is_unique,
         ix.indisprimary                                                 AS is_primary,
         am.amname                                                       AS index_type,
         ARRAY_AGG(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS columns
       FROM pg_index ix
       JOIN pg_class    t  ON t.oid = ix.indrelid
       JOIN pg_class    i  ON i.oid = ix.indexrelid
       JOIN pg_am       am ON am.oid = i.relam
       JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE t.relname = $1 AND n.nspname = $2
       GROUP BY i.relname, ix.indisunique, ix.indisprimary, am.amname`,
      [table, this.schema],
    );

    return rows.map(r => ({
      name:      String(r.index_name),
      columns:   r.columns as string[],
      unique:    Boolean(r.is_unique),
      isPrimary: Boolean(r.is_primary),
      indexType: String(r.index_type),
    }));
  }

  async getForeignKeys(table: string): Promise<ForeignKeyDef[]> {
    const { rows } = await this.pool.query(
      `SELECT
         tc.constraint_name,
         kcu.column_name       AS local_column,
         ccu.table_name        AS foreign_table,
         ccu.column_name       AS foreign_column,
         rc.delete_rule,
         rc.update_rule
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
       JOIN information_schema.referential_constraints rc
         ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND tc.table_name      = $1
         AND tc.table_schema    = $2`,
      [table, this.schema],
    );

    const map = new Map<string, ForeignKeyDef>();
    for (const r of rows) {
      const key = String(r.constraint_name);
      if (!map.has(key)) {
        map.set(key, {
          constraintName: key,
          localColumns:   [],
          foreignTable:   String(r.foreign_table),
          foreignColumns: [],
          onDelete:       String(r.delete_rule),
          onUpdate:       String(r.update_rule),
        });
      }
      const fk = map.get(key)!;
      fk.localColumns.push(String(r.local_column));
      fk.foreignColumns.push(String(r.foreign_column));
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
