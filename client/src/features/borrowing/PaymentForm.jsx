import { useState } from "react";
import { currency, today } from "../../utils/format";

// One repayment: amount (pre-filled with what's left when adding) and date.
// Submitted by the sheet's footer button via the `id`/`form` attribute.
export default function PaymentForm({ id, payment, max, onSubmit }) {
  const [form, setForm] = useState(() => ({
    amount: payment ? String(payment.amount) : max > 0 ? String(max) : "",
    date: payment?.date ?? today(),
    note: payment?.note ?? "",
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
            onFocus={(e) => e.target.select()}
            required
          />
        </span>
        <span className="field-hint">Up to {currency(max)}</span>
      </label>
      <div className="field-grid">
        <label className="field">
          <span className="field-label">Date</span>
          <input type="date" name="date" className="input" value={form.date} onChange={handleChange} required />
        </label>
        <label className="field">
          <span className="field-label">Note (optional)</span>
          <input className="input" name="note" value={form.note} onChange={handleChange} placeholder="e.g. UPI" enterKeyHint="done" />
        </label>
      </div>
    </form>
  );
}
