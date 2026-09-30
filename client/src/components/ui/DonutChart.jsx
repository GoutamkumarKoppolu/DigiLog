// Donut chart. segments: [{ key, value, color, label? }]; children render in
// the hole. With `onSelect`, tapping a segment selects it (tap again to clear)
// and the others fade, so the hole can show the selected one's figures.
export default function DonutChart({ segments, size = 220, stroke = 30, gap = 0.012, label, selected = null, onSelect, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  const visibleGap = segments.length > 1 ? gap : 0;
  let offset = 0;

  return (
    <div className="donut" style={{ width: size, height: size }} role={onSelect ? "group" : "img"} aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden={!onSelect}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        {total > 0 &&
          segments.map((s) => {
            const share = s.value / total;
            const len = Math.max(0, share - visibleGap) * c;
            const el = (
              <circle
                key={s.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${len} ${c}`}
                strokeDashoffset={-offset * c}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className={`donut-segment ${selected && selected !== s.key ? "is-faded" : ""}`}
                {...(onSelect && {
                  role: "button",
                  tabIndex: 0,
                  "aria-label": s.label || s.key,
                  "aria-pressed": selected === s.key,
                  onClick: () => onSelect(selected === s.key ? null : s.key),
                  onKeyDown: (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(selected === s.key ? null : s.key);
                    }
                  },
                })}
              />
            );
            offset += share;
            return el;
          })}
      </svg>
      <div className="donut-center">{children}</div>
    </div>
  );
}
