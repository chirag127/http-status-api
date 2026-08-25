
const fs = require('fs');
const path = require('path');
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../schemas/data.json'), 'utf8'));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../api/v1/data.json'), 'utf8'));
let errors = 0;
for (const item of data) {
  if (schema.items && schema.items.required) {
    for (const field of schema.items.required) {
      if (!(field in item)) { console.error('Missing', field); errors++; }
    }
  }
}
if (errors > 0) process.exit(1);
console.log('Validation passed');
