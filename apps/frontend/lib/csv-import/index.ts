// Core CSV import utilities shared across all platforms
import Papa from 'papaparse';
import type { ParsedCSVData, ColumnPattern, ImportProgress } from './types';

/**
 * Parse a CSV file and return structured data
 */
export async function parseCSV(file: File): Promise<ParsedCSVData> {
  const text = await file.text();
  const { data, errors } = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (errors.length > 0) {
    console.error('CSV parsing errors:', errors);
    throw new Error(`CSV parsing error: ${errors[0].message}`);
  }

  const rows = data as Record<string, any>[];
  const headers = Object.keys(rows[0] || {});
  const previewRows = rows.slice(0, 5);

  return { headers, rows, previewRows };
}

/**
 * Auto-detect column mappings based on header names and patterns
 */
export function detectColumnMappings(
  headers: string[],
  patterns: ColumnPattern[]
): Record<string, string> {
  const mappings: Record<string, string> = {};

  headers.forEach((header) => {
    for (const { field, pattern } of patterns) {
      if (pattern.test(header.trim())) {
        mappings[field] = header;
        break;
      }
    }
  });

  return mappings;
}

/**
 * Parse a goal string like "10K", "1.5M", "10000" into a numeric value
 * Handles K (thousand) and M (million) suffixes case-insensitively
 */
export function parseGoalString(goalStr: string | number | null | undefined): number {
  if (goalStr === null || goalStr === undefined) return 0;

  const str = String(goalStr).trim().replace(/[,\s$]/g, '');
  if (!str) return 0;

  // Check for K (thousands) suffix
  const kMatch = str.match(/^([\d.]+)[Kk]$/);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }

  // Check for M (millions) suffix
  const mMatch = str.match(/^([\d.]+)[Mm]$/);
  if (mMatch) {
    return Math.round(parseFloat(mMatch[1]) * 1000000);
  }

  // Plain number
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.round(num);
}

/**
 * Parse a comma-separated string into an array
 * Handles various delimiters and cleans up whitespace
 */
export function parseArrayField(value: string | null | undefined): string[] {
  if (!value) return [];
  
  return value
    .split(/[,;|]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Process items in batches with progress callback
 */
export async function batchProcess<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[], batchIndex: number) => Promise<R[]>,
  onProgress?: (processed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = [];
  const totalBatches = Math.ceil(items.length / batchSize);

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * batchSize;
    const end = Math.min(start + batchSize, items.length);
    const batch = items.slice(start, end);

    const batchResults = await processor(batch, batchIdx);
    results.push(...batchResults);

    if (onProgress) {
      onProgress(end, items.length);
    }

    // Small delay to prevent rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Generate a CSV file from data and trigger download
 */
export function downloadCSV(data: Record<string, any>[], filename: string): void {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Clean and normalize a price/currency string
 */
export function parsePriceString(priceStr: string | null | undefined): number {
  if (!priceStr) return 0;
  
  const cleaned = String(priceStr).replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse a date string into ISO format (YYYY-MM-DD)
 */
export function parseDateString(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  
  const str = String(dateStr).trim();
  if (!str) return null;
  
  // Try parsing as Date
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  
  // MM/DD/YYYY format
  const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

/**
 * Create initial progress state
 */
export function createInitialProgress(totalPhases: number = 5): ImportProgress {
  return {
    current: 0,
    total: 0,
    phase: '',
    phaseNum: 0,
    totalPhases,
  };
}

// Re-export types
export * from './types';
