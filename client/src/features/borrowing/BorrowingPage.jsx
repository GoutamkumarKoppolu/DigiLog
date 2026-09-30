import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Handshake, Plus } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SegmentedControl from "../../components/ui/SegmentedControl";
import EmptyState from "../../components/ui/EmptyState";
import ErrorBanner from "../../components/ui/ErrorBanner";
import FormSheet from "../../components/ui/FormSheet";
import Money from "../../components/ui/Money";
import { currency } from "../../utils/format";
import { useLedger } from "../ledger";
import { fetchPots } from "../savings";
import {
  createPayment,
  createRecord,
  deletePayment,
  deleteRecord,
  fetchBorrowingData,
  setCompleted,
  updatePayment,
  updateRecord,
} from "./api";
import { DIRECTIONS, maxPayment, summarizeDirection } from "./domain";
import RecordCard from "./RecordCard";
import RecordForm from "./RecordForm";
import PaymentForm from "./PaymentForm";

const RECORD_FORM_ID = "borrow-record-form";
const PAYMENT_FORM_ID = "borrow-payment-form";
const TABS = Object.entries(DIRECTIONS).map(([value, m]) => ({ value, label: m.tab }));

// Money borrowed from people and lent to people, one tab each. Switching tabs
// isn't a level, so Back from either tab goes to More. `param` is a record id
// (from a Home row): that record opens, and Back closes it again.
export default function BorrowingPage({ navigate, param }) {
  const { movements, refresh: refreshLedger } = useLedger();
  const [direction, setDirection] = useState("borrowed");
  const meta = DIRECTIONS[direction];

  const [data, setData] = useState({ records: [], payments: [] });
  const [pots, setPots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  // null | { kind: "record", record? } | { kind: "payment", record, payment? }
  const [sheet, setSheet] = useState(null);

  const load = useCallback(
    () =>
      Promise.all([fetchBorrowingData(), fetchPots()])
        .then(([next, nextPots]) => {
          setData(next);
          setPots(nextPots);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false)),
    []
  );

  // Reloads after Repay/Received from the + sheet, too.
  useEffect(() => {
    load();
  }, [load, movements]);

  // Opening a record from Home; Back drops the param and closes it.
  const shownParam = useRef(null);
  useEffect(() => {
    const record = param && data.records.find((r) => String(r.id) === param);
    if (record && shownParam.current !== param) {
      shownParam.current = param;
      setDirection(record.direction);
      setShowCompleted(true);
      setOpenId(record.id);
      requestAnimationFrame(() => document.getElementById(`record-card-${record.id}`)?.scrollIntoView({ block: "center" }));
    } else if (!param && shownParam.current) {
      shownParam.current = null;
      setOpenId(null);
    }
  }, [param, data.records]);

  // Changes can move money in or out of the balance and savings, so Home
  // and Savings reload too.
  async function run(action) {
    try {
      setError("");
      await action();
      await load();
      refreshLedger();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  function open(next) {
    setError("");
    setSheet(next);
  }

  function close() {
    setSheet(null);
    setError("");
  }

  async function submit(action) {
    if (await run(action)) setSheet(null);
  }

  const { active, completed, totals } = summarizeDirection(data.records, data.payments, direction);

  async function handleSaveRecord(form) {
    const editing = sheet.record;
    let saved;
    const ok = await run(async () => (saved = editing ? await updateRecord(editing.id, form) : await createRecord(direction, form)));
    if (ok) {
      setSheet(null);
      setOpenId(saved.id);
    }
  }

  // Both work from the card and from inside the edit sheet.
  function handleDeleteRecord(r) {
    const count = r.payments.length;
    const extra = count ? ` and its ${count} payment${count === 1 ? "" : "s"}` : "";
    const linked = r.linked_to || r.payments.some((p) => p.linked_to);
    const undo = linked ? " Any money it moved in or out of your balance or savings is undone." : "";
    if (window.confirm(`Delete ${currency(r.amount)} with ${r.person}${extra}?${undo} This can't be undone.`)) submit(() => deleteRecord(r.id));
  }

  function handleDeletePayment(p) {
    const undo = p.linked_to ? " The money goes back to where it came from." : "";
    if (window.confirm(`Delete this ${currency(p.amount)} payment?${undo}`)) submit(() => deletePayment(p.id));
  }

  function toggleCompleted(record) {
    run(() => setCompleted(record.id, !record.completed));
  }

  const card = (r) => (
    <RecordCard
      key={r.id}
      record={r}
      meta={meta}
      open={openId === r.id}
      onToggle={() => setOpenId(openId === r.id ? null : r.id)}
      onAddPayment={(record) => open({ kind: "payment", record })}
      onOpenPayment={(record, payment) => open({ kind: "payment", record, payment })}
      onDeletePayment={handleDeletePayment}
      onEdit={(record) => open({ kind: "record", record })}
      onDelete={handleDeleteRecord}
      onToggleCompleted={toggleCompleted}
    />
  );

  return (
    <>
      <PageHeader title="Borrowed & lent" subtitle="Who owes what" info="borrowing" onBack={() => navigate("more")} />
      <div className="page-body">
        <SegmentedControl
          label="Borrowed or lent"
          options={TABS}
          value={direction}
          onChange={(value) => {
            setOpenId(null);
            setShowCompleted(false);
            setDirection(value);
          }}
        />

        {!sheet && <ErrorBanner message={error} onDismiss={() => setError("")} />}

        <div className="card savings-summary">
          <span className="muted">{meta.outstanding}</span>
          <div className="savings-summary-amount">
            <Money value={totals.remaining} className="big-amount" />
            {active.length > 0 && (
              <span className="muted">
                across {active.length} {active.length === 1 ? "person" : "people"}
              </span>
            )}
          </div>
        </div>

        <button type="button" className="btn btn-primary btn-block" onClick={() => open({ kind: "record" })}>
          <Plus size={18} /> {meta.add}
        </button>

        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            {active.length ? (
              <div className="budget-list">{active.map(card)}</div>
            ) : (
              <EmptyState icon={Handshake}>{completed.length ? "Nothing pending. Completed ones are below." : meta.empty}</EmptyState>
            )}

            {completed.length > 0 && (
              <>
                <button
                  type="button"
                  className={`section-toggle ${showCompleted ? "is-open" : ""}`}
                  aria-expanded={showCompleted}
                  onClick={() => setShowCompleted((v) => !v)}
                >
                  <span>Completed ({completed.length})</span>
                  <ChevronDown size={18} />
                </button>
                {showCompleted && <div className="budget-list">{completed.map(card)}</div>}
              </>
            )}
          </>
        )}
      </div>

      {sheet?.kind === "record" && (
        <FormSheet
          title={sheet.record ? "Edit" : meta.add}
          formId={RECORD_FORM_ID}
          submitLabel={sheet.record ? "Save changes" : "Save"}
          error={error}
          onClose={close}
          onDelete={sheet.record ? () => handleDeleteRecord(sheet.record) : null}
        >
          <RecordForm id={RECORD_FORM_ID} record={sheet.record} meta={meta} pots={pots} onSubmit={handleSaveRecord} />
        </FormSheet>
      )}

      {sheet?.kind === "payment" && (
        <FormSheet
          title={`${sheet.payment ? "Edit" : meta.addPayment} · ${sheet.record.person}`}
          formId={PAYMENT_FORM_ID}
          submitLabel={sheet.payment ? "Save changes" : "Save"}
          error={error}
          onClose={close}
          onDelete={sheet.payment ? () => handleDeletePayment(sheet.payment) : null}
        >
          <PaymentForm
            id={PAYMENT_FORM_ID}
            payment={sheet.payment}
            max={maxPayment(sheet.record, sheet.payment)}
            meta={meta}
            pots={pots}
            onSubmit={(form) =>
              submit(() => (sheet.payment ? updatePayment(sheet.payment.id, form) : createPayment(sheet.record.id, form)))
            }
          />
        </FormSheet>
      )}
    </>
  );
}
