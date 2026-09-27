// Dexie schema, 1:1 with server/schema.sql. `date` and `created_at` are
// stored as plain strings ("YYYY-MM-DD" / ISO), never Date objects, so the
// existing date.slice(0, 7)-style month-key logic throughout the app keeps
// working unchanged and timezone conversion never enters the picture.
export const STORES = {
  transaction_types: "++id, &name, kind",
  payment_methods: "++id, &name",
  payment_sources: "++id, &name",
  transactions: "++id, type, amount, tag, payment_method, payment_source, date, note, created_at",
  credit_cards: "++id, name, last4, created_at",
  credit_card_transactions: "++id, card_id, amount, description, date, created_at",
};

// Version 2: adds money taken out of savings (see features/savings). Dexie
// keeps every table from earlier versions, so only new/changed stores go here.
export const STORES_V2 = {
  savings_withdrawals: "++id, tag, date, created_at",
};

// Version 3: event budgets (see features/budgets). A row with parent_id null
// is an event; a row with parent_id set is one of its sub-budgets (one level
// only). Spends point at either.
export const STORES_V3 = {
  budgets: "++id, parent_id, created_at",
  budget_spends: "++id, budget_id, date, created_at",
};

// Version 4: bill uploads (see features/bills). A bill lives in a folder and
// has one or more pages; each page holds the original file as a Blob, plus a
// small preview image for photos.
export const STORES_V4 = {
  bill_folders: "++id, name, created_at",
  bills: "++id, folder_id, created_at",
  bill_pages: "++id, bill_id",
};

// Version 5: money borrowed from or lent to people (see features/borrowing).
// A record is one borrowing or lending; payments pay it back over time.
export const STORES_V5 = {
  borrow_records: "++id, direction, created_at",
  borrow_payments: "++id, record_id, date",
};

// Version 6: recurring payments (see features/recurring). A run records the
// transaction added for one payment in one month; the unique pair makes sure
// a month is never added twice.
export const STORES_V6 = {
  recurring_payments: "++id, created_at",
  recurring_runs: "++id, recurring_id, &[recurring_id+month]",
};

// Version 7: subscriptions tracked by hand (see features/subscriptions). For
// tracking and reminders only; never part of the balance.
export const STORES_V7 = {
  subscriptions: "++id, created_at",
};
