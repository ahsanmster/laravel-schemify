export type SupportedDriver = 'mysql' | 'pgsql';

export interface DBConfig {
  driver: SupportedDriver;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  authMethod: 'password' | 'key';
  password?: string;
  privateKeyPath?: string;
  passphrase?: string;
}

export interface RunOptions {
  output: string;
  tables?: string[];
  force: boolean;
}
