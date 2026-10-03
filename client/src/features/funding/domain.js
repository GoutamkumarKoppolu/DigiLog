// Pure rules for covering a shortfall: when an expense (or a saving that
// deducts from the balance) needs more than the balance has, the missing
// amount comes from a savings pot, from borrowed money, or part from each.
// Together they must cover exactly what's missing, so every rupee is
// accounted for.

import { currency } from "../../utils/format";

const toPaise = (n) => Math.round((Number(n) || 0) * 100);
const fromPaise = (p) => p / 100;

// Picking a pot: take what it can give (up to the shortfall), borrow the rest.
export function splitWithPot(short, potRemaining) {
  const fromSavings = Math.min(toPaise(short), Math.max(0, toPaise(potRemaining)));
  return { fromSavings: fromPaise(fromSavings), borrowed: fromPaise(toPaise(short) - fromSavings) };
}

// The other amount after one was typed, never below zero.
export const restOf = (short, typed) => fromPaise(Math.max(0, toPaise(short) - toPaise(typed)));

// > 0: still to cover; < 0: more than needed; 0: exactly covered.
export const uncovered = (short, fromSavings, borrowed) =>
  fromPaise(toPaise(short) - toPaise(fromSavings) - toPaise(borrowed));

// What's wrong with a split, or "" when it can be saved.
export function fundingProblem({ short, pot, potRemaining, fromSavings, borrowed, person }) {
  if (toPaise(fromSavings) < 0 || toPaise(borrowed) < 0) return "Amounts can't be negative";
  if (toPaise(fromSavings) > 0 && !pot) return "Pick the savings pot";
  if (toPaise(fromSavings) > toPaise(potRemaining)) return `Only ${currency(potRemaining)} is left in "${pot}"`;
  if (toPaise(borrowed) > 0 && !String(person ?? "").trim()) return "Who did you borrow from?";
  const left = uncovered(short, fromSavings, borrowed);
  if (left > 0) return `${currency(left)} still to cover`;
  if (left < 0) return `${currency(-left)} more than needed`;
  return "";
}
