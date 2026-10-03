import { describe, expect, it } from "vitest";
import { balanceEffect, balanceShortfall, matchesMovementFilters, movementTotals } from "./transactions";

const m = (flow, account, amount, date = "2026-09-10") => ({ flow, account, amount, date });

describe("movementTotals", () => {
  it("adds money in and takes money out, per account", () => {
    const moves = [m("out", "balance", 10000), m("in", "balance", 4000), m("out", "savings", 3000), m("in", "savings", 500)];
    expect(movementTotals(moves)).toEqual({ balance: -6000, savings: -2500 });
  });
});

describe("matchesMovementFilters", () => {
  it("shows movements for the picked months only", () => {
    expect(matchesMovementFilters(m("in", "balance", 1), { months: ["2026-09"] })).toBe(true);
    expect(matchesMovementFilters(m("in", "balance", 1), { months: ["2026-08"] })).toBe(false);
    expect(matchesMovementFilters(m("in", "balance", 1), { months: [] })).toBe(true);
  });

  it("hides them when a type or tag is picked: they're neither", () => {
    expect(matchesMovementFilters(m("in", "balance", 1), { kind: "expense" })).toBe(false);
    expect(matchesMovementFilters(m("in", "balance", 1), { tags: ["Food"] })).toBe(false);
  });
});

describe("balance rule", () => {
  it("knows what each transaction does to the balance", () => {
    expect(balanceEffect({ type_kind: "earning", amount: 500 })).toBe(500);
    expect(balanceEffect({ type_kind: "expense", amount: 200 })).toBe(-200);
    expect(balanceEffect({ type_kind: "saving", amount: 100, deduct_from_balance: true })).toBe(-100);
    expect(balanceEffect({ type_kind: "saving", amount: 100, deduct_from_balance: false })).toBe(0);
  });

  it("never lets the balance go below zero", () => {
    expect(balanceShortfall(2000, -3000)).toBe(3000);
    expect(balanceShortfall(2000, 0)).toBe(0);
    expect(balanceShortfall(0.3, 0.1 + 0.2 - 0.3)).toBe(0);
  });

  it("lets an old negative balance stay, but not go lower", () => {
    expect(balanceShortfall(-100, -100)).toBe(0);
    expect(balanceShortfall(-100, -600)).toBe(500);
    expect(balanceShortfall(-100, 50)).toBe(0);
  });
});
