import { useState } from "react";
import SegmentedControl from "../../components/ui/SegmentedControl";
import Switch from "../../components/ui/Switch";
import TagSuggestions from "../../components/ui/TagSuggestions";

const KIND_OPTIONS = [
  { value: "expense", label: "Expense" },
  { value: "saving", label: "Saving" },
];

const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

// Add or edit a recurring payment. `item` + `prog` prefill an edit, with the
// pending balance and payments left shown as what's left now. Submitted by
// the sheet's footer button via the `id`/`form` attribute.
export default function RecurringForm({ id, item, prog, tags, paymentMethods, paymentSources, onSubmit }) {
  const [form, setForm] = useState(() => ({
    name: item?.name ?? "",
    kind: item?.kind ?? "expense",
    amount: item ? String(item.amount) : "",
    tag: item?.tag ?? "",
    day: item ? String(item.day) : "",
    payment_method: item?.payment_method ?? "",
    payment_source: item?.payment_source ?? "",
    deduct_from_balance: item?.deduct_from_balance !== false,
    pending: prog?.remaining != null ? String(prog.remaining) : "",
    left: prog?.left != null ? String(prog.left) : "",
  }));
  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const handleChange = (e) => set(e.target.name, e.target.value);
  const day = Number(form.day);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ ...form, amount: Number(form.amount), day });
  }

  return (
    <form autoComplete="off" id={id} className="form" onSubmit={handleSubmit}>
      <label className="field">
        <span className="field-label">Name</span>
        <input
          className="input"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="e.g. Home loan EMI, Rent, SIP"
          enterKeyHint="next"
          autoFocus={!item}
          required
        />
      </label>

      <SegmentedControl label="Type" options={KIND_OPTIONS} value={form.kind} onChange={(v) => set("kind", v)} />

      <label className="amount-field">
        <span className="field-label">Every month</span>
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
          />
        </span>
      </label>

      <div className="field-grid">
        <label className="field">
          <span className="field-label">Tag</span>
          <input
            className="input"
            name="tag"
            value={form.tag}
            onChange={handleChange}
            placeholder="e.g. Home loan"
            enterKeyHint="next"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Day of month</span>
          <input
            className="input"
            type="number"
            name="day"
            inputMode="numeric"
            min="1"
            max="31"
            step="1"
            value={form.day}
            onChange={handleChange}
            placeholder="1–31"
            required
          />
        </label>
      </div>
      <TagSuggestions value={form.tag} tags={tags} onPick={(t) => set("tag", t)} />
      {day >= 1 && day <= 31 && (
        <span className="field-hint recurring-day-hint">
          On the {ordinal(day)} of every month{day > 28 ? " (or the month's last day)" : ""}, once that month's Salary is added.
        </span>
      )}

      {form.kind === "saving" && (
        <Switch
          name="deduct_from_balance"
          checked={form.deduct_from_balance}
          onChange={(checked) => set("deduct_from_balance", checked)}
          label="Deduct from current balance"
          info="balanceDeduction"
          description="Turn off if this saving doesn't come out of your balance."
        />
      )}

      <div className="field-grid">
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

      <div className="field-grid">
        <label className="field">
          <span className="field-label">Pending balance</span>
          <input
            className="input"
            type="number"
            name="pending"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={form.pending}
            onChange={handleChange}
            placeholder="Optional"
          />
        </label>
        <label className="field">
          <span className="field-label">Payments left</span>
          <input
            className="input"
            type="number"
            name="left"
            inputMode="numeric"
            min="0"
            step="1"
            value={form.left}
            onChange={handleChange}
            placeholder="Optional"
          />
        </label>
      </div>
      <span className="field-hint">
        Optional. It stops by itself when the pending balance reaches zero or no payments are left. Leave both empty for rent,
        SIPs and anything with no end.
      </span>
    </form>
  );
}
