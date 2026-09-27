import { useState } from "react";

// One name field (new folder, rename folder). Submitted by the sheet's
// footer button via the `id`/`form` attribute.
export default function NameForm({ id, label, initialName = "", placeholder, onSubmit }) {
  const [name, setName] = useState(initialName);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(name.trim());
  }

  return (
    <form autoComplete="off" id={id} className="form" onSubmit={handleSubmit}>
      <label className="field">
        <span className="field-label">{label}</span>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          required
          autoFocus
        />
      </label>
    </form>
  );
}
