import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addOption,
  createTransaction,
  deleteOption,
  deleteTransaction,
  fetchAllOptions,
  fetchMovements,
  fetchOverview,
  fetchTags,
  fetchTransactions,
  updateTransaction,
} from "../../api";
import { LedgerContext, defaultFilters } from "./ledgerContext";

// Shared main-ledger state (transactions, filters, options, overview) for
// every page that needs it. Pages read it with useLedger() instead of
// having App.jsx thread props through.

const emptyOptions = { "transaction-types": [], "payment-methods": [], "payment-sources": [] };
const emptyOverview = { totalEarnings: 0, totalExpenses: 0, totalSavings: 0, balance: 0 };

export function LedgerProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  // All movements (e.g. repayments), newest first. Home filters them itself.
  const [movements, setMovements] = useState([]);
  const [tags, setTags] = useState([]);
  const [options, setOptions] = useState(emptyOptions);
  const [overview, setOverview] = useState(emptyOverview);
  const [filters, setFiltersState] = useState(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fail = useCallback((e) => setError(e.message), []);

  const loadTransactions = useCallback(() => {
    fetchTransactions(filters)
      .then(setTransactions)
      .catch(fail)
      .finally(() => setLoading(false));
  }, [filters, fail]);

  const loadOptions = useCallback(() => fetchAllOptions().then(setOptions).catch(fail), [fail]);

  // Everything derived from the ledger, e.g. after a mutation here or on
  // another page (Savings withdrawals change the overview).
  const refresh = useCallback(() => {
    loadTransactions();
    fetchTags().then(setTags).catch(fail);
    fetchOverview().then(setOverview).catch(fail);
    fetchMovements().then(setMovements).catch(fail);
  }, [loadTransactions, fail]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setFilters = useCallback((patch) => setFiltersState((f) => ({ ...f, ...patch })), []);

  // Mutations resolve to true on success; failures surface via `error`.
  const run = useCallback(
    async (action, after) => {
      try {
        setError("");
        await action();
        after();
        return true;
      } catch (e) {
        setError(e.message);
        return false;
      }
    },
    []
  );

  const value = useMemo(
    () => ({
      transactions,
      movements,
      tags,
      options,
      overview,
      filters,
      setFilters,
      resetFilters: () => setFiltersState(defaultFilters()),
      loading,
      error,
      setError,
      refresh,
      saveTransaction: (data, id) => run(() => (id ? updateTransaction(id, data) : createTransaction(data)), refresh),
      removeTransaction: (id) => run(() => deleteTransaction(id), refresh),
      addOption: (kind, payload) => run(() => addOption(kind, payload), loadOptions),
      removeOption: (kind, id) => run(() => deleteOption(kind, id), loadOptions),
    }),
    [transactions, movements, tags, options, overview, filters, setFilters, loading, error, refresh, run, loadOptions]
  );

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}
