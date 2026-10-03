import { capitalize } from "../../utils/format";

// The Type chips of the add sheet: the transaction types, then any extra
// entries features add (e.g. Repay). `extra` is the picked extra's id, or
// null when a transaction type is picked.
export default function KindChips({ types, extras = [], type, extra, onPickType, onPickExtra }) {
  const chip = (key, label, active, onClick) => (
    <button type="button" key={key} role="radio" aria-checked={active} className={`chip ${active ? "is-active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );

  return (
    <div className="field">
      <span className="field-label">Type</span>
      <div className="chip-group" role="radiogroup" aria-label="Type">
        {types.map((t) => chip(`type-${t.id}`, capitalize(t.name), !extra && type === t.name, () => onPickType(t.name)))}
        {extras.map((e) => chip(`extra-${e.id}`, e.label, extra === e.id, () => onPickExtra(e.id)))}
      </div>
    </div>
  );
}
