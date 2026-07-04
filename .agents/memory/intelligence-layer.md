---
name: Intelligence layer pattern
description: How the financial intelligence layer (regret score, rescue plan, money story) is structured and extended
---

# Intelligence Layer Pattern

## Structure
- `artifacts/api-server/src/lib/financialIntelligence.ts` — deterministic scoring + action generation (no LLM)
- `artifacts/api-server/src/lib/aiOrchestration.ts` — LLM narrative helpers; always gracefully falls back to deterministic text when no OpenAI key
- `artifacts/api-server/src/routes/intelligence.ts` — 6 endpoints (regret-score, regret-score/history, rescue-plan, rescue-plan/latest, money-story, money-story/latest)
- `lib/api-client-react/src/intelligence.ts` — manually written React Query hooks (not orval-generated); exported from index.ts

## Why manually written client hooks
The orval codegen has no run script in package.json — the generated files are committed artifacts. New endpoints must be added to `intelligence.ts` and re-exported from `index.ts`.

## Regret Score weights
savings_rate 30% · spending_velocity 25% · recurring_burden 20% · balance_buffer 15% · discretionary_spike 10%
Score 0–100; level: low <30, medium 30–60, high ≥60.

## LLM key resolution
getOpenAIClient() in aiOrchestration.ts: user encrypted key → server OPENAI_API_KEY env → null (graceful fallback text).

## Persistence
All outputs persisted: regret_scores, rescue_plans, money_stories tables (schema already existed in ai-outputs.ts at task start).
