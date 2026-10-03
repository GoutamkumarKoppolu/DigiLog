import { describe, expect, it } from "vitest";
import { averageRate, monthlyTrend } from "./domain";
import { salaryMonth } from "../recurring/domain";

const t = (type_kind, amount, date, tag = "Misc") => ({ type_kind, amount, date, tag });
// As in the app: a salary counts in the month it pays for.
const monthOf = (row) => (row.tag === "Salary" ? salaryMonth(row.date) : row.date.slice(0, 7));

describe("savings rate trend", () => {
  const rows = [
    t("earning", 100000, "2026-08-31", "Salary"),
    t("expense", 60000, "2026-09-10"),
    t("saving", 10000, "2026-09-12"),
    t("earning", 100000, "2026-09-30", "Salary"),
    t("expense", 90000, "2026-10-05"),
  ];

  it("adds up each month and keeps what wasn't spent", () => {
    const trend = monthlyTrend(rows, "2026-10", monthOf, 3);
    expect(trend.map((m) => m.month)).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(trend[1]).toMatchObject({ income: 100000, expenses: 60000, saved: 10000, kept: 40000, rate: 0.4 });
    expect(trend[2]).toMatchObject({ income: 100000, expenses: 90000, rate: 0.1 });
  });

  it("counts a salary in the month it pays for, not the day it arrived", () => {
    const trend = monthlyTrend(rows, "2026-10", monthOf, 3);
    expect(trend[0]).toMatchObject({ month: "2026-08", income: 0, rate: null });
  });

  it("averages over months with income, weighted by income", () => {
    expect(averageRate(monthlyTrend(rows, "2026-10", monthOf, 3))).toBeCloseTo(0.25);
    expect(averageRate(monthlyTrend([], "2026-10", monthOf, 3))).toBeNull();
  });
});
