/**
 * Schema validation tests
 * Run: npm test
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../schemas/data.json'), 'utf8'));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../api/v1/data.json'), 'utf8'));

let passed = 0, failed = 0;

function validate(item) {
  const errors = [];
  if (schema.items && schema.items.required) {
    for (const field of schema.items.required) {
      if (!(field in item)) errors.push(`Missing required field: ${field}`);
    }
  }
  return errors;
}

console.log('Test 1: Schema validation');
for (const item of data) {
  const errors = validate(item);
  if (errors.length > 0) {
    console.error('  FAIL:', item.id || 'unknown', errors.join(', '));
    failed++;
  } else passed++;
}

console.log('Test 2: No duplicate IDs');
const ids = data.map(d => d.id || d.code || d.slug).filter(Boolean);
const dupes = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
if (dupes.length > 0) { console.error('  FAIL: Duplicates:', dupes.join(', ')); failed++; }
else { console.log('  PASS'); passed++; }

console.log('Test 3: Individual files exist');
const indivDir = path.join(__dirname, '../api/v1/individual');
let filesOk = true;
for (const item of data) {
  const id = item.id || item.code || item.slug;
  if (id && !fs.existsSync(path.join(indivDir, `${id}.json`))) {
    console.error('  FAIL: Missing', id);
    filesOk = false; failed++;
  }
}
if (filesOk) { console.log('  PASS'); passed++; }

console.log(`
${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
