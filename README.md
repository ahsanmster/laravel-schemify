# laravel-schemify

> Reverse-engineer your MySQL or PostgreSQL database into ready-to-run Laravel migration files — interactively.

[![npm version](https://img.shields.io/npm/v/laravel-schemify)](https://www.npmjs.com/package/laravel-schemify)
[![license](https://img.shields.io/npm/l/laravel-schemify)](LICENSE)

---

## Why?

When a new developer joins your Laravel project they often face an undocumented database with no migrations. `laravel-schemify` connects to your live database, reads every table, and generates proper Laravel migration files — so anyone can run `php artisan migrate` and have the full schema from scratch.

---

## Installation

**Global (recommended)**

```bash
npm install -g laravel-schemify
```

**Per-project (as a dev dependency)**

```bash
npm install --save-dev laravel-schemify
```

Then run with:

```bash
npx laravel-schemify
```

---

## Usage

Run the command from the root of your Laravel project:

```bash
laravel-schemify
```

The CLI will guide you through:

1. **Auto-detect `.env`** — if a Laravel `.env` file is found, you'll be asked whether to use its database config.
2. **Database credentials** — driver (MySQL / PostgreSQL), host, port, database name, username, password.
3. **Output options** — output directory (default: `./database/migrations`), which tables to include, whether to overwrite existing files.

Then it connects, reads all tables, and writes one migration file per table.

---

## Example output

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->enum('role', ['admin', 'editor', 'viewer'])->default('viewer');
            $table->boolean('is_active')->default(true);
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();

            $table->unique('email', 'users_email_unique');

            $table->foreign('team_id')->references('id')->on('teams')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
```

---

## Supported column types

### MySQL / MariaDB
`int`, `bigint`, `smallint`, `mediumint`, `tinyint`, `float`, `double`, `decimal`, `char`, `varchar`, `text`, `tinytext`, `mediumtext`, `longtext`, `binary`, `blob`, `date`, `datetime`, `timestamp`, `time`, `year`, `json`, `enum`, `set`, geometry types, and more.

### PostgreSQL
`int2/4/8`, `serial`, `float4/8`, `numeric`, `decimal`, `money`, `char`, `varchar`, `text`, `bytea`, `boolean`, `date`, `timestamp`, `timestamptz`, `time`, `timetz`, `json`, `jsonb`, `uuid`, `inet`, `macaddr`, `point`, `polygon`, arrays mapped to `json`, and more.

---

## Laravel shortcuts detected automatically

| Pattern | Generated method |
|---------|-----------------|
| `id` column, BIGINT, auto-increment | `$table->id()` |
| `created_at` + `updated_at` | `$table->timestamps()` |
| `deleted_at` nullable timestamp | `$table->softDeletes()` |

---

## Requirements

- Node.js >= 20
- Laravel 9+ (uses anonymous class migration syntax)
- MySQL 5.7+ / MariaDB 10.3+ or PostgreSQL 12+

---

## License

MIT — [ahsanmster](https://github.com/ahsanmster)
