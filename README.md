# DigiLog

*Track to the tail.*

A private, offline money tracker for Android and the web, built for one-handed use.
Everything stays on your phone: no account, no server, no ads, no SMS permissions.

[![Downloads](https://img.shields.io/github/downloads/GoutamkumarKoppolu/DigiLog/total?label=downloads&color=6d48ef)](https://github.com/GoutamkumarKoppolu/DigiLog/releases)

**[⬇ Download the Android app (APK)](https://github.com/GoutamkumarKoppolu/DigiLog/releases/latest/download/digilog.apk)** · [All releases](https://github.com/GoutamkumarKoppolu/DigiLog/releases)

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
| **Subscriptions** | Monthly and yearly costs, free trials, and phone reminders before each renewal. Charge one to a credit card and it shows in that card's **estimated bill** for the month. |
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

1. On your phone, tap **[Download the APK](https://github.com/GoutamkumarKoppolu/DigiLog/releases/latest/download/digilog.apk)**.
2. Open the downloaded file. If Android asks, allow your browser or Files app to **install unknown apps**.
3. If Play Protect warns that the app is unknown, tap **More details → Install anyway** (it's not on the Play Store, see the FAQ).

To update, download and install the new APK over the old one: your data stays.

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

## FAQ

**Is it free? Are there ads?**
Free, no ads, no account, no in-app purchases.

**Where is my data? Can anyone else see it?**
Only on your phone, in the app's own storage. Nothing is sent anywhere, and the app works fully offline.

**Will I lose my data if I uninstall or change phones?**
Uninstalling deletes the app's data. Before that, go to **More → Backup & restore → Save to phone** (it's kept in *Documents › DigiLog*) or **Share** it to Drive. On the new install, **Import** that file. Updating to a new version keeps your data.

**Why does Android say the app is unknown or unsafe?**
It's installed from GitHub, not the Play Store, so Play Protect doesn't know it. The code is all here, and each APK is built by GitHub Actions from this repository.

**Is there an iPhone app?**
Not yet. It's Android only for now.

**My EMIs and rent aren't being deducted. Why?**
Recurring payments wait for that month's salary: add it as an **earning tagged exactly "Salary"**. They're then added on their day automatically, so don't add them yourself, even if you pay one by hand.

**What's "Usable" under my balance?**
Your current balance minus this month's recurring payments still to come. Tap **See breakup** for the month at a glance.

**Do subscriptions reduce my balance?**
No, they're tracking and reminders only. If one is charged to a credit card, it shows in that card's **estimated bill**, and the money leaves your balance when you pay the card bill.

**How do I record a credit card bill?**
Add an expense, turn on **Paying a credit card bill** and pick the card. Log what you buy on the card on the Credit cards page, and each card shows logged vs paid, month by month.

**I borrowed money from a friend. Where does it go?**
**More → Borrowed & lent.** Pick whether it went into your Balance or Savings (or just note it), and add each repayment as you make it.

## Not there yet

Monthly per-tag limits · separate bank/cash accounts · app lock · automatic backups · home-screen widget.
