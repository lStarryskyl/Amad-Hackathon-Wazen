# Wazen — Video Demo Flow Map

App: **http://localhost:8081** · Real Clerk auth ON · Real AI (NVIDIA llama-3.1-70b) ON

> **Recording tip:** press F12 → toggle device toolbar (Ctrl+Shift+M) → pick "iPhone 14 Pro Max" so the app records phone-shaped. AI generations take ~5–15 s — keep talking while they load.

---

## Act 1 — Sign Up (the real auth flow)

1. App opens on **Sign In** → tap **"Create one free"**.
2. Email: use a Clerk **test email** so the code is instant and always works:
   `omar+clerk_test@example.com` (any email containing `+clerk_test`)
   Password: anything strong, e.g. `WazenDemo!2026`
3. Tap **Create Account** → verification screen → enter code **`424242`** (test emails always accept this) → **Verify Email**.

## Act 2 — Onboarding

4. Welcome screen: "Know Your Money." → **Get Started**.
5. **Privacy consent** screen — mention "no data sold, delete anytime" → **I Understand & Consent**.
6. **"You're all set!"** → **Go to Dashboard**. (Your account is auto-seeded with 6 months of realistic transactions.)

## Act 3 — Home tour

7. Point out the **gradient balance hero** — total balance, savings rate, income/expenses.
8. Tap the **eye icon** — balances mask everywhere (privacy mode). Tap again to reveal.
9. **Quick actions row** — Simulate / Goals / Insights / Privacy shortcuts.
10. Tap **Check In** on the Daily Check-in card → health score appears (achievement popup may fire 🏆).
11. Scroll: **Regret Meter** widget, **accounts carousel**, **Top Spending** animated bars.
12. **Recent Transactions → "See All"** → full history modal → tap **Money Out / Money In** filters → close.

## Act 4 — Insights (the AI brain)

13. Go to **Insights** tab. Expand a **Behavioral Pattern** card (tap to unfold).
14. **Regret Meter** section — score, contributing factors (tap to expand), stat pills, and the **Score Trend** sparkline.
15. **Rescue Plan → Generate** — real AI builds recovery actions from the data (~10 s). Expand an action, show estimated $/mo savings.
16. **Money Stories → Generate** — AI narrates the last 3 months like a story. Read a line or two aloud.

## Act 5 — Digital Twin Lab (the wow moment)

17. Go to **Simulate** tab → **Ask Your First Question**.
18. Type or pick: **"What if I save an extra $200 a month?"** → **See What Happens**.
19. Results: AI narrative ("Here's what would happen"), balance-change hero, 6-month trajectory chart, goal timelines, "How we read your question".
20. Tap **New Scenario** → run a second one: **"What if I take on a $450/month car payment?"**
21. Back on the list → **Select** two scenarios → **Compare These Two** → winner banner, dual chart, metric table.
22. Optional: **Share Comparison** → generates a PDF.

## Act 6 — Progress (gamification)

23. Go to **Progress** tab: **🔥 Streaks** (your check-in streak is alive from Act 3), **🏆 Achievements** grid — tap one for details.
24. **Safe Zones → +** → pick "Food & Dining", Monthly, limit **300** → **Set Guardrail** → animated budget bar appears.
25. **Goals → +** → "Trip to Japan", target **4000**, saved **500** → **Create Goal** → progress bar animates.

## Act 7 — Profile finale

26. Go to **Profile** tab → gradient avatar ring, member badge.
27. Flip **Dark Mode** — the entire app re-themes live. Hop back to Home for one beat in dark mode. 🌙
28. (Optional ending) **Sign Out** — lands back on the sign-in screen. Clean loop.

---

## If something stalls

- AI button spins >30 s → it falls back to deterministic output automatically; just narrate the result.
- Sign-up captcha appears → complete it once; it won't reappear.
- Anything frozen → pull-to-refresh works on Home, Insights, and Progress.
