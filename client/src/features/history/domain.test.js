import { describe, expect, it } from "vitest";
import { historyMonths, planHistoryDelete } from "./domain";

const tx = (id, type_kind, amount, date, tag = "Misc") => ({ id, type_kind, amount, date, tag, deduct_from_balance: type_kind === "saving" || null });
const use = (id, tag, amount, date) => ({ id, tag, amount, date });

describe("planHistoryDelete", () => {
  const transactions = [
    tx(1, "earning", 50000, "2026-03-01", "Salary"),
    tx(2, "expense", 2000, "2026-03-05"),
    tx(3, "saving", 5000, "2026-03-10", "Trip"),
    tx(4, "saving", 1000, "2026-04-10", "Trip"),
  ];

  it("picks one month's transactions and withdrawals", () => {
    const plan = planHistoryDelete({ transactions, withdrawals: [use(1, "Trip", 500, "2026-03-20")], movements: [] }, "2026-03");
    expect(plan.transactions.map((t) => t.id)).toEqual([1, 2, 3]);
    expect(plan.withdrawals.map((w) => w.id)).toEqual([1]);
    expect(plan.totals).toMatchObject({ earnings: 50000, expenses: 2000, savings: 5000 });
    expect(plan.pots).toEqual([{ tag: "Trip", amount: -4500 }]);
    expect(plan.shortPot).toBeNull();
    expect(plan.empty).toBe(false);
  });

  it("also deletes later uses of a month's savings, newest first, until the pot is back at zero", () => {
    const withdrawals = [use(1, "Trip", 400, "2026-04-15"), use(2, "Trip", 3000, "2026-04-20"), use(3, "Food", 9, "2026-04-21")];
    const withFood = [...transactions, tx(5, "saving", 50, "2026-04-01", "Food")];
    const plan = planHistoryDelete({ transactions: withFood, withdrawals, movements: [] }, "2026-03");
    expect(plan.laterUses.map((w) => w.id)).toEqual([2]);
    expect(plan.withdrawals.map((w) => w.id)).toEqual([2]);
    expect(plan.pots).toEqual([{ tag: "Trip", amount: -2000 }]);
    expect(plan.shortPot).toBeNull();
  });

  it("deletes everything with no month, but keeps movements and blocks pots they emptied", () => {
    const out = { key: "b1", flow: "out", account: "savings", pot: "Trip", amount: 700, date: "2026-03-02" };
    const plan = planHistoryDelete({ transactions, withdrawals: [use(1, "Trip", 500, "2026-04-20")], movements: [out] });
    expect(plan.transactions).toHaveLength(4);
    expect(plan.keptMovements).toEqual([out]);
    expect(plan.withdrawals.map((w) => w.id)).toEqual([1]);
    expect(plan.shortPot).toEqual({ tag: "Trip", amount: 700 });
  });

  it("works out what the delete does to the balance", () => {
    const moved = { ...use(9, "Trip", 1000, "2026-03-25"), to_balance: true };
    const plan = planHistoryDelete({ transactions, withdrawals: [moved], movements: [] }, "2026-03");
    // −50,000 earning, +2,000 expense, +5,000 saving undone; the 1,000 moved in goes back out.
    expect(plan.balanceChange).toBe(-50000 + 2000 + 5000 - 1000);
  });

  it("is empty for a month with nothing in it", () => {
    expect(planHistoryDelete({ transactions, withdrawals: [], movements: [] }, "2025-01").empty).toBe(true);
  });
});

it("lists months with history, newest first", () => {
  expect(historyMonths([tx(1, "expense", 1, "2026-03-05"), tx(2, "expense", 1, "2026-03-09")], [use(1, "T", 1, "2026-04-01")])).toEqual([
    "2026-04",
    "2026-03",
  ]);
});
