// Savings feature entry point: wires the feature into the core ledger and
// exposes its page. Import the feature from here, not from its inner files.
import { registerMovementSource, registerTransactionDependents, registerTransactionGuard } from "../../api";
import { fetchSavingsMovements, guardSavingsPots, removeFundingFor } from "./api";

registerTransactionGuard(guardSavingsPots);
registerMovementSource(fetchSavingsMovements);
registerTransactionDependents(removeFundingFor);

export { default as SavingsPage } from "./SavingsPage";
export { checkPots, createWithdrawal, fetchPots } from "./api";
