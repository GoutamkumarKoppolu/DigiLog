import { useCallback, useEffect, useState } from "react";
import { BellOff, ChevronDown, Plus, Tv } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import ErrorBanner from "../../components/ui/ErrorBanner";
import FormSheet from "../../components/ui/FormSheet";
import Money from "../../components/ui/Money";
import { currency, today as todayDate } from "../../utils/format";
import { createSubscription, deleteSubscription, fetchSubscriptions, setCancelled, updateSubscription } from "./api";
import { CATEGORY_PRESETS, byCategory, summarize, suggestions } from "./domain";
import { askReminderPermission, reminderPermission, syncReminders } from "./reminders";
import SubscriptionCard from "./SubscriptionCard";
import SubscriptionForm from "./SubscriptionForm";
import { fetchCreditCards } from "../cards";
import CategoryBreakdown from "./CategoryBreakdown";

const FORM_ID = "subscription-form";

const REMINDER_NOTES = {
  granted: "A notification at 9 AM on your phone.",
  prompt: "A notification at 9 AM. Your phone will ask to allow notifications.",
  denied: "Notifications are off for this app. Turn them on in Android Settings › Apps › Expense Tracker.",
  unsupported: "Reminders work in the Android app.",
};

// Subscriptions tracked by hand (Netflix, Spotify, iCloud…): what each costs,
// how it's paid, when it renews, with reminders on the phone. Tracking only;
// nothing here changes the balance.
export default function SubscriptionsPage({ navigate }) {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [sheet, setSheet] = useState(null); // null | { subscription? }
  const [permission, setPermission] = useState("unsupported");
  // For "Charged to a credit card" in the form.
  const [cards, setCards] = useState([]);
  const today = todayDate();

  const load = useCallback(
    () =>
      fetchSubscriptions()
        .then((rows) => {
          setSubs(rows);
          return rows;
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
    reminderPermission().then(setPermission).catch(() => {});
    fetchCreditCards().then(setCards).catch(() => {});
  }, [load]);

  // Saves, then reschedules reminders (asking for permission the first time
  // a reminder or trial is set).
  async function run(action, { wantsReminder = false } = {}) {
    try {
      setError("");
      await action();
      let perm = permission;
      if (wantsReminder && perm === "prompt") {
        perm = await askReminderPermission();
        setPermission(perm);
      }
      const rows = await load();
      await syncReminders(rows).catch(() => {});
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  const { soon, later, cancelled, totals } = summarize(subs, today);
  const categories = byCategory(subs, today);
  const remindersOn = subs.some((s) => !s.cancelled_at && (s.remind !== "off" || s.trial_end));

  async function handleSave(form) {
    const editing = sheet.subscription;
    let saved;
    const ok = await run(async () => (saved = editing ? await updateSubscription(editing.id, form) : await createSubscription(form)), {
      wantsReminder: form.remind !== "off" || Boolean(form.trial_end),
    });
    if (ok) {
      setSheet(null);
      setOpenId(saved.id);
    }
  }

  function handleDelete(s) {
    if (window.confirm(`Delete "${s.name}"? Its reminders are removed too. This can't be undone.`)) {
      run(() => deleteSubscription(s.id)).then((ok) => ok && setSheet(null));
    }
  }

  function handleCancel(s, cancel) {
    const text = cancel
      ? `Mark "${s.name}" as cancelled? It stays in the list under Cancelled, and reminders stop.`
      : `Restart "${s.name}"? Its reminders start again.`;
    if (window.confirm(text)) run(() => setCancelled(s.id, cancel ? todayDate() : null), { wantsReminder: !cancel });
  }

  const card = (s) => (
    <SubscriptionCard
      key={s.id}
      subscription={s}
      today={today}
      open={openId === s.id}
      onToggle={() => setOpenId(openId === s.id ? null : s.id)}
      onEdit={(sub) => {
        setError("");
        setSheet({ subscription: sub });
      }}
      onCancel={handleCancel}
      onDelete={handleDelete}
    />
  );

  const section = (title, list) =>
    list.length > 0 && (
      <section className="tag-section">
        <div className="section-head">
          <h2>{title}</h2>
        </div>
        <div className="budget-list">{list.map(card)}</div>
      </section>
    );

  return (
    <>
      <PageHeader title="Subscriptions" subtitle="Tracking only · not linked to your balance" info="subscriptions" onBack={() => navigate("more")} />
      <div className="page-body">
        {!sheet && <ErrorBanner message={error} onDismiss={() => setError("")} />}

        {totals.activeCount > 0 && (
          <div className="card savings-summary">
            <span className="muted">You pay for subscriptions</span>
            <div className="savings-summary-amount">
              <Money value={totals.monthly} className="big-amount" />
              <span className="muted">a month</span>
            </div>
            <span className="muted">
              {currency(totals.yearly)} a year · {totals.activeCount} active
              {totals.trialCount > 0 && ` · ${totals.trialCount} on free trial`}
            </span>
            <div className="mini-stats">
              <div>
                <span className="muted">Renewing in 7 days</span>
                <strong>
                  {totals.soonCount ? (
                    <>
                      {currency(totals.soonAmount)} <span className="muted">({totals.soonCount})</span>
                    </>
                  ) : (
                    "Nothing"
                  )}
                </strong>
              </div>
              <div>
                <span className="muted">Categories</span>
                <strong>{categories.length}</strong>
              </div>
            </div>
          </div>
        )}

        {remindersOn && permission === "denied" && (
          <div className="warning-note">
            <BellOff size={18} aria-hidden="true" />
            <p>{REMINDER_NOTES.denied}</p>
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => {
            setError("");
            setSheet({});
          }}
        >
          <Plus size={18} /> Add subscription
        </button>

        {loading ? (
          <p className="muted">Loading…</p>
        ) : subs.length === 0 ? (
          <EmptyState icon={Tv}>
            No subscriptions yet. Add Netflix, Spotify, iCloud and the rest to see what they cost and get reminded before they
            renew.
          </EmptyState>
        ) : (
          <>
            {section("Renewing in the next 7 days", soon)}
            {section("Later", later)}

            {categories.length > 1 && (
              <section className="tag-section">
                <div className="section-head">
                  <h2>By category</h2>
                </div>
                <CategoryBreakdown rows={categories} total={totals.monthly} />
              </section>
            )}

            {cancelled.length > 0 && (
              <>
                <button
                  type="button"
                  className={`section-toggle ${showCancelled ? "is-open" : ""}`}
                  aria-expanded={showCancelled}
                  onClick={() => setShowCancelled((v) => !v)}
                >
                  <span>Cancelled ({cancelled.length})</span>
                  <ChevronDown size={18} />
                </button>
                {showCancelled && <div className="budget-list">{cancelled.map(card)}</div>}
              </>
            )}
          </>
        )}
      </div>

      {sheet && (
        <FormSheet
          title={sheet.subscription ? "Edit subscription" : "Add subscription"}
          formId={FORM_ID}
          submitLabel={sheet.subscription ? "Save changes" : "Save"}
          error={error}
          onClose={() => {
            setSheet(null);
            setError("");
          }}
          onDelete={sheet.subscription ? () => handleDelete(sheet.subscription) : null}
        >
          <SubscriptionForm
            id={FORM_ID}
            subscription={sheet.subscription}
            methods={suggestions(subs.map((s) => s.payment_method))}
            categories={suggestions(
              subs.map((s) => s.category),
              CATEGORY_PRESETS
            )}
            remindersNote={REMINDER_NOTES[permission]}
            cards={cards}
            onSubmit={handleSave}
          />
        </FormSheet>
      )}
    </>
  );
}
