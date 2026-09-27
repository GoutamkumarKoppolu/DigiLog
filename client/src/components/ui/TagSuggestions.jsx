// Tag suggestions as tappable chips under a tag field: while typing, the tags
// that contain the text; otherwise (empty, or an existing tag picked) the most
// recent ones, with the picked one highlighted. Use this instead of a
// <datalist>, which Android shows in the keyboard's suggestion strip.
export default function TagSuggestions({ value, tags, onPick, limit = 8, label = "Tag suggestions" }) {
  const q = value.trim().toLowerCase();
  const exact = tags.some((t) => t.toLowerCase() === q);
  const list = (q && !exact ? tags.filter((t) => t.toLowerCase().includes(q)) : tags).slice(0, limit);
  if (!list.length) return null;

  return (
    <div className="chip-group chip-group-scroll" aria-label={label}>
      {list.map((t) => (
        <button
          type="button"
          key={t}
          aria-pressed={t.toLowerCase() === q}
          className={`chip chip-sm ${t.toLowerCase() === q ? "is-active" : ""}`}
          onClick={() => onPick(t)}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
