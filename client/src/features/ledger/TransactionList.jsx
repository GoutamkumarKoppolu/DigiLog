import { Receipt } from "lucide-react";
import EmptyState from "../../components/ui/EmptyState";
import { movementSign } from "../../domain/transactions";
import { currency, dateHeading, groupByDate } from "../../utils/format";
import TransactionRow from "./TransactionRow";
import MovementRow from "./MovementRow";

// Movements count only when they change the balance.
function signed(row) {
  if (!row.movement) return (row.type_kind === "earning" ? 1 : -1) * Number(row.amount);
  return row.account === "balance" ? movementSign(row) * Number(row.amount) : 0;
}

const signedTotal = (rows) => rows.reduce((sum, row) => sum + signed(row), 0);

const newestFirst = (a, b) => b.date.localeCompare(a.date) || String(b.created_at).localeCompare(String(a.created_at));

// Date-grouped transaction cards, with any movements (e.g. repayments) mixed
// in by date; tapping a transaction opens it for editing, a movement opens
// where it was made.
export default function TransactionList({ transactions, movements = [], onSelect, onSelectMovement }) {
  const rows = movements.length ? [...transactions, ...movements.map((m) => ({ ...m, movement: true }))].sort(newestFirst) : transactions;

  if (!rows.length) {
    return <EmptyState icon={Receipt}>No transactions for these filters yet. Tap + to add one.</EmptyState>;
  }

  return (
    <div className="tx-groups">
      {groupByDate(rows).map((g) => (
        <section key={g.date} className="tx-group">
          <div className="tx-group-head">
            <span>{dateHeading(g.date)}</span>
            <span className="tx-group-total">Net {currency(signedTotal(g.rows))}</span>
          </div>
          <div className="card card-list">
            {g.rows.map((t) =>
              t.movement ? <MovementRow key={t.key} m={t} onSelect={onSelectMovement} /> : <TransactionRow key={t.id} t={t} onSelect={onSelect} />
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
