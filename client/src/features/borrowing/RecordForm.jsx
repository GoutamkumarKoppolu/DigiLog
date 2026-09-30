import { useState } from "react";
import { today } from "../../utils/format";
import MoneyLinkField from "./MoneyLinkField";
import { initialLink, linkPayload } from "./moneyLink";

// Who, how much, when, where the money went, and optionally their phone and
// why. Submitted by the sheet's footer button via the `id`/`form` attribute.
export default function RecordForm({ id, record, meta, pots, onSubmit }) {
  const [link, setLink] = useState(() => initialLink(record));
  const [form, setForm] = useState(() => ({
    person: record?.person ?? "",
    amount: record ? String(record.amount) : "",
    date: record?.date ?? today(),
    phone: record?.phone ?? "",
    note: record?.note ?? "",
  }));
  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ ...form, amount: Number(form.amount), ...linkPayload(link) });
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
            autoFocus={!record}
          />
        </span>
      </label>

      <div className="field-grid">
        <label className="field">
          <span className="field-label">{meta.personLabel}</span>
          <input
            className="input"
            name="person"
            value={form.person}
            onChange={handleChange}
            placeholder="Name"
            autoComplete="off"
            enterKeyHint="next"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Date</span>
          <input type="date" name="date" className="input" value={form.date} onChange={handleChange} required />
        </label>
      </div>

      <MoneyLinkField label={meta.recordLink} flow={meta.recordFlow} value={link} onChange={setLink} pots={pots} editing={record} />

      <label className="field">
        <span className="field-label">Phone (optional)</span>
        <input
          className="input"
          type="tel"
          name="phone"
          inputMode="tel"
          value={form.phone}
          onChange={handleChange}
          placeholder="e.g. 98765 43210"
          autoComplete="off"
          enterKeyHint="next"
        />
      </label>

      <label className="field">
        <span className="field-label">Why? (optional)</span>
        <textarea
          className="input textarea"
          name="note"
          rows={2}
          value={form.note}
          onChange={handleChange}
          placeholder="e.g. For the bike down payment"
        />
      </label>
    </form>
  );
}
