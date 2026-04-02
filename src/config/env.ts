import * as fs from 'node:fs';
import * as path from 'node:path';
import dotenv from 'dotenv';
import type { DBConfig, SupportedDriver } from '../types/config.js';

export function envExists(envPath = '.env'): boolean {
  return fs.existsSync(path.resolve(process.cwd(), envPath));
}

export function loadEnvConfig(envPath = '.env'): DBConfig | null {
  const resolved = path.resolve(process.cwd(), envPath);
  if (!fs.existsSync(resolved)) return null;

  const result = dotenv.config({ path: resolved });
  if (result.error || !result.parsed) return null;

  const env = result.parsed;
  const driver = (env['DB_CONNECTION'] ?? 'mysql') as SupportedDriver;

  if (driver !== 'mysql' && driver !== 'pgsql') return null;

  const database = env['DB_DATABASE'] ?? '';
  const username = env['DB_USERNAME'] ?? '';
  if (!database || !username) return null;

  return {
    driver,
    host:     env['DB_HOST']     ?? '127.0.0.1',
    port:     parseInt(env['DB_PORT'] ?? (driver === 'mysql' ? '3306' : '5432'), 10),
    database,
    username,
    password: env['DB_PASSWORD'] ?? '',
  };
}
