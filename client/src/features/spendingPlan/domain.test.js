import { describe, expect, it } from "vitest";
import { planProblem, planProgress, previousPlan, stillSetAside } from "./domain";

const plan = (id, month, tag, amount) => ({ id, month, tag, amount });
const spend = (tag, amount, date, type_kind = "expense") => ({ tag, amount, date, type_kind });

describe("spending plan", () => {
  const plans = [plan(1, "2026-10", "Bills", 10000), plan(2, "2026-10", "Shopping", 5000), plan(3, "2026-09", "Bills", 9000)];

  it("fills each tag's bar from that month's expenses, any case", () => {
    const txs = [
      spend("bills ", 4000, "2026-10-02"),
      spend("Bills", 2000, "2026-10-20"),
      spend("Bills", 999, "2026-09-30"),
      spend("Bills", 500, "2026-10-05", "saving"),
      spend("Shopping", 4800, "2026-10-08"),
    ];
    const rows = planProgress(plans, txs, "2026-10");
    expect(rows.map((r) => [r.tag, r.spent, r.left, r.red])).toEqual([
      ["Bills", 6000, 4000, false],
      ["Shopping", 4800, 200, true],
    ]);
    expect(rows.map((r) => r.color)).toEqual(["var(--cat-1)", "var(--cat-2)"]);
  });

  it("goes red when over, and counts nothing left in that tag", () => {
    const rows = planProgress(plans, [spend("Shopping", 6200, "2026-10-08")], "2026-10");
    expect(rows[1]).toMatchObject({ left: -1200, red: true });
    expect(stillSetAside(rows)).toBe(10000);
  });

  it("suggests last month's plan for the next one", () => {
    expect(previousPlan(plans, "2026-11")).toEqual([
      { tag: "Bills", amount: 10000 },
      { tag: "Shopping", amount: 5000 },
    ]);
    expect(previousPlan(plans, "2026-09")).toEqual([]);
  });

  it("only saves a plan with a tag and an amount per row, each tag once", () => {
    expect(planProblem([{ tag: "Bills", amount: 100 }])).toBe("");
    expect(planProblem([{ tag: " ", amount: 100 }])).toBe("Every row needs a tag");
    expect(planProblem([{ tag: "Bills", amount: 0 }])).toBe('Set an amount for "Bills"');
    expect(planProblem([{ tag: "Bills", amount: 1 }, { tag: "bills", amount: 2 }])).toBe('"bills" is in the plan twice');
  });
});
