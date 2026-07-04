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

/** Seeded variance — deterministic jitter so transactions don't all land on the same day */
function jitter(base: number, range: number) {
  return Math.max(1, Math.min(28, base + Math.floor(Math.random() * range * 2) - range));
}
function randAmount(base: number, spread: number) {
  return (base + (Math.random() * spread * 2 - spread)).toFixed(2);
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
    inserted.forEach((c) => { catMap[c.name] = c.id; });
  } else {
    existingCats.forEach((c) => { catMap[c.name] = c.id; });
  }

  // Create demo accounts
  const accounts = await db
    .insert(accountsTable)
    .values([
      {
        userId,
        institutionName: "Wells Fargo",
        accountName: "Everyday Checking",
        accountType: "checking",
        balance: "3847.62",
      },
      {
        userId,
        institutionName: "Marcus by Goldman Sachs",
        accountName: "High-Yield Savings",
        accountType: "savings",
        balance: "14230.00",
      },
      {
        userId,
        institutionName: "Chase",
        accountName: "Sapphire Preferred",
        accountType: "credit",
        balance: "-1087.43",
      },
    ])
    .returning();

  const [checking, , credit] = accounts;

  const groceryStores = [
    "Whole Foods Market",
    "Trader Joe's",
    "H-E-B",
    "Kroger",
    "Sprouts Farmers Market",
    "Aldi",
  ];
  const coffeeShops = [
    "Blue Bottle Coffee",
    "Starbucks",
    "Peet's Coffee",
    "Verve Coffee Roasters",
    "La Colombe",
  ];
  const restaurants = [
    "Sweetgreen",
    "Chipotle Mexican Grill",
    "The Cheesecake Factory",
    "Local Taqueria",
    "Shake Shack",
    "Dine & Dash",
    "Olive Garden",
  ];
  const gasStations = ["Shell", "Chevron", "BP", "Exxon", "Mobil"];
  const pharmacies = ["CVS Pharmacy", "Walgreens", "Rite Aid"];
  const streaming = [
    { name: "Netflix", amount: "15.49" },
    { name: "Spotify", amount: "9.99" },
    { name: "Apple TV+", amount: "9.99" },
    { name: "YouTube Premium", amount: "13.99" },
  ];

  // Generate 6 months of realistic transactions with natural variance
  const transactions: (typeof transactionsTable.$inferInsert)[] = [];
  const today = new Date();

  for (let offset = 5; offset >= 0; offset--) {
    const d = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;
    const m = `${yr}-${pad(mo)}`;

    // ── Income ── bi-weekly payroll with small natural variance
    const payday1 = pad(jitter(1, 1));
    const payday2 = pad(jitter(15, 1));
    const baseSalary = 3250;
    transactions.push(
      {
        userId,
        accountId: checking.id,
        categoryId: catMap["Income"],
        amount: randAmount(baseSalary, 15),
        description: "ACH Payroll",
        merchantName: "Meridian Solutions Inc",
        date: `${m}-${payday1}`,
        type: "credit",
        isRecurring: true,
      },
      {
        userId,
        accountId: checking.id,
        categoryId: catMap["Income"],
        amount: randAmount(baseSalary, 15),
        description: "ACH Payroll",
        merchantName: "Meridian Solutions Inc",
        date: `${m}-${payday2}`,
        type: "credit",
        isRecurring: true,
      },
    );

    // ── Fixed monthly bills ──
    const electricAmt = randAmount(88, 22);
    const internetAmt = randAmount(69, 5);
    transactions.push(
      {
        userId, accountId: checking.id, categoryId: catMap["Housing"],
        amount: "1650.00", description: "Rent Payment — Unit 4B", merchantName: "Parkside Apartments LLC",
        date: `${m}-01`, type: "debit", isRecurring: true,
      },
      {
        userId, accountId: checking.id, categoryId: catMap["Utilities"],
        amount: electricAmt, description: "Electric Service", merchantName: "Austin Energy",
        date: `${m}-${pad(jitter(6, 2))}`, type: "debit", isRecurring: true,
      },
      {
        userId, accountId: checking.id, categoryId: catMap["Utilities"],
        amount: internetAmt, description: "Internet & Cable", merchantName: "Comcast Xfinity",
        date: `${m}-${pad(jitter(9, 2))}`, type: "debit", isRecurring: true,
      },
      {
        userId, accountId: checking.id, categoryId: catMap["Utilities"],
        amount: "82.00", description: "Mobile Plan", merchantName: "T-Mobile",
        date: `${m}-${pad(jitter(10, 1))}`, type: "debit", isRecurring: true,
      },
      {
        userId, accountId: checking.id, categoryId: catMap["Health"],
        amount: "44.00", description: "Gym Membership", merchantName: "Gold's Gym",
        date: `${m}-${pad(jitter(4, 2))}`, type: "debit", isRecurring: true,
      },
    );

    // ── Streaming subscriptions ── (not all every month, staggered)
    streaming.forEach((svc, i) => {
      if ((mo + i) % 3 !== 0) {
        transactions.push({
          userId, accountId: credit.id, categoryId: catMap["Entertainment"],
          amount: svc.amount, description: `${svc.name} Subscription`, merchantName: svc.name,
          date: `${m}-${pad(jitter(12, 3))}`, type: "debit", isRecurring: true,
        });
      }
    });

    // ── Groceries (weekly) ──
    [7, 14, 21, 27].forEach((baseDay, i) => {
      const day = pad(jitter(baseDay, 2));
      const amount = randAmount(87, 28);
      transactions.push({
        userId, accountId: checking.id, categoryId: catMap["Food & Dining"],
        amount, description: "Grocery Shopping",
        merchantName: groceryStores[(mo + i) % groceryStores.length],
        date: `${m}-${day}`, type: "debit", isRecurring: false,
      });
    });

    // ── Coffee (4-5 per month) ──
    [3, 8, 13, 20, 26].forEach((baseDay, i) => {
      if (i === 4 && Math.random() > 0.6) return; // skip occasionally
      const day = pad(jitter(baseDay, 1));
      const amount = (5.25 + Math.random() * 3.5).toFixed(2);
      transactions.push({
        userId, accountId: credit.id, categoryId: catMap["Food & Dining"],
        amount, description: "Coffee",
        merchantName: coffeeShops[(mo + i) % coffeeShops.length],
        date: `${m}-${day}`, type: "debit", isRecurring: false,
      });
    });

    // ── Restaurants (2-4 per month, naturally random) ──
    const diningDays = [10, 17, 24].filter(() => Math.random() > 0.2);
    diningDays.forEach((baseDay, i) => {
      const day = pad(jitter(baseDay, 2));
      const amount = randAmount(38, 20);
      transactions.push({
        userId, accountId: credit.id, categoryId: catMap["Food & Dining"],
        amount, description: "Restaurant",
        merchantName: restaurants[(mo + i) % restaurants.length],
        date: `${m}-${day}`, type: "debit", isRecurring: false,
      });
    });

    // ── Gas / Transportation ──
    [5, 19].forEach((baseDay, i) => {
      if (Math.random() > 0.15) {
        const day = pad(jitter(baseDay, 2));
        const amount = randAmount(52, 14);
        transactions.push({
          userId, accountId: credit.id, categoryId: catMap["Transportation"],
          amount, description: "Gas Station",
          merchantName: gasStations[(mo + i) % gasStations.length],
          date: `${m}-${day}`, type: "debit", isRecurring: false,
        });
      }
    });

    // ── Pharmacy (occasional) ──
    if (Math.random() > 0.55) {
      const day = pad(jitter(16, 4));
      const amount = randAmount(24, 18);
      transactions.push({
        userId, accountId: credit.id, categoryId: catMap["Health"],
        amount, description: "Pharmacy",
        merchantName: pharmacies[mo % pharmacies.length],
        date: `${m}-${day}`, type: "debit", isRecurring: false,
      });
    }

    // ── Personal care (monthly) ──
    if (Math.random() > 0.35) {
      const day = pad(jitter(22, 3));
      transactions.push({
        userId, accountId: credit.id, categoryId: catMap["Personal Care"],
        amount: randAmount(55, 25), description: "Salon & Grooming",
        merchantName: Math.random() > 0.5 ? "Great Clips" : "Supercuts",
        date: `${m}-${day}`, type: "debit", isRecurring: false,
      });
    }

    // ── Amazon / Online shopping (most months, varied) ──
    const shopCount = Math.floor(Math.random() * 3);
    for (let s = 0; s < shopCount; s++) {
      const day = pad(jitter(8 + s * 9, 3));
      const amount = randAmount(34, 40);
      transactions.push({
        userId, accountId: credit.id, categoryId: catMap["Shopping"],
        amount, description: "Online Order",
        merchantName: Math.random() > 0.4 ? "Amazon" : (Math.random() > 0.5 ? "Target" : "Best Buy"),
        date: `${m}-${day}`, type: "debit", isRecurring: false,
      });
    }

    // ── Rideshare / Uber (occasional) ──
    if (Math.random() > 0.5) {
      const day = pad(jitter(14, 6));
      transactions.push({
        userId, accountId: credit.id, categoryId: catMap["Transportation"],
        amount: randAmount(18, 9), description: "Ride",
        merchantName: Math.random() > 0.5 ? "Uber" : "Lyft",
        date: `${m}-${day}`, type: "debit", isRecurring: false,
      });
    }

    // ── Savings transfer (consistent habit) ──
    const savingsAmt = offset <= 3 ? "300.00" : "200.00";
    transactions.push({
      userId, accountId: checking.id, categoryId: catMap["Income"],
      amount: savingsAmt, description: "Transfer to Savings",
      merchantName: "Marcus by Goldman Sachs",
      date: `${m}-${pad(jitter(17, 2))}`, type: "credit", isRecurring: true,
    });
  }

  await db.insert(transactionsTable).values(transactions);

  // ── Financial Goals ── realistic, specific
  const nextYear = today.getFullYear() + 1;
  const fiveMonths = new Date(today.getFullYear(), today.getMonth() + 5, 1);
  await db.insert(goalsTable).values([
    {
      userId,
      name: "Emergency Fund (6 months)",
      targetAmount: "20000.00",
      currentAmount: "14230.00",
      category: "savings",
      status: "active",
    },
    {
      userId,
      name: "Italy Trip — Summer",
      targetAmount: "6500.00",
      currentAmount: "2100.00",
      targetDate: `${nextYear}-07-01`,
      category: "travel",
      status: "active",
    },
    {
      userId,
      name: "Pay Off Chase Card",
      targetAmount: "1087.43",
      currentAmount: "620.00",
      targetDate: `${fiveMonths.getFullYear()}-${pad(fiveMonths.getMonth() + 1)}-01`,
      category: "debt",
      status: "active",
    },
    {
      userId,
      name: "Standing Desk Setup",
      targetAmount: "1200.00",
      currentAmount: "1200.00",
      category: "tech",
      status: "completed",
    },
  ]);

  // ── Recurring obligations ──
  await db.insert(recurringObligationsTable).values([
    { userId, name: "Rent", amount: "1650.00", frequency: "monthly", categoryId: catMap["Housing"] },
    { userId, name: "T-Mobile", amount: "82.00", frequency: "monthly", categoryId: catMap["Utilities"] },
    { userId, name: "Xfinity Internet", amount: "69.00", frequency: "monthly", categoryId: catMap["Utilities"] },
    { userId, name: "Netflix", amount: "15.49", frequency: "monthly", categoryId: catMap["Entertainment"] },
    { userId, name: "Spotify", amount: "9.99", frequency: "monthly", categoryId: catMap["Entertainment"] },
    { userId, name: "Gold's Gym", amount: "44.00", frequency: "monthly", categoryId: catMap["Health"] },
    { userId, name: "Austin Energy", amount: "88.00", frequency: "monthly", categoryId: catMap["Utilities"] },
  ]);
}
