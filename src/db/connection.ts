import mysql from 'mysql2/promise';
import pg    from 'pg';
import type { DBConfig, SupportedDriver } from '../types/config.js';
import { ConnectionError } from '../utils/errors.js';

export interface DatabaseConnection {
  driver: SupportedDriver;
  mysqlPool?: mysql.Pool;
  pgPool?: pg.Pool;
  close(): Promise<void>;
}

export async function createConnection(config: DBConfig): Promise<DatabaseConnection> {
  if (config.driver === 'mysql') {
    let pool: mysql.Pool;
    try {
      pool = mysql.createPool({
        host:               config.host,
        port:               config.port,
        database:           config.database,
        user:               config.username,
        password:           config.password,
        charset:            'utf8mb4',
        waitForConnections: true,
        connectionLimit:    5,
      });
      await pool.query('SELECT 1');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ConnectionError(`MySQL connection failed: ${msg}`);
    }

    return {
      driver:    'mysql',
      mysqlPool: pool,
      close:     () => pool.end(),
    };
  }

  let pool: pg.Pool;
  try {
    pool = new pg.Pool({
      host:     config.host,
      port:     config.port,
      database: config.database,
      user:     config.username,
      password: config.password,
      max:      5,
    });
    await pool.query('SELECT 1');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ConnectionError(`PostgreSQL connection failed: ${msg}`);
  }

  return {
    driver: 'pgsql',
    pgPool: pool,
    close:  () => pool.end(),
  };
}
