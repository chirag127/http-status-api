/**
 * HTTP Status Codes scraper.
 *
 * Primary source: IANA HTTP Status Code Registry XML.
 * Description source: the RFC text cited by each registry record (the registry
 * itself only carries the reason phrase). RFCs are cached under the OS temp dir.
 *
 * Run: node scraper/index.cjs
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const REGISTRY_URL = 'https://www.iana.org/assignments/http-status-codes/http-status-codes.xml';
const RFC_URL = (n) => `https://www.rfc-editor.org/rfc/rfc${n}.txt`;
const CACHE_DIR = path.join(os.tmpdir(), 'http-status-api-rfc-cache');

const ROOT = path.join(__dirname, '..');
const API_DIR = path.join(ROOT, 'api/v1');

const CATEGORIES = {
  1: { class: 'informational', category: '1xx', categoryName: 'Informational' },
  2: { class: 'success', category: '2xx', categoryName: 'Success' },
  3: { class: 'redirect', category: '3xx', categoryName: 'Redirection' },
  4: { class: 'client-error', category: '4xx', categoryName: 'Client Error' },
  5: { class: 'server-error', category: '5xx', categoryName: 'Server Error' },
};

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'http-status-api/1.0 (+https://github.com/chirag127/http-status-api)' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const text = await res.text();
  if (/^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text)) throw new Error(`${url} returned HTML, not data`);
  return text;
}

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&');
}

function parseRegistry(xml) {
  const updated = (xml.match(/<registry[^>]*>\s*<title>[^<]*<\/title>\s*<updated>([^<]+)<\/updated>/) || [])[1] || null;
  const records = [];
  for (const chunk of xml.split('<record').slice(1)) {
    const body = chunk.slice(0, chunk.indexOf('</record>') + 1 || chunk.length);
    const value = (body.match(/<value>([^<]*)<\/value>/) || [])[1];
    if (!value) continue;
    const description = decodeEntities((body.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '');
    const xrefs = [...body.matchAll(/<xref type="([^"]+)" data="([^"]+)"(?: section="([^"]+)")?/g)].map((m) => ({
      type: m[1],
      data: m[2],
      section: m[3] || null,
    }));
    const note = (body.match(/<note>\s*<artwork>([\s\S]*?)<\/artwork>/) || [])[1];
    records.push({
      value: value.trim(),
      description: description.trim(),
      xrefs,
      note: note ? note.trim() : null,
      registered: (body.match(/\bdate="([^"]+)"/) || [])[1] || null,
      updated: (body.match(/\bupdated="([^"]+)"/) || [])[1] || null,
    });
  }
  return { updated, records };
}

/** Strip RFC page furniture so section bodies are clean paragraphs. */
function cleanRfc(text) {
  return text
    .split('\n')
    .filter((line) => !/^RFC \d+\s/.test(line))
    .filter((line) => !/^\[?Page \d+\]?$/.test(line.trim()))
    .map((line) => line.replace(/\f/g, ''))
    .join('\n');
}

const HEADING = /^(\d+(?:\.\d+)*)\.?\s+\S/;

function sectionBody(lines, startIndex) {
  const out = [];
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (HEADING.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out;
}

function firstParagraph(text) {
  const paragraphs = text
    .replace(/\n\s*\n/g, '\n\n')
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim())
    .filter((p) => p.length > 0);
  return paragraphs.length ? paragraphs[0] : null;
}

/**
 * Locate the text for one registry record. Explicit section numbers come from
 * the registry; older RFCs carry no section, so the heading that names the code
 * is used instead (e.g. "3.  428 Precondition Required").
 */
function extractRfcText(rfcText, code, section) {
  const lines = cleanRfc(rfcText).split('\n');
  let start = -1;
  if (section) {
    const re = new RegExp(`^${section.split('.').join('[.]')}[.]?\\s+\\S`);
    start = lines.findIndex((l) => re.test(l));
  }
  if (start < 0) {
    const re = new RegExp(`^\\d+(?:\\.\\d+)*\\.?\\s+(?=.*\\b${code}\\b)`);
    start = lines.findIndex((l) => re.test(l) && l.length < 80);
  }
  if (start < 0) return null;
  return firstParagraph(sectionBody(lines, start).join('\n'));
}

async function loadRfc(number) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, `rfc${number}.txt`);
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  const text = await fetchText(RFC_URL(number));
  if (!/^\s*(Network Working Group|Internet Engineering|Independent Submission|Internet Research)/.test(text) && !/Request for Comments/.test(text)) {
    throw new Error(`rfc${number} did not look like an RFC text file`);
  }
  fs.writeFileSync(file, text);
  return text;
}

function specFor(record) {
  const rfc = record.xrefs.find((x) => x.type === 'rfc');
  if (rfc) {
    const num = rfc.data.replace(/^rfc/, '');
    return {
      rfc: num,
      section: rfc.section,
      url: rfc.section
        ? `https://www.rfc-editor.org/rfc/rfc${num}.html#section-${rfc.section}`
        : `https://www.rfc-editor.org/rfc/rfc${num}.html`,
    };
  }
  const draft = record.xrefs.find((x) => x.type === 'draft');
  if (draft) {
    return { rfc: null, section: null, url: `https://datatracker.ietf.org/doc/${draft.data}/` };
  }
  return { rfc: null, section: null, url: null };
}

async function build() {
  console.log('Fetching', REGISTRY_URL);
  const xml = await fetchText(REGISTRY_URL);
  const { updated, records: raw } = parseRegistry(xml);
  console.log(`Registry updated: ${updated}; ${raw.length} records`);

  const singles = raw.filter((r) => /^\d{3}$/.test(r.value));
  const ranges = raw.filter((r) => !/^\d{3}$/.test(r.value));
  console.log(`${singles.length} single codes, ${ranges.length} unassigned ranges (ranges are not published as records)`);

  const rfcCache = new Map();
  const records = [];
  for (const r of singles) {
    const code = Number(r.value);
    const cat = CATEGORIES[Math.floor(code / 100)];
    const spec = specFor(r);
    let description = null;
    if (spec.rfc) {
      if (!rfcCache.has(spec.rfc)) rfcCache.set(spec.rfc, await loadRfc(spec.rfc));
      description = extractRfcText(rfcCache.get(spec.rfc), code, spec.section);
    }
    const unassigned = /^unassigned$/i.test(r.description);
    if (unassigned) {
      description = 'Unassigned in the IANA HTTP Status Code Registry; no status code is currently registered for this number.';
    }
    if (!description) description = r.description;

    records.push({
      id: r.value,
      code,
      name: r.description,
      phrase: r.description,
      state: unassigned ? 'unassigned' : /\(unused\)/i.test(r.description) ? 'reserved' : 'assigned',
      class: cat.class,
      category: cat.category,
      categoryName: cat.categoryName,
      // The registry marks temporary registrations as "(TEMPORARY - registered ...)";
      // a plain /TEMPORARY/i also matches the phrase "Temporary Redirect" (307).
      temporary: /\(TEMPORARY/.test(r.description),
      description: description.replace(/\s+/g, ' ').trim(),
      spec,
      registered: r.registered,
      updated: r.updated,
    });
  }

  const assigned = records.filter((r) => r.state === 'assigned').length;
  const missingText = records.filter((r) => r.state === 'assigned' && (!r.spec.rfc || r.description === r.phrase)).map((r) => r.id);
  if (missingText.length) console.warn('Codes whose description is the registry phrase (no RFC text found):', missingText.join(', '));
  console.log(`${records.length} records written (${assigned} assigned)`);

  return { records, registryUpdated: updated };
}

build()
  .then(({ records, registryUpdated }) => {
    const json = JSON.stringify(records, null, 2) + '\n';
    for (const rel of ['data.json', 'data/status-codes.json', 'data/index.json', 'api/v1/data.json']) {
      fs.writeFileSync(path.join(ROOT, rel), json);
    }

    const outDir = path.join(API_DIR, 'individual');
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });
    for (const rec of records) {
      fs.writeFileSync(path.join(outDir, `${rec.id}.json`), JSON.stringify(rec, null, 2) + '\n');
    }

    const byId = {};
    for (const rec of records) byId[rec.id] = rec;
    fs.writeFileSync(path.join(API_DIR, 'search-index.json'), JSON.stringify({ byId }, null, 2) + '\n');

    const now = new Date();
    const meta = {
      status: 'healthy',
      lastUpdated: now.toISOString(),
      sourceUpdatedAt: registryUpdated ? `${registryUpdated}T00:00:00.000Z` : null,
      retrievedAt: now.toISOString(),
      recordCount: records.length,
      assignedCount: records.filter((r) => r.state === 'assigned').length,
      version: '1.0.0',
      schemaVersion: '1.0.0',
      source: 'IANA HTTP Status Code Registry',
      sourceUrl: REGISTRY_URL,
      license: 'IANA registry data; description text is IETF RFC text',
      updateCadence: 'manual',
      nextUpdateDue: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      lastFailedAt: null,
      failureReason: null,
    };
    fs.writeFileSync(path.join(API_DIR, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
    fs.writeFileSync(
      path.join(__dirname, 'fixtures/expected.json'),
      JSON.stringify({ recordCount: records.length, assignedCount: meta.assignedCount, sourceUpdatedAt: meta.sourceUpdatedAt }, null, 2) + '\n'
    );
    console.log(`Generated ${records.length} individual files, search index, meta.json`);
  })
  .catch((err) => {
    console.error('Scraper failed:', err.message);
    process.exit(1);
  });
