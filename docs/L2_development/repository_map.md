# Repository Map

## Top-level Responsibilities
- `pages/`: Next.js pages and API routes
- `lib/`: shared backend utilities (DB, storage, filename/content-disposition helpers, constants)
- `components/`: reusable UI component(s)
- `styles/`: global styles
- `scripts/`: local command helpers
- `public/`: static assets
- `uploads/`: uploaded file binaries (runtime data)
- `data/`: SQLite DB file (runtime data)

Evidence:
- pages/_app.js:1
- pages/api/upload.js:6
- pages/api/upload.js:15
- components/AppIcon.js:1
- styles/globals.css:1
- scripts/dev.mjs:1
- public/favicon.svg
- lib/storage.js:5
- lib/storage.js:6

## HTTP Entry Points
- UI
  - `/` -> upload page (`pages/index.js`)
  - `/d/[token]` -> download/auth page (`pages/d/[token].js`)
- API
  - `POST /api/upload`
  - `POST /api/download/[token]/files`
  - `POST /api/download/[token]/file`
  - `POST /api/download/[token]/bundle`
  - Legacy endpoint `/api/download/[token]` returns 410

Evidence:
- pages/index.js:24
- pages/d/[token].js:54
- pages/api/upload.js:88
- pages/api/download/[token]/files.js:31
- pages/api/download/[token]/file.js:29
- pages/api/download/[token]/bundle.js:29
- pages/api/download/[token].js:2

## Data Model Location
- Schema initialization is in `lib/db.js`.
- `transfers` and `transfer_files` tables are created on first DB access.

Evidence:
- lib/db.js:8
- lib/db.js:17
- lib/db.js:31
