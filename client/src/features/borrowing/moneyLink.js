// Form state for MoneyLinkField: { linked_to: "balance" | "savings" | "note", pot }.
export const NOTE = "note";

// New entries start on Balance; saved ones show what they were (none = noted).
export const initialLink = (row) => ({ linked_to: row ? row.linked_to || NOTE : "balance", pot: row?.pot || "" });

// What the api expects: null linked_to means "just note it".
export const linkPayload = ({ linked_to, pot }) => ({ linked_to: linked_to === NOTE ? null : linked_to, pot });
