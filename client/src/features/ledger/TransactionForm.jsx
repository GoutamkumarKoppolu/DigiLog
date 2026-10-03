import { useState } from "react";
import Switch from "../../components/ui/Switch";
import InfoButton from "../../components/ui/InfoButton";
import TagSuggestions from "../../components/ui/TagSuggestions";
import { deductsFromBalance } from "../../domain/transactions";
import { today } from "../../utils/format";
import KindChips from "./KindChips";

const QUICK_TAG_COUNT = 8;

const sameTag = (a, b) => a.trim().toLowerCase() === (b || "").trim().toLowerCase();

// The tag group (e.g. credit card bills) a saved tag belongs to, if any.
const groupOfTag = (groups, tag) => groups.find((g) => g.tags.some((t) => sameTag(t.tag, tag)))?.id ?? null;

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
// sheet with the amount typed so far. `tagGroups` are switches that swap the
// Tag field for fixed tags, for one kind of type: { id, kind, label, info,
// description, tags: [{ tag, label }] } (e.g. "Paying a credit card bill").
// `tagHints` explain a tag that matters for one kind of type and offer it
// first: { kind, tag, text, info } (e.g. "Salary" for earnings). `tagPicks`
// are extra rows of tag chips for one kind: { kind, label, tags: [{ tag,
// label, red }] } (e.g. the spending plan's tags with what's left).
export default function TransactionForm(props) {
  const { id, transaction, transactionTypes, paymentMethods, paymentSources, existingTags, onSubmit, seed } = props;
  const { extras = [], onPickExtra, tagGroups = [], tagHints = [], tagPicks = [] } = props;
  const [form, setForm] = useState(() => initialForm(transaction, seed));
  // undefined until the switch is touched: follows the saved tag, since
  // groups may load after the form opens.
  const [groupChoice, setGroupId] = useState(undefined);
  const groupId = groupChoice === undefined ? groupOfTag(tagGroups, transaction?.tag) : groupChoice;

  // Default to "expense" (the most common entry), else the first type.
  const defaultType = (transactionTypes.find((t) => t.name === "expense") || transactionTypes[0])?.name || "";
  const type = form.type || defaultType;
  const kind = transactionTypes.find((t) => t.name === type)?.kind;
  const isSavingType = kind === "saving";
  const groups = tagGroups.filter((g) => g.kind === kind && g.tags.length);
  const group = groups.find((g) => g.id === groupId);
  const hint = tagHints.find((h) => h.kind === kind);
  const picks = tagPicks.filter((p) => p.kind === kind && p.tags.length);
  const suggestedTags = hint ? [hint.tag, ...existingTags.filter((t) => !sameTag(t, hint.tag))] : existingTags;

  // A group's tag only fits with the switch on, a typed tag only with it off.
  function toggleGroup(g, on) {
    setGroupId(on ? g.id : null);
    if (on !== g.tags.some((t) => sameTag(t.tag, form.tag))) set("tag", "");
  }

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

      {groups.map((g) => (
        <Switch
          key={g.id}
          name={g.id}
          checked={group?.id === g.id}
          onChange={(on) => toggleGroup(g, on)}
          label={g.label}
          info={g.info}
          description={g.description}
        />
      ))}

      {group ? (
        <div className="field">
          <span className="field-label">{group.pickLabel}</span>
          <div className="chip-group" role="radiogroup" aria-label={group.pickLabel}>
            {group.tags.map((t) => (
              <button
                type="button"
                key={t.tag}
                role="radio"
                aria-checked={sameTag(t.tag, form.tag)}
                className={`chip ${sameTag(t.tag, form.tag) ? "is-active" : ""}`}
                onClick={() => set("tag", t.tag)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* Keeps native "required" validation for the chip choice. */}
          <input className="visually-hidden" tabIndex={-1} aria-hidden="true" value={form.tag} onChange={() => {}} required />
        </div>
      ) : (
        <>
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
          {picks.map((p) => (
            <div className="field" key={p.label}>
              <span className="field-label">{p.label}</span>
              <div className="chip-group chip-group-scroll" role="group" aria-label={p.label}>
                {p.tags.map((t) => (
                  <button
                    type="button"
                    key={t.tag}
                    aria-pressed={sameTag(t.tag, form.tag)}
                    className={`chip chip-sm ${sameTag(t.tag, form.tag) ? "is-active" : ""} ${t.red ? "chip-over" : ""}`}
                    onClick={() => set("tag", t.tag)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <TagSuggestions value={form.tag} tags={suggestedTags} onPick={(t) => set("tag", t)} limit={QUICK_TAG_COUNT} label="Recent tags" />
          {hint && (
            <p className="field-hint tag-hint">
              {hint.text} {hint.info && <InfoButton topic={hint.info} />}
            </p>
          )}
        </>
      )}

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
