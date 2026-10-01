// Subscriptions entry point: the page, and the invisible component that keeps
// renewal reminders scheduled (App renders it once). Tracking only; nothing
// here touches the ledger. Subscriptions charged to a credit card add to
// that card's estimated bill.
import { registerCardEstimateSource } from "../cards";
import { fetchSubscriptionEstimates } from "./api";

registerCardEstimateSource(fetchSubscriptionEstimates);

export { default as SubscriptionsPage } from "./SubscriptionsPage";
export { default as SubscriptionReminders } from "./SubscriptionReminders";
