import SegmentedControl from "../../components/ui/SegmentedControl";
import TagSuggestions from "../../components/ui/TagSuggestions";
import { currency } from "../../utils/format";
import { NOTE } from "./moneyLink";

// Where the money went: Balance, a savings pot, or (allowNote) just noted.
// Money going out picks a pot that has money in it; money coming in can go
// into any pot, or a new one by typing its name.
export default function MoneyLinkField({ label, flow, value, onChange, pots, allowNote = true, editing = null }) {
  const options = [
    { value: "balance", label: "Balance" },
    { value: "savings", label: "Savings" },
    ...(allowNote ? [{ value: NOTE, label: "Just note it" }] : []),
  ];
  // When editing money taken from a pot, it's still in there to spend.
  const own = (tag) => (editing?.linked_to === "savings" && editing.pot === tag ? Number(editing.amount) : 0);
  const outPots = pots.map((p) => ({ ...p, remaining: p.remaining + own(p.tag) })).filter((p) => p.remaining > 0);
  const choices = flow === "out" ? outPots : pots;

  function pick(linked_to) {
    // With only one pot there's nothing to choose.
    const pot = value.pot || (linked_to === "savings" && choices.length === 1 ? choices[0].tag : "");
    onChange({ linked_to, pot });
  }

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <SegmentedControl label={label} options={options} value={value.linked_to} onChange={pick} />

      {value.linked_to === NOTE && <span className="field-hint">Keeps a note here only. Your balance and savings don&apos;t change.</span>}

      {value.linked_to === "savings" && flow === "out" && (
        <>
          {outPots.length ? (
            <div className="chip-group" role="radiogroup" aria-label="Savings pot">
              {outPots.map((p) => (
                <button
                  type="button"
                  key={p.tag}
                  role="radio"
                  aria-checked={value.pot === p.tag}
                  className={`chip ${value.pot === p.tag ? "is-active" : ""}`}
                  onClick={() => onChange({ ...value, pot: p.tag })}
                >
                  {p.tag} · {currency(p.remaining)}
                </button>
              ))}
            </div>
          ) : (
            <span className="field-hint">No savings to use yet.</span>
          )}
          {/* Keeps native "required" validation for the pot choice. */}
          <input className="visually-hidden" tabIndex={-1} aria-hidden="true" value={value.pot} onChange={() => {}} required />
        </>
      )}

      {value.linked_to === "savings" && flow === "in" && (
        <div className="link-pot">
          <input
            className="input"
            aria-label="Savings pot"
            placeholder="Pot, e.g. Emergency"
            value={value.pot}
            onChange={(e) => onChange({ ...value, pot: e.target.value })}
            autoComplete="off"
            required
          />
          <TagSuggestions value={value.pot} tags={pots.map((p) => p.tag)} onPick={(pot) => onChange({ ...value, pot })} label="Savings pots" />
        </div>
      )}
    </div>
  );
}
