import { useState } from "react";

// Name + amount, for an event or a sub-budget. Submitted by the sheet's
// footer button via the `id`/`form` attribute.
export default function BudgetForm({ id, budget, nameLabel, namePlaceholder, onSubmit }) {
  const [form, setForm] = useState(() => ({ name: budget?.name ?? "", amount: budget ? String(budget.amount) : "" }));
  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ name: form.name.trim(), amount: Number(form.amount) });
  }

  return (
    <form autoComplete="off" id={id} className="form" onSubmit={handleSubmit}>
      <label className="field">
        <span className="field-label">{nameLabel}</span>
        <input
          className="input"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder={namePlaceholder}
          required
          autoFocus={!budget}
        />
      </label>
      <label className="amount-field">
        <span className="field-label">Budget</span>
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
    </form>
  );
}
