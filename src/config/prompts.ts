import { select, input, password, confirm } from '@inquirer/prompts';
import type { DBConfig, RunOptions, SupportedDriver } from '../types/config.js';
import { loadEnvConfig, envExists } from './env.js';
import chalk from 'chalk';

export async function gatherDBConfig(): Promise<DBConfig> {
  // Auto-detect .env and offer to use it
  if (envExists()) {
    const envConfig = loadEnvConfig();
    if (envConfig) {
      console.log(chalk.dim(`\nFound .env file — ${envConfig.driver}://${envConfig.username}@${envConfig.host}:${envConfig.port}/${envConfig.database}`));
      const useEnv = await confirm({
        message: 'Use database config from .env file?',
        default: true,
      });
      if (useEnv) return envConfig;
    }
  }

  console.log(chalk.cyan('\nEnter your database connection details:\n'));

  const driver = await select<SupportedDriver>({
    message: 'Database driver',
    choices: [
      { name: 'MySQL / MariaDB', value: 'mysql' },
      { name: 'PostgreSQL',      value: 'pgsql' },
    ],
  });

  const host = await input({
    message: 'Host',
    default: '127.0.0.1',
  });

  const portDefault = driver === 'mysql' ? '3306' : '5432';
  const portStr = await input({
    message: 'Port',
    default: portDefault,
  });

  const database = await input({
    message: 'Database name',
    required: true,
  });

  const username = await input({
    message: 'Username',
    default: driver === 'mysql' ? 'root' : 'postgres',
  });

  const pwd = await password({
    message: 'Password (leave blank if none)',
    mask: '*',
  });

  return {
    driver,
    host,
    port:     parseInt(portStr, 10),
    database,
    username,
    password: pwd ?? '',
  };
}

export async function gatherRunOptions(): Promise<RunOptions> {
  console.log(chalk.cyan('\nMigration output options:\n'));

  const output = await input({
    message: 'Output directory',
    default: './database/migrations',
  });

  const tablesInput = await input({
    message: 'Tables to include (comma-separated, leave blank for ALL)',
  });

  const force = await confirm({
    message: 'Overwrite existing migration files?',
    default: false,
  });

  const tables = tablesInput.trim()
    ? tablesInput.split(',').map(t => t.trim()).filter(Boolean)
    : undefined;

  return { output, tables, force };
}
