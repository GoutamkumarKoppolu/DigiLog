# Track My Bills

A private, offline money tracker for Android and the web, built for one-handed use.
Everything stays on your phone: no account, no server, no ads, no SMS permissions.

<p align="center">
  <img src="docs/screenshots/home.png" width="200" alt="Home: current balance, monthly income, expenses and savings, and transactions" />
  <img src="docs/screenshots/report.png" width="200" alt="Report: donut chart of expenses by tag" />
  <img src="docs/screenshots/savings.png" width="200" alt="Savings: available savings, pots by tag and history" />
  <img src="docs/screenshots/recurring.png" width="200" alt="Recurring: what's coming up and what's been deducted this month" />
</p>

## Features

| | |
|---|---|
| **Transactions** | Earnings, expenses and savings with tags, notes, payment method and source. Filter by months, type and tag. |
| **Savings pots** | Savings grouped by tag. Each saving says whether it came from your balance; **Use savings** takes from a pot, never below zero. |
| **Recurring** | EMIs, rent and SIPs added automatically on their day once the month's **Salary** is in (tag your pay exactly "Salary"); pending balances count down to zero. Home shows your **usable balance**, with the month at a glance. |
| **Credit cards** | Log what you buy on each card, pay the bill as an expense ("Paying a credit card bill"), and see logged vs paid per card, month by month. |
| **Borrowed & lent** | Who owes whom, paid back in parts. Each entry and payment moves money in or out of your **Balance** or a **Savings** pot, or is just noted. |
| **Budgets** | A total for an event (wedding, new car) with optional sub-budgets and spends. A plan only: never touches the balance. |
| **Bills** | Photos and PDFs of bills and warranties in folders; open or share them from the app. |
| **Subscriptions** | Monthly and yearly costs, free trials, and phone reminders before each renewal. |
| **Insights** | Report (donut by tag, change vs last month) and a Tags page across all time. Tap any chart to see its numbers. |
| **Your data** | Backup and restore to one file (Save to phone, Share, or download). Themes: System / Light / Dark / Black × 6 accents. |

## How the numbers work

| Figure | Formula |
|---|---|
| **Current balance** | earnings − expenses − savings from balance ± borrowed & lent linked to the balance |
| **Overall savings** | savings − savings used ± borrowed & lent linked to savings |
| **Pot remaining** | saved into the pot − used from it (never below zero) |
| **Usable balance** | current balance − this month's recurring payments still to be deducted (ones waiting for the salary come out of it) |
| **Usable salary** | salary − this month's recurring payments |
| **Card bill month** | a bill paid on or after the 25th is for that month; before the 25th, for the previous month |

Budgets, subscriptions and logged card spends are tracking only and never change the balance.

## Install on Android

1. GitHub → **Actions → Build Android APK → Run workflow**.
2. Download the `app-debug-apk` artifact and open `app-debug.apk` on your phone.

It's an unsigned debug build: fine for your own phone, not for the Play Store.
Before reinstalling or changing phones, use **More → Backup & restore → Save to phone** (it goes to *Documents › Expense Tracker*).

## Run locally

Needs Node.js 20+. No server, database or `.env`.

```bash
cd client
npm install
npm run dev     # http://localhost:5173
npm run lint    # oxlint
npm test        # Vitest
npm run build   # → client/dist
```

For the Android project locally (needs Android Studio): `npm run cap:sync && npx cap open android`.

## Tech

React 19 · Vite 8 · Dexie 4 (IndexedDB) · Capacitor 7 · plain CSS · Vitest. Each feature lives in `client/src/features/<name>/`. See [CLAUDE.md](CLAUDE.md) for the architecture and the rules for adding features.

`server/` is a legacy Express + PostgreSQL API kept for reference only; the app doesn't use it.

## Not there yet

Monthly per-tag limits · separate bank/cash accounts · app lock · automatic backups · home-screen widget.
