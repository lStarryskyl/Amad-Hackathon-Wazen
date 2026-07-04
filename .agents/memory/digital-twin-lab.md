---
name: Digital Twin Lab
description: How the simulation/what-if scenario feature is structured across server, client, and mobile
---

# Digital Twin Lab

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
