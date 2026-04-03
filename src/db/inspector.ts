import type { DatabaseConnection } from './connection.js';
import type { TableSchema, RoutineDef } from '../types/schema.js';
import { MySQLInspector }        from './mysql/MySQLInspector.js';
import { MySQLRoutineInspector } from './mysql/MySQLRoutineInspector.js';
import { PgInspector }           from './postgres/PgInspector.js';
import { PgRoutineInspector }    from './postgres/PgRoutineInspector.js';

export class SchemaInspector {
  private impl:    MySQLInspector | PgInspector;
  private routines: MySQLRoutineInspector | PgRoutineInspector;

  constructor(conn: DatabaseConnection, database: string) {
    if (conn.driver === 'mysql') {
      this.impl     = new MySQLInspector(conn.mysqlPool!, database);
      this.routines = new MySQLRoutineInspector(conn.mysqlPool!, database);
    } else {
      this.impl     = new PgInspector(conn.pgPool!);
      this.routines = new PgRoutineInspector(conn.pgPool!);
    }
  }

  getTables(): Promise<string[]>                { return this.impl.getTables(); }
  inspectTable(t: string): Promise<TableSchema> { return this.impl.inspectTable(t); }
  getRoutines(): Promise<RoutineDef[]>           { return this.routines.getAll(); }
}
