import { useState } from "react";
import { FileText, Image, X } from "lucide-react";
import { fileSize } from "../../utils/format";
import { defaultBillName, pageKind } from "./domain";
import FilePickers from "./FilePickers";

const NEW_FOLDER = "new";

// Upload bills into a folder (an existing one, or a new one named here).
// Every chosen file becomes its own bill, named after the file; each name
// can be changed before saving. Submitted by the sheet's footer button via
// the `id`/`form` attribute.
export default function AddBillForm({ id, folders, initialFolderId, onSubmit, onCountChange }) {
  const [folder, setFolder] = useState(() => initialFolderId ?? folders[0]?.id ?? NEW_FOLDER);
  const [newFolderName, setNewFolderName] = useState("");
  const [items, setItems] = useState([]); // [{ key, file, name }]

  function update(next) {
    setItems(next);
    onCountChange?.(next.length);
  }

  function addFiles(picked) {
    const stamp = Date.now();
    update([...items, ...picked.map((file, i) => ({ key: `${stamp}-${i}`, file, name: defaultBillName(file.name) }))]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      items: items.map((it) => ({ name: it.name.trim(), file: it.file })),
      ...(folder === NEW_FOLDER ? { newFolderName: newFolderName.trim() } : { folderId: folder }),
    });
  }

  return (
    <form autoComplete="off" id={id} className="form" onSubmit={handleSubmit}>
      <div className="field">
        <span className="field-label">Folder</span>
        <div className="chip-group" role="radiogroup" aria-label="Folder">
          {folders.map((f) => (
            <button
              type="button"
              key={f.id}
              role="radio"
              aria-checked={folder === f.id}
              className={`chip ${folder === f.id ? "is-active" : ""}`}
              onClick={() => setFolder(f.id)}
            >
              {f.name}
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={folder === NEW_FOLDER}
            className={`chip ${folder === NEW_FOLDER ? "is-active" : ""}`}
            onClick={() => setFolder(NEW_FOLDER)}
          >
            + New folder
          </button>
        </div>
      </div>

      {folder === NEW_FOLDER && (
        <label className="field">
          <span className="field-label">New folder name</span>
          <input
            className="input"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="e.g. Electricity, Car service"
            enterKeyHint="done"
            required
          />
        </label>
      )}

      <div className="field">
        <span className="field-label">Bills</span>
        {items.length > 0 && (
          <div className="card card-list upload-list">
            {items.map((it, i) => (
              <div className="upload-row" key={it.key}>
                <span className="icon-badge tone-accent">
                  {pageKind(it.file.type) === "pdf" ? <FileText size={18} /> : <Image size={18} />}
                </span>
                <span className="upload-text">
                  <input
                    className="input upload-name-input"
                    value={it.name}
                    onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    aria-label={`Name for ${it.file.name}`}
                    enterKeyHint="done"
                    required
                  />
                  <span className="upload-meta">
                    {it.file.name} · {fileSize(it.file.size)}
                  </span>
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => update(items.filter((_, j) => j !== i))}
                  aria-label={`Remove ${it.file.name}`}
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
        <FilePickers onPick={addFiles} chooseLabel={items.length ? "Add more" : "Choose files"} />
        <span className="field-hint">
          Each photo or PDF is saved as its own bill, at its original size. To keep several pages together, open a bill and use Add
          pages.
        </span>
      </div>
    </form>
  );
}
