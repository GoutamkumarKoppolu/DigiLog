import { ArrowLeftRight, HandCoins, History, PiggyBank, Trash2 } from "lucide-react";
import EmptyState from "../../components/ui/EmptyState";
import { currency, dateHeading, groupByDate } from "../../utils/format";

// Money moved in or out by another feature (e.g. "Repay · Anil"); it's
// changed where it was made, so there's nothing to tap here.
function MovementEntry({ e }) {
  const isIn = e.flow === "in";
  return (
    <div className="tx-row">
      <span className={`icon-badge ${isIn ? "tone-savings" : "tone-negative"}`}>
        <ArrowLeftRight size={18} />
      </span>
      <span className="tx-main">
        <span className="tx-title">{e.title}</span>
        <span className="tx-sub">{[`${isIn ? "Into" : "From"} ${e.tag}`, e.note].filter(Boolean).join(" · ")}</span>
      </span>
      <span className={`tx-amount ${isIn ? "text-savings" : "text-negative"}`}>
        {isIn ? "+" : "−"}
        {currency(e.amount)}
      </span>
    </div>
  );
}

// Timeline of money in (Saving transactions from the ledger), money out
// (withdrawals) and movements. Deposits are edited from Home; withdrawals are
// deleted here.
export default function SavingsHistory({ entries, onDeleteWithdrawal }) {
  if (!entries.length) {
    return <EmptyState icon={History}>No savings history for this selection.</EmptyState>;
  }

  return (
    <div className="tx-groups">
      {groupByDate(entries).map((g) => (
        <section key={g.date} className="tx-group">
          <div className="tx-group-head">
            <span>{dateHeading(g.date)}</span>
          </div>
          <div className="card card-list">
            {g.rows.map((e) => {
              if (e.entry === "movement") return <MovementEntry key={e.key} e={e} />;
              const isDeposit = e.entry === "deposit";
              return (
                <div className="tx-row" key={e.key}>
                  <span className={`icon-badge ${isDeposit ? "tone-savings" : "tone-negative"}`}>
                    {isDeposit ? <PiggyBank size={18} /> : <HandCoins size={18} />}
                  </span>
                  <span className="tx-main">
                    <span className="tx-title">{isDeposit ? `Saved to ${e.tag}` : `Used from ${e.tag}`}</span>
                    {e.note && <span className="tx-sub">{e.note}</span>}
                    {isDeposit && (
                      <span className={`pill ${e.deducted ? "tone-savings" : "tone-accent"}`}>
                        {e.deducted ? "From balance" : "Not from balance"}
                      </span>
                    )}
                  </span>
                  <span className={`tx-amount ${isDeposit ? "text-savings" : "text-negative"}`}>
                    {isDeposit ? "+" : "−"}
                    {currency(e.amount)}
                  </span>
                  {!isDeposit && (
                    <button
                      type="button"
                      className="icon-btn icon-btn-danger"
                      onClick={() => onDeleteWithdrawal(e.id)}
                      aria-label={`Delete ${currency(e.amount)} used from ${e.tag}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
