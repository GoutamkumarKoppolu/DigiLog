# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this project is

**DigiLog** ("Track to the tail"; repo GoutamkumarKoppolu/DigiLog, internal id `com.goutam.expensetracker`, never change it or updates stop installing) is a personal money tracker that runs **fully offline, on-device**. It's a React (Vite) single-page app that stores everything in IndexedDB via Dexie, and it's also packaged as an Android app with Capacitor. There is **no backend**. An old Express + Postgres API was moved to the `archive/server` branch; never make the client depend on a server.

Stack: React 19, Vite 8, Dexie 4, Capacitor 7 (Android), oxlint. Plain JavaScript/JSX (no TypeScript), plain CSS (no UI framework, no router, no state library). Unit tests use Vitest and cover the pure rules (`*.test.js` next to the code).

## Running locally

All day-to-day work happens in `client/`:

```bash
cd client
npm install
npm run dev        # http://localhost:5173 (creates and seeds the IndexedDB "expense-tracker" DB on first load)
npm run lint       # oxlint
npm test           # Vitest unit tests
npm run build      # production build -> client/dist
npm run preview    # serve the production build
```

No `.env`, database, or server is needed. To reset local data, delete the `expense-tracker` IndexedDB database in the browser's DevTools (Application → IndexedDB). It will be re-seeded on the next load.

**Android:**
- CI: GitHub → Actions → "Build Android APK" → Run workflow (manual `workflow_dispatch`, [.github/workflows/android-build.yml](.github/workflows/android-build.yml)). Download the `app-debug-apk` artifact. It uses Node 20 and JDK 21, and the build is an unsigned debug build.
- **Public releases:** push a tag `vX.Y.Z` (or run "Release Android app" by hand) → [.github/workflows/release.yml](.github/workflows/release.yml) runs the tests, builds a **signed** release APK and publishes it as a GitHub Release (`digilog.apk`; the README links to `releases/latest/download/digilog.apk`). It needs the `ANDROID_KEYSTORE_BASE64` / `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_ALIAS` / `ANDROID_KEY_PASSWORD` secrets; `build.gradle` reads them (and `VERSION_CODE` / `VERSION_NAME`) from the environment. Always the same keystore, or updates won't install over the old app. Keystores are git-ignored, never commit one.
- **Traffic stats:** [.github/workflows/traffic-stats.yml](.github/workflows/traffic-stats.yml) runs daily (and by hand) and saves views, unique visitors, clones, referrers, popular pages and APK download counts as CSVs on the orphan `stats` branch (GitHub keeps traffic for 14 days only). Needs a `TRAFFIC_TOKEN` secret (fine-grained token, this repo, Administration: Read-only). The README shows a live downloads badge (shields.io).
- Local (needs Android Studio): `cd client && npm run cap:sync && npx cap open android`.
- `client/android/` is Capacitor-generated. Commit it as-is and avoid hand-editing it unless a native change is really required. The local plugins (`SystemBarsPlugin`, `FileViewerPlugin`) are registered in `MainActivity`. `MainActivity` also (1) replaces Capacitor's edge-to-edge insets listener with one that lifts the WebView above the keyboard (Android 15 no longer resizes for it, so sheets were hidden), and (2) sends the Back button to `window.appHandleBack()` (`app/useBackButton.js`) instead of closing the app. `FileViewerPlugin` opens a file from the cache folder with `ACTION_VIEW` through the existing FileProvider (`res/xml/file_paths.xml`); JS falls back to the share sheet if it fails.
- **Status bar / navigation bar (Android 15+ edge-to-edge):** `capacitor.config.json` sets `android.adjustMarginsForEdgeToEdge: "auto"`, so Android insets the WebView below the status bar and above the nav bar natively (don't rely on `env(safe-area-inset-*)`, which older Android WebViews report as 0). The strips behind the bars are coloured by the local `SystemBarsPlugin.java` (registered in `MainActivity`), driven from `app/useSystemBars.js`: hero colour on pages with `hero: true` in `ROUTES`, page background elsewhere, bottom nav colour at the bottom, with icons light/dark to stay readable. Keep the CSS `env(safe-area-inset-*)` padding too, for iOS and browsers.

## Architecture

```
client/src/
  main.jsx                 React root
  App.jsx                  Shell only: ROUTES page registry, bottom nav, global add/edit transaction sheet
  app/
    useHashRoute.js        Hash router (#/savings, #/budgets/12 → route + `param` prop); navigate(id, { replace })
    useBackButton.js       Android Back (called from MainActivity): closes the top sheet, else goes one level up
                           (drops the last `param` segment, then the route's `parent` in ROUTES); false on Home = exit
    BottomNav.jsx          One UI bottom tabs with the raised centre + button
    Splash.jsx             Launch screen: "DigiLog · Track to the tail" on the hero gradient for 2 s per app start (tap skips);
                           Android's own launch screen is the same purple (res/values/splash.xml) so they flow together
  api.js                   Core ledger data access: transactions, options, overview, registerTransactionGuard,
                           registerMovementSource / fetchMovements
  domain/transactions.js   Pure ledger rules: kinds, balance-deduction flag, computeTotals, matchesFilters
  domain/salary.js         Pure salary rules shared by Recurring, the spending plan and the Report: isSalary, which
                           month a salary pays for (salaryMonth: on/after the 25th → next month), planMonth, and
                           ledgerMonth (the month any row counts in: a salary's pay month, else its date's month)
  utils/format.js          Shared helpers: currency, compactCurrency (₹12.35L), dates, periodLabel, groupByDate
  components/
    ui/                    Design-system primitives: BottomSheet, PageHeader (collapsing large title),
                           SegmentedControl, ChipGroup, Switch, StatCard, ProgressRing, DonutChart,
                           Money, ListRow, EmptyState, ErrorBanner, InfoButton (ⓘ → help sheet),
                           FormSheet (a form in a sheet: submit + optional Delete), BlobImage (<img> for a stored Blob),
                           AppMark (the DigiLog "Rupee trail" logo; `tile` = the app icon), TagSuggestions (in-app tag chips; never <datalist>, see "No browser suggestions"),
                           ChartTip (tap a chart column → what each mark is and its value),
                           ColumnChart (legend + up to 12 tappable grouped columns; Report savings rate, Savings per month)
    MonthPicker.jsx        Years × months chip picker ("YYYY-MM"[] contract)
    PeriodSheet.jsx        MonthPicker in a bottom sheet
  features/
    ledger/                Shared ledger state (LedgerProvider + useLedger), TransactionForm/Sheet/List, kindMeta
    home/                  Home page: balance hero, "Your money" cards, FilterSheet, transaction list
    report/                Report page: savings rate card (kept ÷ income, 12-month average, income/expenses/saved per
                           month, salaries in the month they pay for) + per-tag donut + breakdown, change vs previous
                           month (pure rules in domain.js)
    spendingPlan/          Money from the usable balance set aside per tag for the month on show (planMonth): set in
                           "<Month> at glance" after a salary (SetAsideCard) or from Home; bars under Your money
                           (PlanBars, red from 95%); the plan's tags as their own chips when adding an expense
                           (usePlanTags → TransactionForm `tagPicks`); never changes the balance
    savings/               Savings page: pots, withdrawals, history (api.js, domain.js, index.js registers its guard)
    recurring/             Recurring payments (EMIs, rent, SIPs) + RecurringEngine (rendered once in App): when the salary
                           that pays for the month exists (earning tagged "Salary"; one dated on/after the 25th pays NEXT
                           month's payments, `salaryMonth`) and a payment's day has come, adds it as a normal transaction
                           via the core api, dated on its day; runs on open, on ledger changes and on returning to the app
                           MonthPlanSheet / UsableBalance: "<Month> at glance" (usable balance + usable salary)
    cards/                 Credit cards: logged spends (own store, not in the balance) vs bills paid on Home as expenses
                           tagged "<card> bill" (domain.js: billTag, billMonth, compareMonths); useCardBillTags adds the
                           "Paying a credit card bill" switch to the expense form
    settings/              Manage options page + More page
    appearance/            Appearance page: background + accent pickers with live preview
    tags/                  Tags page: all transactions by kind → tag → month, all time by default (pure rules in domain.js)
    budgets/               Budgets for events: optional one-level sub-budgets, spends, mark as done; not linked to the balance
                           (pure rules in domain.js; list at #/budgets, one event at #/budgets/<id>)
    bills/                 Bills: folders of uploaded photos/PDFs, a bill = one or more pages (#/bills, #/bills/<folder>,
                           #/bills/<folder>/<bill>); files stored as Blobs with a small preview; thumbnail.js makes previews
    borrowing/             "Borrowed & lent" (never call it "loans" in the UI): per-person records with payments,
                           tabs Borrowed/Lent (DIRECTIONS in domain.js holds each tab's wording); each record/payment is
                           linked to Balance, a Savings pot, or "Just note it" (MoneyLinkField) and registers as a movement;
                           useBorrowEntries adds the Repay / Received chips to the + sheet
    subscriptions/         Subscriptions tracked by hand (monthly day / yearly date, typed payment method, category, trial);
                           totals, renewing soon, by category; reminders.js schedules phone notifications (Local
                           Notifications plugin, ids ≥ 1,000,000) and SubscriptionReminders (rendered once in App) resyncs them
    history/               Delete history (More → Delete history): the whole money history or one month (transactions +
                           savings withdrawals only); a pot left below zero also loses its other uses, newest first (blocked only if
                           Borrowed & lent is what empties it); borrowed & lent
                           movements and recurring_runs stay (a deleted month is never re-added); pure rules in domain.js
    funding/               "Not enough balance": where the rest of an expense came from (savings pot and/or borrowed,
                           exact split); FundingSheet stacked on the + sheet (App passes it as `Funding`); pure rules in domain.js
    backup/                Backup & restore: backupFormat.js (format version, per-table specs, migrations, validation),
                           api.js (export all tables / restore in one transaction; Blobs ⇄ { $blob: base64, type })
  platform/files.js        Getting files out of the app: download / share sheet / open in the phone's viewer
                           (FileViewerPlugin.java) / save to Documents/DigiLog (saveTextToDevice), with chunked
                           writes on Android so large files don't exhaust memory
  content/help.js          In-app explanations shown by InfoButton (one entry per topic)
  theme/
    palettes.css           Accent palettes (light + dark variants) and the Black background
    palettes.js            BACKGROUNDS / ACCENTS option lists (ids match palettes.css)
    themeStore.js          Saves the choice in localStorage; sets data-theme / data-accent / data-bg on <html>
    useTheme.js            React hook over the store
  db/
    schema.js              Dexie store definitions (STORES = v1, then STORES_V2..V7 with each version's additions)
    index.js               Dexie instance, versioning, populate -> seed, storage.persist()
    seed.js                Default transaction types / payment methods / payment sources
    validators.js          Pure validation helpers (throw Error with user-facing messages)
  index.css                Base design tokens (neutrals, semantic colors, radii, shadows) for light + dark, base element styles
  App.css                  All component/page styles, grouped by section
```

**Data flow:** Page → `useLedger()` action (e.g. `saveTransaction`) or the feature's own `api.js` → Dexie (`db`). Service functions throw `Error(message)`. The ledger context and each feature page catch it and show it in an `ErrorBanner` (inside the open sheet when there is one). Ledger mutations call `refresh()`, and pages with their own queries (Report, Savings) reload when `useLedger().transactions` changes.

**Data model (IndexedDB stores):**
| Store | Fields |
|---|---|
| `transaction_types` | `id`, `name` (unique), `kind` (`earning` \| `expense` \| `saving`) |
| `payment_methods` | `id`, `name` (unique) |
| `payment_sources` | `id`, `name` (unique) |
| `transactions` | `id`, `type` (type *name*), `amount`, `tag`, `payment_method`, `payment_source`, `date`, `note`, `deduct_from_balance` (savings only; `null` otherwise, missing = `true`), `created_at` |
| `credit_cards` | `id`, `name` (unique, case-insensitive: it's the bill tag), `last4`, `created_at` |
| `credit_card_transactions` | `id`, `card_id`, `amount`, `description`, `date`, `created_at` |
| `savings_withdrawals` (v2) | `id`, `tag` (savings pot), `amount`, `date`, `note`, `to_balance` (moved into the balance to cover an expense; missing = `false`), `transaction_id` (the expense it covered, or `null`), `created_at` |
| `budgets` (v3) | `id`, `parent_id` (`null` = event, else the event it belongs to; one level only), `name`, `amount`, `done` (events), `created_at` |
| `budget_spends` (v3) | `id`, `budget_id` (the event or one of its sub-budgets), `amount`, `description`, `date`, `created_at` |
| `bill_folders` (v4) | `id`, `name` (unique, case-insensitive, checked in `api.js`), `created_at` |
| `bills` (v4) | `id`, `folder_id`, `name`, `created_at` |
| `bill_pages` (v4) | `id`, `bill_id`, `position`, `name` (original file name), `type` (MIME), `size`, `data` (Blob, the original file), `thumb` (small JPEG Blob for photos, else `null`), `created_at` |
| `borrow_records` (v5) | `id`, `direction` (`borrowed` \| `lent`), `person`, `amount`, `date`, `phone` (cleaned, or `null`), `note`, `completed` (marked by hand; fully paid counts as completed without it), `linked_to` (`balance` \| `savings` \| `null` = just noted; missing = `null`), `pot` (savings only), `transaction_id` (the expense this borrowing covered, or `null`), `created_at` |
| `borrow_payments` (v5) | `id`, `record_id`, `amount` (never more than what's left), `date`, `note`, `linked_to`, `pot` (as on records), `created_at` |
| `recurring_payments` (v6) | `id`, `name`, `kind` (`expense` \| `saving`), `amount`, `tag`, `day` (1–31; last day in shorter months), `payment_method`, `payment_source`, `deduct_from_balance` (savings), `pending_start` / `duration` (totals, or `null`; the form shows what's *left* = total − payments made), `start_month`, `paused` / `skipped_months` (savings only), `completed` (by hand), `created_at` |
| `recurring_runs` (v6) | `id`, `recurring_id`, `month`, `transaction_id` (may have been deleted), `created_at`; unique `[recurring_id+month]` so a month is never added twice |
| `spending_plans` (v8) | `id`, `month` (`"YYYY-MM"`, the month the plan is for), `tag`, `amount`, `created_at`; unique `[month+tag]` (one amount per tag per month, case-insensitive in `api.js`) |
| `subscriptions` (v7) | `id`, `name`, `amount`, `cycle` (`monthly` \| `yearly`), `day` (1–31), `month` (yearly only), `payment_method` / `category` (free text), `trial_end` (date or `null`), `remind` (`off` \| `0` \| `1` \| `3` days before), `cancelled_at` (date or `null`), `card_id` (credit card it's charged to, or `null`; missing/deleted card = none), `created_at` |

Conventions in the data layer:
- Dates are stored as **strings** (`date` = `"YYYY-MM-DD"`, `created_at` = ISO). Month keys are `date.slice(0, 7)` (`"YYYY-MM"`), except that wherever a month is picked for ledger rows (Home's cards and list via `matchesFilters`, the Report, Tags, Delete history) a **salary counts in the month it pays for** (`ledgerMonth` in `domain/salary.js`: 30 Sep's salary is October's); its row says "Counts for October". Never store `Date` objects. To turn a timestamp into a date, use `localDate()` / `today()` from `utils/format.js`, never `iso.slice(0, 10)`: that gives the UTC date, which is yesterday before 05:30 IST.
- Transactions reference their type by **name**. `api.js` derives `type_kind` at read time, and all totals are computed from `type_kind`, not the type name.
- **Balance and savings rules** (in `domain/transactions.js` and `features/savings/domain.js`):
  - Current balance = earnings − expenses − savings that deduct from the balance ± movements into/out of the balance.
  - **The balance never goes below zero** (one already below, from older data, may not go lower: `balanceShortfall`). Every change that can lower it runs inside core `withBalanceCheck(writes, explain)`: one Dexie transaction over all tables, balance before vs after, rolled back with a `BalanceError` whose message says what to do instead. Nested calls are judged once, by the outermost. Used by ledger create/update/delete, savings withdrawal delete, every borrowing mutation and Delete history. Recurring payments the balance can't cover wait ("Not enough balance") and are added once money comes in.
  - **Covering a shortfall** (`features/funding/`): an expense or deducting saving that needs more than the balance opens "Not enough balance" on top of the + sheet (`shortfallFor`); the missing amount must be covered exactly, from one savings pot (a withdrawal with `to_balance: true`, a balance movement) and/or money borrowed from one person (a borrowed record linked to Balance), all saved in one transaction and linked by `transaction_id`. Deleting the expense removes them (`registerTransactionDependents`), unless some of the borrowing was already repaid.
  - **Movements** are money in or out of the balance or a savings pot that isn't income, an expense or a saving (today: linked borrowed & lent records and payments). Features register a source with `registerMovementSource`; they change the balance, Overall Savings and pots, show on Home (only with no type/tag filter) and in pot history, but never count in Income/Expenses/Saved, the Report or Tags. Rows: `{ key, date, created_at, amount, flow: in|out, account: balance|savings, pot, title, note, route }`.
  - Savings with `deduct_from_balance: false` (e.g. money given to you) never reduce the balance.
  - Using savings (a withdrawal) reduces savings only, never the balance, except a `to_balance` one that covered an expense (it adds to the balance as a movement). Overall Savings = all savings − withdrawals.
  - A pot can never go below zero: withdrawals are capped at the pot's remaining amount, and editing/deleting a Saving transaction that would push its pot negative is blocked.
- **Cross-feature hooks:** core `api.js` exposes `registerTransactionGuard(fn)` so a feature can veto ledger edits/deletes, and `registerMovementSource(fn)` so a feature can move money in/out of the balance or pots, without the core importing the feature. The + sheet takes extra Type chips as `entries` (`{ id, label, render }`), extra tag chip rows as `tagPicks` (`{ kind, label, tags: [{ tag, label, red }] }`, e.g. the spending plan), Cards exports `registerCardEstimateSource(fn)` (Subscriptions registers its charges per card for a card's estimated bill). `tagGroups` (a switch that swaps the Tag field for fixed tags for one kind, e.g. card bills) and `tagHints` (a hint + suggested tag for one kind, e.g. "Salary" for earnings), all passed in by App, plus `onSaved(row, { created })` (App opens "<Month> at glance" after a new Salary). A page can get extra props from its `ROUTES` entry (`props`), e.g. Home's `BalanceNote` (Recurring's usable balance). Savings exports `fetchPots` / `checkPots` so a feature moving money out of a pot can't take it below zero. Each feature wires itself up in its `features/<name>/index.js` entry point, and App imports the feature only from there.
- There are no foreign keys in IndexedDB, so cascades are done manually inside a Dexie transaction (see `deleteCreditCard` in `features/cards/api.js`).
- Files are stored as `Blob`s. Never `await` non-Dexie work (reading a file, making a preview, base64) inside a Dexie transaction: IndexedDB closes the transaction. Prepare it first, then write (see `createBill` in `features/bills/api.js`, `exportBackup`/`restoreBackup` in `features/backup/api.js`).
- Option CRUD is generic over the `OPTION_KINDS` / `TABLE_BY_KIND` maps in `api.js`.

## Features / components

| Feature | Where |
|---|---|
| Navigation: bottom tabs Home · Recurring · **+** · Savings · More; More → Report, Tags, Budgets, Borrowed & lent, Bills, Credit cards, Manage options, Appearance, Backup; Android Back goes up one level (sheet → page levels → `parent` → Home → exit) | `App.jsx` (`ROUTES`, `TABS`), `app/` |
| Add/edit/delete transactions in a bottom sheet (amount, type chips, "Deduct from current balance" switch for savings, tag + recent-tag chips, date, note, payment method/source) | `features/ledger/TransactionSheet.jsx`, `TransactionForm.jsx` |
| Home: balance hero (current balance, overall savings), Income/Expenses/Saved cards for the filters, date-grouped transaction list | `features/home/HomePage.jsx`, `features/ledger/TransactionList.jsx` |
| Filters sheet: years × months, single type (All/Earning/Expense/Saving), balance deduction (All/From balance/Not from balance) when Saving, tags | `features/home/FilterSheet.jsx`, `matchesFilters` |
| Report: Expenses/Income/Savings toggle, donut by tag (top 7 + Other), per-tag share bars, % change vs previous month when one month is selected | `features/report/` |
| Savings: available/used summary, from/not-from balance split, per-tag pots with progress rings, "Use savings" sheet (capped at pot remaining), "Saved per month" chart (12 months, saved vs used, follows the picked pot), history filterable by pot | `features/savings/` |
| Tags page (More → Tags, or "By tag" on Home): all time by default, sections Expenses → Savings → Income, each tag with count, date range, total (savings split from/not from balance); expand for its transactions by month; search; period picker | `features/tags/` |
| Budgets (More → Budgets): events with a total, optional sub-budgets (one level, "Unallocated" / over-allocated shown), spends from a sub-budget or the whole budget, overspending shown in red, Mark as done / Reopen; never touches the balance | `features/budgets/` |
| Bills (More → Bills): folders (one level) of bills; add a bill by camera or file picker (photos/PDFs, originals kept, ≤ 50 MB each), each file = its own bill (named after the file, editable before saving), Add pages on a bill for multi-page bills; view photos in-app, Open in the phone's viewer, Share; rename/move bills, add/delete pages, rename/delete folders; search; included in backups | `features/bills/`, `platform/files.js`, `FileViewerPlugin.java` |
| Borrowed & lent (More → Borrowed & lent): tabs Borrowed / Lent with the outstanding total; one record per borrowing/lending (person, amount, date, optional phone + why), expandable to its payments ("Repaid" / "Received"); payments capped at what's left; Completed automatically when fully paid, or Mark as completed / Reopen; Call and WhatsApp links; each record and payment picks Balance / Savings (pot) / Just note it (new ones default to Balance), and the + sheet offers Repay / Received while someone is still open; Home rows open the record (`#/borrowing/<id>`); not income or expenses | `features/borrowing/` |
| Recurring (bottom tab): EMIs/rent/SIPs with tag, day, method/source, Expense or Saving (+ deduct switch); added as normal transactions once the Salary that pays for that month is in and the day comes (a salary pays the next month's bills: dated on or after the 25th → next month, before → its own month, `SALARY_CUTOFF_DAY`; 30 Sep and 3 Oct both pay October's; the page, Home's usable line and "<Month> at glance" show next month as soon as its salary is in, `planMonth`) (note "Recurring: <name>"), caught up on next open, never twice a month; statuses Due / Waiting for salary / Deducted / Skipped / Paused / Starts / Completed; pending balance and payments left count down and end it; Mark as completed / Reopen; savings can pause or skip a month; per-month history; Edit/Delete keeps past payments; a note says they're recorded automatically (don't add them by hand). **"<Month> at glance"** (`monthPlan`): usable balance = current balance − payments still to be deducted (ones waiting for the salary aren't counted: they come out of it), usable salary = salary − all of the month's payments; shown as "Usable ₹… · See breakup" under the Home balance (hidden with nothing recurring this month) and popped up after adding a new Salary. The **Salary tag** is emphasised: a hint + "Salary" chip when adding an earning, the `salary` help topic, and the Tags help. Subscriptions are tracking only and never counted | `features/recurring/` |
| Subscriptions (More → Subscriptions): name, amount, Monthly (day) or Yearly (date), typed payment method + category with suggestion chips, optional free trial (its end is the first charge; regular dates less than half a cycle after it are skipped); totals per month/year (yearly ÷ 12, trials excluded until they end), renewing in 7 days, by category; phone reminders at 9 AM (off / on the day / 1 / 3 days before) + the day before a trial ends; Cancel / Restart / Delete; never touches the balance | `features/subscriptions/` |
| Backup & restore (More → Backup & restore): export everything (data, bill files + theme) to a JSON file (download on web; Save to phone → Documents/DigiLog, or Share, on Android); import validates the whole file, upgrades older backups, shows a summary, then replaces all data atomically | `features/backup/` |
| Delete history (More → Delete history): Whole history (type DELETE) or One month (chips of months that have history); preview of counts, totals and per-pot change; deletes that month's transactions and savings uses in one Dexie transaction; a pot left below zero also loses its other savings uses, newest first, listed before deleting (refused only if Borrowed & lent empties it); warns that Borrowed & lent entries stay and still change the balance; budgets, bills, cards, subscriptions, borrowing untouched | `features/history/` |
| Balance rule (everywhere): the balance can't go below ₹0; an expense or deducting saving that needs more opens "Not enough balance" (balance, amount needed, a savings pot chip + amount, borrowed from + amount, the two fill each other in, must cover it exactly, ⓘ `balanceRule`); savings used show "To balance" in pot history and as "From <pot> savings" on Home, borrowed money as a Borrowed record; deleting the expense removes them (refused if the borrowing was partly repaid); other refusals (deleting a spent salary, repaying/lending more than the balance, deleting money already spent) say why and what to do | `api.js` (`withBalanceCheck`), `features/funding/` |
| Spending plan: after a salary, "Set money aside" splits the usable balance across tags (last month's tags offered as chips; Free money = usable − what's still set aside); Home shows "<Month> plan" bars per tag (`--cat-n`, red from 95%, "Over by ₹X, taken from your free money"); adding an expense shows "<Month> plan" chips with what's left; expenses only fill the bars, the balance works as before | `features/spendingPlan/` |
| Savings rate (top of Report): "You kept 22% of your income in October", 12-month average, tappable 12-month income/expenses/saved columns | `features/report/SavingsRateCard.jsx` |
| Info buttons (ⓘ) explaining balance deduction, savings, credit cards, tags, budgets and sub-budgets, bills, borrowed & lent, recurring payments, subscriptions | `components/ui/InfoButton.jsx`, `content/help.js` |
| Credit cards: card visuals, log spend / delete per card, period picker; each card shows logged spends vs the bill paid for them over 6 months (outlined vs filled bars in the card's colour; tap a month for Matches / paid but not logged / not paid yet); a bill paid on or after the 25th counts for that month, before it for the previous month (`BILL_CUTOFF_DAY`); "Bills paid" chart + table at the bottom uses only the paid bills (palette `--cat-1..8`). Bills are expenses added with "Paying a credit card bill" on (tag "<card> bill"); deleting a card keeps them. **Estimated bill · <month> ⓘ** under a card = this month's charges of the subscriptions charged to it (monthly every month, yearly in their month, trials when they end; not logged spends) | `features/cards/`, `TransactionForm` `tagGroups` |
| Manage options: transaction types (with kind), payment methods, payment sources | `features/settings/SettingsPage.jsx` |
| Themes: background (System / Light / Dark / Black AMOLED) × accent (Purple, Blue, Green, Teal, Orange, Pink), saved per device, applied instantly | `theme/`, `features/appearance/`, More → Appearance |
| Safe-area insets for the Android status/nav bars | `App.css` |
| Offline storage and Android packaging | `db/`, `capacitor.config.json`, `client/android/` |

## UI conventions (One UI, one-handed)

- **Top third is for viewing, bottom is for doing.** Pages start with a tall `PageHeader` (large title that collapses into a sticky app bar on scroll) or the Home hero. Interactive controls sit lower: bottom nav, the centre + button, full-width primary buttons, and bottom sheets with their actions in the sheet footer.
- **Forms and pickers open in a `BottomSheet`**, never inline at the top of a page. Submit buttons live in the sheet footer (`<button form={FORM_ID}>`).
- **Tap targets ≥ 44px**, and choices are chips or segmented controls rather than small dropdowns where the list is short.
- **No browser suggestions.** Android shows `<datalist>` options and autofill history as chips in the keyboard's suggestion strip (a real bug: old tags appeared while typing a name). So: never use `<datalist>` or `list=`; every `<form>` gets `autoComplete="off"`, and so does any input outside a form (search boxes). For tag suggestions use `components/ui/TagSuggestions.jsx` (in-app chips). `MainActivity` also opts the WebView out of Android autofill. `src/uiRules.test.js` fails the tests if any of this is broken.
- **Cards and rows, not wide tables.** Only the utilization table remains, inside `.table-scroll`. Test at 360, 390 and 412px widths: there must be no horizontal page scroll.
- **Charts are tappable.** On a phone there's no hover, so tapping a bar column shows a `ChartTip` (label + value per mark, tap again to hide) and tapping a donut slice shows it in the hole (`DonutChart` `selected` / `onSelect`). New charts should do the same.
- **Brand:** the app icon is the "Rupee trail" (a ₹ drawn as strokes, leaving three fading dots, inside the adaptive-icon safe zone) on brand green `--brand-from` / `--brand-to` (index.css, the same in every theme; not an accent). The same shapes are in `components/ui/AppMark.jsx` and Android's `drawable/ic_digilog_foreground.xml` (adaptive icon foreground + monochrome layer; background `drawable/ic_launcher_background.xml`; legacy PNG mipmaps, `public/favicon.svg` and `docs/icon.png` are rendered from it). Change the logo in all of them together. Both launch screens are brand green.
- **Colors only from tokens**, never hard-coded. Neutrals/semantic colors live in `index.css` (light on `:root`, dark on `:root[data-theme="dark"]`). Anything brand-coloured uses the accent tokens (`--accent`, `--accent-soft`, `--on-accent`, `--hero-from/-to`) from `theme/palettes.css`, so it follows the user's chosen accent. Charts use `--cat-1..8` in fixed order.
- **Theme is per device display state** (localStorage via `theme/themeStore.js`), not ledger data, so it doesn't go in IndexedDB. Dark mode is driven by `data-theme` set in JS, not by a `prefers-color-scheme` media query.
- **Adding a palette:** add a light block and a dark block to `theme/palettes.css`, and an entry to `ACCENTS` in `theme/palettes.js`. Keep `--on-accent` on `--accent` and `--accent` on `--accent-soft` at ≥ 4.5:1 contrast.
- New pages: add to `ROUTES` in `App.jsx` (plus `TABS` if it needs a bottom tab; prefer adding it to the More page).
- **Explain non-obvious features in-app.** When a feature's purpose isn't self-evident, add a topic to `content/help.js` (what it is, why it exists, one example) and place an `InfoButton` next to it (`info` prop on `PageHeader` / `Switch`). If the ⓘ sits inside a `<label>`, give the label an explicit `htmlFor`, or taps on the label will open the help instead of toggling the control.
- Bottom sheets render into `<body>` via a portal and can stack (e.g. help on top of a form). Escape closes only the top one.

## How extensible the code is today

**Easy to extend:**
- New pages: create `features/<name>/` with a page that owns its state and data (see `features/savings/`), then add one line to `ROUTES` in `App.jsx`.
- New ledger-derived views: read from `useLedger()` instead of fetching and threading props.
- New UI: compose from `components/ui/` before writing new primitives.
- New option lists: add an entry to `OPTION_KINDS` / `TABLE_BY_KIND` / `NOT_FOUND_MESSAGE` plus a store and a seed.
- New validation: add pure helpers to `db/validators.js`. New business rules: add pure functions to a `domain.js`.
- Cross-feature rules: use `registerTransactionGuard` rather than importing a feature into the core.

**Friction points to be aware of (improve them when you touch them, don't spread them):**
- Filtering loads whole tables and filters in memory. That's fine at personal scale, but use Dexie indexes if data grows.
- Schema changes need a **new `db.version(n)`**, not an edit to an existing version. Editing one breaks existing installs, including users' phones.
- Savings pots are keyed by tag name, and withdrawals store the tag string, so renames rely on the savings guard.
- Unit tests cover only pure rules (ledger movements, savings pots, credit card bills, budgets, bills, borrowing, recurring and subscriptions domain, Back-button targets, backup format). Native plugins (`SystemBarsPlugin`, `FileViewerPlugin`) are only compiled by the Android CI build, so check that build after touching them. Android's resource parser is stricter than browsers (e.g. no `--` inside XML comments, so don't name CSS variables there); `src/androidResources.test.js` catches that before CI. UI checks are done manually or with a throwaway Playwright script.

## Rules for building new features

Every new feature must be **decoupled** so it can be added, changed, or removed without breaking existing features. Follow these rules:

1. **Feature isolation.** Put a new feature in its own module: `src/features/<feature>/` with its page/components, its own data functions (e.g. `features/<feature>/api.js`), and any feature-specific helpers. A feature should be removable by deleting its folder and its one registration line.
2. **Layering: UI → service → storage.** Components never import `db` or Dexie. All persistence goes through service functions (`api.js` or the feature's own api module), which return plain objects and throw `Error` with user-facing messages. Keep business logic (totals, grouping, validation) in pure functions outside components so it can be tested and reused.
3. **Single responsibility.** One component does one thing. Split pages into container (state + data loading) and presentational components (props in, JSX out), the way `SavingsPage` → `PotList` / `SavingsHistory` does. Keep files small and focused.
4. **Open/closed: extend, don't modify.** Prefer config maps and registries (like `OPTION_KINDS` / `TABLE_BY_KIND` / `ROUTES` / `KIND_META`) over new `if/else` or ternary branches.
5. **Don't touch unrelated features.** A new feature must not change the behavior, props, or data shape of existing features. If a shared contract (an `api.js` signature, a store shape, a component's props) must change, keep it backward-compatible and update every caller in the same change.
6. **DRY with shared utilities.** Reusable helpers belong in shared modules: `utils/format.js` for currency and dates, `components/ui/` for UI primitives, and `src/hooks/` for hooks. Don't copy-paste helpers.
7. **Safe schema evolution.** Add stores and indexes via a new `db.version(n).stores({...})` (with `.upgrade()` for data migrations). Never edit an existing version, never drop user data, and keep old data readable.
   **Every data change must keep backups working** (`features/backup/backupFormat.js`):
   - New table → add a spec to `TABLE_SPECS` (older backups just start it empty). Export and import refuse to run if a Dexie table has no spec, so a forgotten table can't be silently wiped.
   - New field → set it in that table's spec with a default for rows that lack it (like `deduct_from_balance`).
   - Changed meaning of existing data → bump `BACKUP_FORMAT` and add a `MIGRATIONS` step from the previous format.
   - Never make import accept a backup from a newer format. Validate every row before writing anything, and restore in a single transaction.
8. **Keep the offline, no-backend model.** No network calls, no server dependency, no new heavy dependencies without a clear need. Everything must work inside the Android WebView.
9. **Follow existing conventions.** Use string dates, `type_kind` for totals, errors surfaced via `ErrorBanner`, colors from CSS tokens (support both light and dark), respect the safe-area padding, follow the One UI conventions above, and match the existing JSX/CSS style.
10. **Verify before finishing.** Run `npm run lint` and `npm run build` in `client/`, then exercise the feature in `npm run dev` at phone width (360–412px) and desktop, in light and dark mode, including regressions on Home, Report, Savings, Credit cards and Manage options. If you add pure logic, add Vitest tests for it and run `npm test`.
