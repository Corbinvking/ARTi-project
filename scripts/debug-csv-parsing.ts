#!/usr/bin/env ts-node

/**
 * Debug CSV Parsing
 * Tests if CSV files are being read correctly
 */

import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

console.log('🔍 CSV Parsing Debug\n');

// Test YouTube CSV
console.log('='.repeat(60));
console.log('YouTube CSV:');
console.log('='.repeat(60));
try {
  const csvContent = fs.readFileSync('YouTube-All Campaigns.csv', 'utf-8');
  console.log(`File size: ${csvContent.length} characters`);
  console.log(`First 500 characters:\n${csvContent.substring(0, 500)}\n`);
  
  const records: any[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
  
  console.log(`Total records parsed: ${records.length}`);
  console.log(`\nColumn names found:`, Object.keys(records[0] || {}));
  console.log(`\nFirst record:`, JSON.stringify(records[0], null, 2));
  console.log(`\nSample Campaign values:`);
  for (let i = 0; i < Math.min(5, records.length); i++) {
    console.log(`  [${i}] Campaign: "${records[i].Campaign || '(null)'}"`);
    console.log(`      URL: "${records[i].URL || '(null)'}"`);
  }
} catch (error) {
  console.error('❌ Error reading YouTube CSV:', error);
}

// Test Instagram CSV
console.log('\n' + '='.repeat(60));
console.log('Instagram CSV:');
console.log('='.repeat(60));
try {
  const csvContent = fs.readFileSync('IG Seeding-All Campaigns.csv', 'utf-8');
  console.log(`File size: ${csvContent.length} characters`);
  console.log(`First 500 characters:\n${csvContent.substring(0, 500)}\n`);
  
  const records: any[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
  
  console.log(`Total records parsed: ${records.length}`);
  console.log(`\nColumn names found:`, Object.keys(records[0] || {}));
  console.log(`\nFirst record:`, JSON.stringify(records[0], null, 2));
} catch (error) {
  console.error('❌ Error reading Instagram CSV:', error);
}

// Test SoundCloud CSV
console.log('\n' + '='.repeat(60));
console.log('SoundCloud CSV:');
console.log('='.repeat(60));
try {
  const csvContent = fs.readFileSync('SoundCloud-All Campaigns.csv', 'utf-8');
  console.log(`File size: ${csvContent.length} characters`);
  console.log(`First 500 characters:\n${csvContent.substring(0, 500)}\n`);
  
  const records: any[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
  
  console.log(`Total records parsed: ${records.length}`);
  console.log(`\nColumn names found:`, Object.keys(records[0] || {}));
  console.log(`\nFirst record:`, JSON.stringify(records[0], null, 2));
} catch (error) {
  console.error('❌ Error reading SoundCloud CSV:', error);
}

console.log('\n' + '='.repeat(60));
console.log('✅ Debug complete!');
console.log('='.repeat(60));

