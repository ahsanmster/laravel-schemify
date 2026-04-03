import type { RoutineDef } from '../types/schema.js';
import { toStudlyCase } from '../utils/naming.js';

export function generateRoutineMigration(routine: RoutineDef): string {
  const className = `Create${toStudlyCase(routine.name)}${toStudlyCase(routine.type.toLowerCase())}`;
  const dropStatement = routine.type === 'PROCEDURE'
    ? `DROP PROCEDURE IF EXISTS \`${routine.name}\``
    : `DROP FUNCTION IF EXISTS \`${routine.name}\``;

  // Escape backslashes and double-quotes inside the SQL string
  const escaped = routine.definition
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');

  return `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Support\\Facades\\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::unprepared("
${escaped}
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared('${dropStatement}');
    }
};
`;
}
