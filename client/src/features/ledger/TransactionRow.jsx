import { deductsFromBalance, isSaving } from "../../domain/transactions";
import { ledgerMonth } from "../../domain/salary";
import { capitalize, currency, monthLabel, shortDate } from "../../utils/format";
import { kindMeta } from "./kindMeta";

// One tappable transaction card row. `showDate` adds the date to the
// details line, for lists that aren't already grouped by day.
export default function TransactionRow({ t, onSelect, showDate = false }) {
  const meta = kindMeta(t.type_kind);
  const Icon = meta.icon;
  const details = [showDate && shortDate(t.date), capitalize(t.type), t.payment_method, t.payment_source, t.note].filter(Boolean).join(" · ");
  // A salary from the 25th on counts for the next month; say so on its row.
  const countsFor = ledgerMonth(t) !== t.date.slice(0, 7) ? monthLabel(ledgerMonth(t)).split(" ")[0] : null;

  return (
    <button type="button" className="tx-row" onClick={() => onSelect(t)}>
      <span className={`icon-badge tone-${meta.tone}`}>
        <Icon size={18} />
      </span>
      <span className="tx-main">
        <span className="tx-title">{t.tag}</span>
        <span className="tx-sub">{details}</span>
        {isSaving(t) && (
          <span className={`pill ${deductsFromBalance(t) ? "tone-savings" : "tone-accent"}`}>
            {deductsFromBalance(t) ? "From balance" : "Not from balance"}
          </span>
        )}
        {countsFor && <span className="pill tone-positive">Counts for {countsFor}</span>}
      </span>
      <span className={`tx-amount text-${meta.tone}`}>
        {meta.sign}
        {currency(t.amount)}
      </span>
    </button>
  );
}
