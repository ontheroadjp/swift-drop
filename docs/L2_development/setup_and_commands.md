# Setup And Commands

## Source of Truth
Runtime commands are defined in `repo.profile.json` and backed by implementation/docs evidence.

## Prerequisites
- Node.js and npm available in shell

Evidence:
- package.json:5
- package-lock.json

## Commands
- `npm install`
  - Installs dependencies before running app.
  - Evidence: README.md:16
- `npm run dev`
  - Runs `node scripts/dev.mjs` and starts `next dev`.
  - Evidence: package.json:6, scripts/dev.mjs:34
- `npm run build`
  - Runs Next.js production build.
  - Evidence: package.json:7
- `npm run start`
  - Starts Next.js production server.
  - Evidence: package.json:8

## Dev Port Behavior
- Default port is `3000`.
- `--port`, `-p`, numeric arg, and `npm_config_port` are accepted.

Evidence:
- scripts/dev.mjs:6
- scripts/dev.mjs:17
- scripts/dev.mjs:23
- scripts/dev.mjs:28

## Paths Relevant To Development
- Uploaded files directory: `uploads/`
- SQLite DB directory: `data/`
- SQLite DB file: `data/swift_drop.db`

Evidence:
- lib/storage.js:5
- lib/storage.js:6
- lib/db.js:12
- README.md:32
- README.md:33

## Not Confirmed
- No CI command contract documented yet.

How to confirm:
- Add and inspect `.github/workflows/*.yml`.

## Security Runtime Notes
- `APP_BASE_URL`
  - If set, upload API returns an absolute download URL using this origin.
  - If not set, upload API returns a relative path (`/d/<token>`).
  - Evidence: `pages/api/upload.js:185-187`, `lib/security.js:24-37`
- `TRUST_PROXY`
  - Set `TRUST_PROXY=true` only when the app is behind a trusted reverse proxy.
  - When not set to `true`, client IP is resolved from socket address and `x-forwarded-for` is ignored.
  - Evidence: `lib/security.js:9-22`
