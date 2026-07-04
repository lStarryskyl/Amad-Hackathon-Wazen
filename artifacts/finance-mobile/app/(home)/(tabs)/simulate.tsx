import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Svg, { Polyline, Polygon, Line, Text as SvgText, G } from "react-native-svg";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSimulations,
  useRunSimulation,
  useDeleteSimulation,
  getSimulationsQueryKey,
} from "@workspace/api-client-react";
import type { SimulationRun, ScenarioInputs, MonthDataPoint } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

type Screen = "list" | "builder" | "results";

// ─── Mini sparkline ───────────────────────────────────────────────────────────

function MiniSparkline({ dataPoints, color }: { dataPoints: MonthDataPoint[]; color: string }) {
  const W = 200;
  const H = 28;
  if (dataPoints.length < 2) return null;

  const balances = dataPoints.map((d) => d.balance);
  const minV = Math.min(...balances);
  const maxV = Math.max(...balances);
  const range = maxV - minV || 1;

  const pts = dataPoints
    .map((d, i) => {
      const x = (i / (dataPoints.length - 1)) * W;
      const y = H - ((d.balance - minV) / range) * H * 0.85 - 1;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <View style={{ width: W, height: H }}>
      <Svg width={W} height={H}>
        <Polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

// ─── Balance trajectory chart ─────────────────────────────────────────────────

function BalanceChart({ dataPoints, width }: { dataPoints: MonthDataPoint[]; width: number }) {
  const colors = useColors();
  const H = 180;
  const padLeft = 58;
  const padBottom = 28;
  const cw = Math.max(width - padLeft - 8, 10);
  const ch = H - padBottom;

  if (dataPoints.length < 2 || width < 10) return null;

  const balances = dataPoints.map((d) => d.balance);
  const minV = Math.min(...balances);
  const maxV = Math.max(...balances);
  const range = maxV - minV || 1;

  const toX = (i: number) => padLeft + (i / (dataPoints.length - 1)) * cw;
  const toY = (v: number) => ((maxV - v) / range) * ch;

  const linePts = dataPoints.map((d, i) => `${toX(i).toFixed(1)},${toY(d.balance).toFixed(1)}`).join(" ");
  const fillPts =
    `${toX(0).toFixed(1)},${ch} ` +
    dataPoints.map((d, i) => `${toX(i).toFixed(1)},${toY(d.balance).toFixed(1)}`).join(" ") +
    ` ${toX(dataPoints.length - 1).toFixed(1)},${ch}`;

  const isPositive = balances[balances.length - 1] >= balances[0];
  const lineColor = isPositive ? colors.accent : colors.danger;
  const fillColor = isPositive ? colors.accent + "28" : colors.danger + "28";

  const fmt = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `$${(v / 1000).toFixed(0)}k`;
    return `$${Math.round(v)}`;
  };

  const yGridVals = [minV, minV + range * 0.5, maxV];

  const labelIdxs: number[] = [0];
  const step = Math.max(1, Math.floor((dataPoints.length - 1) / 3));
  for (let i = step; i < dataPoints.length - 1; i += step) labelIdxs.push(i);
  labelIdxs.push(dataPoints.length - 1);
  const uniqueLabelIdxs = [...new Set(labelIdxs)];

  return (
    <View style={{ width, height: H }}>
      <Svg width={width} height={H}>
        <Polygon points={fillPts} fill={fillColor} />
        {yGridVals.map((v, idx) => {
          const y = toY(v);
          return (
            <G key={idx}>
              <Line x1={padLeft} y1={y} x2={width - 8} y2={y} stroke={colors.border} strokeWidth={1} strokeDasharray="3,3" />
              <SvgText x={padLeft - 4} y={y + 4} fill={colors.mutedForeground} fontSize={9} textAnchor="end">
                {fmt(v)}
              </SvgText>
            </G>
          );
        })}
        <Polyline points={linePts} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {uniqueLabelIdxs.map((i) => {
          const d = dataPoints[i];
          const x = toX(i);
          return (
            <SvgText key={i} x={x} y={H - 6} fill={colors.mutedForeground} fontSize={9} textAnchor="middle">
              {d.label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

// ─── Slider row ───────────────────────────────────────────────────────────────

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  color,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  color: string;
}) {
  const colors = useColors();
  const steps = Math.round((max - min) / step);
  const currentStep = Math.round((value - min) / step);
  const pct = steps > 0 ? Math.max(0, Math.min(1, currentStep / steps)) : 0;

  const decrement = () => onChange(Math.max(min, Math.round((value - step) * 100) / 100));
  const increment = () => onChange(Math.min(max, Math.round((value + step) * 100) / 100));

  return (
    <View style={sliderStyles.row}>
      <View style={sliderStyles.labelRow}>
        <Text style={[sliderStyles.label, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[sliderStyles.value, { color }]}>{format(value)}</Text>
      </View>
      <View style={sliderStyles.controls}>
        <TouchableOpacity onPress={decrement} style={[sliderStyles.btn, { backgroundColor: colors.cardElevated }]}>
          <Feather name="minus" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
        <View style={[sliderStyles.track, { backgroundColor: colors.border }]}>
          <View style={[sliderStyles.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
        </View>
        <TouchableOpacity onPress={increment} style={[sliderStyles.btn, { backgroundColor: colors.cardElevated }]}>
          <Feather name="plus" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  row: { marginBottom: 20 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { fontSize: 14, fontWeight: "500" },
  value: { fontSize: 14, fontWeight: "700" },
  controls: { flexDirection: "row", alignItems: "center", gap: 8 },
  btn: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3, minWidth: 4 },
});

// ─── Scenario card ────────────────────────────────────────────────────────────

function ScenarioCard({
  run,
  onOpen,
  onDelete,
}: {
  run: SimulationRun;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  const results = run.results;
  if (!results) return null;

  const balanceChange = results.finalBalance - results.startingBalance;
  const isPositive = balanceChange >= 0;
  const changeColor = isPositive ? colors.accent : colors.danger;

  const fmtK = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1000) return `$${(abs / 1000).toFixed(1)}k`;
    return `$${Math.abs(Math.round(v))}`;
  };

  const horizonLabel =
    run.inputs.timeHorizonMonths < 12
      ? `${run.inputs.timeHorizonMonths}mo`
      : run.inputs.timeHorizonMonths === 12
      ? "1yr"
      : `${(run.inputs.timeHorizonMonths / 12).toFixed(0)}yr`;

  const dateLabel = new Date(run.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <TouchableOpacity
      style={[cardStyles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onOpen}
      activeOpacity={0.75}
    >
      <View style={cardStyles.header}>
        <View style={cardStyles.titleRow}>
          <View style={[cardStyles.dot, { backgroundColor: changeColor }]} />
          <Text style={[cardStyles.title, { color: colors.text }]} numberOfLines={1}>
            {run.scenarioName}
          </Text>
        </View>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="trash-2" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <View style={cardStyles.metrics}>
        <View style={cardStyles.metric}>
          <Text style={[cardStyles.metricLabel, { color: colors.mutedForeground }]}>Balance change</Text>
          <Text style={[cardStyles.metricValue, { color: changeColor }]}>
            {isPositive ? "+" : "-"}{fmtK(balanceChange)}
          </Text>
        </View>
        <View style={cardStyles.metric}>
          <Text style={[cardStyles.metricLabel, { color: colors.mutedForeground }]}>Savings rate</Text>
          <Text style={[cardStyles.metricValue, { color: results.finalSavingsRate >= 10 ? colors.accent : colors.warning }]}>
            {results.finalSavingsRate.toFixed(1)}%
          </Text>
        </View>
        <View style={cardStyles.metric}>
          <Text style={[cardStyles.metricLabel, { color: colors.mutedForeground }]}>Horizon</Text>
          <Text style={[cardStyles.metricValue, { color: colors.textSecondary }]}>{horizonLabel}</Text>
        </View>
      </View>

      {results.dataPoints && results.dataPoints.length > 1 && (
        <View style={{ marginBottom: 8 }}>
          <MiniSparkline dataPoints={results.dataPoints} color={changeColor} />
        </View>
      )}

      <Text style={[cardStyles.date, { color: colors.mutedForeground }]}>{dateLabel}</Text>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  container: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { fontSize: 16, fontWeight: "700", flex: 1 },
  metrics: { flexDirection: "row", gap: 16, marginBottom: 12 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 11, marginBottom: 2 },
  metricValue: { fontSize: 15, fontWeight: "700" },
  date: { fontSize: 11 },
});

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew, colors }: { onNew: () => void; colors: ReturnType<typeof useColors> }) {
  const examples = [
    "What if I save $200/month?",
    "What if I cut spending 20%?",
    "What if I take on a $500/mo loan?",
  ];
  return (
    <View style={emptyStyles.container}>
      <View style={[emptyStyles.icon, { backgroundColor: colors.primary + "20" }]}>
        <Feather name="layers" size={36} color={colors.primary} />
      </View>
      <Text style={[emptyStyles.title, { color: colors.text }]}>No simulations yet</Text>
      <Text style={[emptyStyles.desc, { color: colors.mutedForeground }]}>
        Run your first scenario to see how financial decisions play out over time.
      </Text>
      <View style={emptyStyles.chips}>
        {examples.map((ex) => (
          <View key={ex} style={[emptyStyles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="zap" size={11} color={colors.primary} />
            <Text style={[emptyStyles.chipText, { color: colors.mutedForeground }]}>{ex}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={[emptyStyles.btn, { backgroundColor: colors.primary }]} onPress={onNew} activeOpacity={0.8}>
        <Feather name="plus" size={16} color="#fff" />
        <Text style={emptyStyles.btnText}>Create First Scenario</Text>
      </TouchableOpacity>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { alignItems: "center", paddingTop: 60, paddingBottom: 40 },
  icon: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 10 },
  desc: { fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 28, maxWidth: 280 },
  chips: { gap: 8, marginBottom: 32, alignSelf: "stretch" },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  chipText: { fontSize: 13 },
  btn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

// ─── Small metric card ────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon,
  color,
  colors,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[metricStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name={icon as any} size={14} color={color} style={{ marginBottom: 6 }} />
      <Text style={[metricStyles.value, { color }]}>{value}</Text>
      <Text style={[metricStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  card: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, minWidth: "45%" },
  value: { fontSize: 18, fontWeight: "800", marginBottom: 2 },
  label: { fontSize: 11 },
});

// ─── Goal timeline row ────────────────────────────────────────────────────────

function GoalTimelineRow({ goal, colors }: { goal: any; colors: ReturnType<typeof useColors> }) {
  const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
  const willFinish = goal.monthsToComplete !== null;
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text, flex: 1 }} numberOfLines={1}>
          {goal.goalName}
        </Text>
        <Text style={{ fontSize: 12, fontWeight: "500", color: willFinish ? colors.accent : colors.mutedForeground, marginLeft: 8 }}>
          {willFinish ? `✓ ${goal.completionLabel}` : "Beyond horizon"}
        </Text>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: "hidden" }}>
        <View style={{ height: "100%", borderRadius: 2, minWidth: 4, width: `${pct}%`, backgroundColor: willFinish ? colors.accent : colors.mutedForeground }} />
      </View>
    </View>
  );
}

// ─── Input summary row ────────────────────────────────────────────────────────

function InputSummaryRow({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary }}>{value}</Text>
    </View>
  );
}

// ─── Default inputs ───────────────────────────────────────────────────────────

const DEFAULT_INPUTS: Omit<ScenarioInputs, "scenarioName"> = {
  incomeChangePercent: 0,
  spendingChangePercent: 0,
  additionalMonthlySaving: 0,
  newMonthlyObligation: 0,
  oneTimeExpense: 0,
  timeHorizonMonths: 12,
};

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SimulateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [screen, setScreen] = useState<Screen>("list");
  const [selectedRun, setSelectedRun] = useState<SimulationRun | null>(null);
  const [scenarioName, setScenarioName] = useState("My Scenario");
  const [inputs, setInputs] = useState<Omit<ScenarioInputs, "scenarioName">>(DEFAULT_INPUTS);
  const [chartWidth, setChartWidth] = useState(0);

  const { data: simulations, isLoading: listLoading } = useGetSimulations({ staleTime: 30_000, retry: 1 });

  const { mutate: runSim, isPending: isRunning } = useRunSimulation({
    onSuccess: (run) => {
      queryClient.invalidateQueries({ queryKey: getSimulationsQueryKey() });
      setSelectedRun(run);
      setScreen("results");
    },
    onError: () => Alert.alert("Simulation failed", "Could not run the simulation. Please try again."),
  });

  const { mutate: deleteSim } = useDeleteSimulation({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getSimulationsQueryKey() }),
    onError: () => Alert.alert("Error", "Could not delete this simulation."),
  });

  const handleRun = useCallback(() => {
    if (!scenarioName.trim()) { Alert.alert("Name required", "Give your scenario a name."); return; }
    runSim({ ...inputs, scenarioName: scenarioName.trim() });
  }, [scenarioName, inputs, runSim]);

  const handleDelete = useCallback((id: number) => {
    Alert.alert("Delete scenario", "Remove this simulation?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteSim(id) },
    ]);
  }, [deleteSim]);

  const openBuilder = useCallback(() => {
    setScenarioName("My Scenario");
    setInputs(DEFAULT_INPUTS);
    setScreen("builder");
  }, []);

  const formatPct = (v: number) => (v >= 0 ? `+${v}%` : `${v}%`);
  const formatDollar = (v: number) => (v === 0 ? "$0" : `$${v.toLocaleString()}`);

  // ─── List screen ───────────────────────────────────────────────────────────
  if (screen === "list") {
    return (
      <View style={[gs.flex, { backgroundColor: colors.background }]}>
        <ScrollView
          style={gs.flex}
          contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
        >
          <View style={gs.pageHeader}>
            <View>
              <Text style={[gs.pageTitle, { color: colors.text }]}>Digital Twin Lab</Text>
              <Text style={[gs.pageSubtitle, { color: colors.mutedForeground }]}>Run what-if simulations on your finances</Text>
            </View>
            <TouchableOpacity style={[gs.newBtn, { backgroundColor: colors.primary }]} onPress={openBuilder} activeOpacity={0.8}>
              <Feather name="plus" size={16} color="#fff" />
              <Text style={gs.newBtnText}>New</Text>
            </TouchableOpacity>
          </View>

          {listLoading ? (
            <View style={gs.center}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={[{ marginTop: 12, fontSize: 14 }, { color: colors.mutedForeground }]}>Loading scenarios…</Text>
            </View>
          ) : !simulations || simulations.length === 0 ? (
            <EmptyState onNew={openBuilder} colors={colors} />
          ) : (
            simulations.map((run) => (
              <ScenarioCard
                key={run.id}
                run={run}
                onOpen={() => { setSelectedRun(run); setScreen("results"); }}
                onDelete={() => handleDelete(run.id)}
              />
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  // ─── Builder screen ────────────────────────────────────────────────────────
  if (screen === "builder") {
    return (
      <View style={[gs.flex, { backgroundColor: colors.background }]}>
        <ScrollView
          style={gs.flex}
          contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 120 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={gs.navRow}>
            <TouchableOpacity onPress={() => setScreen("list")} style={gs.navBtn}>
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[gs.navTitle, { color: colors.text }]}>Scenario Builder</Text>
            <View style={gs.navBtn} />
          </View>

          {/* Name */}
          <View style={[gs.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[gs.sectionLabel, { color: colors.mutedForeground }]}>SCENARIO NAME</Text>
            <TextInput
              value={scenarioName}
              onChangeText={setScenarioName}
              placeholder="e.g. Cut dining by 30%"
              placeholderTextColor={colors.mutedForeground}
              style={[gs.nameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardElevated }]}
              maxLength={60}
            />
          </View>

          {/* Income */}
          <View style={[gs.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[gs.sectionLabel, { color: colors.mutedForeground }]}>INCOME</Text>
            <SliderRow
              label="Income change"
              value={inputs.incomeChangePercent}
              min={-50} max={100} step={5}
              format={formatPct}
              onChange={(v) => setInputs((p) => ({ ...p, incomeChangePercent: v }))}
              color={inputs.incomeChangePercent >= 0 ? colors.accent : colors.danger}
            />
          </View>

          {/* Spending */}
          <View style={[gs.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[gs.sectionLabel, { color: colors.mutedForeground }]}>SPENDING</Text>
            <SliderRow
              label="Spending change"
              value={inputs.spendingChangePercent}
              min={-60} max={60} step={5}
              format={formatPct}
              onChange={(v) => setInputs((p) => ({ ...p, spendingChangePercent: v }))}
              color={inputs.spendingChangePercent <= 0 ? colors.accent : colors.danger}
            />
            <SliderRow
              label="New monthly obligation"
              value={inputs.newMonthlyObligation}
              min={0} max={2000} step={50}
              format={formatDollar}
              onChange={(v) => setInputs((p) => ({ ...p, newMonthlyObligation: v }))}
              color={inputs.newMonthlyObligation === 0 ? colors.mutedForeground : colors.warning}
            />
            <SliderRow
              label="One-time expense"
              value={inputs.oneTimeExpense}
              min={0} max={50000} step={500}
              format={formatDollar}
              onChange={(v) => setInputs((p) => ({ ...p, oneTimeExpense: v }))}
              color={inputs.oneTimeExpense === 0 ? colors.mutedForeground : colors.warning}
            />
          </View>

          {/* Savings */}
          <View style={[gs.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[gs.sectionLabel, { color: colors.mutedForeground }]}>SAVINGS</Text>
            <SliderRow
              label="Extra monthly savings"
              value={inputs.additionalMonthlySaving}
              min={0} max={2000} step={50}
              format={formatDollar}
              onChange={(v) => setInputs((p) => ({ ...p, additionalMonthlySaving: v }))}
              color={inputs.additionalMonthlySaving === 0 ? colors.mutedForeground : colors.accent}
            />
          </View>

          {/* Time horizon */}
          <View style={[gs.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[gs.sectionLabel, { color: colors.mutedForeground }]}>TIME HORIZON</Text>
            <View style={gs.chipRow}>
              {([3, 6, 12, 24, 36, 60] as const).map((mo) => {
                const label = mo < 12 ? `${mo}mo` : mo === 12 ? "1yr" : mo === 24 ? "2yr" : mo === 36 ? "3yr" : "5yr";
                const active = inputs.timeHorizonMonths === mo;
                return (
                  <TouchableOpacity
                    key={mo}
                    onPress={() => setInputs((p) => ({ ...p, timeHorizonMonths: mo }))}
                    style={[gs.chip, { backgroundColor: active ? colors.primary : colors.cardElevated, borderColor: active ? colors.primary : colors.border }]}
                  >
                    <Text style={[gs.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={[gs.fixedBottom, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[gs.runBtn, { backgroundColor: colors.primary, opacity: isRunning ? 0.7 : 1 }]}
            onPress={handleRun}
            disabled={isRunning}
            activeOpacity={0.8}
          >
            {isRunning ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="play" size={18} color="#fff" />}
            <Text style={gs.runBtnText}>{isRunning ? "Simulating…" : "Run Simulation"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Results screen ────────────────────────────────────────────────────────
  const run = selectedRun;
  if (!run || !run.results) { setScreen("list"); return null; }

  const results = run.results;
  const balanceChange = results.finalBalance - results.startingBalance;
  const isPositive = balanceChange >= 0;
  const changeColor = isPositive ? colors.accent : colors.danger;

  const fmtK = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `$${(Math.abs(v) / 1_000).toFixed(1)}k`;
    return `$${Math.abs(Math.round(v))}`;
  };

  const horizonText =
    run.inputs.timeHorizonMonths < 12
      ? `${run.inputs.timeHorizonMonths} months`
      : run.inputs.timeHorizonMonths === 12
      ? "1 year"
      : `${(run.inputs.timeHorizonMonths / 12).toFixed(0)} years`;

  return (
    <View style={[gs.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        style={gs.flex}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
        onLayout={(e) => setChartWidth(e.nativeEvent.layout.width - 40)}
      >
        <View style={gs.navRow}>
          <TouchableOpacity onPress={() => setScreen("list")} style={gs.navBtn}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[gs.navTitle, { color: colors.text }]} numberOfLines={1}>{run.scenarioName}</Text>
          <TouchableOpacity onPress={openBuilder} style={gs.navBtn}>
            <Feather name="plus" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={[gs.heroCard, { backgroundColor: isPositive ? colors.accent + "18" : colors.danger + "18", borderColor: changeColor + "50" }]}>
          <Text style={[gs.heroLabel, { color: colors.mutedForeground }]}>Balance after {horizonText}</Text>
          <Text style={[gs.heroValue, { color: changeColor }]}>
            {isPositive ? "+" : "-"}{fmtK(Math.abs(balanceChange))}
          </Text>
          <Text style={[gs.heroSub, { color: colors.mutedForeground }]}>
            {fmtK(results.startingBalance)} → {fmtK(results.finalBalance)}
          </Text>
        </View>

        {/* Chart */}
        <View
          style={[gs.section, { backgroundColor: colors.card, borderColor: colors.border }]}
          onLayout={(e) => setChartWidth(e.nativeEvent.layout.width - 32)}
        >
          <Text style={[gs.sectionLabel, { color: colors.mutedForeground, marginBottom: 16 }]}>BALANCE TRAJECTORY</Text>
          {chartWidth > 10 && results.dataPoints && results.dataPoints.length > 1 && (
            <BalanceChart dataPoints={results.dataPoints} width={chartWidth} />
          )}
        </View>

        {/* Metrics */}
        <View style={gs.metricsGrid}>
          <MetricCard label="Savings Rate" value={`${results.finalSavingsRate.toFixed(1)}%`} icon="trending-up" color={results.finalSavingsRate >= 15 ? colors.accent : results.finalSavingsRate >= 0 ? colors.warning : colors.danger} colors={colors} />
          <MetricCard label="Avg Monthly Saved" value={fmtK(results.avgMonthlySavings)} icon="dollar-sign" color={results.avgMonthlySavings >= 0 ? colors.accent : colors.danger} colors={colors} />
          <MetricCard label="Total Saved" value={fmtK(results.totalSaved)} icon="archive" color={colors.primary} colors={colors} />
          <MetricCard label="Monthly Income" value={fmtK(results.projectedMonthlyIncome)} icon="activity" color={colors.textSecondary} colors={colors} />
        </View>

        {/* AI narrative */}
        {run.narrative && (
          <View style={[gs.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Feather name="cpu" size={14} color={colors.primary} />
              <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.8, color: colors.primary }}>AI ANALYSIS</Text>
            </View>
            <Text style={{ fontSize: 15, lineHeight: 24, color: colors.textSecondary }}>{run.narrative}</Text>
          </View>
        )}

        {/* Goal timelines */}
        {results.goalTimelines && results.goalTimelines.length > 0 && (
          <View style={[gs.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[gs.sectionLabel, { color: colors.mutedForeground }]}>GOAL TIMELINES</Text>
            {results.goalTimelines.map((g) => (
              <GoalTimelineRow key={g.goalId} goal={g} colors={colors} />
            ))}
          </View>
        )}

        {/* Inputs summary */}
        <View style={[gs.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[gs.sectionLabel, { color: colors.mutedForeground }]}>SCENARIO INPUTS</Text>
          <InputSummaryRow label="Income change" value={`${run.inputs.incomeChangePercent >= 0 ? "+" : ""}${run.inputs.incomeChangePercent}%`} colors={colors} />
          <InputSummaryRow label="Spending change" value={`${run.inputs.spendingChangePercent >= 0 ? "+" : ""}${run.inputs.spendingChangePercent}%`} colors={colors} />
          {run.inputs.additionalMonthlySaving > 0 && <InputSummaryRow label="Extra savings" value={`+$${run.inputs.additionalMonthlySaving.toLocaleString()}/mo`} colors={colors} />}
          {run.inputs.newMonthlyObligation > 0 && <InputSummaryRow label="New obligation" value={`$${run.inputs.newMonthlyObligation.toLocaleString()}/mo`} colors={colors} />}
          {run.inputs.oneTimeExpense > 0 && <InputSummaryRow label="One-time expense" value={`$${run.inputs.oneTimeExpense.toLocaleString()}`} colors={colors} />}
          <InputSummaryRow label="Time horizon" value={horizonText} colors={colors} />
        </View>
      </ScrollView>

      <View style={[gs.fixedBottom, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[gs.runBtn, { backgroundColor: colors.primary }]} onPress={openBuilder} activeOpacity={0.8}>
          <Feather name="plus" size={18} color="#fff" />
          <Text style={gs.runBtnText}>New Scenario</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Global styles ────────────────────────────────────────────────────────────

const gs = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: "center", paddingVertical: 60 },
  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: "800", marginBottom: 4 },
  pageSubtitle: { fontSize: 14 },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  newBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  navRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  navBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  navTitle: { fontSize: 18, fontWeight: "700", flex: 1, textAlign: "center", marginHorizontal: 4 },
  section: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 14 },
  nameInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: "600" },
  fixedBottom: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  runBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 16 },
  runBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  heroCard: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center", marginBottom: 16 },
  heroLabel: { fontSize: 13, marginBottom: 8, fontWeight: "500" },
  heroValue: { fontSize: 44, fontWeight: "900", marginBottom: 4 },
  heroSub: { fontSize: 14 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
});
