# laravel-schemify

> Instantly generate Laravel migration files from your existing MySQL or PostgreSQL database — no config files, just answer a few prompts.

[![npm version](https://img.shields.io/npm/v/laravel-schemify?color=cb3837&label=npm)](https://www.npmjs.com/package/laravel-schemify)
[![node](https://img.shields.io/node/v/laravel-schemify?color=339933)](https://www.npmjs.com/package/laravel-schemify)
[![license](https://img.shields.io/npm/l/laravel-schemify?color=blue)](https://github.com/ahsanmster/laravel-schemify/blob/main/LICENSE)

---

## The Problem

A new developer joins your Laravel project. There are no migrations — just a live database nobody documented. Setting up locally means manually recreating dozens of tables from scratch.

**laravel-schemify solves this.** Run one command, answer a few prompts, and every table in your database becomes a proper Laravel migration file ready for `php artisan migrate`.

---

## Installation

Install globally and use it in any Laravel project:

```bash
npm install -g laravel-schemify
```

Or use it once without installing:

```bash
npx laravel-schemify
```

Or add it as a dev dependency to a specific project:

```bash
npm install --save-dev laravel-schemify
npx laravel-schemify
```

---

## Usage

Run from the **root of your Laravel project**:

```bash
laravel-schemify
```

The CLI walks you through everything interactively:

```
  laravel-schemify

  Generate Laravel migrations from your existing database.

  Found .env file — mysql://root@127.0.0.1:3306/my_app
  ? Use database config from .env file? › Yes

  Migration output options:
  ? Output directory › ./database/migrations
  ? Tables to include (comma-separated, leave blank for ALL) ›
  ? Overwrite existing migration files? › No

  ✔ Connected to my_app via mysql
  ✔ Found 12 table(s): users, posts, comments, ...

  ✔ Generated: 2026_04_03_120000_create_users_table.php
  ✔ Generated: 2026_04_03_120001_create_posts_table.php
  ✔ Generated: 2026_04_03_120002_create_comments_table.php
  ...

  Done! 12 migration(s) written to ./database/migrations
```

### What gets auto-detected from your .env

If a `.env` file exists in the current directory, laravel-schemify reads `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD` automatically — you just confirm or override.

---

## Generated migration example

For a `users` table in MySQL:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->enum('status', ['active', 'inactive', 'banned'])->default('active');
            $table->boolean('is_verified')->default(false);
            $table->unsignedBigInteger('team_id')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique('email', 'users_email_unique');
            $table->index('team_id', 'users_team_id_index');

            $table->foreign('team_id')->references('id')->on('teams')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
```

---

## What gets handled automatically

| Database pattern | Generated Laravel code |
|---|---|
| `id` BIGINT UNSIGNED AUTO_INCREMENT | `$table->id()` |
| `created_at` + `updated_at` columns | `$table->timestamps()` |
| `deleted_at` nullable timestamp | `$table->softDeletes()` |
| UNIQUE indexes | `$table->unique(...)` |
| Composite indexes | `$table->index([...])` |
| FULLTEXT indexes (MySQL) | `$table->fullText(...)` |
| Foreign key constraints | `$table->foreign(...)->references(...)->on(...)` |
| ON DELETE / ON UPDATE rules | `->onDelete('cascade')` etc. |
| ENUM columns | `$table->enum('col', ['a', 'b'])` |
| Nullable columns | `->nullable()` |
| Default values | `->default(...)` |
| Unsigned integers | `->unsigned()` |
| Column comments | `->comment(...)` |

---

## Supported databases & column types

### MySQL / MariaDB

| MySQL type | Laravel method |
|---|---|
| `TINYINT(1)` | `boolean()` |
| `TINYINT`, `SMALLINT`, `MEDIUMINT`, `INT`, `BIGINT` | `tinyInteger()`, `smallInteger()`, `mediumInteger()`, `integer()`, `bigInteger()` |
| Auto-increment variants | `tinyIncrements()`, `smallIncrements()`, `mediumIncrements()`, `increments()`, `bigIncrements()` |
| `FLOAT`, `DOUBLE`, `DECIMAL` | `float()`, `double()`, `decimal()` |
| `CHAR`, `VARCHAR` | `char()`, `string()` |
| `TINYTEXT`, `TEXT`, `MEDIUMTEXT`, `LONGTEXT` | `tinyText()`, `text()`, `mediumText()`, `longText()` |
| `BINARY`, `BLOB` variants | `binary()` |
| `DATE`, `DATETIME`, `TIMESTAMP`, `TIME`, `YEAR` | `date()`, `dateTime()`, `timestamp()`, `time()`, `year()` |
| `JSON` | `json()` |
| `ENUM`, `SET` | `enum()`, `set()` |
| Spatial: `POINT`, `POLYGON`, `GEOMETRY`, etc. | `point()`, `polygon()`, `geometry()`, etc. |

### PostgreSQL

| PostgreSQL type | Laravel method |
|---|---|
| `int2/4/8`, `serial`, `bigserial` | `smallInteger()`, `integer()`, `bigInteger()`, `increments()`, etc. |
| `float4`, `float8`, `numeric`, `money` | `float()`, `double()`, `decimal()` |
| `char`, `varchar`, `text`, `citext` | `char()`, `string()`, `text()` |
| `bytea` | `binary()` |
| `boolean` | `boolean()` |
| `date`, `timestamp`, `timestamptz`, `time`, `timetz` | `date()`, `dateTime()`, `dateTimeTz()`, `time()`, `timeTz()` |
| `json`, `jsonb` | `json()`, `jsonb()` |
| `uuid` | `uuid()` |
| `inet`, `macaddr` | `ipAddress()`, `macAddress()` |
| `point`, `polygon` | `point()`, `polygon()` |
| Arrays (`_text`, `_int4`, etc.) | `json()` |

---

## Requirements

- **Node.js** >= 20.0.0
- **Laravel** 9+ (uses anonymous class migration syntax)
- **MySQL** 5.7+ / **MariaDB** 10.3+ or **PostgreSQL** 12+

---

## After generating migrations

```bash
# Run all generated migrations
php artisan migrate

# Or preview what will run first
php artisan migrate --pretend
```

---

## License

MIT © [ahsanmster](https://github.com/ahsanmster)
