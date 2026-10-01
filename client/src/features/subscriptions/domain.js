// Pure rules for subscriptions tracked by hand. Nothing here touches the
// ledger: these are for keeping an eye on what renews when, what it costs a
// month and a year, and when to remind.

export const CYCLES = { monthly: "Monthly", yearly: "Yearly" };
export const REMIND_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "0", label: "On the day" },
  { value: "1", label: "1 day before" },
  { value: "3", label: "3 days before" },
];
export const SOON_DAYS = 7;
export const REMIND_HOUR = 9;
export const CATEGORY_PRESETS = ["Entertainment", "Music", "Cloud & storage", "Software", "News & reading", "Fitness", "Food", "Shopping"];

const toPaise = (n) => Math.round(Number(n) * 100);
const fromPaise = (p) => p / 100;
const pad2 = (n) => String(n).padStart(2, "0");

const lastDay = (year, month) => new Date(year, month, 0).getDate();

// "YYYY-MM-DD" for a day in a month, using the month's last day when it's
// shorter (the 31st in September, 29 Feb in a normal year).
export const dateFor = (year, month, day) => `${year}-${pad2(month)}-${pad2(Math.min(day, lastDay(year, month)))}`;

const parts = (date) => [Number(date.slice(0, 4)), Number(date.slice(5, 7)), Number(date.slice(8, 10))];

function plusDays(date, n) {
  const [y, m, d] = parts(date);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

export function daysBetween(from, to) {
  const [y1, m1, d1] = parts(from);
  const [y2, m2, d2] = parts(to);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export const isCancelled = (s) => Boolean(s.cancelled_at);
export const onTrial = (s, today) => Boolean(s.trial_end) && s.trial_end >= today;

// After a trial's first charge, regular dates closer than half a cycle are
// skipped, so a trial ending on the 4th with a monthly day of the 5th renews
// next on the 5th of the following month, not the next day.
const GAP_DAYS = { monthly: 15, yearly: 183 };

// Charge dates from `from` onwards (inclusive), in order: the trial's end
// first while a trial is running, then the regular monthly/yearly dates.
export function renewalsFrom(s, from, count = 1) {
  const out = [];
  let [y, m] = parts(from);
  const trialRunning = s.trial_end && s.trial_end >= from;
  if (trialRunning) out.push(s.trial_end);
  const after = trialRunning ? plusDays(s.trial_end, GAP_DAYS[s.cycle] - 1) : null;
  if (s.cycle === "yearly") {
    for (let year = y; out.length < count; year++) {
      const d = dateFor(year, s.month, s.day);
      if (d >= from && (!after || d > after)) out.push(d);
    }
  } else {
    while (out.length < count) {
      const d = dateFor(y, m, s.day);
      if (d >= from && (!after || d > after)) out.push(d);
      m += 1;
      if (m === 13) {
        m = 1;
        y += 1;
      }
    }
  }
  return out.slice(0, count);
}

export const nextRenewal = (s, today) => renewalsFrom(s, today, 1)[0];

export const monthlyCost = (s) => (s.cycle === "yearly" ? s.amount / 12 : s.amount);
export const yearlyCost = (s) => (s.cycle === "yearly" ? s.amount : s.amount * 12);

// "Renews tomorrow", "Renews in 3 days", "Trial ends in 4 days"…
export function renewalLabel(s, today) {
  const next = nextRenewal(s, today);
  const days = daysBetween(today, next);
  const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
  return onTrial(s, today) ? `Trial ends ${when}` : `Renews ${when}`;
}

// Active subscriptions by next date, split into renewing soon and later, with
// totals over the ones being paid for (trials aren't costing anything yet).
export function summarize(subs, today) {
  const withNext = subs.map((s) => ({ ...s, next: isCancelled(s) ? null : nextRenewal(s, today) }));
  const active = withNext.filter((s) => !isCancelled(s)).sort((a, b) => a.next.localeCompare(b.next) || a.name.localeCompare(b.name));
  const paying = active.filter((s) => !onTrial(s, today));
  const soon = active.filter((s) => daysBetween(today, s.next) <= SOON_DAYS);
  const monthlyPaise = paying.reduce((sum, s) => sum + toPaise(monthlyCost(s)), 0);
  const yearlyPaise = paying.reduce((sum, s) => sum + toPaise(yearlyCost(s)), 0);
  // A trial ending soon counts too: its end is the first charge.
  const soonPaise = soon.reduce((sum, s) => sum + toPaise(s.amount), 0);
  return {
    soon,
    later: active.filter((s) => daysBetween(today, s.next) > SOON_DAYS),
    cancelled: withNext.filter(isCancelled).sort((a, b) => b.cancelled_at.localeCompare(a.cancelled_at)),
    totals: {
      monthly: fromPaise(monthlyPaise),
      yearly: fromPaise(yearlyPaise),
      activeCount: active.length,
      trialCount: active.length - paying.length,
      soonCount: soon.length,
      soonAmount: fromPaise(soonPaise),
    },
  };
}

// Monthly cost per category (paid subscriptions only), biggest first.
export function byCategory(subs, today) {
  const map = new Map();
  subs
    .filter((s) => !isCancelled(s) && !onTrial(s, today))
    .forEach((s) => {
      const key = s.category || "Other";
      const c = map.get(key) || { category: key, count: 0, paise: 0 };
      c.count += 1;
      c.paise += toPaise(monthlyCost(s));
      map.set(key, c);
    });
  return [...map.values()]
    .map((c) => ({ category: c.category, count: c.count, monthly: fromPaise(c.paise) }))
    .sort((a, b) => b.monthly - a.monthly || a.category.localeCompare(b.category));
}

// Distinct non-empty values, most used first (for suggestion chips).
export function suggestions(values, extra = []) {
  const counts = new Map();
  values.filter(Boolean).forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  const used = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([v]) => v);
  return [...used, ...extra.filter((e) => !counts.has(e))];
}

// ---------- reminders ----------

// Notification ids live in their own range so other features can use theirs.
export const REMINDER_ID_BASE = 1_000_000;
const PER_SUB = 10;

const minusDays = (date, n) => plusDays(date, -n);

// The next few reminders for every active subscription with reminders on:
// [{ id, at: "YYYY-MM-DDTHH:MM", title, body }], only ones still ahead of `now`
// ("YYYY-MM-DDTHH:MM", local time). A running trial also gets a heads-up the
// day before it ends. Scheduling a few ahead covers months when the app isn't
// opened; they're rescheduled every time it is.
export function upcomingReminders(subs, now, { perSub = 3, formatAmount = (n) => `₹${n}` } = {}) {
  const today = now.slice(0, 10);
  const at = (date) => `${date}T${pad2(REMIND_HOUR)}:00`;
  const out = [];
  subs
    .filter((s) => !isCancelled(s))
    .forEach((s) => {
      let k = 0;
      const push = (date, title, body) => {
        if (at(date) > now && k < PER_SUB) out.push({ id: REMINDER_ID_BASE + s.id * PER_SUB + k++, at: at(date), title, body, subscriptionId: s.id });
      };
      const paidWith = s.payment_method ? ` · ${s.payment_method}` : "";
      if (onTrial(s, today)) {
        push(minusDays(s.trial_end, 1), `${s.name} trial ends tomorrow`, `Then ${formatAmount(s.amount)} ${s.cycle === "yearly" ? "a year" : "a month"}. Cancel today if you don't want it.`);
      }
      if (s.remind === "off" || s.remind == null) return;
      const before = Number(s.remind);
      const when = before === 0 ? "today" : before === 1 ? "tomorrow" : `in ${before} days`;
      renewalsFrom(s, today, perSub + 1).forEach((date) => {
        const isTrialEnd = s.trial_end && date === s.trial_end && onTrial(s, today);
        const title = isTrialEnd ? `${s.name}: first charge ${when}` : `${s.name} renews ${when}`;
        push(minusDays(date, before), title, `${formatAmount(s.amount)}${paidWith}`);
      });
    });
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

// ---------- charged to a credit card ----------

// The dates a subscription charges in a month ("YYYY-MM"): a monthly one
// once, a yearly one only in its month, a trial only once it ends. Cancelled
// ones charge nothing.
export function chargesInMonth(s, month) {
  if (isCancelled(s)) return [];
  return renewalsFrom(s, `${month}-01`, 3).filter((d) => d.startsWith(month));
}

// This month's estimated bill per card from the subscriptions charged to it:
// Map card id → { amount, count }.
export function cardEstimates(subs, month) {
  const out = new Map();
  subs
    .filter((s) => s.card_id != null)
    .forEach((s) => {
      const n = chargesInMonth(s, month).length;
      if (!n) return;
      const e = out.get(s.card_id) || { paise: 0, count: 0 };
      e.paise += toPaise(s.amount) * n;
      e.count += 1;
      out.set(s.card_id, e);
    });
  return new Map([...out].map(([id, e]) => [id, { amount: fromPaise(e.paise), count: e.count }]));
}
