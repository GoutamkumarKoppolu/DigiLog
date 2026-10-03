import { deductsFromBalance, isSaving } from "../../domain/transactions";
import { capitalize, currency, shortDate } from "../../utils/format";
import { kindMeta } from "./kindMeta";

// One tappable transaction card row. `showDate` adds the date to the
// details line, for lists that aren't already grouped by day.
export default function TransactionRow({ t, onSelect, showDate = false }) {
  const meta = kindMeta(t.type_kind);
  const Icon = meta.icon;
  const details = [showDate && shortDate(t.date), capitalize(t.type), t.payment_method, t.payment_source, t.note].filter(Boolean).join(" · ");

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
      </span>
      <span className={`tx-amount text-${meta.tone}`}>
        {meta.sign}
        {currency(t.amount)}
      </span>
    </button>
  );
}
