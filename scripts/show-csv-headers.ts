import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const csvPath = path.join(process.cwd(), 'SoundCloud-All Campaigns.csv');
const fileContent = fs.readFileSync(csvPath, 'utf-8');

const records = parse(fileContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  relax_column_count: true,
});

console.log('📋 CSV Column Headers:');
if (records.length > 0) {
  const headers = Object.keys(records[0]);
  headers.forEach((header, idx) => {
    console.log(`  ${idx + 1}. "${header}"`);
  });
  
  console.log('\n📄 First Row Sample:');
  const firstRow = records[0];
  headers.forEach(header => {
    const value = firstRow[header];
    console.log(`  ${header}: ${value?.substring(0, 60)}${value?.length > 60 ? '...' : ''}`);
  });
} else {
  console.log('No records found!');
}



