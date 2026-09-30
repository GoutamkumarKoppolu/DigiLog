import { describe, expect, it } from "vitest";
import { billMonth, billTag, billsByCard, cardForTag, compareMonths, compareStatus, lastMonths, latestActiveMonth } from "./domain";

const cards = [
  { id: 1, name: "HDFC Regalia" },
  { id: 2, name: "SBI SimplyClick" },
];
const expense = (id, tag, amount, date) => ({ id, tag, amount, date, type_kind: "expense" });

describe("bill tags", () => {
  it("names the tag after the card", () => {
    expect(billTag(" HDFC Regalia ")).toBe("HDFC Regalia bill");
  });

  it("finds the card for a tag, ignoring case and spaces", () => {
    expect(cardForTag(cards, "hdfc regalia BILL ")).toBe(cards[0]);
    expect(cardForTag(cards, "HDFC Regalia")).toBeUndefined();
    expect(cardForTag(cards, null)).toBeUndefined();
  });
});

describe("billMonth", () => {
  it("counts a bill paid from the 25th for that month", () => {
    expect(billMonth("2026-09-25")).toBe("2026-09");
    expect(billMonth("2026-09-30")).toBe("2026-09");
  });

  it("counts a bill paid before the 25th for the previous month, across years", () => {
    expect(billMonth("2026-10-03")).toBe("2026-09");
    expect(billMonth("2026-09-24")).toBe("2026-08");
    expect(billMonth("2027-01-05")).toBe("2026-12");
  });
});

describe("lastMonths", () => {
  it("gives the last n months, oldest first, across a year", () => {
    expect(lastMonths(3, "2027-02-10")).toEqual(["2026-12", "2027-01", "2027-02"]);
  });
});

describe("billsByCard", () => {
  it("keeps only expenses tagged with a card's bill, with the month they pay for", () => {
    const byCard = billsByCard(cards, [
      expense(1, "HDFC Regalia bill", 4000, "2026-10-02"),
      expense(2, "Food", 300, "2026-10-02"),
      expense(3, "SBI SimplyClick bill", 900, "2026-09-28"),
    ]);
    expect(byCard.get(1).map((b) => [b.id, b.month])).toEqual([[1, "2026-09"]]);
    expect(byCard.get(2).map((b) => [b.id, b.month])).toEqual([[3, "2026-09"]]);
  });
});

describe("compareMonths", () => {
  const spends = [
    { amount: 2000, date: "2026-09-04" },
    { amount: 1999.9, date: "2026-09-20" },
    { amount: 500, date: "2026-08-11" },
  ];
  const bills = [{ amount: 4000, month: "2026-09" }];

  it("puts logged spends and paid bills side by side, with paid − logged", () => {
    expect(compareMonths(["2026-08", "2026-09", "2026-10"], spends, bills)).toEqual([
      { month: "2026-08", logged: 500, paid: 0, difference: -500 },
      { month: "2026-09", logged: 3999.9, paid: 4000, difference: 0.1 },
      { month: "2026-10", logged: 0, paid: 0, difference: 0 },
    ]);
  });
});

describe("compareStatus", () => {
  it("explains the difference", () => {
    expect(compareStatus({ logged: 0, paid: 0, difference: 0 }).text).toBe("Nothing logged or paid");
    expect(compareStatus({ logged: 4000, paid: 4000, difference: 0 })).toMatchObject({ tone: "positive", text: "Matches" });
    expect(compareStatus({ logged: 4000, paid: 0, difference: -4000 }).text).toBe("Bill not paid yet");
    expect(compareStatus({ logged: 3250, paid: 4000, difference: 750 })).toMatchObject({ tone: "warning", amount: 750 });
    expect(compareStatus({ logged: 4000, paid: 3000, difference: -1000 })).toMatchObject({ text: "logged but not paid yet", amount: 1000 });
  });
});

describe("latestActiveMonth", () => {
  it("picks the newest month with activity, else the newest month", () => {
    const row = (month, logged, paid) => ({ month, logged, paid });
    expect(latestActiveMonth([row("2026-08", 5, 0), row("2026-09", 0, 5), row("2026-10", 0, 0)])).toBe("2026-09");
    expect(latestActiveMonth([row("2026-09", 0, 0), row("2026-10", 0, 0)])).toBe("2026-10");
    expect(latestActiveMonth([])).toBeNull();
  });
});
