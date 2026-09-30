// The label shown over a tapped chart column: what each mark is and its
// value, e.g. "Paid ₹2,000". Put it inside the column (position: relative).
// `index` / `count` place it so it stays inside the chart at the edges.
// lines: [{ key, label, value, swatch? (style for the mark's key swatch) }]
export default function ChartTip({ title, lines, index = 0, count = 1 }) {
  const align = index < 2 ? "start" : index > count - 3 ? "end" : "center";
  return (
    <span className={`chart-tip chart-tip-${align}`} role="status">
      {title && <span className="chart-tip-title">{title}</span>}
      {lines.map((l) => (
        <span className="chart-tip-line" key={l.key}>
          {l.swatch && <span className="chart-tip-swatch" style={l.swatch} aria-hidden="true" />}
          <span className="chart-tip-label">{l.label}</span>
          <strong>{l.value}</strong>
        </span>
      ))}
    </span>
  );
}
