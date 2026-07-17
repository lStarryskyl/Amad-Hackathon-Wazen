---
name: Digital Twin Lab
description: How the simulation/what-if scenario feature is structured across server, client, and mobile
---

# Digital Twin Lab

## Natural-language flow (current)
- Users type a free-form what-if question; POST /simulations accepts `{ prompt }` (preferred) or legacy structured inputs. Forecast horizon is hard-capped at 6 months server-side.
- `artifacts/api-server/src/lib/scenarioParsing.ts` — builds 3-month transaction context (per-month income/expenses/top categories), AI-parses the prompt into ScenarioInputs, with a deterministic regex heuristic fallback (used when AI unavailable or SKIP_AI_NARRATIVE=true). `assumptions` explain the interpretation and are stored inside `inputs` jsonb.
- Narrative generation receives the original prompt + transaction context for grounding.
- Test run recipe: `pnpm exec esbuild src/routes/simulations.test.ts --bundle --platform=node --format=esm --outfile=src/routes/.sim.test.run.mjs && CLERK_SECRET_KEY=sk_test_dummy node src/routes/.sim.test.run.mjs` (node 20 lacks --experimental-strip-types; shell env has no Clerk secret but test auth bypass only needs any key present).

## Structure
- `artifacts/api-server/src/lib/simulationEngine.ts` — deterministic projection; takes ScenarioInputs + DB data → SimulationResults with month-by-month dataPoints, goalTimelines, summary stats
- `artifacts/api-server/src/lib/aiOrchestration.ts` — `generateSimulationNarrative()` added here; uses same getOpenAIClient() pattern with graceful fallback
- `artifacts/api-server/src/routes/simulations.ts` — 4 REST endpoints: POST /simulations, GET /simulations, GET /simulations/:id, DELETE /simulations/:id
- `lib/api-client-react/src/simulations.ts` — manually written React Query hooks (same pattern as intelligence.ts — not orval generated)
- `artifacts/finance-mobile/app/(home)/(tabs)/simulate.tsx` — 3-screen flow (list / builder / results) with react-native-svg charts

## DB
`simulation_runs` table in `lib/db/src/schema/ai-outputs.ts` — was pre-created. Columns: id, userId, scenarioName, inputs (jsonb), results (jsonb), narrative (text), createdAt.

## Chart library
Uses `react-native-svg` (v15.12.1, already installed). Import: `import Svg, { Polyline, Polygon, Line, Text as SvgText, G } from 'react-native-svg'`. Raw `<svg>` HTML elements do NOT work in React Native.

## Pre-existing TS errors (not from this feature)
`intelligence.ts:126` and `rescuePlans.ts:29` have type mismatches that predate this work. `pnpm tsc --noEmit` in api-server exits 1 with these 3 errors — not blocking runtime.

**Why:** Same "manually extend, don't rely on codegen" pattern as intelligence layer. Any new simulation endpoints must be added to simulations.ts and re-exported from lib/api-client-react/src/index.ts.
