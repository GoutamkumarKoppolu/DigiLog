import { ArrowLeftRight } from "lucide-react";
import { movementSign } from "../../domain/transactions";
import { currency } from "../../utils/format";

// "From balance", or the pot for savings ("Into Emergency"); the pill's
// colour tells the two apart, and short labels fit a 360px row.
function where(m) {
  return `${m.flow === "in" ? "Into" : "From"} ${m.account === "savings" ? m.pot : "balance"}`;
}

// One movement (e.g. "Repay · Anil") in the transaction list. Tapping it
// opens where it was made.
export default function MovementRow({ m, onSelect }) {
  const tone = m.flow === "in" ? "positive" : "negative";
  return (
    <button type="button" className="tx-row" onClick={() => onSelect(m)}>
      <span className={`icon-badge tone-${tone}`}>
        <ArrowLeftRight size={18} />
      </span>
      <span className="tx-main">
        <span className="tx-title">{m.title}</span>
        {m.note && <span className="tx-sub">{m.note}</span>}
        <span className={`pill ${m.account === "savings" ? "tone-savings" : "tone-accent"}`}>{where(m)}</span>
      </span>
      <span className={`tx-amount text-${tone}`}>
        {movementSign(m) > 0 ? "+" : "−"}
        {currency(m.amount)}
      </span>
    </button>
  );
}
