import { useState } from "react";
import SegmentedControl from "../../components/ui/SegmentedControl";
import Switch from "../../components/ui/Switch";
import TagSuggestions from "../../components/ui/TagSuggestions";
import { today } from "../../utils/format";
import { CYCLES, REMIND_OPTIONS, nextRenewal } from "./domain";

const CYCLE_OPTIONS = Object.entries(CYCLES).map(([value, label]) => ({ value, label }));

const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

// Add or edit a subscription. Monthly ones take a day of the month; yearly
// ones a renewal date (its day and month are kept). Payment method and
// category are typed freely, with tap-to-fill chips. Submitted by the sheet's
// footer button via the `id`/`form` attribute.
export default function SubscriptionForm({ id, subscription: s, methods, categories, remindersNote, onSubmit }) {
  const [form, setForm] = useState(() => ({
    name: s?.name ?? "",
    amount: s ? String(s.amount) : "",
    cycle: s?.cycle ?? "monthly",
    day: s ? String(s.day) : "",
    // Yearly: shown as the next renewal date, stored as month + day.
    renews: s?.cycle === "yearly" ? nextRenewal({ ...s, trial_end: null }, today()) : "",
    payment_method: s?.payment_method ?? "",
    category: s?.category ?? "",
    onTrial: Boolean(s?.trial_end),
    trial_end: s?.trial_end ?? "",
    remind: s?.remind ?? "1",
  }));
  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const handleChange = (e) => set(e.target.name, e.target.value);
  const day = Number(form.day);

  function handleSubmit(e) {
    e.preventDefault();
    const yearly = form.cycle === "yearly";
    onSubmit({
      name: form.name,
      amount: Number(form.amount),
      cycle: form.cycle,
      day: yearly ? Number(form.renews.slice(8, 10)) : day,
      month: yearly ? Number(form.renews.slice(5, 7)) : null,
      payment_method: form.payment_method,
      category: form.category,
      trial_end: form.onTrial ? form.trial_end : null,
      remind: form.remind,
    });
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
          placeholder="e.g. Netflix, Spotify, iCloud"
          enterKeyHint="next"
          autoFocus={!s}
          required
        />
      </label>

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
          />
        </span>
      </label>

      <SegmentedControl label="Billing" options={CYCLE_OPTIONS} value={form.cycle} onChange={(v) => set("cycle", v)} />

      {form.cycle === "monthly" ? (
        <label className="field">
          <span className="field-label">Day of deduction</span>
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
          {day >= 1 && day <= 31 && (
            <span className="field-hint">
              On the {ordinal(day)} of every month{day > 28 ? " (or the month's last day)" : ""}.
            </span>
          )}
        </label>
      ) : (
        <label className="field">
          <span className="field-label">Next renewal date</span>
          <input type="date" name="renews" className="input" value={form.renews} onChange={handleChange} required />
          <span className="field-hint">It renews on this day every year.</span>
        </label>
      )}

      <label className="field">
        <span className="field-label">Payment method</span>
        <input
          className="input"
          name="payment_method"
          value={form.payment_method}
          onChange={handleChange}
          placeholder="e.g. HDFC credit card, GPay"
          enterKeyHint="next"
        />
      </label>
      <TagSuggestions value={form.payment_method} tags={methods} onPick={(v) => set("payment_method", v)} label="Payment methods" />

      <label className="field">
        <span className="field-label">Category</span>
        <input
          className="input"
          name="category"
          value={form.category}
          onChange={handleChange}
          placeholder="e.g. Entertainment"
          enterKeyHint="done"
        />
      </label>
      <TagSuggestions value={form.category} tags={categories} onPick={(v) => set("category", v)} label="Categories" />

      <Switch
        name="onTrial"
        checked={form.onTrial}
        onChange={(checked) => set("onTrial", checked)}
        label="On a free trial"
        description="You'll be reminded the day before it ends."
      />
      {form.onTrial && (
        <label className="field">
          <span className="field-label">Trial ends on</span>
          <input type="date" name="trial_end" className="input" value={form.trial_end} onChange={handleChange} required />
        </label>
      )}

      <div className="field">
        <span className="field-label">Remind me</span>
        <div className="chip-group" role="radiogroup" aria-label="Remind me">
          {REMIND_OPTIONS.map((o) => (
            <button
              type="button"
              key={o.value}
              role="radio"
              aria-checked={form.remind === o.value}
              className={`chip ${form.remind === o.value ? "is-active" : ""}`}
              onClick={() => set("remind", o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <span className="field-hint">{remindersNote}</span>
      </div>
    </form>
  );
}
