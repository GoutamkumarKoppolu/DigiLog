// Saving an expense (or a saving that deducts from the balance) together with
// the money that covers what the balance couldn't: a savings pot moved into
// the balance and/or money borrowed into it. All of it is one change, so it
// saves completely or not at all.
import { balanceMessage, createTransaction, shortfallFor, updateTransaction, withBalanceCheck } from "../../api";
import { createWithdrawal, fetchPots } from "../savings";
import { createRecord, fetchLenders } from "../borrowing";
import { fundingProblem } from "./domain";

// Pots with money in them (not the one being saved into), and people money
// was borrowed from before.
export async function fetchFundingOptions(excludePot = "") {
  const [pots, lenders] = await Promise.all([fetchPots(), fetchLenders()]);
  return { pots: pots.filter((p) => p.remaining > 0.004 && p.tag !== excludePot), lenders };
}

// `id` set = editing that transaction. split: { pot, fromSavings, person, borrowed }.
export async function saveFunded(data, id, { pot, fromSavings, person, borrowed }) {
  const short = await shortfallFor(data, id);
  const { pots } = await fetchFundingOptions();
  const potRemaining = pots.find((p) => p.tag === pot)?.remaining ?? 0;
  const problem = fundingProblem({ short, pot, potRemaining, fromSavings, borrowed, person });
  if (problem) throw new Error(problem);

  const note = `For ${data.tag}`;
  return withBalanceCheck(
    async () => {
      const row = id ? await updateTransaction(id, data) : await createTransaction(data);
      const link = { date: data.date, note, transaction_id: row.id };
      if (fromSavings > 0) await createWithdrawal({ ...link, tag: pot, amount: fromSavings, to_balance: true });
      if (borrowed > 0) await createRecord("borrowed", { ...link, person, amount: borrowed, linked_to: "balance" });
      return row;
    },
    (ctx) => `${balanceMessage(ctx)} Something changed while you were filling this in. Close it and try again.`
  );
}
