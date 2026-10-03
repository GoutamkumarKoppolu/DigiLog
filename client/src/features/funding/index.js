// Funding entry point: the "Not enough balance" sheet that asks where the
// rest of an expense came from (savings and/or borrowed). App passes it to
// the add/edit sheet; without it, such a transaction is just refused.
export { default as FundingSheet } from "./FundingSheet";
