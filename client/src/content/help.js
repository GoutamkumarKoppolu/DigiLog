// In-app explanations shown by <InfoButton topic="..." />. Keep them short
// and concrete: what it is, why it exists, one example.
export const HELP = {
  balanceDeduction: {
    title: "Deduct from current balance",
    body: [
      "Turn this on when the money you're saving comes out of your own balance, e.g. part of your salary. Your current balance goes down by that amount.",
      "Turn it off for money that comes from someone else, like money a family member or friend gives you to keep. It still counts as savings, but it doesn't reduce your balance, because it was never part of it.",
    ],
    example: "Balance ₹5,000. Save ₹1,000 from salary → balance ₹4,000. Save ₹2,000 you were given → balance stays ₹4,000. Total savings: ₹3,000.",
  },
  savings: {
    title: "Why savings are tracked separately",
    body: [
      "Not all savings come from your earnings. Some you set aside from your salary; some is money other people give you that you keep aside.",
      "Savings are grouped into pots by tag, so you can see exactly how much you saved from your salary, how much from money you were given, and so on, and how much of each you've already used.",
      "Using savings lowers that pot. It doesn't change your current balance, except when you use it to cover an expense your balance couldn't: then it moves into the balance first (see Not enough balance).",
    ],
    example: "Pot \"Salary savings\": ₹5,000. Pot \"Gift money\": ₹2,000 you were given. Spend ₹1,500 from \"Salary savings\" → ₹3,500 left there, the ₹2,000 in \"Gift money\" untouched.",
  },
  creditCards: {
    title: "How credit cards work here",
    body: [
      "Card statements often don't make it clear what each amount was spent on, so log each card spend here as you make it, with a short description. These entries don't touch your balance.",
      "When you pay the bill, add it on Home as an expense and turn on \"Paying a credit card bill\", then pick the card. That is the money leaving your balance, tagged \"<card> bill\".",
      "Each card then shows, month by month, what you logged next to the bill you paid for it. Bills are paid around salary time, so a bill paid on or after the 25th counts for that month, and one paid before the 25th counts for the month before.",
      "Bills paid at the bottom shows the bills for all cards together.",
    ],
    example: "Logged in September: ₹12,400. Bill paid on 1 October: ₹13,150 → September shows ₹750 paid but not logged, worth a look.",
  },
  cardEstimate: {
    title: "Estimated card bill",
    body: [
      "This is worked out from the subscriptions charged to this card that renew this month: monthly ones every month, yearly ones only in their month, and free trials only in the month they end.",
      "It's an estimate: it doesn't include what you log or buy on the card yourself. You pay it with the card's bill, at the end of the month or early next month.",
      "To add a subscription to it, edit the subscription and pick the card under \"Charged to a credit card\".",
    ],
    example: "Netflix ₹649 on the 12th and Spotify ₹199 on the 20th, both on HDFC Regalia → estimated bill for October ₹848.",
  },
  cardBills: {
    title: "Paying a credit card bill",
    body: [
      "Turn this on when an expense is a credit card bill, and pick the card. It's tagged \"<card> bill\" so the Credit cards page can compare it with the spends you logged for that card.",
      "Add your cards on More › Credit cards first; each one shows up here.",
    ],
    example: "Paid ₹4,000 for the HDFC Regalia bill → expense tagged \"HDFC Regalia bill\", shown under that card for last month.",
  },
  backup: {
    title: "Why back up",
    body: [
      "Your data lives only on this device. Uninstalling the app, clearing its storage or switching phones removes it, and there's no server copy.",
      "Export saves everything to a single file. Save to phone puts it in Documents › DigiLog, where it stays even if you uninstall the app. Share sends it to Drive, WhatsApp or email, which is the safe choice before resetting or changing phones.",
      "Use Import on the new install and pick the file to get it all back.",
      "Backups from older versions of the app still work: anything new is filled in with sensible defaults, and the file is checked before anything on your device changes.",
    ],
    example: "Reinstalling: Save to phone first, then after reinstalling, Import → Documents › DigiLog → the file → Replace my data. Changing phones: Share → Drive, then Import it on the new phone.",
  },
  budgets: {
    title: "How budgets work",
    body: [
      "Make a budget for something you're planning, like a wedding, a function or a new car, and note down each amount you spend on it. You always see how much is left.",
      "You can split the total into sub-budgets. A spend can come from a sub-budget or straight from the whole budget; either way it's taken off the total. Going over is allowed: the amount left just turns red.",
      "Budgets are only a plan. They don't change your current balance, so log real expenses on Home as usual. When it's over, tap Mark as done to move it out of the way.",
    ],
    example: "Car: ₹10L, split into Purchase ₹5L, Modifications ₹3L and Repair ₹1L (₹1L unallocated). Spend ₹40,000 on modifications → Modifications ₹2.6L left, Car ₹9.6L left.",
  },
  subBudgets: {
    title: "Sub-budgets",
    body: [
      "Sub-budgets split a budget into parts, so you can see how each part is going. They're optional.",
      "Each sub-budget has its own amount. Spending from one reduces that sub-budget and the whole budget. \"Unallocated\" is the part of the total you haven't given to any sub-budget yet. If the sub-budgets add up to more than the total, it shows how much you've over-allocated.",
      "Tap a sub-budget to see only its spends, and to edit or delete it.",
    ],
    example: "Wedding ₹8L: Venue ₹3L, Catering ₹2.5L, Clothes ₹1.5L → ₹1L unallocated. Spend ₹50,000 on catering → Catering ₹2L left, Wedding ₹7.5L left.",
  },
  bills: {
    title: "Keeping bills",
    body: [
      "Keep photos and PDFs of bills you may need later, like invoices, warranties, receipts or service records, sorted into folders you name.",
      "Add bills by taking a photo or choosing files: each file becomes its own bill, named after the file (you can rename it). Files are kept exactly as you added them; nothing inside them is read.",
      "To keep a multi-page bill together, like a two-page invoice, open the bill and use Add pages.",
      "Tap a photo or Open on a PDF to view it in your phone's own viewer, where you can zoom. Share sends the whole bill to another app.",
      "Bills are stored only on this device and are included in your backup file, so export a backup before changing phones.",
    ],
    example: "Folder \"Warranties\": \"Fridge invoice\" (2 photos) and \"TV warranty card\" (a PDF). When the fridge needs repair, open the folder and show the invoice.",
  },
  balanceRule: {
    title: "Not enough balance",
    body: [
      "Your current balance can never go below ₹0. Money you spend has to come from somewhere, so every rupee stays accounted for.",
      "When an expense (or a saving taken from your balance) is more than your balance, say where the rest came from: a savings pot, money you borrowed, or part from each. That money moves into your balance, then the expense takes it to ₹0.",
      "The savings used show in that pot's history, and borrowed money shows under Borrowed & lent, so you can repay it. Delete the expense later and they're removed with it.",
      "Anything else that would take the balance below ₹0, like deleting a salary that's already been spent, is refused with what to do instead. Recurring payments wait, marked Not enough balance, until money comes in.",
    ],
    example: "Balance ₹20,000, a ₹50,000 expense → ₹30,000 more needed: ₹10,000 from \"Emergency\" savings + ₹20,000 borrowed from Ravi. Balance ₹0, Emergency down ₹10,000, you owe Ravi ₹20,000.",
  },
  savingsRate: {
    title: "Savings rate",
    body: [
      "The share of your income you didn't spend: (income − expenses) ÷ income. Money you put into savings and money still in your balance both count as kept.",
      "A salary counts in the month it pays for, so a salary on 30 Sep is October's. That keeps each month's rate honest instead of swinging up and down with payday.",
      "The 12-month average weighs each month by its income. Many money managers aim for 20% or more. Tap a month in the chart to see its figures.",
    ],
    example: "Income ₹1,00,000, expenses ₹78,000 → you kept ₹22,000, a 22% savings rate.",
  },
  spendingPlan: {
    title: "Setting money aside",
    body: [
      "After your salary comes in, split your usable balance across a few tags, like Bills ₹10,000 and Shopping ₹5,000. It's a plan: your balance doesn't change.",
      "When you add an expense, the plan's tags show as their own suggestions, with what's left in each. Expenses with that tag fill its bar under Your money on Home. At 95% the bar turns red.",
      "Spend more than you set aside and the extra comes out of your free money: the part of your usable balance you didn't set aside.",
      "Next month, last month's tags are offered again. Keep them, change the amounts, or add new ones.",
    ],
    example: "Usable ₹30,000. Bills ₹10,000 + Shopping ₹5,000 → free money ₹15,000. Spend ₹6,000 on Shopping → Shopping is red, over by ₹1,000, free money ₹14,000.",
  },
  borrowing: {
    title: "Borrowed & lent",
    body: [
      "Keep track of money you borrowed from people (Borrowed) and money you gave people that they'll pay back (Lent).",
      "Add one entry each time: who, how much, when, and why if you like. Tap it to see everything, and add each part as it's paid back. What's left updates straight away, and a payment can't be more than what's left.",
      "When it's fully paid back it's marked Completed automatically. If you decide to let the rest go, tap Mark as completed. Save a phone number to call or WhatsApp them from here.",
      "Each entry and payment says where the money went: your Balance, a Savings pot, or Just note it. Balance and Savings change your current balance or that pot, and show on Home. Just note it only keeps the record here, e.g. for money lent before you used the app.",
      "To pay someone back or note money you got back, you can also tap + and pick Repay or Received. None of this counts as income or expenses.",
    ],
    example: "Balance ₹50,000. Lend Ravi ₹10,000 from Balance → ₹40,000. He pays it all back into Balance → ₹50,000 again, and his entry moves to Completed.",
  },
  recurring: {
    title: "How recurring payments work",
    body: [
      "Add payments that repeat every month, like a home loan EMI, rent or a SIP, with the day they're paid. They're recorded for you: don't add them on Home yourself, even if you pay one by hand, or it's counted twice.",
      "A month's bills are paid from the salary you got for the month before: September's EMIs come out of the salary from the end of August or the first days of September. So a salary tagged \"Salary\" dated on or after the 25th pays the next month's payments, and one before the 25th pays its own month's.",
      "Once that salary is in, each payment is added to your transactions on its day and taken off your balance, like any other expense. Before its day it shows as \"Due\"; until the salary is in, \"Waiting for salary\". If the app wasn't opened on the day, it's added the next time you open it, still dated on its day. As soon as next month's salary is in, this page shows next month.",
      "Give a pending balance or the number of payments left, and it stops by itself when it's all paid; the last payment is only what's left. For one with no end date, tap Mark as completed to stop it.",
      "Savings go into your Savings pot under their tag and follow the \"Deduct from current balance\" switch. They can be paused, or skipped for a month.",
    ],
    example: "Home loan EMI ₹25,000 on the 5th, ₹65,000 pending. Salary on 30 Sep → on 5 Oct, ₹25,000 is added and ₹40,000 is left. Next month ₹25,000 again, then a last ₹15,000, and it's Completed.",
  },
  salary: {
    title: "Why the \"Salary\" tag matters",
    body: [
      "Recurring payments (EMIs, rent, SIPs) wait for your salary: they're only taken off your balance once the salary that pays for them is added, tagged \"Salary\". Use exactly that tag for your pay, every month.",
      "Your salary pays the next month's bills. One dated on or after the 25th counts for the next month, so a salary on 30 Sep or on 3 Oct both pay October's payments.",
      "When you add it, you see the month it pays for at a glance: your salary, that month's recurring payments, and what's usable. Tap \"See breakup\" under the balance on Home to see it again.",
      "Usable balance is your current balance minus the payments still to be deducted this month. Payments waiting for the salary aren't counted until it's added, since they come out of it.",
    ],
    example: "Balance ₹18,000 before payday → usable ₹18,000. Add ₹80,000 tagged Salary → balance ₹98,000, EMI + rent + SIP ₹42,500 to come → usable ₹55,500, usable salary ₹37,500.",
  },
  subscriptions: {
    title: "Tracking subscriptions",
    body: [
      "Keep a list of what you pay for regularly, like Netflix, Spotify, iCloud or Amazon Prime, with the amount, how you pay and when it's taken: a day each month, or a date each year.",
      "The top shows what they cost you a month and a year (a yearly plan counts as a twelfth each month), and By category shows where it goes.",
      "Pick a reminder and your phone notifies you at 9 AM before it renews. On a free trial, you're also reminded the day before it ends, so you can cancel in time.",
      "This is only for tracking: it doesn't change your balance. Cancel one to keep it in the list under Cancelled, or delete it.",
    ],
    example: "Netflix ₹649 monthly on the 5th, paid with HDFC card, reminder 1 day before → a notification on the 4th at 9 AM: \"Netflix renews tomorrow · ₹649 · HDFC card\".",
  },
  tags: {
    title: "How tags help",
    body: [
      "A tag groups related transactions, even across months. Use the same tag every time and you can see all of them together, with the total.",
      "Open More → Tags to see every tag, grouped by expenses, savings and income, or pick tags in the Home filters.",
      "One tag is special: tag your pay \"Salary\". Recurring payments are only deducted once that month's Salary is added.",
    ],
    example: "Tag every trip expense \"Goa trip\", or each of 12 monthly EMIs \"Car loan\", then open that tag to see them all.",
  },
};
