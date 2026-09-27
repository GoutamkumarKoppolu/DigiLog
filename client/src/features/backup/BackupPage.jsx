import { useRef, useState } from "react";
import { CircleCheck, Download, Share2, Smartphone, TriangleAlert, Upload } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import BottomSheet from "../../components/ui/BottomSheet";
import ErrorBanner from "../../components/ui/ErrorBanner";
import { dateHeading, localDate, today } from "../../utils/format";
import { TABLE_LABELS, parseBackup } from "./backupFormat";
import { exportBackup, restoreBackup } from "./api";
import { isNative, saveTextFile, saveTextToDevice } from "../../platform/files";

const LAST_EXPORT_KEY = "expense-tracker.lastExport";

// "expense-tracker-backup-2026-09-27-1216.json": the time keeps several
// backups from the same day side by side.
function backupFileName() {
  const now = new Date();
  const hm = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  return `expense-tracker-backup-${today()}-${hm}.json`;
}

function readLastExport() {
  try {
    return localStorage.getItem(LAST_EXPORT_KEY);
  } catch {
    return null;
  }
}

// Import confirmation: what's in the file, and a clear "this replaces" warning.
function ImportSheet({ parsed, busy, exporting, error, onExportFirst, onConfirm, onClose }) {
  const { summary } = parsed;
  return (
    <BottomSheet
      title="Restore this backup?"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onExportFirst} disabled={busy || exporting}>
            {exporting ? "Exporting…" : "Export current first"}
          </button>
          <button type="button" className="btn btn-danger btn-block" onClick={onConfirm} disabled={busy}>
            {busy ? "Restoring…" : "Replace my data"}
          </button>
        </>
      }
    >
      <ErrorBanner message={error} />
      {summary.exportedAt && <p className="muted backup-meta">Backup from {dateHeading(localDate(summary.exportedAt))}</p>}
      <div className="card card-list backup-counts">
        {Object.entries(summary.counts).map(([table, count]) => (
          <div className="backup-count-row" key={table}>
            <span>{TABLE_LABELS[table]}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
      {summary.missingTables.length > 0 && (
        <p className="field-hint">
          This backup is from an older version of the app. {summary.missingTables.map((t) => TABLE_LABELS[t]).join(", ")} will
          start empty. Everything else is brought up to date automatically.
        </p>
      )}
      <div className="warning-note">
        <TriangleAlert size={18} aria-hidden="true" />
        <p>This replaces all the data on this device with the backup. Export your current data first if you might need it.</p>
      </div>
    </BottomSheet>
  );
}

export default function BackupPage({ navigate }) {
  const fileInput = useRef(null);
  const [lastExport, setLastExport] = useState(readLastExport);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState("");
  const [sheetError, setSheetError] = useState("");
  const [busy, setBusy] = useState(false);
  const [restored, setRestored] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedTo, setSavedTo] = useState("");

  // "device" saves into Documents/Expense Tracker (a download in a browser);
  // "share" opens the share sheet (Drive, WhatsApp, email…).
  async function handleExport(target = "device") {
    try {
      setExporting(true);
      setError("");
      setSheetError("");
      setSavedTo("");
      const backup = await exportBackup();
      const json = JSON.stringify(backup, null, 2);
      const name = backupFileName();
      let saved;
      if (target === "share") saved = await saveTextFile(name, json);
      else {
        setSavedTo(await saveTextToDevice(name, json));
        saved = true;
      }
      if (saved) {
        const now = new Date().toISOString();
        try {
          localStorage.setItem(LAST_EXPORT_KEY, now);
        } catch {
          // Only affects the "last exported" hint.
        }
        setLastExport(now);
      }
    } catch (e) {
      (parsed ? setSheetError : setError)(`Export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;
    try {
      setError("");
      setSheetError("");
      setParsed(parseBackup(await file.text()));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRestore() {
    try {
      setBusy(true);
      setSheetError("");
      await restoreBackup(parsed);
      setParsed(null);
      setRestored(true);
    } catch (e) {
      setSheetError(`Nothing was changed. ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Backup & restore" subtitle="Keep your data when you change phones" info="backup" onBack={() => navigate("more")} />
      <div className="page-body">
        <ErrorBanner message={error} onDismiss={() => setError("")} />

        {restored && (
          <div className="success-note" role="status">
            <CircleCheck size={20} aria-hidden="true" />
            <div>
              <p>Backup restored.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  // Fresh start so every page reloads the restored data.
                  window.location.hash = "/home";
                  window.location.reload();
                }}
              >
                Open the app
              </button>
            </div>
          </div>
        )}

        <section className="card backup-card">
          <span className="icon-badge tone-accent">
            <Download size={20} />
          </span>
          <h2>Export</h2>
          <p className="muted">
            Saves all your transactions, savings, recurring payments, budgets, borrowed & lent, credit cards, bills (with their files), options and theme to one file. Do this before uninstalling the app
            or changing phones. Save to phone puts the file in Documents › Expense Tracker; Share sends it to Drive, WhatsApp or email.
          </p>
          <p className="muted backup-meta">
            {lastExport ? `Last exported: ${dateHeading(localDate(lastExport))}` : "You haven't exported a backup on this device yet."}
          </p>
          {savedTo && (
            <div className="success-note" role="status">
              <CircleCheck size={20} aria-hidden="true" />
              <p>
                Saved to {savedTo}. To restore it later, tap Import backup and pick that file.
              </p>
            </div>
          )}
          {isNative() ? (
            <div className="button-row">
              <button type="button" className="btn btn-primary btn-block" onClick={() => handleExport("device")} disabled={exporting}>
                <Smartphone size={18} /> {exporting ? "Preparing…" : "Save to phone"}
              </button>
              <button type="button" className="btn btn-soft btn-block" onClick={() => handleExport("share")} disabled={exporting}>
                <Share2 size={18} /> Share
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-primary btn-block" onClick={() => handleExport("device")} disabled={exporting}>
              <Download size={18} /> {exporting ? "Preparing backup…" : "Download backup"}
            </button>
          )}
        </section>

        <section className="card backup-card">
          <span className="icon-badge tone-savings">
            <Upload size={20} />
          </span>
          <h2>Import</h2>
          <p className="muted">
            Restores a backup file into this app. Backups from older versions are upgraded automatically. You'll see what's in the
            file before anything changes.
          </p>
          <input ref={fileInput} type="file" className="visually-hidden" tabIndex={-1} aria-hidden="true" onChange={handleFile} />
          <button type="button" className="btn btn-soft btn-block" onClick={() => fileInput.current.click()}>
            <Upload size={18} /> Import backup
          </button>
        </section>
      </div>

      {parsed && (
        <ImportSheet
          parsed={parsed}
          busy={busy}
          error={sheetError}
          onExportFirst={() => handleExport("device")}
          exporting={exporting}
          onConfirm={handleRestore}
          onClose={() => {
            setParsed(null);
            setSheetError("");
          }}
        />
      )}
    </>
  );
}
