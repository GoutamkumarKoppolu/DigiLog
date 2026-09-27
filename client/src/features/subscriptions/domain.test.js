import { describe, expect, it } from "vitest";
import {
  REMINDER_ID_BASE,
  byCategory,
  dateFor,
  daysBetween,
  nextRenewal,
  renewalLabel,
  renewalsFrom,
  summarize,
  suggestions,
  upcomingReminders,
} from "./domain";

const sub = (extra = {}) => ({
  id: 1,
  name: "Netflix",
  amount: 649,
  cycle: "monthly",
  day: 5,
  month: null,
  payment_method: "HDFC card",
  category: "Entertainment",
  trial_end: null,
  remind: "1",
  cancelled_at: null,
  created_at: "2026-09-01T00:00:00.000Z",
  ...extra,
});

describe("renewal dates", () => {
  it("uses the month's last day when it's shorter", () => {
    expect(dateFor(2026, 9, 31)).toBe("2026-09-30");
    expect(dateFor(2027, 2, 29)).toBe("2027-02-28");
    expect(dateFor(2028, 2, 29)).toBe("2028-02-29");
  });

  it("monthly: this month if the day is today or later, else next month", () => {
    expect(nextRenewal(sub(), "2026-10-03")).toBe("2026-10-05");
    expect(nextRenewal(sub(), "2026-10-05")).toBe("2026-10-05");
    expect(nextRenewal(sub(), "2026-10-06")).toBe("2026-11-05");
    expect(nextRenewal(sub(), "2026-12-20")).toBe("2027-01-05");
    expect(nextRenewal(sub({ day: 31 }), "2026-11-01")).toBe("2026-11-30");
  });

  it("yearly: this year's date if it's still ahead, else next year's", () => {
    const prime = sub({ cycle: "yearly", month: 3, day: 14, amount: 1499 });
    expect(nextRenewal(prime, "2026-10-01")).toBe("2027-03-14");
    expect(nextRenewal(prime, "2027-03-14")).toBe("2027-03-14");
    expect(renewalsFrom(sub({ cycle: "yearly", month: 2, day: 29 }), "2026-10-01", 3)).toEqual(["2027-02-28", "2028-02-29", "2029-02-28"]);
  });

  it("a running trial's end is the first charge, then the regular dates after it", () => {
    const trial = sub({ trial_end: "2026-10-12" });
    expect(renewalsFrom(trial, "2026-10-01", 3)).toEqual(["2026-10-12", "2026-11-05", "2026-12-05"]);
    expect(nextRenewal(trial, "2026-10-13")).toBe("2026-11-05");
  });

  it("doesn't renew again right after a trial's first charge", () => {
    // Trial ends the 4th, monthly day is the 5th: next is 5 Nov, not 5 Oct.
    expect(renewalsFrom(sub({ trial_end: "2026-10-04" }), "2026-10-01", 3)).toEqual(["2026-10-04", "2026-11-05", "2026-12-05"]);
    // Trial ends the 9th, monthly day is the 8th: a full month later is fine.
    expect(renewalsFrom(sub({ day: 8, trial_end: "2026-10-09" }), "2026-10-01", 2)).toEqual(["2026-10-09", "2026-11-08"]);
    // Yearly: a trial ending 1 Mar with a 14 Mar renewal next charges the year after.
    const prime = sub({ cycle: "yearly", month: 3, day: 14, trial_end: "2027-03-01" });
    expect(renewalsFrom(prime, "2027-02-01", 2)).toEqual(["2027-03-01", "2028-03-14"]);
    // No extra reminder for a charge that isn't happening.
    const r = upcomingReminders([sub({ trial_end: "2026-10-04" })], "2026-10-03T10:00", { perSub: 1 });
    expect(r.map((x) => x.at)).toEqual(["2026-11-04T09:00"]);
  });

  it("counts days and labels them", () => {
    expect(daysBetween("2026-10-30", "2026-11-02")).toBe(3);
    expect(renewalLabel(sub(), "2026-10-05")).toBe("Renews today");
    expect(renewalLabel(sub(), "2026-10-04")).toBe("Renews tomorrow");
    expect(renewalLabel(sub(), "2026-10-01")).toBe("Renews in 4 days");
    expect(renewalLabel(sub({ trial_end: "2026-10-10" }), "2026-10-06")).toBe("Trial ends in 4 days");
  });
});

describe("totals", () => {
  const subs = [
    sub({ id: 1, name: "Netflix", amount: 649, day: 5 }),
    sub({ id: 2, name: "Spotify", amount: 119, day: 20, category: "Music" }),
    sub({ id: 3, name: "Prime", cycle: "yearly", month: 3, day: 14, amount: 1500, category: "Shopping" }),
    sub({ id: 4, name: "YouTube", amount: 149, day: 8, trial_end: "2026-10-09", category: "Entertainment" }),
    sub({ id: 5, name: "Hotstar", amount: 299, day: 2, cancelled_at: "2026-09-15" }),
  ];
  const s = summarize(subs, "2026-10-03");

  it("totals what's being paid for, a month and a year (yearly spread over months)", () => {
    expect(s.totals).toMatchObject({ monthly: 649 + 119 + 125, yearly: 649 * 12 + 119 * 12 + 1500, activeCount: 4, trialCount: 1 });
  });

  it("splits renewing soon (7 days) from later, and keeps cancelled apart", () => {
    expect(s.soon.map((x) => [x.name, x.next])).toEqual([
      ["Netflix", "2026-10-05"],
      ["YouTube", "2026-10-09"],
    ]);
    expect(s.later.map((x) => x.name)).toEqual(["Spotify", "Prime"]);
    expect(s.cancelled.map((x) => x.name)).toEqual(["Hotstar"]);
    expect(s.totals).toMatchObject({ soonCount: 2, soonAmount: 649 + 149 });
  });

  it("breaks the monthly cost down by category", () => {
    expect(byCategory(subs, "2026-10-03")).toEqual([
      { category: "Entertainment", count: 1, monthly: 649 },
      { category: "Shopping", count: 1, monthly: 125 },
      { category: "Music", count: 1, monthly: 119 },
    ]);
  });

  it("suggests the most used values first, then presets", () => {
    expect(suggestions(["UPI", "Card", "UPI", "", null], ["Cash", "UPI"])).toEqual(["UPI", "Card", "Cash"]);
  });
});

describe("reminders", () => {
  it("schedules the next few at 9 AM, the chosen days before, with stable ids", () => {
    const r = upcomingReminders([sub()], "2026-10-01T12:00", { perSub: 3 });
    expect(r.map((x) => [x.id, x.at, x.title, x.body])).toEqual([
      [REMINDER_ID_BASE + 10, "2026-10-04T09:00", "Netflix renews tomorrow", "₹649 · HDFC card"],
      [REMINDER_ID_BASE + 11, "2026-11-04T09:00", "Netflix renews tomorrow", "₹649 · HDFC card"],
      [REMINDER_ID_BASE + 12, "2026-12-04T09:00", "Netflix renews tomorrow", "₹649 · HDFC card"],
      [REMINDER_ID_BASE + 13, "2027-01-04T09:00", "Netflix renews tomorrow", "₹649 · HDFC card"],
    ]);
  });

  it("skips reminders whose time has passed", () => {
    const r = upcomingReminders([sub({ remind: "0" })], "2026-10-05T10:00", { perSub: 1 });
    expect(r.map((x) => x.at)).toEqual(["2026-11-05T09:00"]);
  });

  it("warns the day before a trial ends, even with reminders off", () => {
    const r = upcomingReminders([sub({ remind: "off", trial_end: "2026-10-12" })], "2026-10-01T08:00");
    expect(r.map((x) => [x.at, x.title])).toEqual([["2026-10-11T09:00", "Netflix trial ends tomorrow"]]);
  });

  it("has nothing for cancelled subscriptions", () => {
    expect(upcomingReminders([sub({ cancelled_at: "2026-09-30" })], "2026-10-01T08:00")).toEqual([]);
  });
});
