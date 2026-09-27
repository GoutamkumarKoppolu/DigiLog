import { useEffect } from "react";
import { fetchSubscriptions } from "./api";
import { onReminderTapped, syncReminders } from "./reminders";

// Invisible: keeps renewal reminders scheduled a few months ahead. Syncs when
// the app opens and whenever it comes back to the foreground; tapping a
// reminder opens the Subscriptions page. Reminders are cosmetic, so a
// failure here never gets in the way.
export default function SubscriptionReminders() {
  useEffect(() => {
    const sync = () => fetchSubscriptions().then(syncReminders).catch(() => {});
    const onVisible = () => document.visibilityState === "visible" && sync();
    sync();
    document.addEventListener("visibilitychange", onVisible);
    const stopListening = onReminderTapped(() => {
      window.location.hash = "/subscriptions";
    });
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      stopListening();
    };
  }, []);

  return null;
}
