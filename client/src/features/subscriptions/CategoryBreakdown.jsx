import { currency } from "../../utils/format";

// Monthly cost per category with a share bar, biggest first.
export default function CategoryBreakdown({ rows, total }) {
  return (
    <div className="card card-list">
      {rows.map((r, i) => (
        <div className="category-row" key={r.category}>
          <span className="category-row-text">
            <span className="category-row-name">{r.category}</span>
            <span className="muted">
              {r.count} subscription{r.count === 1 ? "" : "s"}
            </span>
          </span>
          <strong className="category-row-amount">{currency(r.monthly)}/mo</strong>
          <span className="bar-track category-row-bar">
            <span
              className="bar-fill"
              style={{ width: `${total ? (r.monthly / total) * 100 : 0}%`, background: `var(--cat-${(i % 8) + 1})` }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}
