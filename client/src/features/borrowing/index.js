// "Borrowed & lent" feature entry point: registers its linked records and
// payments as ledger movements (so they change the balance and savings) and
// exposes its page and the + sheet's Repay / Received entries. Import the
// feature from here.
import { registerMovementSource } from "../../api";
import { fetchBorrowMovements } from "./api";

registerMovementSource(fetchBorrowMovements);

export { default as BorrowingPage } from "./BorrowingPage";
export { useBorrowEntries } from "./useBorrowEntries";
