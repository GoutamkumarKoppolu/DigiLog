import { useEffect, useState } from "react";
import { useLedger } from "../ledger";
import { fetchPots } from "../savings";
import { createPayment, fetchBorrowingData } from "./api";
import { DIRECTIONS, summarizeDirection } from "./domain";
import BorrowEntryForm from "./BorrowEntryForm";

// Extra entries for the + sheet: Repay (someone you borrowed from) and
// Received (someone you lent to), each only while someone is still open.
// Entry: { id, label, render({ formId, amount, kindChips, onDone, onError }) }.
export function useBorrowEntries() {
  const { movements } = useLedger();
  const [data, setData] = useState(null);

  // Reload whenever the ledger changes, e.g. after a repayment.
  useEffect(() => {
    let live = true;
    Promise.all([fetchBorrowingData(), fetchPots()])
      .then(([borrowing, pots]) => live && setData({ ...borrowing, pots }))
      .catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, [movements]);

  if (!data) return [];
  return Object.entries(DIRECTIONS)
    .map(([direction, meta]) => ({ meta, records: summarizeDirection(data.records, data.payments, direction).active }))
    .filter(({ records }) => records.length)
    .map(({ meta, records }) => ({
      id: meta.entry,
      label: meta.entry,
      render: ({ formId, amount, kindChips, onDone, onError }) => (
        <BorrowEntryForm
          id={formId}
          meta={meta}
          records={records}
          pots={data.pots}
          amount={amount}
          kindChips={kindChips}
          onSubmit={(recordId, payment) =>
            createPayment(recordId, payment)
              .then(onDone)
              .catch((e) => onError(e.message))
          }
        />
      ),
    }));
}
