export type SupportedDriver = 'mysql' | 'pgsql';

export interface DBConfig {
  driver: SupportedDriver;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface RunOptions {
  output: string;
  tables?: string[];
  force: boolean;
}
