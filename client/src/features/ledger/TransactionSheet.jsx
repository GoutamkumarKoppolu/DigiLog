import { Fragment, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import BottomSheet from "../../components/ui/BottomSheet";
import ErrorBanner from "../../components/ui/ErrorBanner";
import KindChips from "./KindChips";
import TransactionForm from "./TransactionForm";
import { useLedger } from "./ledgerContext";
import { shortfallFor } from "../../api";
import { balanceEffect } from "../../domain/transactions";

const FORM_ID = "transaction-form";

// Add (transaction = null) or edit/delete a ledger transaction. When adding,
// `entries` from other features show as extra Type chips (e.g. Repay); each
// renders its own form: { id, label, render({ formId, amount, kindChips,
// onDone, onError }) }. `tagGroups` / `tagHints` / `tagPicks` go to TransactionForm.
// `onSaved(row, { created })` gets the saved transaction (with `type_kind`)
// after the sheet closes, e.g. to follow a new salary with its summary.
// `Funding` (a component) asks where the rest came from when a transaction
// needs more than the balance has; without it, the save is just refused.
export default function TransactionSheet({ transaction, entries = [], tagGroups = [], tagHints = [], tagPicks = [], Funding, onSaved, onClose }) {
  const { options, tags, overview, error, setError, saveTransaction, removeTransaction, refresh } = useLedger();
  // { data, short } while the Funding sheet is open on top.
  const [funding, setFunding] = useState(null);
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

  function saved(row) {
    onClose();
    onSaved?.(row, { created: !transaction });
  }

  async function handleSubmit(data) {
    const kind = options["transaction-types"].find((t) => t.name === data.type)?.kind ?? null;
    const row = { ...data, type_kind: kind };
    // Spending more than the balance has: ask where the rest came from.
    if (Funding && balanceEffect(row) < 0) {
      try {
        setError("");
        const short = await shortfallFor(data, transaction?.id);
        if (short > 0) return setFunding({ data: row, short });
      } catch (e) {
        return setError(e.message);
      }
    }
    if (await saveTransaction(data, transaction?.id)) saved(row);
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
    <>
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
            tagGroups={tagGroups}
            tagHints={tagHints}
            tagPicks={tagPicks}
            onPickExtra={(extra, amount) => switchTo({ extra, type: "", amount })}
          />
        )}
      </BottomSheet>
      {funding && (
        <Funding
          data={funding.data}
          id={transaction?.id}
          short={funding.short}
          balance={overview.balance}
          onClose={() => setFunding(null)}
          onSaved={(row) => {
            refresh();
            saved({ ...funding.data, ...row });
          }}
        />
      )}
    </>
  );
}
