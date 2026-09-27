import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import ErrorBanner from "../../components/ui/ErrorBanner";
import { useLedger } from "../ledger";
import { KIND_LABELS, TRANSACTION_KINDS } from "../../domain/transactions";

// One settings group: a list of options with remove buttons and an add row.
// `withKind` adds the earning/expense/saving picker used by transaction types.
function OptionGroup({ title, kind, options, placeholder, withKind, onAdd, onDelete }) {
  const [name, setName] = useState("");
  const [typeKind, setTypeKind] = useState("expense");

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const ok = await onAdd(kind, withKind ? { name: name.trim(), kind: typeKind } : name.trim());
    if (ok) setName("");
  }

  return (
    <section className="settings-group">
      <h2 className="settings-group-title">{title}</h2>
      <div className="card card-list">
        {options.map((o) => (
          <div className="list-row" key={o.id}>
            <span className="list-row-text">
              <span className="list-row-title">{o.name}</span>
            </span>
            {withKind && <span className={`pill kind-${o.kind}`}>{KIND_LABELS[o.kind] || o.kind}</span>}
            <button
              type="button"
              className="icon-btn icon-btn-danger"
              onClick={() => onDelete(kind, o.id)}
              aria-label={`Remove ${o.name}`}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {!options.length && <p className="muted list-empty">Nothing here yet.</p>}
        <form autoComplete="off" className="option-add" onSubmit={handleAdd}>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={placeholder}
            aria-label={`New ${title.toLowerCase()}`}
          />
          {withKind && (
            <select className="input" value={typeKind} onChange={(e) => setTypeKind(e.target.value)} aria-label="Kind">
              {TRANSACTION_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          )}
          <button type="submit" className="icon-btn icon-btn-filled" aria-label={`Add ${title.toLowerCase()}`}>
            <Plus size={20} />
          </button>
        </form>
      </div>
    </section>
  );
}

export default function SettingsPage({ navigate }) {
  const { options, addOption, removeOption, error, setError } = useLedger();

  return (
    <>
      <PageHeader title="Manage options" subtitle="Types, payment methods and sources" onBack={() => navigate("more")} />
      <div className="page-body">
        <ErrorBanner message={error} onDismiss={() => setError("")} />
        <OptionGroup
          title="Transaction types"
          kind="transaction-types"
          placeholder="New type"
          options={options["transaction-types"]}
          withKind
          onAdd={addOption}
          onDelete={removeOption}
        />
        <OptionGroup
          title="Payment methods"
          kind="payment-methods"
          placeholder="New payment method"
          options={options["payment-methods"]}
          onAdd={addOption}
          onDelete={removeOption}
        />
        <OptionGroup
          title="Payment sources"
          kind="payment-sources"
          placeholder="New payment source"
          options={options["payment-sources"]}
          onAdd={addOption}
          onDelete={removeOption}
        />
      </div>
    </>
  );
}
