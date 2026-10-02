import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, PiggyBank, SlidersHorizontal } from "lucide-react";
import Money from "../../components/ui/Money";
import AppMark from "../../components/ui/AppMark";
import StatCard from "../../components/ui/StatCard";
import ErrorBanner from "../../components/ui/ErrorBanner";
import { TransactionList, useLedger } from "../ledger";
import { computeTotals, DEDUCTION_FILTERS, KIND_LABELS, matchesMovementFilters } from "../../domain/transactions";
import { currency, periodLabel } from "../../utils/format";
import FilterSheet from "./FilterSheet";
import { DEDUCTION_OPTIONS } from "./filterOptions";

function activeFilterLabels(filters) {
  const labels = [periodLabel(filters.months)];
  if (filters.kind) labels.push(KIND_LABELS[filters.kind]);
  if (filters.kind === "saving" && filters.deduction !== DEDUCTION_FILTERS.ALL) {
    labels.push(DEDUCTION_OPTIONS.find((o) => o.value === filters.deduction).label);
  }
  return [...labels, ...filters.tags];
}

// `BalanceNote` (from App's ROUTES) is shown under the current balance, e.g.
// the usable balance from Recurring.
export default function HomePage({ navigate, onOpenTransaction, BalanceNote }) {
  const ledger = useLedger();
  const [showFilters, setShowFilters] = useState(false);
  const { earnings, expenses, savings } = computeTotals(ledger.transactions);
  const movements = ledger.movements.filter((m) => matchesMovementFilters(m, ledger.filters));

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-top">
          <span className="hero-brand">
            <AppMark size={18} /> DigiLog
          </span>
        </div>
        <div className="hero-balance">
          <span className="hero-label">Current balance</span>
          <Money value={ledger.overview.balance} className="hero-amount" />
          {BalanceNote && <BalanceNote navigate={navigate} />}
          <span className="hero-pill">
            <PiggyBank size={14} /> Overall savings {currency(ledger.overview.totalSavings)}
          </span>
        </div>
      </section>

      <div className="page-body home-body">
        <ErrorBanner message={ledger.error} onDismiss={() => ledger.setError("")} />

        <div className="section-head">
          <h2>Your money</h2>
          <span className="muted">{periodLabel(ledger.filters.months)}</span>
        </div>
        <div className="stat-grid">
          <StatCard icon={ArrowDownLeft} tone="positive" label="Income" value={earnings} />
          <StatCard icon={ArrowUpRight} tone="negative" label="Expenses" value={expenses} />
          <StatCard icon={PiggyBank} tone="savings" label="Saved" value={savings} />
        </div>

        <div className="section-head">
          <h2>Transactions</h2>
          <button type="button" className="link-btn" onClick={() => navigate("tags")}>
            By tag
          </button>
        </div>
        <button type="button" className="filter-bar" onClick={() => setShowFilters(true)}>
          <span className="filter-bar-icon">
            <SlidersHorizontal size={18} />
          </span>
          <span className="filter-bar-chips">
            {activeFilterLabels(ledger.filters).map((l) => (
              <span key={l} className="pill tone-accent">
                {l}
              </span>
            ))}
          </span>
        </button>

        {ledger.loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <TransactionList
            transactions={ledger.transactions}
            movements={movements}
            onSelect={onOpenTransaction}
            onSelectMovement={(m) => navigate(m.route)}
          />
        )}
      </div>

      {showFilters && (
        <FilterSheet
          filters={ledger.filters}
          tags={ledger.tags}
          onChange={ledger.setFilters}
          onReset={ledger.resetFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  );
}
