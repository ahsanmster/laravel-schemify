export function generateRoutineFilename(name: string, type: string, index: number): string {
  const base = new Date(Date.now() + index * 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');

  const timestamp = [
    base.getFullYear(),
    pad(base.getMonth() + 1),
    pad(base.getDate()),
    '_',
    pad(base.getHours()),
    pad(base.getMinutes()),
    pad(base.getSeconds()),
  ].join('');

  const kind = type.toLowerCase() === 'procedure' ? 'procedure' : 'function';
  return `${timestamp}_create_${name}_${kind}.php`;
}

export function generateFilename(table: string, index: number): string {
  const base = new Date(Date.now() + index * 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');

  const timestamp = [
    base.getFullYear(),
    pad(base.getMonth() + 1),
    pad(base.getDate()),
    '_',
    pad(base.getHours()),
    pad(base.getMinutes()),
    pad(base.getSeconds()),
  ].join('');

  return `${timestamp}_create_${table}_table.php`;
}

export function toStudlyCase(str: string): string {
  return str
    .split(/[_\-\s]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}
