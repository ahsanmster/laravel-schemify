import { select, input, password, confirm } from '@inquirer/prompts';
import type { DBConfig, SSHConfig, RunOptions, SupportedDriver } from '../types/config.js';
import { loadEnvConfig, envExists } from './env.js';
import chalk from 'chalk';

function isLocalhost(host: string): boolean {
  return ['127.0.0.1', 'localhost', '::1', '0.0.0.0'].includes(host.trim().toLowerCase());
}

export async function gatherDBConfig(): Promise<{ dbConfig: DBConfig; sshConfig?: SSHConfig }> {
  // Auto-detect .env and offer to use it
  if (envExists()) {
    const envConfig = loadEnvConfig();
    if (envConfig) {
      console.log(chalk.dim(`\nFound .env file — ${envConfig.driver}://${envConfig.username}@${envConfig.host}:${envConfig.port}/${envConfig.database}`));
      const useEnv = await confirm({
        message: 'Use database config from .env file?',
        default: true,
      });
      if (useEnv) {
        const sshConfig = !isLocalhost(envConfig.host)
          ? await gatherSSHConfig(envConfig.host)
          : undefined;
        return { dbConfig: envConfig, sshConfig };
      }
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

  const dbConfig: DBConfig = {
    driver,
    host,
    port:     parseInt(portStr, 10),
    database,
    username,
    password: pwd ?? '',
  };

  // Auto-detect remote host — offer SSH tunnel
  const sshConfig = !isLocalhost(host)
    ? await gatherSSHConfig(host)
    : undefined;

  return { dbConfig, sshConfig };
}

async function gatherSSHConfig(dbHost: string): Promise<SSHConfig | undefined> {
  console.log('');
  console.log(chalk.yellow(`  Remote host detected (${dbHost}).`));
  console.log(chalk.dim('  Production databases typically block direct connections on port 3306/5432.'));
  console.log(chalk.dim('  An SSH tunnel routes your connection securely through the server.\n'));

  const useSSH = await confirm({
    message: 'Connect via SSH tunnel?',
    default: true,
  });

  if (!useSSH) return undefined;

  console.log(chalk.cyan('\nSSH connection details:\n'));

  const sshHost = await input({
    message: 'SSH host (your server IP or domain)',
    default: dbHost,
  });

  const sshPortStr = await input({
    message: 'SSH port',
    default: '22',
  });

  const sshUsername = await input({
    message: 'SSH username',
    default: 'root',
  });

  const authMethod = await select<'password' | 'key'>({
    message: 'SSH authentication method',
    choices: [
      { name: 'Password',        value: 'password' },
      { name: 'Private key file', value: 'key' },
    ],
  });

  if (authMethod === 'password') {
    const sshPassword = await password({
      message: 'SSH password',
      mask: '*',
    });
    return {
      host:       sshHost,
      port:       parseInt(sshPortStr, 10),
      username:   sshUsername,
      authMethod: 'password',
      password:   sshPassword ?? '',
    };
  }

  const keyPath = await input({
    message: 'Path to private key file',
    default: '~/.ssh/id_rsa',
  });

  const passphrase = await password({
    message: 'Key passphrase (leave blank if none)',
    mask: '*',
  });

  return {
    host:           sshHost,
    port:           parseInt(sshPortStr, 10),
    username:       sshUsername,
    authMethod:     'key',
    privateKeyPath: keyPath,
    passphrase:     passphrase || undefined,
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
