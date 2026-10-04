# Contributing to DigiLog

Thanks for helping. DigiLog is a React app that runs fully offline: all data lives on the phone in IndexedDB, and there is no backend.

## Set up

You need Node.js 20 or newer.

```bash
git clone https://github.com/GoutamkumarKoppolu/DigiLog.git
cd DigiLog/client
npm install
npm run dev     # http://localhost:5173
```

You don't need a server, a database or a `.env` file. To start with fresh data, delete the `expense-tracker` IndexedDB database in your browser's DevTools (Application → IndexedDB).

## Before you open a pull request

Run these in `client/`:

```bash
npm run lint    # oxlint
npm test        # Vitest
npm run build
```

CI runs lint and tests on every push and pull request.

Also try your change in the browser at phone width (360–412px), in light and dark mode.

## How the code is organised

Each feature lives in its own folder, `client/src/features/<name>/`, with its own `api.js` for data and `domain.js` for pure rules. The [architecture section of CLAUDE.md](CLAUDE.md#architecture) explains the layout, the data model and the rules for new features. The ones that matter most:

- Components never import the database. Data goes through a feature's `api.js`.
- Put business rules in pure functions and add Vitest tests next to them (`*.test.js`).
- Changing the database schema means adding a new `db.version(n)`, never editing an old one, and updating the backup format (`features/backup/backupFormat.js`).
- No network calls. Everything must work offline.
- Colours come from CSS tokens, never hard-coded values.

## Opening a pull request

1. Fork the repo and create a branch from `main`.
2. Keep each pull request to one change, and describe what it changes and how you tested it.
3. Add screenshots for any UI change.

Not sure where to start? Look for issues labelled **good first issue**, or open an issue to discuss an idea before building it.

## Reporting bugs and security problems

Report bugs with the bug report template. For anything security-related, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
