import { describe, expect, it } from "vitest";
import { fundingProblem, restOf, splitWithPot, uncovered } from "./domain";

describe("covering a shortfall", () => {
  it("takes what the pot can give and borrows the rest", () => {
    expect(splitWithPot(50000, 30000)).toEqual({ fromSavings: 30000, borrowed: 20000 });
    expect(splitWithPot(3000, 8000)).toEqual({ fromSavings: 3000, borrowed: 0 });
  });

  it("fills in the other amount after one is typed", () => {
    expect(restOf(50000, 30000)).toBe(20000);
    expect(restOf(50000, 60000)).toBe(0);
    expect(uncovered(0.3, 0.1, 0.2)).toBe(0);
  });

  it("only saves a split that covers exactly what's missing", () => {
    const ok = { short: 50000, pot: "Trip", potRemaining: 30000, fromSavings: 30000, borrowed: 20000, person: "Ravi" };
    expect(fundingProblem(ok)).toBe("");
    expect(fundingProblem({ ...ok, borrowed: 10000 })).toMatch(/still to cover/);
    expect(fundingProblem({ ...ok, borrowed: 25000 })).toMatch(/more than needed/);
    expect(fundingProblem({ ...ok, person: " " })).toBe("Who did you borrow from?");
    expect(fundingProblem({ ...ok, fromSavings: 40000, borrowed: 10000 })).toMatch(/Only .* left in "Trip"/);
    expect(fundingProblem({ ...ok, pot: "", fromSavings: 30000 })).toBe("Pick the savings pot");
  });
});
