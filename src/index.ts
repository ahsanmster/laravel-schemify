import path from 'node:path';
import { Command } from 'commander';
import fsExtra from 'fs-extra';
import ora from 'ora';
import chalk from 'chalk';
import { gatherDBConfig, gatherRunOptions } from './config/prompts.js';
import { createConnection } from './db/connection.js';
import { SchemaInspector }  from './db/inspector.js';
import { MigrationGenerator } from './generator/MigrationGenerator.js';
import { generateRoutineMigration } from './generator/RoutineGenerator.js';
import { generateFilename, generateRoutineFilename } from './utils/naming.js';
import { logger } from './utils/logger.js';

const program = new Command();

program
  .name('laravel-schemify')
  .description('Reverse-engineer a database into Laravel migration files')
  .version('1.0.4')
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

    if (tables.length === 0 && !runOpts.includeRoutines) {
      spinner.warn('No tables found.');
      return;
    }

    spinner.succeed(`Found ${chalk.green(tables.length)} table(s)`);

    // Step 5: discover routines if requested
    let routines: Awaited<ReturnType<typeof inspector.getRoutines>> = [];
    if (runOpts.includeRoutines) {
      spinner.start('Reading procedures & functions...');
      routines = await inspector.getRoutines();
      if (routines.length > 0) {
        const procedures = routines.filter(r => r.type === 'PROCEDURE').length;
        const functions  = routines.filter(r => r.type === 'FUNCTION').length;
        const parts = [];
        if (procedures > 0) parts.push(`${chalk.green(procedures)} procedure(s)`);
        if (functions  > 0) parts.push(`${chalk.green(functions)} function(s)`);
        spinner.succeed(`Found ${parts.join(', ')}`);
      } else {
        spinner.info('No stored procedures or functions found');
      }
    }

    // Step 6: prepare output directory
    const outputDir = path.resolve(process.cwd(), runOpts.output);
    await fsExtra.ensureDir(outputDir);

    // Step 7: generate table migration files
    const generator = new MigrationGenerator(dbConfig.driver);
    let generated = 0;
    let skipped = 0;

    console.log('');

    if (tables.length > 0) {
      logger.info(`Generating table migrations...`);
    }

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

    // Step 8: generate routine migration files
    if (routines.length > 0) {
      console.log('');
      logger.info(`Generating routine migrations...`);

      // Offset timestamps past the table files so routines run after tables
      const offset = tables.length + 10;

      for (let i = 0; i < routines.length; i++) {
        const routine  = routines[i]!;
        const content  = generateRoutineMigration(routine);
        const filename = generateRoutineFilename(routine.name, routine.type, offset + i);
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
    }

    console.log('');
    console.log(chalk.bold.green(`  Done! ${generated} migration(s) written to ${chalk.cyan(outputDir)}`));
    if (skipped > 0) {
      console.log(chalk.dim(`  ${skipped} file(s) skipped (answer yes to "Overwrite" to replace them).`));
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
