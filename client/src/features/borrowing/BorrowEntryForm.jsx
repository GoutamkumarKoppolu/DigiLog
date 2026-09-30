import { useState } from "react";
import { currency, today } from "../../utils/format";
import MoneyLinkField from "./MoneyLinkField";
import { linkPayload } from "./moneyLink";

// Repay / Received from the + sheet: amount, who, balance or savings, date.
// `records` are this direction's open records; `kindChips(amount)` renders
// the sheet's type chips so switching type keeps the amount typed so far.
export default function BorrowEntryForm({ id, meta, records, pots, amount, kindChips, onSubmit }) {
  const [form, setForm] = useState(() => ({
    amount,
    recordId: records.length === 1 ? records[0].id : null,
    date: today(),
    note: "",
  }));
  const [link, setLink] = useState({ linked_to: "balance", pot: "" });
  const record = records.find((r) => r.id === form.recordId);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    const { recordId, ...payment } = form;
    onSubmit(recordId, { ...payment, amount: Number(form.amount), ...linkPayload(link) });
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
            max={record?.remaining}
            placeholder="0.00"
            value={form.amount}
            onChange={handleChange}
            required
            autoFocus
          />
        </span>
        {record && <span className="field-hint">Up to {currency(record.remaining)}</span>}
      </label>

      {kindChips(form.amount)}

      <div className="field">
        <span className="field-label">{meta.paymentFlow === "out" ? "To" : "From"}</span>
        <div className="chip-group" role="radiogroup" aria-label={meta.personLabel}>
          {records.map((r) => (
            <button
              type="button"
              key={r.id}
              role="radio"
              aria-checked={form.recordId === r.id}
              className={`chip ${form.recordId === r.id ? "is-active" : ""}`}
              onClick={() => setForm((f) => ({ ...f, recordId: r.id }))}
            >
              {r.person} · {currency(r.remaining)} left
            </button>
          ))}
        </div>
        {/* Keeps native "required" validation for the person choice. */}
        <input className="visually-hidden" tabIndex={-1} aria-hidden="true" value={form.recordId ?? ""} onChange={() => {}} required />
      </div>

      <MoneyLinkField label={meta.paymentLink} flow={meta.paymentFlow} value={link} onChange={setLink} pots={pots} allowNote={false} />

      <div className="field-grid">
        <label className="field">
          <span className="field-label">Date</span>
          <input type="date" name="date" className="input" value={form.date} onChange={handleChange} required />
        </label>
        <label className="field">
          <span className="field-label">Note</span>
          <input type="text" name="note" className="input" placeholder="Optional" value={form.note} onChange={handleChange} />
        </label>
      </div>
    </form>
  );
}
