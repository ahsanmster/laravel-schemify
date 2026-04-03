import type pg from 'pg';
import type { RoutineDef } from '../../types/schema.js';

export class PgRoutineInspector {
  constructor(
    private pool: pg.Pool,
    private schema = 'public',
  ) {}

  async getAll(): Promise<RoutineDef[]> {
    // pg_get_functiondef() returns the full CREATE OR REPLACE FUNCTION/PROCEDURE statement
    const { rows } = await this.pool.query(
      `SELECT
         p.proname                          AS name,
         CASE p.prokind
           WHEN 'p' THEN 'PROCEDURE'
           ELSE 'FUNCTION'
         END                               AS type,
         pg_get_functiondef(p.oid)         AS definition
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = $1
         AND p.prokind IN ('f', 'p')
       ORDER BY type, name`,
      [this.schema],
    );

    return rows.map(r => ({
      name:       String(r.name),
      type:       String(r.type) as 'PROCEDURE' | 'FUNCTION',
      definition: String(r.definition).trim(),
    }));
  }
}
