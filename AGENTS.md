# http-status-api agent guide

Static JSON API served by GitHub Pages.

- The public contract is `openapi.yaml`; the committed JSON under `api/v1/` is the database.
- Do not hand-edit generated API files. Use the repository scraper/build scripts and validate before committing.
- Never invent data or leave scaffold records in a published dataset. Preserve the last known good data when a source fails.
- Do not commit secrets. Use repository secrets or the local encrypted environment.
- Use the default branch (`main`) and conventional commits. Do not force-push.
- Refresh metadata with the repository's data workflow; keep README, OpenAPI, and website in sync.
