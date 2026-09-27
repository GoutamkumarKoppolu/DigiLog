// Renewal reminders as phone notifications (Android app only). They're
// scheduled on the phone with the Local Notifications plugin, so they work
// offline and even when the app is closed. Every sync replaces this feature's
// pending reminders with a fresh set from upcomingReminders().
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { currency } from "../../utils/format";
import { REMINDER_ID_BASE, upcomingReminders } from "./domain";

const CHANNEL = "subscriptions";
const PAGE = "subscriptions";

export const remindersSupported = () => Capacitor.isNativePlatform();

// "granted" | "denied" | "prompt" | "unsupported"
export async function reminderPermission() {
  if (!remindersSupported()) return "unsupported";
  const { display } = await LocalNotifications.checkPermissions();
  return display === "granted" ? "granted" : display === "denied" ? "denied" : "prompt";
}

// Asks for notification permission (Android 13+ shows a prompt once).
export async function askReminderPermission() {
  if (!remindersSupported()) return "unsupported";
  const { display } = await LocalNotifications.requestPermissions();
  return display === "granted" ? "granted" : "denied";
}

const localNow = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toDate = (at) => {
  const [date, time] = at.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, min);
};

let channelReady = false;

// Replaces the scheduled reminders. Never asks for permission itself (it runs
// on app start); does nothing without it. Resolves to how many are scheduled.
// Calls run one after another (app start and the page can both sync at once),
// so one sync's cancel can't land in the middle of another's schedule.
let queue = Promise.resolve();
export function syncReminders(subscriptions) {
  const next = queue.then(() => replaceReminders(subscriptions));
  queue = next.catch(() => {});
  return next;
}

async function replaceReminders(subscriptions) {
  if (!remindersSupported() || (await reminderPermission()) !== "granted") return 0;
  if (!channelReady) {
    await LocalNotifications.createChannel({ id: CHANNEL, name: "Subscription reminders", importance: 3 }).catch(() => {});
    channelReady = true;
  }
  const { notifications: pending } = await LocalNotifications.getPending();
  const ours = pending.filter((n) => n.id >= REMINDER_ID_BASE);
  if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });

  const list = upcomingReminders(subscriptions, localNow(), { formatAmount: currency });
  if (!list.length) return 0;
  await LocalNotifications.schedule({
    notifications: list.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      channelId: CHANNEL,
      schedule: { at: toDate(r.at), allowWhileIdle: true },
      extra: { page: PAGE },
    })),
  });
  return list.length;
}

// Tapping a reminder opens the Subscriptions page.
export function onReminderTapped(open) {
  if (!remindersSupported()) return () => {};
  const handle = LocalNotifications.addListener("localNotificationActionPerformed", ({ notification }) => {
    if (notification.extra?.page === PAGE) open();
  });
  return () => handle.then((h) => h.remove());
}
