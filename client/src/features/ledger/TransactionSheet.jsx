import { Fragment, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import BottomSheet from "../../components/ui/BottomSheet";
import ErrorBanner from "../../components/ui/ErrorBanner";
import KindChips from "./KindChips";
import TransactionForm from "./TransactionForm";
import { useLedger } from "./ledgerContext";

const FORM_ID = "transaction-form";

// Add (transaction = null) or edit/delete a ledger transaction. When adding,
// `entries` from other features show as extra Type chips (e.g. Repay); each
// renders its own form: { id, label, render({ formId, amount, kindChips,
// onDone, onError }) }.
export default function TransactionSheet({ transaction, entries = [], onClose }) {
  const { options, tags, error, setError, saveTransaction, removeTransaction, refresh } = useLedger();
  // Which chip is picked; the amount is carried over when switching.
  const [mode, setMode] = useState({ extra: null, type: "", amount: "" });
  const extras = transaction ? [] : entries;
  const entry = extras.find((e) => e.id === mode.extra);

  // Don't carry an error from the page into the sheet, or back out of it.
  useEffect(() => {
    setError("");
    return () => setError("");
  }, [setError]);

  function switchTo(next) {
    setError("");
    setMode(next);
  }

  async function handleSubmit(data) {
    if (await saveTransaction(data, transaction?.id)) onClose();
  }

  async function handleDelete() {
    if (!window.confirm("Delete this transaction?")) return;
    if (await removeTransaction(transaction.id)) onClose();
  }

  const kindChips = (amount) => (
    <KindChips
      types={options["transaction-types"]}
      extras={extras}
      extra={mode.extra}
      onPickType={(type) => switchTo({ extra: null, type, amount })}
      onPickExtra={(extra) => switchTo({ extra, type: "", amount })}
    />
  );

  return (
    <BottomSheet
      title={transaction ? "Edit transaction" : "Add transaction"}
      onClose={onClose}
      footer={
        <>
          {transaction && (
            <button type="button" className="btn btn-danger-ghost" onClick={handleDelete}>
              <Trash2 size={18} /> Delete
            </button>
          )}
          <button type="submit" form={FORM_ID} className="btn btn-primary btn-block">
            {transaction ? "Save changes" : entry ? "Save" : "Add transaction"}
          </button>
        </>
      }
    >
      <ErrorBanner message={error} />
      {entry ? (
        <Fragment key={entry.id}>
          {entry.render({
            formId: FORM_ID,
            amount: mode.amount,
            kindChips,
            onDone: () => {
              refresh();
              onClose();
            },
            onError: setError,
          })}
        </Fragment>
      ) : (
        <TransactionForm
          key={mode.type}
          id={FORM_ID}
          transaction={transaction}
          transactionTypes={options["transaction-types"]}
          paymentMethods={options["payment-methods"]}
          paymentSources={options["payment-sources"]}
          existingTags={tags}
          onSubmit={handleSubmit}
          seed={mode}
          extras={extras}
          onPickExtra={(extra, amount) => switchTo({ extra, type: "", amount })}
        />
      )}
    </BottomSheet>
  );
}
