import { useState } from "react";

// Rename a bill or move it to another folder. Submitted by the sheet's
// footer button via the `id`/`form` attribute.
export default function EditBillForm({ id, bill, folders, onSubmit }) {
  const [name, setName] = useState(bill.name);
  const [folderId, setFolderId] = useState(bill.folder_id);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ name: name.trim(), folderId });
  }

  return (
    <form autoComplete="off" id={id} className="form" onSubmit={handleSubmit}>
      <label className="field">
        <span className="field-label">Bill name</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <div className="field">
        <span className="field-label">Folder</span>
        <div className="chip-group" role="radiogroup" aria-label="Folder">
          {folders.map((f) => (
            <button
              type="button"
              key={f.id}
              role="radio"
              aria-checked={folderId === f.id}
              className={`chip ${folderId === f.id ? "is-active" : ""}`}
              onClick={() => setFolderId(f.id)}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
