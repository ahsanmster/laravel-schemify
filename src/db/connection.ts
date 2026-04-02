import mysql from 'mysql2/promise';
import pg    from 'pg';
import type { DBConfig, SSHConfig, SupportedDriver } from '../types/config.js';
import { openSSHTunnel, type TunnelResult } from './tunnel.js';
import { ConnectionError } from '../utils/errors.js';

export interface DatabaseConnection {
  driver: SupportedDriver;
  mysqlPool?: mysql.Pool;
  pgPool?: pg.Pool;
  close(): Promise<void>;
}

export async function createConnection(
  config: DBConfig,
  ssh?: SSHConfig,
): Promise<DatabaseConnection> {
  let tunnel: TunnelResult | undefined;
  let connectHost = config.host;
  let connectPort = config.port;

  if (ssh) {
    tunnel = await openSSHTunnel(ssh, config.port);
    connectHost = '127.0.0.1';
    connectPort = tunnel.localPort;
  }

  if (config.driver === 'mysql') {
    let pool: mysql.Pool;
    try {
      pool = mysql.createPool({
        host:               connectHost,
        port:               connectPort,
        database:           config.database,
        user:               config.username,
        password:           config.password,
        charset:            'utf8mb4',
        waitForConnections: true,
        connectionLimit:    5,
      });
      await pool.query('SELECT 1');
    } catch (err: unknown) {
      await tunnel?.close();
      const msg = err instanceof Error ? err.message : String(err);
      throw new ConnectionError(`MySQL connection failed: ${msg}`);
    }

    return {
      driver:    'mysql',
      mysqlPool: pool,
      close: async () => {
        await pool.end();
        await tunnel?.close();
      },
    };
  }

  let pool: pg.Pool;
  try {
    pool = new pg.Pool({
      host:     connectHost,
      port:     connectPort,
      database: config.database,
      user:     config.username,
      password: config.password,
      max:      5,
    });
    await pool.query('SELECT 1');
  } catch (err: unknown) {
    await tunnel?.close();
    const msg = err instanceof Error ? err.message : String(err);
    throw new ConnectionError(`PostgreSQL connection failed: ${msg}`);
  }

  return {
    driver: 'pgsql',
    pgPool: pool,
    close: async () => {
      await pool.end();
      await tunnel?.close();
    },
  };
}
