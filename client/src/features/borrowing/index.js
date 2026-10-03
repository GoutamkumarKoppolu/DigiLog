// "Borrowed & lent" feature entry point: registers its linked records and
// payments as ledger movements (so they change the balance and savings) and
// exposes its page and the + sheet's Repay / Received entries. Import the
// feature from here.
import { registerMovementSource, registerTransactionDependents } from "../../api";
import { fetchBorrowMovements, removeFundingFor } from "./api";

registerMovementSource(fetchBorrowMovements);
registerTransactionDependents(removeFundingFor);

export { default as BorrowingPage } from "./BorrowingPage";
export { useBorrowEntries } from "./useBorrowEntries";
export { createRecord, fetchLenders } from "./api";
