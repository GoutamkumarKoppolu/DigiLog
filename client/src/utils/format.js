// Shared formatting and date helpers. Dates are always local-time
// "YYYY-MM-DD" / "YYYY-MM" strings (see CLAUDE.md data conventions).

const LOCALE = "en-IN";

const inr = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const currency = (n) => inr.format(Number(n) || 0);

const inrCompact = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "INR",
  notation: "compact",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// Full amount below ₹1 lakh, else lakh/crore shorthand (₹12.35L, ₹9.88Cr)
// for tight spaces like stat cards.
export const compactCurrency = (n) => (Math.abs(Number(n) || 0) < 100000 ? currency(n) : inrCompact.format(Number(n)));

// "₹87,457.85" -> { whole: "₹87,457", fraction: ".85" } for large display figures.
export function splitCurrency(n) {
  const text = currency(n);
  const dot = text.lastIndexOf(".");
  return dot === -1 ? { whole: text, fraction: "" } : { whole: text.slice(0, dot), fraction: text.slice(dot) };
}

const pad2 = (n) => String(n).padStart(2, "0");

// Local "YYYY-MM-DD" for a Date or ISO timestamp. Never slice an ISO string
// for this: that's the UTC date, which is yesterday before 05:30 in IST.
export const localDate = (value = new Date()) => {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

export const today = () => localDate();

// Option names for display: first letter upper-cased, the rest kept
// ("expense" → "Expense"). Not for free text like tags ("iCloud").
export const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const currentMonth = () => today().slice(0, 7);

const monthDate = (ym) => new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1);

export const monthLabel = (ym, month = "long") =>
  monthDate(ym).toLocaleString(LOCALE, { month, year: "numeric" });

export function shiftMonth(ym, delta) {
  const d = monthDate(ym);
  d.setMonth(d.getMonth() + delta);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

// Short human label for a set of "YYYY-MM" filters.
export function periodLabel(months) {
  if (!months.length) return "All time";
  if (months.length === 1) return monthLabel(months[0]);
  const years = [...new Set(months.map((m) => m.slice(0, 4)))];
  if (years.length === 1 && months.length === 12) return years[0];
  return `${months.length} months`;
}

export const dateHeading = (date) =>
  new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))).toLocaleDateString(
    LOCALE,
    { weekday: "long", day: "numeric", month: "long", year: "numeric" }
  );

// "24 Sept" style date for compact rows.
export const shortDate = (date) =>
  new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))).toLocaleDateString(
    LOCALE,
    { day: "numeric", month: "short" }
  );

// Groups date-sorted rows into [{ date, rows }] preserving order.
export function groupByDate(rows) {
  const groups = [];
  rows.forEach((row) => {
    const date = row.date.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.rows.push(row);
    else groups.push({ date, rows: [row] });
  });
  return groups;
}

// "820 KB", "4.2 MB" for file sizes.
export function fileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
