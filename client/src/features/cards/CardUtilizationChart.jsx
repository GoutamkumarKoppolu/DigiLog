import { useState } from "react";
import ChartTip from "../../components/ui/ChartTip";
import { currency, periodLabel } from "../../utils/format";

// Fixed categorical order — colorblind-validated (adjacent ΔE ≥ 8 CVD, ≥ 15
// normal-vision on this app's light/dark surfaces). Never reassign a slot by
// rank; a card keeps its color as other cards are added/removed.
const CARD_COLOR_COUNT = 8;

const monthLabel = (month, year) =>
  new Date(`${month}-01T00:00:00`).toLocaleString("en-IN", year ? { month: "short", year: "2-digit" } : { month: "short" });

// Bills paid per card per month (the month the bill pays for), from Home
// expenses. `paid` maps "cardId:YYYY-MM" to the amount; `months` oldest first.
// Tap a month to label each card's bill and the total.
export default function CardUtilizationChart({ cards, months: monthKeys, paid }) {
  const [tip, setTip] = useState(null);
  if (!cards.length) {
    return <p className="muted">Add a credit card to see the bills you pay.</p>;
  }

  // Columns show "May"; the tap label and table say which year.
  const months = monthKeys.map((value) => ({ value, label: monthLabel(value, true), short: monthLabel(value, false) }));
  const byCardMonth = paid;

  const max = Math.max(
    1,
    ...cards.flatMap((card) => months.map((m) => byCardMonth[`${card.id}:${m.value}`] || 0))
  );

  return (
    <div className="cc-chart-wrap">
      <div className="cc-legend">
        {cards.map((card, i) => (
          <span className="cc-legend-item" key={card.id}>
            <span className="cc-swatch" style={{ background: `var(--cat-${(i % CARD_COLOR_COUNT) + 1})` }} />
            {card.name}
          </span>
        ))}
      </div>

      <div className="cc-chart" role="group" aria-label="Credit card bills paid per month, by card">
        {months.map((m, mi) => {
          const amount = (card) => byCardMonth[`${card.id}:${m.value}`] || 0;
          return (
            <button
              type="button"
              className={`cc-chart-month ${tip === m.value ? "is-selected" : ""}`}
              key={m.value}
              aria-pressed={tip === m.value}
              aria-label={`${m.label}: ${cards.map((card) => `${card.name} ${currency(amount(card))}`).join(", ")}`}
              onClick={() => setTip((t) => (t === m.value ? null : m.value))}
            >
              <span className="cc-chart-bars">
                {cards.map((card, i) => (
                  <span
                    key={card.id}
                    className="cc-chart-bar"
                    style={{
                      height: `${max ? (amount(card) / max) * 100 : 0}%`,
                      background: `var(--cat-${(i % CARD_COLOR_COUNT) + 1})`,
                    }}
                  />
                ))}
              </span>
              <span className="cc-chart-month-label">{m.short}</span>
              {tip === m.value && (
                <ChartTip
                  title={periodLabel([m.value])}
                  index={mi}
                  count={months.length}
                  lines={[
                    ...cards.map((card, i) => ({
                      key: card.id,
                      label: card.name,
                      value: currency(amount(card)),
                      swatch: { background: `var(--cat-${(i % CARD_COLOR_COUNT) + 1})` },
                    })),
                    ...(cards.length > 1
                      ? [{ key: "total", label: "Total", value: currency(cards.reduce((sum, card) => sum + amount(card), 0)) }]
                      : []),
                  ]}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="table-scroll">
      <table className="cc-utilization-table">
        <thead>
          <tr>
            <th>Month</th>
            {cards.map((card) => (
              <th key={card.id} className="amount-col">
                {card.name}
              </th>
            ))}
            <th className="amount-col">Total</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => {
            const monthTotal = cards.reduce(
              (sum, card) => sum + (byCardMonth[`${card.id}:${m.value}`] || 0),
              0
            );
            return (
              <tr key={m.value}>
                <td>{m.label}</td>
                {cards.map((card) => (
                  <td key={card.id} className="amount-col">
                    {currency(byCardMonth[`${card.id}:${m.value}`] || 0)}
                  </td>
                ))}
                <td className="amount-col cc-total-col">{currency(monthTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
