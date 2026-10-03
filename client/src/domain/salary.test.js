import { describe, expect, it } from "vitest";
import { ledgerMonth, salaryMonth } from "./salary";
import { computeTotals, matchesFilters } from "./transactions";

const salary = (date) => ({ type_kind: "earning", tag: "Salary", amount: 85000, date });
const other = (type_kind, date, tag = "Rent") => ({ type_kind, tag, amount: 100, date });

describe("which month a transaction counts in", () => {
  it("puts a salary in the month it pays for, everything else on its date", () => {
    expect(salaryMonth("2026-09-30")).toBe("2026-10");
    expect(ledgerMonth(salary("2026-09-30"))).toBe("2026-10");
    expect(ledgerMonth(salary("2026-10-03"))).toBe("2026-10");
    expect(ledgerMonth(salary("2026-09-01"))).toBe("2026-09");
    expect(ledgerMonth(other("expense", "2026-09-30"))).toBe("2026-09");
    expect(ledgerMonth(other("earning", "2026-09-30", "Bonus"))).toBe("2026-09");
  });

  it("no double-salary month when payday moves: 1 Sep and 30 Sep are different months", () => {
    // August's salary arrived on 1 Sep (31 Aug was a Sunday), September's on 30 Sep.
    // By date that's ₹1,70,000 in September and nothing in October.
    const rows = [salary("2026-09-01"), salary("2026-09-30")];
    const income = (month) => computeTotals(rows.filter((t) => matchesFilters(t, { months: [month] }))).earnings;
    expect([income("2026-09"), income("2026-10")]).toEqual([85000, 85000]);
  });
});
