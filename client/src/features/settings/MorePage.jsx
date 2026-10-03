import { useState } from "react";
import { ChartPie, CreditCard, DatabaseBackup, Handshake, History, Palette, ReceiptText, Settings, ShieldCheck, Tags, Tv, Wallet } from "lucide-react";
import { useTheme } from "../../theme/useTheme";
import { ACCENTS, BACKGROUNDS } from "../../theme/palettes";
import PageHeader from "../../components/ui/PageHeader";
import ListRow from "../../components/ui/ListRow";
import { DeleteHistorySheet } from "../history";

export default function MorePage({ navigate }) {
  const { theme } = useTheme();
  const label = (list, id) => list.find((x) => x.id === id).label;
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <PageHeader title="More" />
      <div className="page-body">
        <div className="card card-list">
          <ListRow
            icon={ChartPie}
            title="Report"
            subtitle="Where your money went, by tag, vs last month"
            onClick={() => navigate("report")}
          />
          <ListRow
            icon={Tags}
            tone="positive"
            title="Tags"
            subtitle="Every tag across months, e.g. a trip or a loan"
            onClick={() => navigate("tags")}
          />
          <ListRow
            icon={Wallet}
            title="Budgets"
            subtitle="Plan an event: a total, sub-budgets and what you spend"
            onClick={() => navigate("budgets")}
          />
          <ListRow
            icon={Handshake}
            tone="positive"
            title="Borrowed & lent"
            subtitle="Money you owe people, and money people owe you"
            onClick={() => navigate("borrowing")}
          />
          <ListRow
            icon={Tv}
            tone="warning"
            title="Subscriptions"
            subtitle="What you pay for monthly or yearly, with reminders"
            onClick={() => navigate("subscriptions")}
          />
          <ListRow
            icon={ReceiptText}
            tone="savings"
            title="Bills"
            subtitle="Photos and PDFs of bills, kept in folders"
            onClick={() => navigate("bills")}
          />
          <ListRow
            icon={CreditCard}
            tone="warning"
            title="Credit cards"
            subtitle="Log card spend separately from your balance"
            onClick={() => navigate("cards")}
          />
          <ListRow
            icon={Settings}
            title="Manage options"
            subtitle="Transaction types, payment methods and sources"
            onClick={() => navigate("settings")}
          />
          <ListRow
            icon={Palette}
            tone="savings"
            title="Appearance"
            subtitle={`${label(BACKGROUNDS, theme.background)} background · ${label(ACCENTS, theme.accent)}`}
            onClick={() => navigate("appearance")}
          />
        </div>
        <div className="card card-list">
          <ListRow
            icon={DatabaseBackup}
            tone="warning"
            title="Backup & restore"
            subtitle="Export your data to a file, or import it on a new install"
            onClick={() => navigate("backup")}
          />
          <ListRow
            icon={History}
            tone="negative"
            title="Delete history"
            subtitle="Clear one month, or your whole money history"
            onClick={() => setDeleting(true)}
          />
          <ListRow
            icon={ShieldCheck}
            tone="positive"
            title="Stored on this device"
            subtitle="Works offline. Nothing is sent to a server."
          />
        </div>
      </div>
      {deleting && <DeleteHistorySheet navigate={navigate} onClose={() => setDeleting(false)} />}
    </>
  );
}
