import { useCallback, useState } from "react";
import { House, LayoutGrid, PiggyBank, Repeat } from "lucide-react";
import "./App.css";
import BottomNav from "./app/BottomNav";
import Splash from "./app/Splash";
import { useHashRoute } from "./app/useHashRoute";
import { useBackButton } from "./app/useBackButton";
import { useSystemBars } from "./app/useSystemBars";
import { LedgerProvider, TransactionSheet } from "./features/ledger";
import HomePage from "./features/home/HomePage";
import ReportPage from "./features/report/ReportPage";
import { SavingsPage } from "./features/savings";
import { CreditCardsPage, useCardBillTags } from "./features/cards";
import SettingsPage from "./features/settings/SettingsPage";
import MorePage from "./features/settings/MorePage";
import AppearancePage from "./features/appearance/AppearancePage";
import TagsPage from "./features/tags/TagsPage";
import BackupPage from "./features/backup/BackupPage";
import { BudgetsPage } from "./features/budgets";
import { BillsPage } from "./features/bills";
import { BorrowingPage, useBorrowEntries } from "./features/borrowing";
import { MonthPlanSheet, RecurringEngine, RecurringPage, SALARY_HINT, UsableBalance, isSalary } from "./features/recurring";
import { SubscriptionReminders, SubscriptionsPage } from "./features/subscriptions";

// Page registry. `tab` is the bottom-nav tab that stays highlighted; `add`
// shows the + (add transaction) button; `hero` means the page starts with
// the colored balance header (status bar is tinted to match); `parent` is
// where the Android Back button goes (none on Home: Back leaves the app);
// `props` are extra props for the page (e.g. what other features show on it).
// Add a page here, nowhere else.
const ROUTES = {
  home: { page: HomePage, tab: "home", add: true, hero: true, props: { BalanceNote: UsableBalance } },
  recurring: { page: RecurringPage, tab: "recurring", add: true, parent: "home" },
  report: { page: ReportPage, tab: "more", add: true, parent: "more" },
  savings: { page: SavingsPage, tab: "savings", add: true, parent: "home" },
  more: { page: MorePage, tab: "more", parent: "home" },
  tags: { page: TagsPage, tab: "more", add: true, parent: "more" },
  cards: { page: CreditCardsPage, tab: "more", parent: "more" },
  settings: { page: SettingsPage, tab: "more", parent: "more" },
  appearance: { page: AppearancePage, tab: "more", parent: "more" },
  backup: { page: BackupPage, tab: "more", parent: "more" },
  budgets: { page: BudgetsPage, tab: "more", parent: "more" },
  bills: { page: BillsPage, tab: "more", parent: "more" },
  borrowing: { page: BorrowingPage, tab: "more", parent: "more" },
  subscriptions: { page: SubscriptionsPage, tab: "more", parent: "more" },
};

const TABS = [
  { id: "home", label: "Home", icon: House },
  { id: "recurring", label: "Recurring", icon: Repeat },
  { id: "savings", label: "Savings", icon: PiggyBank },
  { id: "more", label: "More", icon: LayoutGrid },
];

// The + sheet with what other features add to it: Repay / Received chips,
// the "Paying a credit card bill" switch and the Salary tag hint. A component
// of its own because those read the ledger, which App provides.
function AddSheet(props) {
  return <TransactionSheet {...props} entries={useBorrowEntries()} tagGroups={useCardBillTags()} tagHints={[SALARY_HINT]} />;
}

export default function App() {
  const [route, navigate, param] = useHashRoute(ROUTES, "home");
  useBackButton(ROUTES, route, param, navigate);
  // null = closed, { transaction: null } = add, { transaction } = edit
  const [sheet, setSheet] = useState(null);
  // "<Month> at glance", shown right after a salary is added.
  const [showPlan, setShowPlan] = useState(false);
  // The launch screen, once per app start.
  const [splash, setSplash] = useState(true);
  const hideSplash = useCallback(() => setSplash(false), []);
  const { page: Page, tab, add, hero = false, props: pageProps } = ROUTES[route];
  // The splash is the hero colour, so tint the system bars to match it.
  useSystemBars(hero || splash);

  return (
    <LedgerProvider>
      <RecurringEngine />
      <SubscriptionReminders />
      <div className="app">
        <main className="app-main">
          <Page navigate={navigate} param={param} onOpenTransaction={(transaction) => setSheet({ transaction })} {...pageProps} />
        </main>
        <BottomNav
          tabs={TABS}
          activeTab={tab}
          onNavigate={navigate}
          onAdd={add ? () => setSheet({ transaction: null }) : null}
        />
        {sheet && (
          <AddSheet
            transaction={sheet.transaction}
            onClose={() => setSheet(null)}
            onSaved={(row, { created }) => created && isSalary(row) && setShowPlan(true)}
          />
        )}
        {splash && <Splash onDone={hideSplash} />}
        {showPlan && <MonthPlanSheet salaryAdded onClose={() => setShowPlan(false)} onOpenRecurring={() => navigate("recurring")} />}
      </div>
    </LedgerProvider>
  );
}
