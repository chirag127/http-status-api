
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../api/v1/data.json'), 'utf8'));
const index = { byId: {} };
for (const item of data) {
  const id = item.id || item.code || item.slug || item.name?.replace(/\s+/g, '-').toLowerCase();
  if (id) index.byId[id] = item;
}
fs.writeFileSync(path.join(__dirname, '../api/v1/search-index.json'), JSON.stringify(index, null, 2) + '\n');
console.log('Generated search index');
