
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../api/v1/data.json'), 'utf8'));
const outDir = path.join(__dirname, '../api/v1/individual');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
for (const item of data) {
  const id = item.id || item.code || item.slug || item.name?.replace(/\s+/g, '-').toLowerCase();
  if (id) fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify(item, null, 2) + '\n');
}
console.log(`Generated ${data.length} individual files`);
