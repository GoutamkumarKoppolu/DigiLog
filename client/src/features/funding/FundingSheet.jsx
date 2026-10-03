import { useEffect, useState } from "react";
import { HandCoins, PiggyBank } from "lucide-react";
import BottomSheet from "../../components/ui/BottomSheet";
import ErrorBanner from "../../components/ui/ErrorBanner";
import TagSuggestions from "../../components/ui/TagSuggestions";
import InfoButton from "../../components/ui/InfoButton";
import { currency } from "../../utils/format";
import { fetchFundingOptions, saveFunded } from "./api";
import { fundingProblem, restOf, splitWithPot } from "./domain";

const FORM_ID = "funding-form";

// Stacked on the add/edit sheet when a transaction needs more than the
// balance has: where the rest came from, a savings pot, borrowed money, or
// part from each. `data` is the filled-in transaction (with `type_kind`),
// `id` the one being edited, `short` what's missing, `balance` the balance.
export default function FundingSheet({ data, id, short, balance, onSaved, onClose }) {
  const [options, setOptions] = useState(null);
  const [pot, setPot] = useState("");
  const [fromSavings, setFromSavings] = useState("");
  const [person, setPerson] = useState("");
  const [borrowed, setBorrowed] = useState(String(short));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const excludePot = data.type_kind === "saving" ? data.tag : "";
  useEffect(() => {
    fetchFundingOptions(excludePot)
      .then(setOptions)
      .catch((e) => setError(e.message));
  }, [excludePot]);

  const pots = options?.pots ?? [];
  const potRemaining = pots.find((p) => p.tag === pot)?.remaining ?? 0;
  const split = { short, pot, potRemaining, fromSavings: Number(fromSavings) || 0, borrowed: Number(borrowed) || 0, person };
  const problem = fundingProblem(split);

  function pickPot(tag) {
    const next = tag === pot ? "" : tag;
    setPot(next);
    const amounts = splitWithPot(short, next ? pots.find((p) => p.tag === next).remaining : 0);
    setFromSavings(amounts.fromSavings ? String(amounts.fromSavings) : "");
    setBorrowed(amounts.borrowed ? String(amounts.borrowed) : "");
  }

  // Typing one amount fills in the other, so the two always add up.
  function typeSavings(value) {
    setFromSavings(value);
    const rest = restOf(short, value);
    setBorrowed(rest ? String(rest) : "");
  }

  function typeBorrowed(value) {
    setBorrowed(value);
    if (!pot) return;
    const rest = Math.min(restOf(short, value), potRemaining);
    setFromSavings(rest ? String(rest) : "");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (problem) return;
    try {
      setBusy(true);
      setError("");
      onSaved(await saveFunded(data, id, split));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const what = data.type_kind === "saving" ? "saving" : "expense";
  return (
    <BottomSheet
      title="Not enough balance"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Back
          </button>
          <button type="submit" form={FORM_ID} className="btn btn-primary btn-block" disabled={Boolean(problem) || busy}>
            {busy ? "Saving…" : id ? "Save changes" : `Add ${what}`}
          </button>
        </>
      }
    >
      <ErrorBanner message={error} />
      <p className="funding-lead">
        Your balance is <strong>{currency(balance)}</strong>, so {id ? "this change" : `this ${what}`} needs <strong>{currency(short)}</strong> more. Where did
        it come from? Split it between savings and borrowed money if you like. <InfoButton topic="balanceRule" />
      </p>

      <form autoComplete="off" id={FORM_ID} className="form" onSubmit={handleSubmit}>
        <div className="field">
          <span className="field-label funding-label">
            <PiggyBank size={16} aria-hidden="true" /> From savings
          </span>
          {pots.length ? (
            <div className="chip-group" role="radiogroup" aria-label="Savings pot">
              {pots.map((p) => (
                <button
                  type="button"
                  key={p.tag}
                  role="radio"
                  aria-checked={pot === p.tag}
                  className={`chip ${pot === p.tag ? "is-active" : ""}`}
                  onClick={() => pickPot(p.tag)}
                >
                  {p.tag} · {currency(p.remaining)}
                </button>
              ))}
            </div>
          ) : (
            <p className="field-hint">{options ? "No savings to use." : "Loading…"}</p>
          )}
          {pot && (
            <input
              className="input"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              aria-label={`Amount from ${pot}`}
              value={fromSavings}
              onChange={(e) => typeSavings(e.target.value)}
            />
          )}
        </div>

        <div className="field">
          <span className="field-label funding-label">
            <HandCoins size={16} aria-hidden="true" /> Borrowed
          </span>
          <div className="field-grid">
            <input
              className="input"
              placeholder="Borrowed from"
              aria-label="Borrowed from"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
            />
            <input
              className="input"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              aria-label="Amount borrowed"
              value={borrowed}
              onChange={(e) => typeBorrowed(e.target.value)}
            />
          </div>
          <TagSuggestions value={person} tags={options?.lenders ?? []} onPick={setPerson} label="People you borrowed from" />
        </div>
      </form>

      <p className={`funding-status ${problem ? "is-off" : "is-ok"}`} role="status">
        {problem || `Covered: ${currency(short)}. Your balance will be ${currency(Math.min(0, balance))} after this.`}
      </p>
      <p className="field-hint">
        Savings used here show in that pot's history, and borrowed money under Borrowed & lent so you can repay it. Delete this {what}{" "}
        later and they're removed with it.
      </p>
    </BottomSheet>
  );
}
