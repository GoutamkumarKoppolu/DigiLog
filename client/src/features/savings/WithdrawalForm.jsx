import { useState } from "react";
import { currency, today } from "../../utils/format";

// Records money taken out of a savings pot. Only pots with money left are
// offered. Submitted by the sheet's footer button via the `id`/`form` attribute.
export default function WithdrawalForm({ id, pots, initialTag = "", onSubmit }) {
  const available = pots.filter((p) => p.remaining > 0);
  const [form, setForm] = useState(() => ({
    tag: available.some((p) => p.tag === initialTag) ? initialTag : "",
    amount: "",
    date: today(),
    note: "",
  }));

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ ...form, amount: Number(form.amount) });
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
            autoFocus
          />
        </span>
      </label>

      <div className="field">
        <span className="field-label">From pot</span>
        <div className="chip-group" role="radiogroup" aria-label="From pot">
          {available.map((p) => (
            <button
              type="button"
              key={p.tag}
              role="radio"
              aria-checked={form.tag === p.tag}
              className={`chip ${form.tag === p.tag ? "is-active" : ""}`}
              onClick={() => setForm((f) => ({ ...f, tag: p.tag }))}
            >
              {p.tag} · {currency(p.remaining)}
            </button>
          ))}
        </div>
        {/* Keeps native "required" validation for the chip choice. */}
        <input className="visually-hidden" tabIndex={-1} aria-hidden="true" value={form.tag} onChange={() => {}} required />
      </div>

      <div className="field-grid">
        <label className="field">
          <span className="field-label">Date</span>
          <input type="date" name="date" className="input" value={form.date} onChange={handleChange} required />
        </label>
        <label className="field">
          <span className="field-label">What for?</span>
          <input type="text" name="note" className="input" value={form.note} onChange={handleChange} placeholder="Optional" />
        </label>
      </div>
    </form>
  );
}
