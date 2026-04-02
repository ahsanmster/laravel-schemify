import path from 'node:path';
import { Command } from 'commander';
import fsExtra from 'fs-extra';
import ora from 'ora';
import chalk from 'chalk';
import { gatherDBConfig, gatherRunOptions } from './config/prompts.js';
import { createConnection } from './db/connection.js';
import { SchemaInspector }  from './db/inspector.js';
import { MigrationGenerator } from './generator/MigrationGenerator.js';
import { generateFilename } from './utils/naming.js';
import { logger } from './utils/logger.js';

const program = new Command();

program
  .name('laravel-schemify')
  .description('Reverse-engineer a database into Laravel migration files')
  .version('1.0.2')
  .action(run);

program.parse(process.argv);

async function run(): Promise<void> {
  console.log(chalk.bold.cyan('\n  laravel-schemify\n'));
  console.log(chalk.dim('  Generate Laravel migrations from your existing database.\n'));

  let conn: Awaited<ReturnType<typeof createConnection>> | null = null;

  try {
    // Step 1: gather DB credentials interactively
    const { dbConfig, sshConfig } = await gatherDBConfig();

    // Step 2: gather output options
    const runOpts = await gatherRunOptions();

    console.log('');

    // Step 3: connect (with optional SSH tunnel)
    const spinner = ora(sshConfig ? 'Opening SSH tunnel...' : 'Connecting to database...').start();
    try {
      conn = await createConnection(dbConfig, sshConfig);
      const via = sshConfig
        ? `${chalk.green(dbConfig.driver)} via SSH tunnel (${sshConfig.host})`
        : chalk.green(dbConfig.driver);
      spinner.succeed(`Connected to ${chalk.green(dbConfig.database)} — ${via}`);
    } catch (err) {
      spinner.fail('Connection failed');
      throw err;
    }

    // Step 4: discover tables
    spinner.start('Reading schema...');
    const inspector = new SchemaInspector(conn, dbConfig.database);
    let tables = await inspector.getTables();

    if (runOpts.tables?.length) {
      tables = tables.filter(t => runOpts.tables!.includes(t));
    }

    if (tables.length === 0) {
      spinner.warn('No tables found.');
      return;
    }

    spinner.succeed(`Found ${chalk.green(tables.length)} table(s): ${tables.join(', ')}`);

    // Step 5: prepare output directory
    const outputDir = path.resolve(process.cwd(), runOpts.output);
    await fsExtra.ensureDir(outputDir);

    // Step 6: generate migration files
    const generator = new MigrationGenerator(dbConfig.driver);
    let generated = 0;
    let skipped = 0;

    console.log('');

    for (let i = 0; i < tables.length; i++) {
      const table    = tables[i]!;
      const schema   = await inspector.inspectTable(table);
      const content  = generator.generate(schema);
      const filename = generateFilename(table, i);
      const filepath = path.join(outputDir, filename);

      if (!runOpts.force && await fsExtra.pathExists(filepath)) {
        logger.warn(`Skipped (exists): ${filename}`);
        skipped++;
        continue;
      }

      await fsExtra.writeFile(filepath, content, 'utf8');
      logger.success(`Generated: ${chalk.cyan(filename)}`);
      generated++;
    }

    console.log('');
    console.log(chalk.bold.green(`  Done! ${generated} migration(s) written to ${chalk.cyan(outputDir)}`));
    if (skipped > 0) {
      console.log(chalk.dim(`  ${skipped} file(s) skipped (use --force flag or answer yes to overwrite).`));
    }
    console.log('');

  } catch (err: unknown) {
    console.log('');
    logger.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  } finally {
    await conn?.close();
  }
}
