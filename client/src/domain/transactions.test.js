import { describe, expect, it } from "vitest";
import { matchesMovementFilters, movementTotals } from "./transactions";

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
