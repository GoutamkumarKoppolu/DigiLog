// Savings feature entry point: wires the feature into the core ledger and
// exposes its page. Import the feature from here, not from its inner files.
import { registerTransactionGuard } from "../../api";
import { guardSavingsPots } from "./api";

registerTransactionGuard(guardSavingsPots);

export { default as SavingsPage } from "./SavingsPage";
export { checkPots, fetchPots } from "./api";
