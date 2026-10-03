import { useState } from "react";
import { Plus, X } from "lucide-react";
import BottomSheet from "../../components/ui/BottomSheet";
import ErrorBanner from "../../components/ui/ErrorBanner";
import InfoButton from "../../components/ui/InfoButton";
import TagSuggestions from "../../components/ui/TagSuggestions";
import { useLedger } from "../ledger";
import { useMonthPlan } from "../recurring";
import { currency, monthLabel } from "../../utils/format";
import { savePlan } from "./api";
import { planProblem, sameTag } from "./domain";
import { useSpendingPlan } from "./useSpendingPlan";

const FORM_ID = "spending-plan-form";

// Split the usable balance across tags for the month on show. Last month's
// tags are offered as chips; any tag can be added. Saving replaces the plan.
export default function PlanSheet({ onClose }) {
  const plan = useSpendingPlan();
  const glance = useMonthPlan();
  const ready = plan && glance;
  return (
    <BottomSheet title={plan ? `Set money aside · ${monthLabel(plan.month).split(" ")[0]}` : "Set money aside"} onClose={onClose}
      footer={
        <button type="submit" form={FORM_ID} className="btn btn-primary btn-block" disabled={!ready}>
          Save
        </button>
      }
    >
      {ready ? <PlanForm plan={plan} usable={glance.usableBalance} onSaved={onClose} /> : <p className="muted">Loading…</p>}
    </BottomSheet>
  );
}

// Mounted once the plan has loaded, so the rows start from it.
function PlanForm({ plan, usable, onSaved }) {
  const { tags, refresh } = useLedger();
  const [rows, setRows] = useState(() => plan.rows.map((r) => ({ tag: r.tag, amount: String(r.amount) })));
  const [tag, setTag] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const spentOn = (t) => plan.rows.find((r) => sameTag(r.tag, t))?.spent ?? 0;
  const inPlan = (t) => rows.some((r) => sameTag(r.tag, t));
  // Money still set aside once this is saved: each tag's amount minus what's
  // already been spent on it this month.
  const setAside = rows.reduce((sum, r) => sum + Math.max(0, (Number(r.amount) || 0) - spentOn(r.tag)), 0);
  const free = usable - setAside;

  function add(newTag, newAmount) {
    const t = newTag.trim();
    if (!t) return setError("Type a tag to add");
    if (inPlan(t)) return setError(`"${t}" is already in the plan`);
    setError("");
    setRows([...rows, { tag: t, amount: newAmount ? String(newAmount) : "" }]);
    setTag("");
    setAmount("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const problem = planProblem(rows);
    if (problem) return setError(problem);
    try {
      await savePlan(plan.month, rows);
      refresh();
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  }

  const lastMonth = plan.previous.filter((p) => !inPlan(p.tag));
  return (
    <form autoComplete="off" id={FORM_ID} className="form" onSubmit={handleSubmit}>
      <ErrorBanner message={error} />
      <p className="funding-lead">
        Split your usable balance across tags like Bills or Shopping. Expenses with those tags fill their bar on Home; whatever isn&apos;t
        set aside is your free money. <InfoButton topic="spendingPlan" />
      </p>

      <div className="card card-list backup-counts">
        <div className="backup-count-row">
          <span>Usable balance</span>
          <strong>{currency(usable)}</strong>
        </div>
        <div className="backup-count-row">
          <span>Set aside</span>
          <strong>−{currency(setAside)}</strong>
        </div>
        <div className="backup-count-row">
          <span>Free money</span>
          <strong className={free < 0 ? "text-negative" : "text-positive"}>{currency(free)}</strong>
        </div>
      </div>
      {free < 0 && <p className="field-hint text-negative">You&apos;ve set aside {currency(-free)} more than you have.</p>}

      {rows.length > 0 && (
        <div className="card card-list">
          {rows.map((r, i) => (
            <div className="plan-edit-row" key={r.tag}>
              <span className="tx-main">
                <span className="tx-title">{r.tag}</span>
                {spentOn(r.tag) > 0 && <span className="tx-sub">{currency(spentOn(r.tag))} spent</span>}
              </span>
              <input
                className="input plan-edit-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                aria-label={`Amount for ${r.tag}`}
                value={r.amount}
                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))}
              />
              <button type="button" className="icon-btn icon-btn-danger" aria-label={`Remove ${r.tag}`} onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {lastMonth.length > 0 && (
        <div className="field">
          <span className="field-label">From last month</span>
          <div className="chip-group">
            {lastMonth.map((p) => (
              <button type="button" key={p.tag} className="chip" onClick={() => add(p.tag, p.amount)}>
                <Plus size={14} /> {p.tag} · {currency(p.amount)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <span className="field-label">Add a tag</span>
        <div className="plan-add-row">
          <input className="input" placeholder="e.g. Bills" aria-label="Tag" value={tag} onChange={(e) => setTag(e.target.value)} />
          <input
            className="input plan-edit-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="₹"
            aria-label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button type="button" className="icon-btn plan-add-btn" aria-label="Add tag" onClick={() => add(tag, amount)}>
            <Plus size={20} />
          </button>
        </div>
        <TagSuggestions value={tag} tags={tags.filter((t) => !inPlan(t))} onPick={setTag} label="Your tags" />
      </div>
    </form>
  );
}
