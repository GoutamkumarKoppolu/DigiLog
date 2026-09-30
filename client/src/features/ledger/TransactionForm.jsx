import { useState } from "react";
import Switch from "../../components/ui/Switch";
import InfoButton from "../../components/ui/InfoButton";
import TagSuggestions from "../../components/ui/TagSuggestions";
import { deductsFromBalance } from "../../domain/transactions";
import { today } from "../../utils/format";
import KindChips from "./KindChips";

const QUICK_TAG_COUNT = 8;

// `seed` carries the type and amount over when coming back from an extra
// entry (e.g. Repay) in the same sheet.
function initialForm(transaction, seed) {
  if (!transaction) {
    return {
      type: seed?.type || "",
      amount: seed?.amount || "",
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
// `extras` are more Type chips (e.g. Repay); picking one hands over to the
// sheet with the amount typed so far.
export default function TransactionForm(props) {
  const { id, transaction, transactionTypes, paymentMethods, paymentSources, existingTags, onSubmit, seed, extras = [], onPickExtra } = props;
  const [form, setForm] = useState(() => initialForm(transaction, seed));

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

      <KindChips
        types={transactionTypes}
        extras={extras}
        type={type}
        extra={null}
        onPickType={(name) => set("type", name)}
        onPickExtra={(extraId) => onPickExtra(extraId, form.amount)}
      />

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
