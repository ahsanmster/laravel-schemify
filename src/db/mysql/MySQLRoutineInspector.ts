import type mysql from 'mysql2/promise';
import type { RoutineDef } from '../../types/schema.js';

// Strips DEFINER=`user`@`host` from CREATE statements so migrations are portable
function stripDefiner(sql: string): string {
  return sql.replace(/\s*DEFINER\s*=\s*`[^`]*`@`[^`]*`\s*/gi, ' ').trim();
}

export class MySQLRoutineInspector {
  constructor(
    private pool: mysql.Pool,
    private database: string,
  ) {}

  async getRoutineNames(): Promise<{ name: string; type: 'PROCEDURE' | 'FUNCTION' }[]> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `SELECT ROUTINE_NAME, ROUTINE_TYPE
       FROM information_schema.ROUTINES
       WHERE ROUTINE_SCHEMA = ?
       ORDER BY ROUTINE_TYPE, ROUTINE_NAME`,
      [this.database],
    );
    return rows.map(r => ({
      name: String(r['ROUTINE_NAME']),
      type: String(r['ROUTINE_TYPE']) as 'PROCEDURE' | 'FUNCTION',
    }));
  }

  async getRoutineDefinition(name: string, type: 'PROCEDURE' | 'FUNCTION'): Promise<string> {
    const sql = type === 'PROCEDURE'
      ? `SHOW CREATE PROCEDURE \`${name}\``
      : `SHOW CREATE FUNCTION \`${name}\``;

    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(sql);
    const row = rows[0];
    if (!row) throw new Error(`Could not fetch definition for ${type} \`${name}\``);

    // SHOW CREATE PROCEDURE returns: [Procedure, sql_mode, Create Procedure, ...]
    // SHOW CREATE FUNCTION returns:  [Function,  sql_mode, Create Function,  ...]
    const raw = String(row['Create Procedure'] ?? row['Create Function'] ?? '');
    return stripDefiner(raw);
  }

  async getAll(): Promise<RoutineDef[]> {
    const names = await this.getRoutineNames();
    const routines: RoutineDef[] = [];

    for (const { name, type } of names) {
      try {
        const definition = await this.getRoutineDefinition(name, type);
        routines.push({ name, type, definition });
      } catch {
        // Skip routines we can't read (insufficient privileges)
      }
    }

    return routines;
  }
}
