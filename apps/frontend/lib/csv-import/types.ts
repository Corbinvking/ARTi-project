// Shared types for CSV import across all platforms

export interface ParsedCSVData {
  headers: string[];
  rows: Record<string, any>[];
  previewRows: Record<string, any>[];
}

export interface ColumnMapping {
  csvColumn: string;
  dbField: string;
  required: boolean;
}

export interface FieldDefinition {
  key: string;
  label: string;
  required: boolean;
  type?: 'text' | 'number' | 'date' | 'array' | 'enum';
  enumValues?: string[];
}

export interface ImportProgress {
  current: number;
  total: number;
  phase: string;
  phaseNum: number;
  totalPhases: number;
}

export interface ColumnPattern {
  field: string;
  pattern: RegExp;
}

export type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing';
