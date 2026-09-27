import { useState } from "react";
import { currency, today } from "../../utils/format";

// A spend against an event: straight from its total, or from one of its
// sub-budgets (only offered when it has any). Submitted by the sheet's
// footer button via the `id`/`form` attribute.
export default function SpendForm({ id, event, spend, initialBudgetId, onSubmit }) {
  const [form, setForm] = useState(() => ({
    budget_id: spend?.budget_id ?? initialBudgetId ?? event.id,
    amount: spend ? String(spend.amount) : "",
    description: spend?.description ?? "",
    date: spend?.date ?? today(),
  }));
  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ ...form, amount: Number(form.amount) });
  }

  const choices = [
    { id: event.id, label: `Whole budget · ${currency(event.remaining)}` },
    ...event.subs.map((s) => ({ id: s.id, label: `${s.name} · ${currency(s.remaining)}` })),
  ];

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
            autoFocus={!spend}
          />
        </span>
      </label>

      {event.subs.length > 0 && (
        <div className="field">
          <span className="field-label">Take it from</span>
          <div className="chip-group" role="radiogroup" aria-label="Take it from">
            {choices.map((c) => (
              <button
                type="button"
                key={c.id}
                role="radio"
                aria-checked={form.budget_id === c.id}
                className={`chip ${form.budget_id === c.id ? "is-active" : ""}`}
                onClick={() => setForm((f) => ({ ...f, budget_id: c.id }))}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="field-grid">
        <label className="field">
          <span className="field-label">What for?</span>
          <input
            className="input"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="e.g. Hall advance"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Date</span>
          <input type="date" name="date" className="input" value={form.date} onChange={handleChange} required />
        </label>
      </div>
    </form>
  );
}
