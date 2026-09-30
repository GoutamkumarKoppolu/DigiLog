import { describe, expect, it } from "vitest";
import { BACKUP_APP, BACKUP_FORMAT, parseBackup } from "./backupFormat";

const backupWith = (tables) => JSON.stringify({ app: BACKUP_APP, format: BACKUP_FORMAT, tables });

const event = { id: 1, parent_id: null, name: "Car", amount: 1000000, done: false, created_at: "2026-09-01T10:00:00.000Z" };
const sub = { id: 2, parent_id: 1, name: "Modifications", amount: 300000, created_at: "2026-09-01T10:01:00.000Z" };
const spend = { id: 1, budget_id: 2, amount: 40000, description: "Alloys", date: "2026-09-10", created_at: "2026-09-10T10:00:00.000Z" };

describe("parseBackup: budgets", () => {
  it("imports events, sub-budgets and spends", () => {
    const { tables } = parseBackup(backupWith({ budgets: [event, sub], budget_spends: [spend] }));
    expect(tables.budgets).toEqual([event, { ...sub, done: false }]);
    expect(tables.budget_spends).toEqual([spend]);
  });

  it("starts budgets empty for a backup made before they existed", () => {
    const { tables, summary } = parseBackup(backupWith({ transactions: [] }));
    expect(tables.budgets).toEqual([]);
    expect(tables.budget_spends).toEqual([]);
    expect(summary.missingTables).toEqual(expect.arrayContaining(["budgets", "budget_spends"]));
  });

  it("rejects a sub-budget whose parent is missing", () => {
    expect(() => parseBackup(backupWith({ budgets: [sub] }))).toThrow(/parent 1 isn't a budget/);
  });

  it("rejects sub-budgets nested more than one level", () => {
    const nested = { ...sub, id: 3, parent_id: 2, name: "Alloys" };
    expect(() => parseBackup(backupWith({ budgets: [event, sub, nested] }))).toThrow(/parent 2 isn't a budget/);
  });

  it("rejects a spend pointing at an unknown budget", () => {
    expect(() => parseBackup(backupWith({ budgets: [event], budget_spends: [spend] }))).toThrow(/budget 2 isn't in this backup/);
  });

  it("rejects a budget without a positive amount", () => {
    expect(() => parseBackup(backupWith({ budgets: [{ ...event, amount: 0 }] }))).toThrow(/amount must be a positive number/);
  });
});

describe("parseBackup: bills", () => {
  const folder = { id: 1, name: "Warranties", created_at: "2026-09-01T10:00:00.000Z" };
  const bill = { id: 5, folder_id: 1, name: "Fridge invoice", created_at: "2026-09-02T10:00:00.000Z" };
  const page = {
    id: 9,
    bill_id: 5,
    position: 0,
    name: "invoice.pdf",
    type: "application/pdf",
    size: 3,
    data: { $blob: "JVBE", type: "application/pdf" },
    thumb: null,
    created_at: "2026-09-02T10:00:00.000Z",
  };

  it("imports folders, bills and pages with their file data", () => {
    const { tables } = parseBackup(backupWith({ bill_folders: [folder], bills: [bill], bill_pages: [page] }));
    expect(tables.bill_folders).toEqual([folder]);
    expect(tables.bills).toEqual([bill]);
    expect(tables.bill_pages).toEqual([page]);
  });

  it("keeps a photo's preview", () => {
    const photo = { ...page, type: "image/jpeg", thumb: { $blob: "/9j/", type: "image/jpeg" } };
    const { tables } = parseBackup(backupWith({ bill_folders: [folder], bills: [bill], bill_pages: [photo] }));
    expect(tables.bill_pages[0].thumb).toEqual({ $blob: "/9j/", type: "image/jpeg" });
  });

  it("starts bills empty for a backup made before they existed", () => {
    const { tables } = parseBackup(backupWith({ transactions: [] }));
    expect(tables.bill_folders).toEqual([]);
    expect(tables.bills).toEqual([]);
    expect(tables.bill_pages).toEqual([]);
  });

  it("rejects a page without file data", () => {
    const broken = { ...page, data: null };
    expect(() => parseBackup(backupWith({ bill_folders: [folder], bills: [bill], bill_pages: [broken] }))).toThrow(/page has no file data/);
  });

  it("rejects file data that isn't base64", () => {
    const broken = { ...page, data: { $blob: "not base64!", type: "application/pdf" } };
    expect(() => parseBackup(backupWith({ bill_folders: [folder], bills: [bill], bill_pages: [broken] }))).toThrow(/isn't valid file data/);
  });

  it("rejects bills and pages pointing at missing parents", () => {
    expect(() => parseBackup(backupWith({ bills: [bill] }))).toThrow(/folder 1 isn't in this backup/);
    expect(() => parseBackup(backupWith({ bill_folders: [folder], bill_pages: [page] }))).toThrow(/bill 5 isn't in this backup/);
  });

  it("rejects two folders with the same name", () => {
    const twin = { ...folder, id: 2, name: "warranties" };
    expect(() => parseBackup(backupWith({ bill_folders: [folder, twin] }))).toThrow(/duplicate name/);
  });
});

describe("parseBackup: borrowed & lent", () => {
  const record = {
    id: 1,
    direction: "lent",
    person: "Ravi",
    amount: 50000,
    date: "2026-08-12",
    phone: "+919876543210",
    note: "Bike down payment",
    completed: false,
    linked_to: "balance",
    pot: null,
    created_at: "2026-08-12T10:00:00.000Z",
  };
  const payment = {
    id: 1,
    record_id: 1,
    amount: 10000,
    date: "2026-09-02",
    note: null,
    linked_to: "savings",
    pot: "Trip",
    created_at: "2026-09-02T10:00:00.000Z",
  };

  it("imports records and payments", () => {
    const { tables } = parseBackup(backupWith({ borrow_records: [record], borrow_payments: [payment] }));
    expect(tables.borrow_records).toEqual([record]);
    expect(tables.borrow_payments).toEqual([payment]);
  });

  it("starts empty for a backup made before it existed", () => {
    const { tables } = parseBackup(backupWith({ transactions: [] }));
    expect(tables.borrow_records).toEqual([]);
    expect(tables.borrow_payments).toEqual([]);
  });

  it("fills in missing optional fields", () => {
    const { tables } = parseBackup(backupWith({ borrow_records: [{ ...record, phone: undefined, note: "", completed: undefined }] }));
    expect(tables.borrow_records[0]).toMatchObject({ phone: null, note: null, completed: false });
  });

  it("treats rows from before linking as just noted", () => {
    const { tables } = parseBackup(
      backupWith({ borrow_records: [{ ...record, linked_to: undefined }], borrow_payments: [{ ...payment, linked_to: undefined, pot: undefined }] })
    );
    expect(tables.borrow_records[0]).toMatchObject({ linked_to: null, pot: null });
    expect(tables.borrow_payments[0]).toMatchObject({ linked_to: null, pot: null });
  });

  it("rejects an unknown link and savings without a pot", () => {
    expect(() => parseBackup(backupWith({ borrow_records: [{ ...record, linked_to: "wallet" }] }))).toThrow(/linked_to must be balance or savings/);
    expect(() => parseBackup(backupWith({ borrow_records: [record], borrow_payments: [{ ...payment, pot: "" }] }))).toThrow(/pot is missing/);
  });

  it("rejects an unknown direction and payments for missing records", () => {
    expect(() => parseBackup(backupWith({ borrow_records: [{ ...record, direction: "loan" }] }))).toThrow(/direction must be borrowed or lent/);
    expect(() => parseBackup(backupWith({ borrow_payments: [payment] }))).toThrow(/record 1 isn't in this backup/);
  });
});

describe("parseBackup: recurring payments", () => {
  const item = {
    id: 1,
    name: "Home loan EMI",
    kind: "expense",
    amount: 25000,
    tag: "Home loan",
    day: 5,
    payment_method: "UPI",
    payment_source: null,
    deduct_from_balance: null,
    pending_start: 3200000,
    duration: null,
    start_month: "2026-09",
    paused: false,
    completed: false,
    skipped_months: [],
    created_at: "2026-09-01T10:00:00.000Z",
  };
  const runRow = { id: 1, recurring_id: 1, month: "2026-09", transaction_id: 42, created_at: "2026-09-05T10:00:00.000Z" };

  it("imports payments and their history", () => {
    const { tables } = parseBackup(backupWith({ recurring_payments: [item], recurring_runs: [runRow] }));
    expect(tables.recurring_payments).toEqual([item]);
    expect(tables.recurring_runs).toEqual([runRow]);
  });

  it("starts empty for a backup made before it existed", () => {
    const { tables } = parseBackup(backupWith({ transactions: [] }));
    expect(tables.recurring_payments).toEqual([]);
    expect(tables.recurring_runs).toEqual([]);
  });

  it("defaults the saving balance switch and optional fields", () => {
    const saving = { ...item, kind: "saving", deduct_from_balance: undefined, pending_start: "", duration: undefined, skipped_months: undefined };
    const { tables } = parseBackup(backupWith({ recurring_payments: [saving] }));
    expect(tables.recurring_payments[0]).toMatchObject({ deduct_from_balance: true, pending_start: null, duration: null, skipped_months: [] });
  });

  it("rejects bad rows", () => {
    expect(() => parseBackup(backupWith({ recurring_payments: [{ ...item, day: 32 }] }))).toThrow(/day must be between 1 and 31/);
    expect(() => parseBackup(backupWith({ recurring_payments: [{ ...item, kind: "earning" }] }))).toThrow(/kind must be expense or saving/);
    expect(() => parseBackup(backupWith({ recurring_runs: [runRow] }))).toThrow(/recurring payment 1 isn't in this backup/);
    expect(() =>
      parseBackup(backupWith({ recurring_payments: [item], recurring_runs: [runRow, { ...runRow, id: 2, transaction_id: 43 }] }))
    ).toThrow(/appears twice/);
  });
});

describe("parseBackup: subscriptions", () => {
  const s = {
    id: 1,
    name: "Prime",
    amount: 1499,
    cycle: "yearly",
    day: 14,
    month: 3,
    payment_method: "HDFC card",
    category: "Shopping",
    trial_end: null,
    remind: "1",
    cancelled_at: null,
    created_at: "2026-09-01T10:00:00.000Z",
  };

  it("imports subscriptions", () => {
    const { tables } = parseBackup(backupWith({ subscriptions: [s] }));
    expect(tables.subscriptions).toEqual([s]);
  });

  it("starts empty for a backup made before they existed, and fills in defaults", () => {
    expect(parseBackup(backupWith({ transactions: [] })).tables.subscriptions).toEqual([]);
    const monthly = { ...s, cycle: "monthly", month: 7, remind: undefined, payment_method: "" };
    expect(parseBackup(backupWith({ subscriptions: [monthly] })).tables.subscriptions[0]).toMatchObject({ month: null, remind: "off", payment_method: null });
  });

  it("rejects bad rows", () => {
    expect(() => parseBackup(backupWith({ subscriptions: [{ ...s, cycle: "weekly" }] }))).toThrow(/cycle must be monthly or yearly/);
    expect(() => parseBackup(backupWith({ subscriptions: [{ ...s, month: 13 }] }))).toThrow(/month must be between 1 and 12/);
  });
});
