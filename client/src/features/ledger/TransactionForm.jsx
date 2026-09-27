import { useState } from "react";
import Switch from "../../components/ui/Switch";
import InfoButton from "../../components/ui/InfoButton";
import TagSuggestions from "../../components/ui/TagSuggestions";
import { deductsFromBalance } from "../../domain/transactions";
import { today } from "../../utils/format";

const QUICK_TAG_COUNT = 8;

function initialForm(transaction) {
  if (!transaction) {
    return {
      type: "",
      amount: "",
      tag: "",
      payment_method: "",
      payment_source: "",
      date: today(),
      note: "",
      deduct_from_balance: true,
    };
  }
  return {
    type: transaction.type,
    amount: transaction.amount,
    tag: transaction.tag,
    payment_method: transaction.payment_method || "",
    payment_source: transaction.payment_source || "",
    date: transaction.date.slice(0, 10),
    note: transaction.note || "",
    deduct_from_balance: deductsFromBalance(transaction),
  };
}

// Add/edit form. Mounted fresh for each sheet, so it initialises from props
// once. Submitted by the sheet's footer button via the `id`/`form` attribute.
export default function TransactionForm({ id, transaction, transactionTypes, paymentMethods, paymentSources, existingTags, onSubmit }) {
  const [form, setForm] = useState(() => initialForm(transaction));

  // Default to "expense" (the most common entry), else the first type.
  const defaultType = (transactionTypes.find((t) => t.name === "expense") || transactionTypes[0])?.name || "";
  const type = form.type || defaultType;
  const isSavingType = transactionTypes.find((t) => t.name === type)?.kind === "saving";

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const handleChange = (e) => set(e.target.name, e.target.value);

  async function handleSubmit(e) {
    e.preventDefault();
    await onSubmit({ ...form, type, amount: Number(form.amount) });
  }

  return (
    <form autoComplete="off" id={id} className="form" onSubmit={handleSubmit}>
      <label className="amount-field">
        <span className="field-label">Amount</span>
        <span className="amount-input">
          <span className="amount-prefix">₹</span>
          <input
            type="number"
            name="amount"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={handleChange}
            required
            autoFocus={!transaction}
          />
        </span>
      </label>

      <div className="field">
        <span className="field-label">Type</span>
        <div className="chip-group" role="radiogroup" aria-label="Type">
          {transactionTypes.map((t) => (
            <button
              type="button"
              key={t.id}
              role="radio"
              aria-checked={type === t.name}
              className={`chip ${type === t.name ? "is-active" : ""}`}
              onClick={() => set("type", t.name)}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {isSavingType && (
        <Switch
          name="deduct_from_balance"
          checked={form.deduct_from_balance}
          onChange={(checked) => set("deduct_from_balance", checked)}
          label="Deduct from current balance"
          info="balanceDeduction"
          description="Turn off for money that didn't come from your balance, e.g. a gift."
        />
      )}

      <label className="field" htmlFor="tx-tag">
        <span className="field-label">
          Tag / Category <InfoButton topic="tags" />
        </span>
        <input
          id="tx-tag"
          type="text"
          name="tag"
          className="input"
          placeholder="e.g. Shopping, Salary, Food"
          value={form.tag}
          onChange={handleChange}
          required
        />
      </label>
      <TagSuggestions value={form.tag} tags={existingTags} onPick={(t) => set("tag", t)} limit={QUICK_TAG_COUNT} label="Recent tags" />

      <div className="field-grid">
        <label className="field">
          <span className="field-label">Date</span>
          <input type="date" name="date" className="input" value={form.date} onChange={handleChange} required />
        </label>
        <label className="field">
          <span className="field-label">Note</span>
          <input type="text" name="note" className="input" placeholder="Optional" value={form.note} onChange={handleChange} />
        </label>
        <label className="field">
          <span className="field-label">Payment method</span>
          <select name="payment_method" className="input" value={form.payment_method} onChange={handleChange}>
            <option value="">None</option>
            {paymentMethods.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Payment source</span>
          <select name="payment_source" className="input" value={form.payment_source} onChange={handleChange}>
            <option value="">None</option>
            {paymentSources.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </form>
  );
}
