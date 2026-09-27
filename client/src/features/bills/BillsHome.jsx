import { useState } from "react";
import { FolderPlus, Plus, ReceiptText, Search } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import ErrorBanner from "../../components/ui/ErrorBanner";
import FormSheet from "../../components/ui/FormSheet";
import { fileSize } from "../../utils/format";
import { createFolder } from "./api";
import { searchBills } from "./domain";
import FolderGrid from "./FolderGrid";
import BillGrid from "./BillGrid";
import NameForm from "./NameForm";
import AddBillSheet from "./AddBillSheet";

const FOLDER_FORM_ID = "new-bill-folder-form";

// All folders, plus search across every bill.
export default function BillsHome({ folders, bills, error, setError, run, navigate, onOpenBill }) {
  const [sheet, setSheet] = useState(null); // null | "bill" | "folder"
  const [query, setQuery] = useState("");

  const results = query.trim() ? searchBills(bills, folders, query) : null;
  const folderName = new Map(folders.map((f) => [f.id, f.name]));
  const totalSize = folders.reduce((sum, f) => sum + f.size, 0);

  function open(kind) {
    setError("");
    setSheet(kind);
  }

  function close() {
    setSheet(null);
    setError("");
  }

  return (
    <>
      <PageHeader
        title="Bills"
        subtitle={bills.length ? `${bills.length} bill${bills.length === 1 ? "" : "s"} · ${fileSize(totalSize)}` : "Keep important bills in one place"}
        info="bills"
        onBack={() => navigate("more")}
      />
      <div className="page-body">
        {!sheet && <ErrorBanner message={error} onDismiss={() => setError("")} />}

        <div className="button-row">
          <button type="button" className="btn btn-primary btn-block" onClick={() => open("bill")}>
            <Plus size={18} /> Add bills
          </button>
          <button type="button" className="btn btn-soft btn-block" onClick={() => open("folder")}>
            <FolderPlus size={18} /> New folder
          </button>
        </div>

        {bills.length > 0 && (
          <label className="search-field">
            <Search size={18} />
            <input
              className="input"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search bills"
              aria-label="Search bills"
            />
          </label>
        )}

        {results ? (
          results.length ? (
            <BillGrid bills={results} folderName={folderName} onOpen={onOpenBill} />
          ) : (
            <EmptyState icon={Search}>No bills match “{query.trim()}”.</EmptyState>
          )
        ) : folders.length ? (
          <FolderGrid folders={folders} onOpen={(id) => navigate(`bills/${id}`)} />
        ) : (
          <EmptyState icon={ReceiptText}>
            No bills yet. Add a photo or PDF of a bill, warranty or receipt, and keep it in a folder.
          </EmptyState>
        )}
      </div>

      {sheet === "bill" && (
        <AddBillSheet
          folders={folders}
          error={error}
          run={run}
          onClose={close}
          onSaved={(saved) => {
            setSheet(null);
            navigate(`bills/${saved[0].folder_id}`);
          }}
        />
      )}

      {sheet === "folder" && (
        <FormSheet title="New folder" formId={FOLDER_FORM_ID} submitLabel="Create folder" error={error} onClose={close}>
          <NameForm
            id={FOLDER_FORM_ID}
            label="Folder name"
            placeholder="e.g. Electricity, Warranties"
            onSubmit={async (name) => {
              let folder;
              if (await run(async () => (folder = await createFolder(name)))) {
                setSheet(null);
                navigate(`bills/${folder.id}`);
              }
            }}
          />
        </FormSheet>
      )}
    </>
  );
}
