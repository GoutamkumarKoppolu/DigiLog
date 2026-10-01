import { useCallback, useEffect, useState } from "react";
import { CalendarDays, CreditCard, Plus, Receipt, Trash2 } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import InfoButton from "../../components/ui/InfoButton";
import BottomSheet from "../../components/ui/BottomSheet";
import EmptyState from "../../components/ui/EmptyState";
import ErrorBanner from "../../components/ui/ErrorBanner";
import PeriodSheet from "../../components/PeriodSheet";
import { useLedger } from "../ledger";
import CardUtilizationChart from "./CardUtilizationChart";
import CardCompareChart from "./CardCompareChart";
import {
  createCreditCard,
  deleteCreditCard,
  fetchCardData,
  fetchCardTransactions,
  createCardTransaction,
  deleteCardTransaction,
} from "./api";
import { compareMonths, lastMonths, latestActiveMonth } from "./domain";
import { currency, currentMonth, monthLabel, periodLabel, today } from "../../utils/format";

const CHART_MONTHS = 6;

const ADD_CARD_FORM_ID = "add-card-form";
const ADD_SPEND_FORM_ID = "add-card-spend-form";
const CARD_COLOR_COUNT = 8;

function AddCardSheet({ onAdd, onClose, error }) {
  const [name, setName] = useState("");
  const [last4, setLast4] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (name.trim()) onAdd({ name: name.trim(), last4: last4 || undefined });
  }

  return (
    <BottomSheet
      title="Add a credit card"
      onClose={onClose}
      footer={
        <button type="submit" form={ADD_CARD_FORM_ID} className="btn btn-primary btn-block">
          Add card
        </button>
      }
    >
      <ErrorBanner message={error} />
      <form autoComplete="off" id={ADD_CARD_FORM_ID} className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Card name</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. HDFC Regalia"
            required
            autoFocus
          />
        </label>
        <label className="field">
          <span className="field-label">Last 4 digits (optional)</span>
          <input
            className="input"
            inputMode="numeric"
            value={last4}
            onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="1234"
          />
        </label>
      </form>
    </BottomSheet>
  );
}

function AddSpendSheet({ card, onAdd, onClose, error }) {
  const [form, setForm] = useState({ amount: "", description: "", date: today() });
  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  function handleSubmit(e) {
    e.preventDefault();
    onAdd({ ...form, amount: Number(form.amount) });
  }

  return (
    <BottomSheet
      title={`Log spend · ${card.name}`}
      onClose={onClose}
      footer={
        <button type="submit" form={ADD_SPEND_FORM_ID} className="btn btn-primary btn-block">
          Add transaction
        </button>
      }
    >
      <ErrorBanner message={error} />
      <form autoComplete="off" id={ADD_SPEND_FORM_ID} className="form" onSubmit={handleSubmit}>
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
              autoFocus
            />
          </span>
        </label>
        <div className="field-grid">
          <label className="field">
            <span className="field-label">Description</span>
            <input
              className="input"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="e.g. Amazon order"
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Date</span>
            <input type="date" name="date" className="input" value={form.date} onChange={handleChange} required />
          </label>
        </div>
      </form>
    </BottomSheet>
  );
}

// "Estimated bill · October ₹1,948 ⓘ" under a card, when something estimates it.
function EstimateLine({ amount }) {
  return (
    <div className="card cc-estimate">
      <span className="cc-estimate-label">
        Estimated bill · {monthLabel(currentMonth())} <InfoButton topic="cardEstimate" />
      </span>
      <strong>{currency(amount)}</strong>
    </div>
  );
}

function CardSection({ card, index, months, compare, estimate, onChanged, onDeleteCard }) {
  const [transactions, setTransactions] = useState([]);
  const [chartMonth, setChartMonth] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetchCardTransactions(card.id, { months })
      .then(setTransactions)
      .catch((e) => setError(e.message));
  }, [card.id, months]);

  useEffect(load, [load]);

  const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  async function mutate(action) {
    try {
      setError("");
      await action();
      load();
      onChanged();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  async function handleAdd(data) {
    if (await mutate(() => createCardTransaction(card.id, data))) setShowAdd(false);
  }

  function handleDelete(txId) {
    if (window.confirm("Delete this card transaction?")) mutate(() => deleteCardTransaction(card.id, txId));
  }

  return (
    <section className="cc-section" style={{ "--card-color": `var(--cat-${(index % CARD_COLOR_COUNT) + 1})` }}>
      <div className="cc-visual">
        <div className="cc-visual-top">
          <span className="cc-visual-name">{card.name}</span>
          <CreditCard size={22} aria-hidden="true" />
        </div>
        <span className="cc-visual-number">•••• {card.last4 || "····"}</span>
        <div className="cc-visual-bottom">
          <span>
            <span className="cc-visual-label">Spent in period</span>
            <span className="cc-visual-total">{currency(total)}</span>
          </span>
          <button
            type="button"
            className="icon-btn icon-btn-on-card"
            onClick={() => onDeleteCard(card.id)}
            aria-label={`Remove ${card.name}`}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {!showAdd && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      {estimate > 0 && <EstimateLine amount={estimate} />}

      <CardCompareChart
        rows={compare}
        selected={chartMonth ?? latestActiveMonth(compare)}
        tip={chartMonth}
        onSelect={(month) => setChartMonth((m) => (m === month ? null : month))}
      />

      <button
        type="button"
        className="btn btn-soft btn-block"
        onClick={() => {
          setError("");
          setShowAdd(true);
        }}
      >
        <Plus size={18} /> Log spend
      </button>

      {transactions.length ? (
        <div className="card card-list">
          {transactions.map((t) => (
            <div className="tx-row" key={t.id}>
              <span className="icon-badge tone-negative">
                <Receipt size={18} />
              </span>
              <span className="tx-main">
                <span className="tx-title">{t.description}</span>
                <span className="tx-sub">{t.date.slice(0, 10)}</span>
              </span>
              <span className="tx-amount text-negative">{currency(t.amount)}</span>
              <button
                type="button"
                className="icon-btn icon-btn-danger"
                onClick={() => handleDelete(t.id)}
                aria-label={`Delete ${t.description}`}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted cc-empty">No spend logged for this period.</p>
      )}

      {showAdd && (
        <AddSpendSheet
          card={card}
          error={error}
          onAdd={handleAdd}
          onClose={() => {
            setShowAdd(false);
            setError("");
          }}
        />
      )}
    </section>
  );
}

// Logged card spends are kept separate from the main ledger so nothing is
// double-counted; bills are paid on Home as expenses tagged "<card> bill".
// Each card compares the two. Owns its own state, data loading and period.
export default function CreditCardsPage({ navigate }) {
  const { transactions: ledgerVersion } = useLedger();
  const [data, setData] = useState({ cards: [], spends: [], bills: new Map(), estimates: new Map() });
  const [selectedMonths, setSelectedMonths] = useState(() => [currentMonth()]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showPeriod, setShowPeriod] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetchCardData(currentMonth())
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  // Reloads when a bill is paid from the + sheet, too.
  useEffect(load, [load, ledgerVersion]);

  const { cards } = data;
  const chartMonths = lastMonths(CHART_MONTHS, today());
  const compareFor = (card) =>
    compareMonths(chartMonths, data.spends.filter((s) => s.card_id === card.id), data.bills.get(card.id) || []);
  const paid = {};
  data.bills.forEach((bills, cardId) =>
    bills.forEach((b) => {
      paid[`${cardId}:${b.month}`] = (paid[`${cardId}:${b.month}`] || 0) + Number(b.amount);
    })
  );

  async function handleAddCard(card) {
    try {
      setError("");
      await createCreditCard(card);
      load();
      setShowAddCard(false);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDeleteCard(id) {
    if (!window.confirm("Remove this card and all of its logged transactions?")) return;
    try {
      setError("");
      await deleteCreditCard(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Credit cards"
        subtitle="Spends you log vs bills you pay"
        info="creditCards"
        onBack={() => navigate("more")}
      />
      <div className="page-body">
        {!showAddCard && <ErrorBanner message={error} onDismiss={() => setError("")} />}

        <div className="button-row">
          <button type="button" className="period-button" onClick={() => setShowPeriod(true)}>
            <CalendarDays size={16} /> {periodLabel(selectedMonths)}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setError("");
              setShowAddCard(true);
            }}
          >
            <Plus size={18} /> Add card
          </button>
        </div>

        {cards.length === 0 ? (
          <EmptyState icon={CreditCard}>No credit cards yet. Add one to start logging card spend.</EmptyState>
        ) : (
          cards.map((card, i) => (
            <CardSection
              key={card.id}
              card={card}
              index={i}
              months={selectedMonths}
              compare={compareFor(card)}
              estimate={data.estimates.get(card.id) || 0}
              onChanged={load}
              onDeleteCard={handleDeleteCard}
            />
          ))
        )}

        <div className="section-head">
          <h2>Bills paid</h2>
          <span className="muted">Last 6 months</span>
        </div>
        <div className="card">
          <CardUtilizationChart cards={cards} months={chartMonths} paid={paid} />
        </div>
      </div>

      {showAddCard && (
        <AddCardSheet
          error={error}
          onAdd={handleAddCard}
          onClose={() => {
            setShowAddCard(false);
            setError("");
          }}
        />
      )}
      {showPeriod && (
        <PeriodSheet selectedMonths={selectedMonths} onChange={setSelectedMonths} onClose={() => setShowPeriod(false)} />
      )}
    </>
  );
}
