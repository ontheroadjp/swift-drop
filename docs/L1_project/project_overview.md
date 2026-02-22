# Project Overview

## Purpose
Swift Drop is a file handoff service that issues a download URL and a 6-digit auth code after upload.

Evidence:
- README.md:3
- pages/index.js:139
- pages/index.js:248
- pages/api/upload.js:188
- pages/api/upload.js:190

## Runtime and Framework
- Next.js Pages Router app (`pages/` based routing)
- React frontend + Next.js API Routes backend in the same project
- SQLite for transfer metadata
- Uploaded files are stored on local filesystem

Evidence:
- package.json:14
- package.json:15
- pages/index.js:1
- pages/api/upload.js:88
- lib/db.js:11
- lib/db.js:17
- lib/storage.js:5

## Core User Flow
1. Uploader selects one or more files and optional expiration days.
2. Frontend posts multipart form data to `/api/upload`.
3. Server stores files and metadata, hashes auth code, returns URL and code.
4. Recipient opens `/d/[token]`, enters code, fetches file list.
5. Recipient downloads a single file or selected/all files as ZIP.

Evidence:
- pages/index.js:83
- pages/index.js:89
- pages/api/upload.js:130
- pages/api/upload.js:185
- pages/d/[token].js:72
- pages/d/[token].js:104
- pages/d/[token].js:130

## Constraints and Limits
- Maximum file size: 100MB per file
- Maximum files per upload request: 20
- Expiration days: 1 to 30 (default 7)

Evidence:
- lib/constants.js:1
- pages/api/upload.js:30
- pages/api/upload.js:31
- lib/constants.js:3
- lib/constants.js:4
- lib/constants.js:5
- pages/api/upload.js:56

## UI Notes
- Global stylesheet is loaded from `_app`.
- Japanese locale is set in HTML root.
- Google Fonts (Roboto, Roboto Mono) are preloaded in `_document`.

Evidence:
- pages/_app.js:1
- pages/_document.js:5
- pages/_document.js:8
- pages/_document.js:11
- styles/globals.css:1

## Out of Scope / Not Confirmed
- CI workflow definitions are not confirmed in this repository state.
- Automated test suite definitions are not confirmed in this repository state.

How to confirm:
- Check `.github/workflows/` if created later.
- Check `package.json:scripts` for test commands if added later.
