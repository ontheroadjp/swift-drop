# Specification Summary

## Upload Specification
- Method: `POST /api/upload`
- Content type: multipart form (`multer` with `bodyParser: false`)
- Form fields:
  - `files`: file array (required, max 20)
  - `expiresInDays`: integer (optional, 1..30, default 7)
- Success response:
  - `downloadUrl`, `authCode`, `expiresAt`, `expiresInDays`, `fileCount`, `totalSize`

Evidence:
- pages/api/upload.js:82
- pages/api/upload.js:94
- pages/api/upload.js:114
- pages/api/upload.js:188

## Download Authorization / Listing
- Method: `POST /api/download/[token]/files`
- Input: JSON body `{ code }`
- Validations:
  - token exists
  - not expired
  - bcrypt code match
- Success response includes normalized file names

Evidence:
- pages/api/download/[token]/files.js:36
- pages/api/download/[token]/files.js:50
- pages/api/download/[token]/files.js:54
- pages/api/download/[token]/files.js:59
- pages/api/download/[token]/files.js:61

## Single File Download
- Method: `POST /api/download/[token]/file`
- Input: JSON body `{ code, fileId }`
- Streams file content with content-disposition header and increments `download_count`

Evidence:
- pages/api/download/[token]/file.js:35
- pages/api/download/[token]/file.js:41
- pages/api/download/[token]/file.js:72
- pages/api/download/[token]/file.js:77
- pages/api/download/[token]/file.js:79

## ZIP Download
- Method: `POST /api/download/[token]/bundle`
- Input: JSON body `{ code, fileIds }`
- Builds zip archive from selected or all files and streams response

Evidence:
- pages/api/download/[token]/bundle.js:35
- pages/api/download/[token]/bundle.js:57
- pages/api/download/[token]/bundle.js:69
- pages/api/download/[token]/bundle.js:102
- pages/api/download/[token]/bundle.js:118

## Persistence Specification
- DB file: `data/swift_drop.db`
- Tables:
  - `transfers` (token, code_hash, expiry, counters)
  - `transfer_files` (per-file rows linked by `transfer_token`)
- Upload transaction writes both tables in one transaction

Evidence:
- lib/db.js:12
- lib/db.js:18
- lib/db.js:31
- pages/api/upload.js:132
- pages/api/upload.js:157

## Filename Handling
- Uploaded/display names are normalized with mojibake-aware decoding heuristic
- Download header uses ASCII fallback + RFC5987 UTF-8 filename*

Evidence:
- lib/filename.js:20
- lib/filename.js:35
- lib/download.js:21
- lib/download.js:25

## Frontend Contract
- Upload page (`/`) aggregates selected files, supports drag-and-drop, then uploads via `FormData`
- Download page (`/d/[token]`) performs auth, file selection, single/bundle download actions

Evidence:
- pages/index.js:34
- pages/index.js:62
- pages/index.js:83
- pages/d/[token].js:67
- pages/d/[token].js:101
- pages/d/[token].js:121

## Legacy Endpoint Status
- `/api/download/[token]` is deprecated and returns HTTP 410 with migration message.

Evidence:
- pages/api/download/[token].js:2

## Security Controls (Current)
- Auth attempt throttling:
  - Failed code attempts are tracked by `token + ip_address`.
  - Requests are locked for a period after threshold exceed.
  - Evidence: `lib/db.js:44-55`, `lib/security.js:57-139`
- Upload request throttling:
  - Upload requests are limited per IP in process memory window.
  - Evidence: `lib/security.js:5-7`, `lib/security.js:39-51`, `pages/api/upload.js:88-91`
- Proxy trust behavior:
  - `x-forwarded-for` is used only when `TRUST_PROXY=true`.
  - Evidence: `lib/security.js:9-22`

## Dependency Risk (Known)
- `npm audit --omit=dev` currently reports high vulnerabilities in transitive dependencies (`minimatch`/`tar` paths) with no fix available at this time.
- This is a known residual risk and requires periodic reassessment on dependency updates.
