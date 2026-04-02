export interface ColumnDef {
  name: string;
  type: string;
  udtName?: string;
  length?: number;
  precision?: number;
  scale?: number;
  nullable: boolean;
  unsigned: boolean;
  default?: string | number | boolean | null;
  autoIncrement: boolean;
  isPrimary: boolean;
  comment?: string;
  enumValues?: string[];
}

export interface IndexDef {
  name: string;
  columns: string[];
  unique: boolean;
  isPrimary: boolean;
  indexType?: string;
}

export interface ForeignKeyDef {
  constraintName: string;
  localColumns: string[];
  foreignTable: string;
  foreignColumns: string[];
  onDelete: string;
  onUpdate: string;
}

export interface TableSchema {
  name: string;
  columns: ColumnDef[];
  indexes: IndexDef[];
  foreignKeys: ForeignKeyDef[];
  primaryKey: string[];
}
