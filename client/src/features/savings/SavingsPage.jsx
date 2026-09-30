import { useCallback, useEffect, useState } from "react";
import { HandCoins } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import BottomSheet from "../../components/ui/BottomSheet";
import ErrorBanner from "../../components/ui/ErrorBanner";
import { useLedger } from "../ledger";
import { currency } from "../../utils/format";
import { createWithdrawal, deleteWithdrawal, fetchSavingsData } from "./api";
import { buildHistory, computePots, summarizePots } from "./domain";
import SavingsSummary from "./SavingsSummary";
import PotList from "./PotList";
import WithdrawalForm from "./WithdrawalForm";
import SavingsHistory from "./SavingsHistory";

const WITHDRAW_FORM_ID = "withdraw-form";

// Self-contained feature page: owns its state and data loading. Reloads when
// the ledger changes (e.g. a Saving added via the + button).
export default function SavingsPage() {
  const { transactions: ledgerVersion, movements, refresh: refreshLedger } = useLedger();
  const [data, setData] = useState({ savings: [], withdrawals: [], movements: [] });
  const [selectedTag, setSelectedTag] = useState("");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetchSavingsData()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load, ledgerVersion, movements]);

  const pots = computePots(data.savings, data.withdrawals, data.movements);
  const summary = summarizePots(pots);
  const history = buildHistory(data.savings, data.withdrawals, data.movements, selectedTag);
  const canWithdraw = pots.some((p) => p.remaining > 0);

  // Withdrawals change Overall Savings on Home, so refresh the ledger too.
  async function mutate(action) {
    try {
      setError("");
      await action();
      load();
      refreshLedger();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  async function handleWithdraw(form) {
    if (await mutate(() => createWithdrawal(form))) setShowWithdraw(false);
  }

  function handleDeleteWithdrawal(id) {
    if (window.confirm("Delete this entry? The money goes back into its pot.")) mutate(() => deleteWithdrawal(id));
  }

  return (
    <>
      <PageHeader title="Savings" subtitle={`${currency(summary.remaining)} available`} info="savings" />
      <div className="page-body">
        {!showWithdraw && <ErrorBanner message={error} onDismiss={() => setError("")} />}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            <SavingsSummary summary={summary} />

            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={!canWithdraw}
              onClick={() => {
                setError("");
                setShowWithdraw(true);
              }}
            >
              <HandCoins size={18} /> Use savings
            </button>

            <div className="section-head">
              <h2>Pots</h2>
              <span className="muted">Tap a pot to see its history</span>
            </div>
            <PotList pots={pots} selectedTag={selectedTag} onSelect={setSelectedTag} />

            <div className="section-head">
              <h2>History{selectedTag && ` · ${selectedTag}`}</h2>
              {selectedTag && (
                <button type="button" className="link-btn" onClick={() => setSelectedTag("")}>
                  Show all
                </button>
              )}
            </div>
            <SavingsHistory entries={history} onDeleteWithdrawal={handleDeleteWithdrawal} />
          </>
        )}
      </div>

      {showWithdraw && (
        <BottomSheet
          title="Use savings"
          onClose={() => {
            // An error from a failed attempt belongs to the sheet, not the page.
            setShowWithdraw(false);
            setError("");
          }}
          footer={
            <button type="submit" form={WITHDRAW_FORM_ID} className="btn btn-primary btn-block">
              Use savings
            </button>
          }
        >
          <ErrorBanner message={error} />
          <WithdrawalForm id={WITHDRAW_FORM_ID} pots={pots} initialTag={selectedTag} onSubmit={handleWithdraw} />
        </BottomSheet>
      )}
    </>
  );
}
