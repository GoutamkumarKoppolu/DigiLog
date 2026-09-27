import { useState } from "react";
import { House, LayoutGrid, PiggyBank, Repeat } from "lucide-react";
import "./App.css";
import BottomNav from "./app/BottomNav";
import { useHashRoute } from "./app/useHashRoute";
import { useBackButton } from "./app/useBackButton";
import { useSystemBars } from "./app/useSystemBars";
import { LedgerProvider, TransactionSheet } from "./features/ledger";
import HomePage from "./features/home/HomePage";
import ReportPage from "./features/report/ReportPage";
import { SavingsPage } from "./features/savings";
import CreditCardsPage from "./features/cards/CreditCardsPage";
import SettingsPage from "./features/settings/SettingsPage";
import MorePage from "./features/settings/MorePage";
import AppearancePage from "./features/appearance/AppearancePage";
import TagsPage from "./features/tags/TagsPage";
import BackupPage from "./features/backup/BackupPage";
import { BudgetsPage } from "./features/budgets";
import { BillsPage } from "./features/bills";
import { BorrowingPage } from "./features/borrowing";
import { RecurringEngine, RecurringPage } from "./features/recurring";
import { SubscriptionReminders, SubscriptionsPage } from "./features/subscriptions";

// Page registry. `tab` is the bottom-nav tab that stays highlighted; `add`
// shows the + (add transaction) button; `hero` means the page starts with
// the colored balance header (status bar is tinted to match); `parent` is
// where the Android Back button goes (none on Home: Back leaves the app).
// Add a page here, nowhere else.
const ROUTES = {
  home: { page: HomePage, tab: "home", add: true, hero: true },
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

export default function App() {
  const [route, navigate, param] = useHashRoute(ROUTES, "home");
  useBackButton(ROUTES, route, param, navigate);
  // null = closed, { transaction: null } = add, { transaction } = edit
  const [sheet, setSheet] = useState(null);
  const { page: Page, tab, add, hero = false } = ROUTES[route];
  useSystemBars(hero);

  return (
    <LedgerProvider>
      <RecurringEngine />
      <SubscriptionReminders />
      <div className="app">
        <main className="app-main">
          <Page navigate={navigate} param={param} onOpenTransaction={(transaction) => setSheet({ transaction })} />
        </main>
        <BottomNav
          tabs={TABS}
          activeTab={tab}
          onNavigate={navigate}
          onAdd={add ? () => setSheet({ transaction: null }) : null}
        />
        {sheet && <TransactionSheet transaction={sheet.transaction} onClose={() => setSheet(null)} />}
      </div>
    </LedgerProvider>
  );
}
