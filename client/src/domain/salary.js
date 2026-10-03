// Pure rules about the salary: which earning is the salary, and which month's
// bills it pays. Core rules (not one feature's): Recurring, the spending plan
// and the Report all count a salary the same way.
import { shiftMonth } from "../utils/format";

export const SALARY_TAG = "salary";

// An earning tagged "Salary" (any case).
export const isSalary = (t) => t.type_kind === "earning" && String(t.tag).trim().toLowerCase() === SALARY_TAG;

// A month's work is paid at its end (or early the next month), and that
// salary pays the NEXT month's bills: September's EMIs come out of the salary
// received on 31 Aug or in the first days of September. So a salary dated on
// or after this day pays for the next month, one before it for its own month
// (30 Sep and 3 Oct both pay October's payments). Same day as the credit
// card bill cutoff.
export const SALARY_CUTOFF_DAY = 25;

// The month ("YYYY-MM") whose bills a salary dated `date` pays.
export const salaryMonth = (date) =>
  Number(date.slice(8, 10)) >= SALARY_CUTOFF_DAY ? shiftMonth(date.slice(0, 7), 1) : date.slice(0, 7);

// Months whose salary has been added.
export const salaryMonths = (transactions) => new Set(transactions.filter(isSalary).map((t) => salaryMonth(t.date)));

// The month to show: next month as soon as its salary is in (e.g. on 30 Sep,
// October), otherwise this month.
export function planMonth(salarySet, today) {
  const next = shiftMonth(today.slice(0, 7), 1);
  return salarySet.has(next) ? next : today.slice(0, 7);
}
