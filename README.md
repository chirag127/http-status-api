# HTTP Status Codes

Every status code in the IANA HTTP Status Code Registry — 67 records, 62 of them assigned — with the reason phrase, the code class, and the RFC paragraph that defines it.

No authentication. No server. No rate limit. The committed JSON is the database.

    curl https://chirag127.github.io/http-status-api/api/v1/data.json

## What you get

| Field | Example | Notes |
| --- | --- | --- |
| `id` | `"404"` | The three-digit code. A string, so `"008"`-style codes never lose their leading zeros. |
| `code` | `404` | The same value as a number, for arithmetic. |
| `name` | `"Not Found"` | Reason phrase exactly as the IANA registry writes it. `phrase` repeats it for callers that prefer that name. |
| `state` | `"assigned"` | `assigned`, or `reserved` for 306 and 418, or `unassigned` for 427, 430 and 509. |
| `class` / `category` | `"client-error"` / `"4xx"` | Slug plus the 1xx–5xx class the registry note defines. |
| `description` | `"The 404 (Not Found) status code indicates that the origin server did not find a current representation for the target resource…"` | First paragraph of the RFC section that defines the code. |
| `spec` | `{"rfc":"9110","section":"15.5.5","url":"https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.5"}` | RFC, section and a link straight to the defining text. |

## Endpoints

| Endpoint | Description | Size |
| --- | --- | --- |
| `/api/v1/data.json` | All 67 records, in code order | 50,368 bytes |
| `/api/v1/individual/{id}.json` | One record, e.g. `/api/v1/individual/404.json` | 450–1,032 bytes each |
| `/api/v1/search-index.json` | The same records keyed by code, for a single-fetch lookup | 53,399 bytes |
| `/api/v1/meta.json` | Record count, source, retrieval time | 591 bytes |

## Data source and accuracy

The code list, reason phrases, states and registration dates come from the IANA HTTP Status Code Registry XML
(`https://www.iana.org/assignments/http-status-codes/http-status-codes.xml`), last updated by IANA on 2025-09-15 and fetched on 2026-11-10.

The `description` field is the first paragraph of the defining RFC section, quoted verbatim. 63 of the 67 records resolve to RFC text
across 11 RFCs (9110, 2518, 8297, 4918, 5842, 3229, 8470, 6585, 7725, 2295, 2774). Code 104 quotes its registry entry instead, because
it points at an Internet-Draft rather than a published RFC. Codes 427, 430 and 509 are unassigned and carry a one-line statement of that fact.

`scraper/index.cjs` rebuilds the whole dataset from the registry, so a code added by IANA appears on the next run without hand editing.

## Limits, stated plainly

- The registry's eight range records (for example `105-199 Unassigned`) are not published here. Only three-digit codes are.
- `description` is the RFC's opening definition, not usage advice. It will not tell you when to return a code or how clients should react.
- 104 is a temporary registration that expires 2026-11-13 unless IANA extends it. It stays in the file until the registry drops it.
- Vendor codes are absent by design. nginx's 444 and 499, Cloudflare's 520–527 and AWS's 561 are not IANA-registered, so they are not here.

## Contract

[openapi.yaml](./openapi.yaml) describes all four endpoints. The record type:

```ts
type HttpStatus = {
  id: string;            // "404"
  code: number;          // 404
  name: string;          // "Not Found"
  phrase: string;        // "Not Found"
  state: 'assigned' | 'reserved' | 'unassigned';
  class: 'informational' | 'success' | 'redirect' | 'client-error' | 'server-error';
  category: '1xx' | '2xx' | '3xx' | '4xx' | '5xx';
  categoryName: string;  // "Client Error"
  temporary: boolean;    // true for the one temporary registration (104)
  description: string;
  spec: { rfc: string | null; section: string | null; url: string | null };
  registered: string | null;  // "2024-11-13"
  updated: string | null;     // "2021-10-01"
};
```

## Licence

Code: MIT — see [LICENSE](./LICENSE). Data: the code list and reason phrases are the IANA registry; the `description` paragraphs are
excerpts from IETF RFCs, © IETF Trust, reproduced under the [IETF Trust Legal Provisions](https://www.rfc-editor.org/copyright/).

---

## About the author

**Chirag Singhal** — building free, open APIs and tools. Everything here is free, no
authentication, no rate limits, no telemetry. If it saves you time and you want to work
together, that is exactly what this is for.

- **Email — the fastest way to reach me:** [chirag@oriz.in](mailto:chirag@oriz.in)
- **GitHub:** [github.com/chirag127](https://github.com/chirag127)
- **LinkedIn:** [linkedin.com/in/chirag127](https://www.linkedin.com/in/chirag127/)
- **X:** [x.com/singhal127](https://x.com/singhal127)
- **YouTube:** [@ChiragSinghal127](https://www.youtube.com/@ChiragSinghal127)
- **Instagram:** [chiragsinghal127](https://www.instagram.com/chiragsinghal127/)
- **Reddit:** [Far_Macaron_9910](https://www.reddit.com/user/Far_Macaron_9910/)
- **Buy me a coffee:** [buymeacoffee.com/chirag127](https://buymeacoffee.com/chirag127)

**Hiring?** I build developer tooling, data APIs and web platforms. Email me — I reply to
everything.
