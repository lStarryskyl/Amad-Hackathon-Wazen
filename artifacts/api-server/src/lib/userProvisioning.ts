import { db } from "@workspace/db";
import {
  usersTable,
  accountsTable,
  categoriesTable,
  transactionsTable,
  goalsTable,
  recurringObligationsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

export async function getOrCreateUser(clerkUserId: string) {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, clerkUserId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [user] = await db.insert(usersTable).values({ id: clerkUserId }).returning();
  await seedDemoData(clerkUserId);
  return user;
}

async function seedDemoData(userId: string) {
  const pad = (n: number) => String(n).padStart(2, "0");

  // Ensure system categories exist (shared across all users)
  const existingCats = await db.select().from(categoriesTable);
  const catMap: Record<string, number> = {};

  if (existingCats.length === 0) {
    const inserted = await db
      .insert(categoriesTable)
      .values([
        { name: "Food & Dining", icon: "utensils", color: "#F59E0B" },
        { name: "Transportation", icon: "car", color: "#3B82F6" },
        { name: "Housing", icon: "home", color: "#8B5CF6" },
        { name: "Entertainment", icon: "film", color: "#EC4899" },
        { name: "Shopping", icon: "shopping-bag", color: "#10B981" },
        { name: "Health", icon: "heart", color: "#EF4444" },
        { name: "Utilities", icon: "zap", color: "#6366F1" },
        { name: "Income", icon: "trending-up", color: "#059669" },
        { name: "Personal Care", icon: "scissors", color: "#F97316" },
        { name: "Other", icon: "more-horizontal", color: "#6B7280" },
      ])
      .returning();
    inserted.forEach((c) => {
      catMap[c.name] = c.id;
    });
  } else {
    existingCats.forEach((c) => {
      catMap[c.name] = c.id;
    });
  }

  // Create demo accounts
  const accounts = await db
    .insert(accountsTable)
    .values([
      {
        userId,
        institutionName: "Chase Bank",
        accountName: "Checking",
        accountType: "checking",
        balance: "4250.00",
      },
      {
        userId,
        institutionName: "Chase Bank",
        accountName: "Savings",
        accountType: "savings",
        balance: "12800.00",
      },
      {
        userId,
        institutionName: "Visa",
        accountName: "Credit Card",
        accountType: "credit",
        balance: "-1340.00",
      },
    ])
    .returning();

  const [checking, , credit] = accounts;

  // Generate 6 months of realistic transactions
  const transactions: (typeof transactionsTable.$inferInsert)[] = [];
  const today = new Date();

  const groceryStores = ["Whole Foods Market", "Trader Joe's", "Safeway", "Costco"];
  const coffeeShops = ["Starbucks", "Blue Bottle Coffee", "Peet's Coffee", "Verve Coffee Roasters"];
  const restaurants = ["Chipotle Mexican Grill", "Sweetgreen", "The Local Kitchen", "Nobu"];

  for (let offset = 5; offset >= 0; offset--) {
    const d = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;
    const m = `${yr}-${pad(mo)}`;

    // Salary (bi-weekly)
    transactions.push(
      { userId, accountId: checking.id, categoryId: catMap["Income"], amount: "2400.00", description: "Salary - Direct Deposit", merchantName: "Acme Corporation", date: `${m}-01`, type: "credit", isRecurring: true },
      { userId, accountId: checking.id, categoryId: catMap["Income"], amount: "2400.00", description: "Salary - Direct Deposit", merchantName: "Acme Corporation", date: `${m}-15`, type: "credit", isRecurring: true },
    );

    // Fixed monthly bills
    const electricAmt = (85 + Math.floor(Math.random() * 30)).toFixed(2);
    transactions.push(
      { userId, accountId: checking.id, categoryId: catMap["Housing"], amount: "1500.00", description: "Monthly Rent", merchantName: "Cityview Properties LLC", date: `${m}-01`, type: "debit", isRecurring: true },
      { userId, accountId: checking.id, categoryId: catMap["Utilities"], amount: electricAmt, description: "Electric Bill", merchantName: "Pacific Gas & Electric", date: `${m}-05`, type: "debit", isRecurring: true },
      { userId, accountId: checking.id, categoryId: catMap["Utilities"], amount: "75.00", description: "Phone Bill", merchantName: "AT&T Wireless", date: `${m}-10`, type: "debit", isRecurring: true },
      { userId, accountId: credit.id, categoryId: catMap["Entertainment"], amount: "15.99", description: "Netflix Subscription", merchantName: "Netflix", date: `${m}-12`, type: "debit", isRecurring: true },
      { userId, accountId: credit.id, categoryId: catMap["Entertainment"], amount: "10.99", description: "Spotify Premium", merchantName: "Spotify", date: `${m}-12`, type: "debit", isRecurring: true },
      { userId, accountId: checking.id, categoryId: catMap["Health"], amount: "49.99", description: "Gym Membership", merchantName: "Planet Fitness", date: `${m}-03`, type: "debit", isRecurring: true },
    );

    // Groceries (weekly)
    ([7, 14, 21, 27] as number[]).forEach((day, i) => {
      const amount = (65 + Math.floor(Math.random() * 55)).toFixed(2);
      transactions.push({ userId, accountId: checking.id, categoryId: catMap["Food & Dining"], amount, description: "Grocery Shopping", merchantName: groceryStores[i % groceryStores.length], date: `${m}-${pad(day)}`, type: "debit", isRecurring: false });
    });

    // Coffee
    ([3, 8, 14, 22] as number[]).forEach((day, i) => {
      const amount = (4.5 + Math.random() * 3).toFixed(2);
      transactions.push({ userId, accountId: credit.id, categoryId: catMap["Food & Dining"], amount, description: "Coffee", merchantName: coffeeShops[i % coffeeShops.length], date: `${m}-${pad(day)}`, type: "debit", isRecurring: false });
    });

    // Restaurants
    ([9, 17, 25] as number[]).forEach((day, i) => {
      const amount = (28 + Math.floor(Math.random() * 45)).toFixed(2);
      transactions.push({ userId, accountId: credit.id, categoryId: catMap["Food & Dining"], amount, description: "Restaurant", merchantName: restaurants[i % restaurants.length], date: `${m}-${pad(day)}`, type: "debit", isRecurring: false });
    });

    // Gas
    ([6, 20] as number[]).forEach((day, i) => {
      const amount = (45 + Math.floor(Math.random() * 20)).toFixed(2);
      transactions.push({ userId, accountId: credit.id, categoryId: catMap["Transportation"], amount, description: "Gas Station", merchantName: i === 0 ? "Shell" : "Chevron", date: `${m}-${pad(day)}`, type: "debit", isRecurring: false });
    });

    // Amazon shopping (every other month)
    if (offset % 2 === 0) {
      const amount = (45 + Math.floor(Math.random() * 120)).toFixed(2);
      transactions.push({ userId, accountId: credit.id, categoryId: catMap["Shopping"], amount, description: "Online Shopping", merchantName: "Amazon", date: `${m}-14`, type: "debit", isRecurring: false });
    }

    // Savings transfer (recent months)
    if (offset <= 2) {
      transactions.push({ userId, accountId: checking.id, categoryId: catMap["Income"], amount: "200.00", description: "Transfer to Savings", merchantName: "Chase Bank", date: `${m}-16`, type: "credit", isRecurring: true });
    }
  }

  await db.insert(transactionsTable).values(transactions);

  // Financial goals
  const nextYear = today.getFullYear() + 1;
  const fourMonths = new Date(today.getFullYear(), today.getMonth() + 4, 1);
  await db.insert(goalsTable).values([
    { userId, name: "Emergency Fund", targetAmount: "15000.00", currentAmount: "12800.00", category: "savings", status: "active" },
    { userId, name: "Japan Vacation", targetAmount: "5000.00", currentAmount: "1200.00", targetDate: `${nextYear}-06-01`, category: "travel", status: "active" },
    { userId, name: "MacBook Pro", targetAmount: "2500.00", currentAmount: "2500.00", category: "tech", status: "completed" },
    { userId, name: "Pay Off Credit Card", targetAmount: "1340.00", currentAmount: "450.00", targetDate: `${fourMonths.getFullYear()}-${pad(fourMonths.getMonth() + 1)}-01`, category: "debt", status: "active" },
  ]);

  // Recurring obligations
  await db.insert(recurringObligationsTable).values([
    { userId, name: "Monthly Rent", amount: "1500.00", frequency: "monthly", categoryId: catMap["Housing"] },
    { userId, name: "Phone Bill", amount: "75.00", frequency: "monthly", categoryId: catMap["Utilities"] },
    { userId, name: "Netflix", amount: "15.99", frequency: "monthly", categoryId: catMap["Entertainment"] },
    { userId, name: "Spotify Premium", amount: "10.99", frequency: "monthly", categoryId: catMap["Entertainment"] },
    { userId, name: "Gym Membership", amount: "49.99", frequency: "monthly", categoryId: catMap["Health"] },
    { userId, name: "Electric Bill", amount: "95.00", frequency: "monthly", categoryId: catMap["Utilities"] },
  ]);
}
