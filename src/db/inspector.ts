import type { DatabaseConnection } from './connection.js';
import type { TableSchema } from '../types/schema.js';
import { MySQLInspector } from './mysql/MySQLInspector.js';
import { PgInspector }    from './postgres/PgInspector.js';

export class SchemaInspector {
  private impl: MySQLInspector | PgInspector;

  constructor(conn: DatabaseConnection, database: string) {
    this.impl =
      conn.driver === 'mysql'
        ? new MySQLInspector(conn.mysqlPool!, database)
        : new PgInspector(conn.pgPool!);
  }

  getTables(): Promise<string[]>            { return this.impl.getTables(); }
  inspectTable(t: string): Promise<TableSchema> { return this.impl.inspectTable(t); }
}
