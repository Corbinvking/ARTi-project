#!/usr/bin/env node
import { promises as fs } from 'fs';
import { parse } from 'csv-parse/sync';

const csvPath = 'full-databse-chunk.csv';
const fileContent = await fs.readFile(csvPath, 'utf-8');
const records = parse(fileContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  relax_quotes: true,
  bom: true
});

console.log(`\nTotal CSV rows: ${records.length}`);

const campaigns = records.filter(r => r.Campaign && r.Campaign.trim());
console.log(`Rows with campaign names: ${campaigns.length}`);

const campaignNames = campaigns.map(c => c.Campaign.trim());
const uniqueNames = [...new Set(campaignNames)];

console.log(`Unique campaign names: ${uniqueNames.length}`);
console.log(`Duplicates: ${campaigns.length - uniqueNames.length}\n`);

if (campaigns.length !== uniqueNames.length) {
  const nameCounts = {};
  campaignNames.forEach(name => {
    nameCounts[name] = (nameCounts[name] || 0) + 1;
  });
  
  const duplicates = Object.entries(nameCounts)
    .filter(([name, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);
  
  console.log(`Top duplicates:`);
  duplicates.slice(0, 20).forEach(([name, count]) => {
    console.log(`  ${name}: ${count} times`);
  });
}

