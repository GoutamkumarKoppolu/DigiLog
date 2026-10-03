import { describe, expect, it } from "vitest";
import {
  dueDate,
  duePayments,
  firstMonth,
  lastPaymentMonth,
  monthPlan,
  monthStatus,
  monthTotals,
  planMonth,
  progress,
  salaryMonth,
  salaryMonths,
} from "./domain";

const salary = (date, id = 900) => ({ id, type_kind: "earning", tag: "Salary", amount: 85000, date });
const emi = (extra = {}) => ({
  id: 1,
  name: "Home loan EMI",
  kind: "expense",
  amount: 25000,
  tag: "Home loan",
  day: 5,
  pending_start: null,
  duration: null,
  start_month: "2026-09",
  paused: false,
  completed: false,
  skipped_months: [],
  ...extra,
});
const run = (month, transaction_id, recurring_id = 1) => ({ id: transaction_id, recurring_id, month, transaction_id });
const tx = (id, amount, date) => ({ id, type_kind: "expense", tag: "Home loan", amount, date });
const map = (txs) => new Map(txs.map((t) => [t.id, t]));
const due = (items, runs, txs, today) => duePayments(items, runs, map(txs), salaryMonths(txs), today);

describe("dates", () => {
  it("uses the month's last day for days it doesn't have", () => {
    expect(dueDate("2026-09", 31)).toBe("2026-09-30");
    expect(dueDate("2026-02", 30)).toBe("2026-02-28");
    expect(dueDate("2028-02", 30)).toBe("2028-02-29");
    expect(dueDate("2026-09", 5)).toBe("2026-09-05");
  });

  it("starts this month if the day is still to come, else next month", () => {
    expect(firstMonth(5, "2026-09-03")).toBe("2026-09");
    expect(firstMonth(5, "2026-09-05")).toBe("2026-09");
    expect(firstMonth(5, "2026-09-26")).toBe("2026-10");
    expect(firstMonth(5, "2026-12-26")).toBe("2027-01");
  });

  it("only counts earnings tagged Salary (any case)", () => {
    const set = salaryMonths([salary("2026-09-01"), { id: 2, type_kind: "earning", tag: "salary ", date: "2026-10-01" }, { id: 3, type_kind: "expense", tag: "Salary", date: "2026-11-01" }]);
    expect([...set]).toEqual(["2026-09", "2026-10"]);
  });
});

describe("when a payment is added", () => {
  it("waits for the month's salary", () => {
    expect(due([emi()], [], [], "2026-09-10")).toEqual([]);
  });

  it("waits for its day even after salary (salary 1st, EMI 5th)", () => {
    expect(due([emi()], [], [salary("2026-09-01")], "2026-09-04")).toEqual([]);
    const d = due([emi()], [], [salary("2026-09-01")], "2026-09-05");
    expect(d.map((x) => [x.month, x.date, x.amount])).toEqual([["2026-09", "2026-09-05", 25000]]);
  });

  it("is added straight away if its day passed before the salary (EMI 1st, salary 3rd)", () => {
    const d = due([emi({ day: 1 })], [], [salary("2026-09-03")], "2026-09-03");
    expect(d.map((x) => x.date)).toEqual(["2026-09-01"]);
  });

  it("catches up missed months, each on its own date, only where salary came in", () => {
    const txs = [salary("2026-09-01", 901), salary("2026-10-01", 902), salary("2026-12-01", 903)];
    const d = due([emi()], [], txs, "2026-12-20");
    expect(d.map((x) => x.date)).toEqual(["2026-09-05", "2026-10-05", "2026-12-05"]);
  });

  it("never adds a month twice, even if its transaction was deleted", () => {
    const d = due([emi()], [run("2026-09", 50)], [salary("2026-09-01")], "2026-09-20");
    expect(d).toEqual([]);
  });

  it("skips paused, skipped and completed payments", () => {
    const txs = [salary("2026-09-01")];
    expect(due([emi({ paused: true })], [], txs, "2026-09-20")).toEqual([]);
    expect(due([emi({ skipped_months: ["2026-09"] })], [], txs, "2026-09-20")).toEqual([]);
    expect(due([emi({ completed: true })], [], txs, "2026-09-20")).toEqual([]);
  });

  it("doesn't start before its start month", () => {
    expect(due([emi({ start_month: "2026-10" })], [], [salary("2026-09-01")], "2026-09-20")).toEqual([]);
  });
});

describe("pending balance and payments left", () => {
  it("takes only what's pending in the last month, then stops", () => {
    const txs = [salary("2026-09-01", 901), salary("2026-10-01", 902), salary("2026-11-01", 903), salary("2026-12-01", 904)];
    const d = due([emi({ pending_start: 65000 })], [], txs, "2026-12-20");
    expect(d.map((x) => x.amount)).toEqual([25000, 25000, 15000]);
  });

  it("counts down from what's already been paid", () => {
    const txs = [salary("2026-09-01", 901), salary("2026-10-01", 902), tx(50, 25000, "2026-09-05")];
    const p = progress(emi({ pending_start: 100000 }), [run("2026-09", 50)], map(txs));
    expect(p).toMatchObject({ paid: 25000, paidCount: 1, remaining: 75000, completed: false });
  });

  it("gives a deleted payment back to the pending balance", () => {
    const p = progress(emi({ pending_start: 100000 }), [run("2026-09", 50)], map([]));
    expect(p).toMatchObject({ paid: 0, remaining: 100000 });
  });

  it("stops after the number of payments", () => {
    const txs = [salary("2026-09-01", 901), salary("2026-10-01", 902), salary("2026-11-01", 903)];
    expect(due([emi({ duration: 2 })], [], txs, "2026-11-20").map((x) => x.month)).toEqual(["2026-09", "2026-10"]);
  });

  it("is completed when nothing is pending, no payments are left, or by hand", () => {
    const paid = map([tx(50, 25000, "2026-09-05")]);
    expect(progress(emi({ pending_start: 25000 }), [run("2026-09", 50)], paid)).toMatchObject({ finished: true, completed: true });
    expect(progress(emi({ duration: 1 }), [run("2026-09", 50)], paid)).toMatchObject({ finished: true, completed: true });
    expect(progress(emi({ completed: true }), [], paid)).toMatchObject({ finished: false, completed: true });
  });

  it("estimates the month of the last payment", () => {
    const p = progress(emi({ pending_start: 60000 }), [], map([]));
    expect(lastPaymentMonth(emi({ pending_start: 60000 }), p, "2026-09-03")).toBe("2026-11");
    expect(lastPaymentMonth(emi(), progress(emi(), [], map([])), "2026-09-03")).toBeNull();
  });
});

describe("this month's status", () => {
  const status = (item, runs, txs, today) => monthStatus(item, progress(item, runs, map(txs)), salaryMonths(txs), today);

  it("shows deducted, due, waiting and the rest", () => {
    expect(status(emi(), [run("2026-09", 50)], [salary("2026-09-01"), tx(50, 25000, "2026-09-05")], "2026-09-20")).toMatchObject({
      state: "deducted",
      date: "2026-09-05",
      amount: 25000,
    });
    expect(status(emi({ day: 25 }), [], [salary("2026-09-01")], "2026-09-20")).toMatchObject({ state: "due", date: "2026-09-25" });
    expect(status(emi(), [], [], "2026-09-02")).toMatchObject({ state: "waiting", date: "2026-09-05" });
    expect(status(emi(), [run("2026-09", 50)], [], "2026-09-20").state).toBe("removed");
    expect(status(emi({ start_month: "2026-10" }), [], [], "2026-09-20")).toMatchObject({ state: "starts", date: "2026-10-05" });
    expect(status(emi({ paused: true }), [], [], "2026-09-20").state).toBe("paused");
    expect(status(emi({ completed: true }), [], [], "2026-09-20").state).toBe("completed");
  });

  it("totals what's deducted and what's coming up", () => {
    expect(
      monthTotals([
        { state: "deducted", amount: 25000 },
        { state: "due", amount: 12000 },
        { state: "waiting", amount: 1500.5 },
        { state: "paused" },
      ])
    ).toEqual({ deducted: 25000, upcoming: 13500.5 });
  });
});

describe("monthPlan", () => {
  // EMI ₹32,500 on the 5th, rent ₹5,000 on the 10th, SIP ₹5,000 on the 28th.
  const items = [
    emi({ amount: 32500, start_month: "2026-10" }),
    emi({ id: 2, name: "Rent", amount: 5000, day: 10, start_month: "2026-10" }),
    emi({ id: 3, name: "SIP", kind: "saving", deduct_from_balance: true, amount: 5000, day: 28, start_month: "2026-10" }),
  ];
  const pay = (month, id, recurringId) => run(month, id, recurringId);

  it("before the salary: payments wait for it and don't touch usable balance", () => {
    const plan = monthPlan(items, [], [], 18000, "2026-10-01");
    expect(plan).toMatchObject({ salary: null, usableSalary: null, total: 42500, stillToDeduct: 0, waitingForSalary: 42500, usableBalance: 18000 });
    expect(plan.rows.map((r) => [r.name, r.state])).toEqual([
      ["Home loan EMI", "waiting"],
      ["Rent", "waiting"],
      ["SIP", "waiting"],
    ]);
  });

  it("salary added: everything still to come is taken off the balance", () => {
    const plan = monthPlan(items, [], [salary("2026-10-03", 900)], 98000, "2026-10-03");
    expect(plan).toMatchObject({ salary: 85000, total: 42500, usableSalary: 42500, stillToDeduct: 42500, usableBalance: 55500 });
  });

  it("after the EMI is deducted, usable balance holds steady", () => {
    const txs = [salary("2026-10-03", 900), tx(10, 32500, "2026-10-05")];
    const plan = monthPlan(items, [pay("2026-10", 10, 1)], txs, 65500, "2026-10-06");
    expect(plan).toMatchObject({ stillToDeduct: 10000, usableBalance: 55500, total: 42500 });
    expect(plan.rows.map((r) => [r.name, r.state])).toEqual([
      ["Rent", "due"],
      ["SIP", "due"],
      ["Home loan EMI", "deducted"],
    ]);
  });

  it("leaves out savings not from the balance, and skipped, paused or later payments", () => {
    const more = [
      emi({ id: 4, name: "Gift SIP", kind: "saving", deduct_from_balance: false, start_month: "2026-10" }),
      emi({ id: 5, name: "Paused", paused: true, start_month: "2026-10" }),
      emi({ id: 6, name: "Skipped", skipped_months: ["2026-10"], start_month: "2026-10" }),
      emi({ id: 7, name: "Later", start_month: "2026-12" }),
    ];
    expect(monthPlan(more, [], [], 1000, "2026-10-01").rows).toEqual([]);
  });
});

describe("which month a salary pays for", () => {
  it("pays the next month from the 25th, its own month before that", () => {
    expect(salaryMonth("2026-09-30")).toBe("2026-10");
    expect(salaryMonth("2026-09-25")).toBe("2026-10");
    expect(salaryMonth("2026-10-03")).toBe("2026-10");
    expect(salaryMonth("2026-09-24")).toBe("2026-09");
    expect(salaryMonth("2026-12-31")).toBe("2027-01");
  });

  it("shows next month as soon as its salary is in", () => {
    expect(planMonth(salaryMonths([salary("2026-09-30")]), "2026-09-30")).toBe("2026-10");
    expect(planMonth(salaryMonths([salary("2026-08-31")]), "2026-09-30")).toBe("2026-09");
  });

  it("salary on 30 Sep: October's payments are due, not waiting, and added on their day", () => {
    const item = emi({ start_month: "2026-10" });
    const txs = [salary("2026-09-30")];
    expect(monthStatus(item, progress(item, [], map(txs)), salaryMonths(txs), "2026-09-30", "2026-10")).toMatchObject({ state: "due" });
    expect(due([item], [], txs, "2026-10-04")).toEqual([]);
    expect(due([item], [], txs, "2026-10-05").map((d) => d.date)).toEqual(["2026-10-05"]);
  });

  it("September's bills come out of the salary from the end of August", () => {
    const item = emi({ start_month: "2026-09" });
    expect(due([item], [], [salary("2026-08-31")], "2026-09-05").map((d) => d.month)).toEqual(["2026-09"]);
    expect(due([item], [], [salary("2026-09-30")], "2026-09-30")).toEqual([]);
  });

  it("the month at a glance after adding the salary on 30 Sep is October", () => {
    const plan = monthPlan([emi({ start_month: "2026-10" })], [], [salary("2026-09-30")], 85000, "2026-09-30");
    expect(plan).toMatchObject({ month: "2026-10", salary: 85000, stillToDeduct: 25000, usableBalance: 60000, usableSalary: 60000 });
  });
});
