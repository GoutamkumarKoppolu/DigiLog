// Backup file format: build, migrate, validate and normalize. Pure — no
// storage or UI — so it's safe to test on its own.
//
// Keeping old backups importable as the app grows:
//  • Add a NEW TABLE  → add a spec to TABLE_SPECS. Older backups don't have
//    it, so it simply starts empty.
//  • Add a NEW FIELD  → set it in that table's spec with a default for rows
//    that don't have it (see `deduct_from_balance` below).
//  • CHANGE MEANING of existing data → bump BACKUP_FORMAT and add a step to
//    MIGRATIONS that rewrites older backups into the new shape.
// Import validates every row before anything is written, and refuses
// backups from a newer app version instead of guessing.
import { TRANSACTION_KINDS, normalizeDeductFlag } from "../../domain/transactions";

export const BACKUP_APP = "expense-tracker";
export const BACKUP_FORMAT = 1;

// MIGRATIONS[n] upgrades a format-n backup to format n+1.
const MIGRATIONS = {
  // 1: (backup) => ({ ...backup, format: 2, tables: { ...changed } }),
};

// ---------- field helpers (throw Error with a readable message) ----------

const text = (v) => (v === undefined || v === null ? "" : String(v)).trim();

function need(condition, message) {
  if (!condition) throw new Error(message);
}

const required = (v, field) => {
  const s = text(v);
  need(s, `${field} is missing`);
  return s;
};

const optional = (v) => text(v) || null;

const id = (v, field = "id") => {
  const n = Number(v);
  need(Number.isInteger(n) && n > 0, `${field} must be a positive whole number`);
  return n;
};

const amount = (v) => {
  const n = Number(v);
  need(Number.isFinite(n) && n > 0, "amount must be a positive number");
  return n;
};

const date = (v) => {
  const s = text(v).slice(0, 10);
  need(/^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)), `date "${text(v)}" is not a valid YYYY-MM-DD date`);
  return s;
};

const createdAt = (v, fallbackDate) =>
  typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : `${fallbackDate || "1970-01-01"}T00:00:00.000Z`;

// Files are stored in the backup as { $blob: base64, type } (see api.js).
const blob = (v, field) => {
  need(v && typeof v === "object" && typeof v.$blob === "string" && v.$blob.length > 0, `${field} has no file data`);
  need(/^[A-Za-z0-9+/]+=*$/.test(v.$blob.slice(0, 64)), `${field} isn't valid file data`);
  return { $blob: v.$blob, type: typeof v.type === "string" ? v.type : "" };
};

// The expense a savings use or borrowing covered (the balance rule). Added
// without a new database version: older rows covered nothing.
const coveredTransaction = (v) => (v === undefined || v === null ? null : id(v, "transaction_id"));

const optionalBlob = (v, field) => (v === undefined || v === null ? null : blob(v, field));

// Borrowed & lent: where a record's or payment's money went. Added after
// database v5 without a new version: rows without it were only noted.
const moneyLink = (r) => {
  const linkedTo = text(r.linked_to);
  if (!linkedTo) return { linked_to: null, pot: null };
  need(["balance", "savings"].includes(linkedTo), "linked_to must be balance or savings");
  return { linked_to: linkedTo, pot: linkedTo === "savings" ? required(r.pot, "pot") : null };
};

// ---------- per-table specs, in import order (parents before children) ----------
// Each takes a raw row plus a context of already-normalized tables and
// returns the clean row to store.

const option = (r) => ({ id: id(r.id), name: required(r.name, "name") });

export const TABLE_SPECS = {
  transaction_types: (r) => {
    const kind = text(r.kind);
    need(TRANSACTION_KINDS.includes(kind), `kind must be one of ${TRANSACTION_KINDS.join(", ")}`);
    return { ...option(r), kind };
  },
  payment_methods: option,
  payment_sources: option,
  transactions: (r, ctx) => {
    const type = required(r.type, "type");
    const d = date(r.date);
    return {
      id: id(r.id),
      type,
      amount: amount(r.amount),
      tag: required(r.tag, "tag"),
      payment_method: optional(r.payment_method),
      payment_source: optional(r.payment_source),
      date: d,
      note: optional(r.note),
      // Added after v1 of the app: older rows have no value. Savings then
      // default to "deducted", which is how they always behaved.
      deduct_from_balance: normalizeDeductFlag(ctx.kindByType[type], r.deduct_from_balance),
      created_at: createdAt(r.created_at, d),
    };
  },
  credit_cards: (r) => {
    const last4 = optional(r.last4);
    need(!last4 || /^\d{4}$/.test(last4), "last4 must be exactly 4 digits");
    return { id: id(r.id), name: required(r.name, "name"), last4, created_at: createdAt(r.created_at) };
  },
  credit_card_transactions: (r, ctx) => {
    const cardId = id(r.card_id, "card_id");
    need(ctx.cardIds.has(cardId), `card ${cardId} isn't in this backup`);
    const d = date(r.date);
    return {
      id: id(r.id),
      card_id: cardId,
      amount: amount(r.amount),
      description: required(r.description, "description"),
      date: d,
      created_at: createdAt(r.created_at, d),
    };
  },
  savings_withdrawals: (r) => {
    const d = date(r.date);
    return {
      id: id(r.id),
      tag: required(r.tag, "pot"),
      amount: amount(r.amount),
      date: d,
      note: optional(r.note),
      to_balance: r.to_balance === true,
      transaction_id: coveredTransaction(r.transaction_id),
      created_at: createdAt(r.created_at, d),
    };
  },
  // Added in database v3. parent_id null = an event; otherwise a sub-budget of
  // that event (checked once the whole table is read, see checkBudgetParents).
  budgets: (r) => ({
    id: id(r.id),
    parent_id: r.parent_id === undefined || r.parent_id === null ? null : id(r.parent_id, "parent_id"),
    name: required(r.name, "name"),
    amount: amount(r.amount),
    done: r.done === true,
    created_at: createdAt(r.created_at),
  }),
  budget_spends: (r, ctx) => {
    const budgetId = id(r.budget_id, "budget_id");
    need(ctx.budgetIds.has(budgetId), `budget ${budgetId} isn't in this backup`);
    const d = date(r.date);
    return {
      id: id(r.id),
      budget_id: budgetId,
      amount: amount(r.amount),
      description: required(r.description, "description"),
      date: d,
      created_at: createdAt(r.created_at, d),
    };
  },
  // Added in database v4. Folders → bills → pages; each page is one file.
  bill_folders: (r) => ({ id: id(r.id), name: required(r.name, "name"), created_at: createdAt(r.created_at) }),
  bills: (r, ctx) => {
    const folderId = id(r.folder_id, "folder_id");
    need(ctx.billFolderIds.has(folderId), `folder ${folderId} isn't in this backup`);
    return { id: id(r.id), folder_id: folderId, name: required(r.name, "name"), created_at: createdAt(r.created_at) };
  },
  bill_pages: (r, ctx) => {
    const billId = id(r.bill_id, "bill_id");
    need(ctx.billIds.has(billId), `bill ${billId} isn't in this backup`);
    const position = Number(r.position);
    need(Number.isInteger(position) && position >= 0, "position must be a whole number");
    const data = blob(r.data, "page");
    return {
      id: id(r.id),
      bill_id: billId,
      position,
      name: required(r.name, "name"),
      type: required(r.type || data.type, "type"),
      size: Number.isFinite(Number(r.size)) && Number(r.size) >= 0 ? Number(r.size) : 0,
      data,
      thumb: optionalBlob(r.thumb, "preview"),
      created_at: createdAt(r.created_at),
    };
  },
  // Added in database v5. Money borrowed from / lent to people, and the
  // payments that pay it back.
  borrow_records: (r) => {
    const direction = text(r.direction);
    need(["borrowed", "lent"].includes(direction), "direction must be borrowed or lent");
    const d = date(r.date);
    return {
      id: id(r.id),
      direction,
      person: required(r.person, "name"),
      amount: amount(r.amount),
      date: d,
      phone: optional(r.phone),
      note: optional(r.note),
      completed: r.completed === true,
      ...moneyLink(r),
      transaction_id: coveredTransaction(r.transaction_id),
      created_at: createdAt(r.created_at, d),
    };
  },
  borrow_payments: (r, ctx) => {
    const recordId = id(r.record_id, "record_id");
    need(ctx.borrowRecordIds.has(recordId), `record ${recordId} isn't in this backup`);
    const d = date(r.date);
    return {
      id: id(r.id),
      record_id: recordId,
      amount: amount(r.amount),
      date: d,
      note: optional(r.note),
      ...moneyLink(r),
      created_at: createdAt(r.created_at, d),
    };
  },
  // Added in database v6. Recurring payments, and one run per payment per
  // month linking it to the transaction it added (which may since have been
  // deleted, so transaction_id isn't checked).
  recurring_payments: (r) => {
    const kind = text(r.kind);
    need(["expense", "saving"].includes(kind), "kind must be expense or saving");
    const day = Number(r.day);
    need(Number.isInteger(day) && day >= 1 && day <= 31, "day must be between 1 and 31");
    const startMonth = text(r.start_month);
    need(/^\d{4}-\d{2}$/.test(startMonth), "start_month must be YYYY-MM");
    const nonNegative = (v, field) => {
      if (v === undefined || v === null || v === "") return null;
      const n = Number(v);
      need(Number.isFinite(n) && n >= 0, `${field} can't be negative`);
      return n;
    };
    const duration = nonNegative(r.duration, "duration");
    need(duration == null || Number.isInteger(duration), "duration must be a whole number");
    const skipped = Array.isArray(r.skipped_months) ? r.skipped_months.map(text) : [];
    need(skipped.every((m) => /^\d{4}-\d{2}$/.test(m)), "skipped months must be YYYY-MM");
    return {
      id: id(r.id),
      name: required(r.name, "name"),
      kind,
      amount: amount(r.amount),
      tag: required(r.tag, "tag"),
      day,
      payment_method: optional(r.payment_method),
      payment_source: optional(r.payment_source),
      deduct_from_balance: kind === "saving" ? r.deduct_from_balance !== false : null,
      pending_start: nonNegative(r.pending_start, "pending balance"),
      duration,
      start_month: startMonth,
      paused: r.paused === true,
      completed: r.completed === true,
      skipped_months: skipped,
      created_at: createdAt(r.created_at),
    };
  },
  recurring_runs: (r, ctx) => {
    const recurringId = id(r.recurring_id, "recurring_id");
    need(ctx.recurringIds.has(recurringId), `recurring payment ${recurringId} isn't in this backup`);
    const month = text(r.month);
    need(/^\d{4}-\d{2}$/.test(month), "month must be YYYY-MM");
    const key = `${recurringId}:${month}`;
    need(!ctx.recurringRunKeys.has(key), `month ${month} appears twice for recurring payment ${recurringId}`);
    ctx.recurringRunKeys.add(key);
    return {
      id: id(r.id),
      recurring_id: recurringId,
      month,
      transaction_id: id(r.transaction_id, "transaction_id"),
      created_at: createdAt(r.created_at),
    };
  },
  // Added in database v7. Subscriptions tracked by hand (not in the balance).
  subscriptions: (r, ctx) => {
    const cycle = text(r.cycle);
    need(["monthly", "yearly"].includes(cycle), "cycle must be monthly or yearly");
    const day = Number(r.day);
    need(Number.isInteger(day) && day >= 1 && day <= 31, "day must be between 1 and 31");
    const month = cycle === "yearly" ? Number(r.month) : null;
    need(cycle !== "yearly" || (Number.isInteger(month) && month >= 1 && month <= 12), "month must be between 1 and 12");
    const remind = text(r.remind);
    return {
      id: id(r.id),
      name: required(r.name, "name"),
      amount: amount(r.amount),
      cycle,
      day,
      month,
      payment_method: optional(r.payment_method),
      category: optional(r.category),
      trial_end: r.trial_end ? date(r.trial_end) : null,
      remind: ["off", "0", "1", "3"].includes(remind) ? remind : "off",
      cancelled_at: r.cancelled_at ? date(r.cancelled_at) : null,
      // Added later: the card it's charged to. Older backups, and cards not in
      // this backup, mean none.
      card_id: ctx.cardIds.has(Number(r.card_id)) ? Number(r.card_id) : null,
      created_at: createdAt(r.created_at),
    };
  },
  // Added in database v8. Money set aside per tag for a month.
  spending_plans: (r, ctx) => {
    const month = text(r.month);
    need(/^\d{4}-\d{2}$/.test(month), "month must be YYYY-MM");
    const tag = required(r.tag, "tag");
    const key = `${month}:${tag.toLowerCase()}`;
    need(!ctx.planKeys.has(key), `"${tag}" appears twice in the ${month} spending plan`);
    ctx.planKeys.add(key);
    return { id: id(r.id), month, tag, amount: amount(r.amount), created_at: createdAt(r.created_at) };
  },
};

// Tables whose `name` must be unique (they have a unique index).
const UNIQUE_NAME_TABLES = ["transaction_types", "payment_methods", "payment_sources", "bill_folders"];

export const TABLE_LABELS = {
  transaction_types: "Transaction types",
  payment_methods: "Payment methods",
  payment_sources: "Payment sources",
  transactions: "Transactions",
  credit_cards: "Credit cards",
  credit_card_transactions: "Card spends",
  savings_withdrawals: "Savings used",
  budgets: "Budgets",
  budget_spends: "Budget spends",
  bill_folders: "Bill folders",
  bills: "Bills",
  bill_pages: "Bill pages",
  borrow_records: "Borrowed & lent",
  borrow_payments: "Borrowed & lent payments",
  recurring_payments: "Recurring payments",
  recurring_runs: "Recurring payment history",
  spending_plans: "Spending plan",
  subscriptions: "Subscriptions",
};

// Sub-budgets are one level deep: every parent_id must be an event (a row
// whose own parent_id is null) in the same backup.
function checkBudgetParents(rows) {
  const events = new Set(rows.filter((b) => b.parent_id === null).map((b) => b.id));
  return rows
    .filter((b) => b.parent_id !== null && !events.has(b.parent_id))
    .map((b) => `${TABLE_LABELS.budgets} "${b.name}": its parent ${b.parent_id} isn't a budget in this backup`);
}

// ---------- build ----------

export function buildBackup(tables, preferences = {}, exportedAt = new Date().toISOString()) {
  return { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt, preferences, tables };
}

// ---------- parse + validate ----------

const MAX_LISTED_PROBLEMS = 5;

// Returns { tables, preferences, summary } or throws an Error whose message
// is safe to show the user. Nothing here touches the database.
export function parseBackup(fileText) {
  let backup;
  try {
    backup = JSON.parse(fileText);
  } catch {
    throw new Error("This file isn't a backup (it's not valid JSON).");
  }
  need(backup && typeof backup === "object" && backup.app === BACKUP_APP, "This file isn't a DigiLog backup.");
  need(Number.isInteger(backup.format) && backup.format >= 1, "This backup is missing its format version.");
  need(
    backup.format <= BACKUP_FORMAT,
    "This backup was made by a newer version of the app. Update the app, then import it again."
  );
  need(backup.tables && typeof backup.tables === "object", "This backup has no data in it.");

  const originalFormat = backup.format;
  while (backup.format < BACKUP_FORMAT) {
    const step = MIGRATIONS[backup.format];
    need(step, `Can't upgrade backup format ${backup.format}.`);
    backup = step(backup);
  }

  const problems = [];
  const tables = {};
  const ctx = { kindByType: {}, cardIds: new Set(), budgetIds: new Set(), billFolderIds: new Set(), billIds: new Set(), borrowRecordIds: new Set(), recurringIds: new Set(), recurringRunKeys: new Set(), planKeys: new Set() };
  const missingTables = [];

  for (const [name, spec] of Object.entries(TABLE_SPECS)) {
    const raw = backup.tables[name];
    if (raw === undefined) {
      missingTables.push(name);
      tables[name] = [];
      continue;
    }
    if (!Array.isArray(raw)) {
      problems.push(`${TABLE_LABELS[name]}: expected a list`);
      tables[name] = [];
      continue;
    }

    const rows = [];
    const seenIds = new Set();
    const seenNames = new Set();
    raw.forEach((r, i) => {
      const where = `${TABLE_LABELS[name]} row ${i + 1}`;
      try {
        need(r && typeof r === "object", "not a record");
        const row = spec(r, ctx);
        need(!seenIds.has(row.id), `duplicate id ${row.id}`);
        seenIds.add(row.id);
        if (UNIQUE_NAME_TABLES.includes(name)) {
          const key = row.name.toLowerCase();
          need(!seenNames.has(key), `duplicate name "${row.name}"`);
          seenNames.add(key);
        }
        rows.push(row);
      } catch (e) {
        problems.push(`${where}: ${e.message}`);
      }
    });
    tables[name] = rows;

    if (name === "transaction_types") rows.forEach((t) => (ctx.kindByType[t.name] = t.kind));
    if (name === "credit_cards") rows.forEach((c) => ctx.cardIds.add(c.id));
    if (name === "budgets") {
      problems.push(...checkBudgetParents(rows));
      rows.forEach((b) => ctx.budgetIds.add(b.id));
    }
    if (name === "bill_folders") rows.forEach((f) => ctx.billFolderIds.add(f.id));
    if (name === "bills") rows.forEach((b) => ctx.billIds.add(b.id));
    if (name === "borrow_records") rows.forEach((b) => ctx.borrowRecordIds.add(b.id));
    if (name === "recurring_payments") rows.forEach((r) => ctx.recurringIds.add(r.id));
  }

  if (problems.length) {
    const listed = problems.slice(0, MAX_LISTED_PROBLEMS).join("; ");
    const more = problems.length > MAX_LISTED_PROBLEMS ? ` (+${problems.length - MAX_LISTED_PROBLEMS} more)` : "";
    throw new Error(`This backup has ${problems.length} problem${problems.length === 1 ? "" : "s"}, so nothing was imported: ${listed}${more}.`);
  }

  const ignoredTables = Object.keys(backup.tables).filter((n) => !(n in TABLE_SPECS));

  return {
    tables,
    preferences: backup.preferences && typeof backup.preferences === "object" ? backup.preferences : {},
    summary: {
      exportedAt: typeof backup.exportedAt === "string" ? backup.exportedAt : null,
      format: originalFormat,
      counts: Object.fromEntries(Object.entries(tables).map(([n, rows]) => [n, rows.length])),
      missingTables,
      ignoredTables,
    },
  };
}
