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
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Svg, { Polyline, Polygon, Line, Text as SvgText, G } from "react-native-svg";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSimulations,
  useRunSimulation,
  useDeleteSimulation,
  useUpdateSimulation,
  getSimulationsQueryKey,
} from "@workspace/api-client-react";
import type { SimulationRun, ScenarioInputs, MonthDataPoint } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import {
  checkCompareEligibility,
  hasEnoughChartData,
  computeCompareWinners,
} from "@/utils/compare-flow";

type Screen = "list" | "builder" | "results" | "compare";

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

// ─── Balance trajectory chart (single) ───────────────────────────────────────

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

// ─── Dual comparison chart ────────────────────────────────────────────────────

const COMPARE_COLOR_A = "#6C63FF";
const COMPARE_COLOR_B = "#FF6B6B";

function CompareChart({
  dataPointsA,
  dataPointsB,
  labelA,
  labelB,
  width,
}: {
  dataPointsA: MonthDataPoint[];
  dataPointsB: MonthDataPoint[];
  labelA: string;
  labelB: string;
  width: number;
}) {
  const colors = useColors();
  const H = 200;
  const padLeft = 58;
  const padBottom = 32;
  const cw = Math.max(width - padLeft - 8, 10);
  const ch = H - padBottom;

  if (width < 10) return null;

  const allBalances = [
    ...dataPointsA.map((d) => d.balance),
    ...dataPointsB.map((d) => d.balance),
  ];
  const minV = Math.min(...allBalances);
  const maxV = Math.max(...allBalances);
  const range = maxV - minV || 1;

  const lenA = dataPointsA.length;
  const lenB = dataPointsB.length;
  const maxLen = Math.max(lenA, lenB);

  const toXA = (i: number) => padLeft + (i / Math.max(lenA - 1, 1)) * cw;
  const toXB = (i: number) => padLeft + (i / Math.max(lenB - 1, 1)) * cw;
  const toY = (v: number) => ((maxV - v) / range) * ch;

  const fmt = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `$${(v / 1000).toFixed(0)}k`;
    return `$${Math.round(v)}`;
  };

  const yGridVals = [minV, minV + range * 0.5, maxV];

  const ptsA = dataPointsA.length >= 2
    ? dataPointsA.map((d, i) => `${toXA(i).toFixed(1)},${toY(d.balance).toFixed(1)}`).join(" ")
    : "";
  const ptsB = dataPointsB.length >= 2
    ? dataPointsB.map((d, i) => `${toXB(i).toFixed(1)},${toY(d.balance).toFixed(1)}`).join(" ")
    : "";

  const labelIdxs: number[] = [0];
  const step = Math.max(1, Math.floor((maxLen - 1) / 4));
  for (let i = step; i < maxLen - 1; i += step) labelIdxs.push(i);
  labelIdxs.push(maxLen - 1);
  const uniqueLabelIdxs = [...new Set(labelIdxs)];

  return (
    <View style={{ width, height: H + 28 }}>
      <Svg width={width} height={H}>
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
        {ptsA ? (
          <Polyline points={ptsA} fill="none" stroke={COMPARE_COLOR_A} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
        {ptsB ? (
          <Polyline points={ptsB} fill="none" stroke={COMPARE_COLOR_B} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6,3" />
        ) : null}
        {uniqueLabelIdxs.map((i) => {
          const srcA = dataPointsA[Math.min(i, lenA - 1)];
          const srcB = dataPointsB[Math.min(i, lenB - 1)];
          const src = srcA || srcB;
          const x = padLeft + (i / Math.max(maxLen - 1, 1)) * cw;
          return (
            <SvgText key={i} x={x} y={H - 6} fill={colors.mutedForeground} fontSize={9} textAnchor="middle">
              {src?.label ?? ""}
            </SvgText>
          );
        })}
      </Svg>
      {/* Legend */}
      <View style={{ flexDirection: "row", gap: 20, marginTop: 8, paddingLeft: padLeft }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 20, height: 3, backgroundColor: COMPARE_COLOR_A, borderRadius: 2 }} />
          <Text style={{ fontSize: 11, color: colors.mutedForeground }} numberOfLines={1}>{labelA}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 20, height: 3, backgroundColor: COMPARE_COLOR_B, borderRadius: 2, borderStyle: "dashed" }} />
          <Text style={{ fontSize: 11, color: colors.mutedForeground }} numberOfLines={1}>{labelB}</Text>
        </View>
      </View>
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
  selectMode,
  selected,
  onToggleSelect,
}: {
  run: SimulationRun;
  onOpen: () => void;
  onDelete: () => void;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(run.scenarioName);
  const [editNote, setEditNote] = useState(run.inputs.note ?? "");

  const { mutate: updateSim, isPending: isSaving } = useUpdateSimulation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getSimulationsQueryKey() });
      setIsEditing(false);
    },
    onError: () => Alert.alert("Error", "Could not save changes. Please try again."),
  });

  const handleSave = () => {
    const trimmedName = editName.trim();
    if (!trimmedName) { Alert.alert("Name required", "Scenario name cannot be empty."); return; }
    updateSim({ id: run.id, scenarioName: trimmedName, note: editNote.trim() });
  };

  const handleCancelEdit = () => {
    setEditName(run.scenarioName);
    setEditNote(run.inputs.note ?? "");
    setIsEditing(false);
  };

  const results = run.results;

  if (!results) {
    const dateLabel = new Date(run.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return (
      <View
        style={[
          cardStyles.container,
          { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, opacity: 0.5 },
        ]}
      >
        <View style={cardStyles.header}>
          <View style={cardStyles.titleRow}>
            {selectMode ? (
              <View style={[cardStyles.checkbox, { borderColor: colors.border, backgroundColor: "transparent" }]} />
            ) : (
              <View style={[cardStyles.dot, { backgroundColor: colors.mutedForeground }]} />
            )}
            <Text style={[cardStyles.title, { color: colors.text }]} numberOfLines={1}>
              {run.scenarioName}
            </Text>
          </View>
          {!selectMode && (
            <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="trash-2" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
        <View style={cardStyles.metrics}>
          <Text style={[cardStyles.metricLabel, { color: colors.mutedForeground }]}>
            Simulation pending — run to see results
          </Text>
        </View>
        <View>
          <Text style={[cardStyles.date, { color: colors.mutedForeground }]}>{dateLabel}</Text>
        </View>
      </View>
    );
  }

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

  const borderColor = selected ? COMPARE_COLOR_A : isEditing ? colors.primary : colors.border;
  const currentNote = run.inputs.note;

  if (isEditing) {
    return (
      <View style={[cardStyles.container, { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 2 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <View style={[cardStyles.dot, { backgroundColor: changeColor }]} />
          <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.6, color: colors.primary, flex: 1 }}>EDITING SCENARIO</Text>
          <TouchableOpacity onPress={handleCancelEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 11, color: colors.mutedForeground, marginBottom: 6, fontWeight: "600" }}>NAME</Text>
        <TextInput
          value={editName}
          onChangeText={setEditName}
          placeholder="Scenario name"
          placeholderTextColor={colors.mutedForeground}
          style={[gs.nameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardElevated, marginBottom: 14 }]}
          maxLength={60}
          autoFocus
        />

        <Text style={{ fontSize: 11, color: colors.mutedForeground, marginBottom: 6, fontWeight: "600" }}>NOTE (optional)</Text>
        <TextInput
          value={editNote}
          onChangeText={setEditNote}
          placeholder="e.g. aggressive savings plan, worst-case scenario…"
          placeholderTextColor={colors.mutedForeground}
          style={[gs.nameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardElevated, marginBottom: 16, fontSize: 14 }]}
          maxLength={120}
          multiline
        />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            style={[cardStyles.editBtn, { backgroundColor: colors.cardElevated, borderWidth: 1, borderColor: colors.border, flex: 1 }]}
            onPress={handleCancelEdit}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textSecondary }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[cardStyles.editBtn, { backgroundColor: colors.primary, flex: 2, opacity: isSaving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Feather name="check" size={15} color="#fff" />}
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>{isSaving ? "Saving…" : "Save"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        cardStyles.container,
        { backgroundColor: colors.card, borderColor, borderWidth: selected ? 2 : 1 },
      ]}
      onPress={selectMode ? onToggleSelect : onOpen}
      activeOpacity={0.75}
    >
      <View style={cardStyles.header}>
        <View style={cardStyles.titleRow}>
          {selectMode ? (
            <View style={[
              cardStyles.checkbox,
              { borderColor: selected ? COMPARE_COLOR_A : colors.border, backgroundColor: selected ? COMPARE_COLOR_A : "transparent" },
            ]}>
              {selected && <Feather name="check" size={11} color="#fff" />}
            </View>
          ) : (
            <View style={[cardStyles.dot, { backgroundColor: changeColor }]} />
          )}
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={selectMode ? onToggleSelect : () => setIsEditing(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}
          >
            <Text style={[cardStyles.title, { color: colors.text }]} numberOfLines={1}>
              {run.scenarioName}
            </Text>
            {currentNote ? (
              <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 1 }} numberOfLines={1}>
                {currentNote}
              </Text>
            ) : !selectMode ? (
              <Text style={{ fontSize: 11, color: colors.primary + "80", marginTop: 1 }}>
                Tap to rename / add note
              </Text>
            ) : null}
          </TouchableOpacity>
          {!selectMode && (
            <TouchableOpacity onPress={() => setIsEditing(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginRight: 8 }}>
              <Feather name="edit-2" size={13} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
        {!selectMode && (
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="trash-2" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
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
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 16, fontWeight: "700" },
  metrics: { flexDirection: "row", gap: 16, marginBottom: 12 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 11, marginBottom: 2 },
  metricValue: { fontSize: 15, fontWeight: "700" },
  date: { fontSize: 11 },
  editBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 10 },
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

// ─── Diff table row ───────────────────────────────────────────────────────────

function DiffRow({
  label,
  valueA,
  valueB,
  winnerIsA,
  colors,
}: {
  label: string;
  valueA: string;
  valueB: string;
  winnerIsA: boolean | null;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={diffStyles.row}>
      <Text style={[diffStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={diffStyles.values}>
        <View style={[diffStyles.cell, winnerIsA === true && { backgroundColor: COMPARE_COLOR_A + "20", borderRadius: 8 }]}>
          {winnerIsA === true && <Feather name="award" size={10} color={COMPARE_COLOR_A} style={{ marginRight: 3 }} />}
          <Text style={[diffStyles.val, { color: winnerIsA === true ? COMPARE_COLOR_A : colors.textSecondary, fontWeight: winnerIsA === true ? "800" : "600" }]}>
            {valueA}
          </Text>
        </View>
        <View style={[diffStyles.cell, winnerIsA === false && { backgroundColor: COMPARE_COLOR_B + "20", borderRadius: 8 }]}>
          {winnerIsA === false && <Feather name="award" size={10} color={COMPARE_COLOR_B} style={{ marginRight: 3 }} />}
          <Text style={[diffStyles.val, { color: winnerIsA === false ? COMPARE_COLOR_B : colors.textSecondary, fontWeight: winnerIsA === false ? "800" : "600" }]}>
            {valueB}
          </Text>
        </View>
      </View>
    </View>
  );
}

const diffStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
  label: { fontSize: 13, flex: 1 },
  values: { flexDirection: "row", gap: 8 },
  cell: { width: 90, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingHorizontal: 8, paddingVertical: 4 },
  val: { fontSize: 14 },
});

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

  // Compare selection state
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [compareRuns, setCompareRuns] = useState<[SimulationRun, SimulationRun] | null>(null);

  const selectMode = compareIds.length > 0;

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

  const handleToggleCompare = useCallback((id: number) => {
    const run = simulations?.find((r) => r.id === id);
    if (!run?.results) return;
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  }, [simulations]);

  const handleStartCompare = useCallback(() => {
    if (compareIds.length !== 2 || !simulations) return;
    const runA = simulations.find((r) => r.id === compareIds[0]);
    const runB = simulations.find((r) => r.id === compareIds[1]);
    if (!runA || !runB) return;
    const eligibility = checkCompareEligibility(runA, runB);
    if (!eligibility.eligible) {
      Alert.alert("Scenario unavailable", eligibility.alertMessage, [{ text: "OK" }]);
      return;
    }
    setCompareRuns([runA, runB]);
    setScreen("compare");
  }, [compareIds, simulations]);

  const handleCancelCompare = useCallback(() => {
    setCompareIds([]);
  }, []);

  const handleShareComparison = useCallback(async () => {
    if (!compareRuns) return;
    const [runA, runB] = compareRuns;
    const resA = runA.results!;
    const resB = runB.results!;

    const balA = resA.finalBalance - resA.startingBalance;
    const balB = resB.finalBalance - resB.startingBalance;
    const winnerBalance = balA === balB ? null : balA > balB;
    const winnerSavingsRate = resA.finalSavingsRate === resB.finalSavingsRate ? null : resA.finalSavingsRate > resB.finalSavingsRate;
    const winnerTotalSaved = resA.totalSaved === resB.totalSaved ? null : resA.totalSaved > resB.totalSaved;
    const winnerFinalBalance = resA.finalBalance === resB.finalBalance ? null : resA.finalBalance > resB.finalBalance;

    const aWins = [winnerBalance, winnerSavingsRate, winnerTotalSaved, winnerFinalBalance].filter((w) => w === true).length;
    const bWins = [winnerBalance, winnerSavingsRate, winnerTotalSaved, winnerFinalBalance].filter((w) => w === false).length;
    const overallWinnerIsA = aWins > bWins ? true : bWins > aWins ? false : null;

    const signedFmt = (v: number) => {
      const abs = Math.abs(v);
      const prefix = v >= 0 ? "+" : "-";
      if (abs >= 1_000_000) return `${prefix}$${(abs / 1_000_000).toFixed(1)}M`;
      if (abs >= 1_000) return `${prefix}$${(abs / 1_000).toFixed(1)}k`;
      return `${prefix}$${Math.round(abs)}`;
    };
    const fmt = (v: number) => {
      const abs = Math.abs(v);
      if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
      if (abs >= 1_000) return `$${(Math.abs(v) / 1_000).toFixed(1)}k`;
      return `$${Math.abs(Math.round(v))}`;
    };
    const horizonLabel = (mo: number) =>
      mo < 12 ? `${mo}mo` : mo === 12 ? "1yr" : `${(mo / 12).toFixed(0)}yr`;

    const winCell = (val: string, isWinner: boolean | null, color: string) =>
      isWinner === true
        ? `<td class="win" style="color:${color};border-left-color:${color}20">🏆 ${val}</td>`
        : `<td>${val}</td>`;

    const metricRow = (label: string, valA: string, valB: string, winner: boolean | null) => `
      <tr>
        <td class="metric-label">${label}</td>
        ${winCell(valA, winner, "#6C63FF")}
        ${winCell(valB, winner === null ? null : !winner, "#FF6B6B")}
      </tr>`;

    const winnerName = overallWinnerIsA === null ? null : overallWinnerIsA ? runA.scenarioName : runB.scenarioName;
    const winnerColor = overallWinnerIsA ? "#6C63FF" : "#FF6B6B";
    const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    // ── Build inline SVG comparison chart ──────────────────────────────────────
    const dpA = resA.dataPoints ?? [];
    const dpB = resB.dataPoints ?? [];
    const chartW = 560;
    const chartH = 220;
    const padLeft = 64;
    const padBottom = 36;
    const plotW = chartW - padLeft - 12;
    const plotH = chartH - padBottom;

    const allBalances = [...dpA.map((d: any) => d.balance), ...dpB.map((d: any) => d.balance)];
    const minV = allBalances.length ? Math.min(...allBalances) : 0;
    const maxV = allBalances.length ? Math.max(...allBalances) : 1;
    const range = maxV - minV || 1;

    const toX = (i: number, len: number) => padLeft + (i / Math.max(len - 1, 1)) * plotW;
    const toY = (v: number) => ((maxV - v) / range) * plotH;

    const fmtAxis = (v: number) => {
      const abs = Math.abs(v);
      if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
      if (abs >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
      return `$${Math.round(v)}`;
    };

    const ptsA = dpA.length >= 2
      ? dpA.map((d: any, i: number) => `${toX(i, dpA.length).toFixed(1)},${toY(d.balance).toFixed(1)}`).join(" ")
      : "";
    const ptsB = dpB.length >= 2
      ? dpB.map((d: any, i: number) => `${toX(i, dpB.length).toFixed(1)},${toY(d.balance).toFixed(1)}`).join(" ")
      : "";

    const yGridVals = [minV, minV + range * 0.5, maxV];
    const yGridLines = yGridVals.map((v) => {
      const y = toY(v);
      return `<line x1="${padLeft}" y1="${y.toFixed(1)}" x2="${chartW - 12}" y2="${y.toFixed(1)}" stroke="#e8e8f0" stroke-width="1" stroke-dasharray="4,3"/>
              <text x="${(padLeft - 6).toFixed(0)}" y="${(y + 4).toFixed(1)}" fill="#aaa" font-size="10" text-anchor="end">${fmtAxis(v)}</text>`;
    }).join("\n");

    const maxLen = Math.max(dpA.length, dpB.length);
    const labelIdxs: number[] = [0];
    const step = Math.max(1, Math.floor((maxLen - 1) / 4));
    for (let i = step; i < maxLen - 1; i += step) labelIdxs.push(i);
    if (maxLen > 0) labelIdxs.push(maxLen - 1);
    const xLabels = [...new Set(labelIdxs)].map((i) => {
      const srcA = dpA[Math.min(i, dpA.length - 1)];
      const srcB = dpB[Math.min(i, dpB.length - 1)];
      const label = (srcA || srcB)?.label ?? "";
      const x = padLeft + (i / Math.max(maxLen - 1, 1)) * plotW;
      return `<text x="${x.toFixed(1)}" y="${(chartH - 6).toFixed(1)}" fill="#aaa" font-size="10" text-anchor="middle">${label}</text>`;
    }).join("\n");

    const chartSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${chartW}" height="${chartH}" viewBox="0 0 ${chartW} ${chartH}">
  ${yGridLines}
  ${ptsA ? `<polyline points="${ptsA}" fill="none" stroke="#6C63FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
  ${ptsB ? `<polyline points="${ptsB}" fill="none" stroke="#FF6B6B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="8,4"/>` : ""}
  ${xLabels}
</svg>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Scenario Comparison</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f9fc; color: #1a1a2e; padding: 32px 24px; }
  h1 { font-size: 26px; font-weight: 800; margin-bottom: 4px; }
  .subtitle { font-size: 13px; color: #888; margin-bottom: 28px; }
  .winner-banner { background: ${winnerColor}18; border: 1.5px solid ${winnerColor}50; border-radius: 16px; padding: 20px 24px; margin-bottom: 24px; text-align: center; }
  .winner-banner .label { font-size: 11px; font-weight: 700; letter-spacing: 1px; color: ${winnerColor}; margin-bottom: 6px; }
  .winner-banner .name { font-size: 22px; font-weight: 900; color: ${winnerColor}; margin-bottom: 4px; }
  .winner-banner .sub { font-size: 13px; color: #888; }
  .chart-card { background: #fff; border-radius: 16px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden; }
  .chart-card svg { display: block; width: 100%; height: auto; }
  .legend { display: flex; gap: 24px; margin-top: 12px; padding-left: 64px; }
  .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #666; }
  .legend-line { width: 24px; height: 3px; border-radius: 2px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 20px; }
  th { padding: 14px 16px; font-size: 12px; font-weight: 700; letter-spacing: 0.6px; background: #f0f0f7; text-align: center; }
  th.a { color: #6C63FF; }
  th.b { color: #FF6B6B; }
  th.label-col { text-align: left; color: #888; }
  td { padding: 13px 16px; font-size: 14px; font-weight: 600; text-align: center; border-top: 1px solid #f0f0f0; }
  td.metric-label { text-align: left; font-weight: 500; color: #666; font-size: 13px; }
  td.win { font-weight: 800; }
  .section-title { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; color: #aaa; margin-bottom: 10px; margin-top: 24px; }
  .footer { font-size: 11px; color: #bbb; text-align: center; margin-top: 28px; }
</style>
</head>
<body>
  <h1>Scenario Comparison</h1>
  <p class="subtitle">Generated ${dateStr} · AI Finance</p>

  ${winnerName ? `<div class="winner-banner">
    <div class="label">🏆 BETTER PATH</div>
    <div class="name">${winnerName}</div>
    <div class="sub">Wins ${overallWinnerIsA ? aWins : bWins} of ${aWins + bWins} metrics compared</div>
  </div>` : ""}

  <p class="section-title">BALANCE TRAJECTORIES</p>
  <div class="chart-card">
    ${chartSvg}
    <div class="legend">
      <div class="legend-item">
        <div class="legend-line" style="background:#6C63FF"></div>
        <span>${runA.scenarioName}</span>
      </div>
      <div class="legend-item">
        <div class="legend-line" style="background:#FF6B6B;border-top:3px dashed #FF6B6B;height:0"></div>
        <span>${runB.scenarioName}</span>
      </div>
    </div>
  </div>

  <p class="section-title">METRIC COMPARISON</p>
  <table>
    <thead>
      <tr>
        <th class="label-col">Metric</th>
        <th class="a">${runA.scenarioName}</th>
        <th class="b">${runB.scenarioName}</th>
      </tr>
    </thead>
    <tbody>
      ${metricRow("Balance change", signedFmt(balA), signedFmt(balB), winnerBalance)}
      ${metricRow("Final balance", fmt(resA.finalBalance), fmt(resB.finalBalance), winnerFinalBalance)}
      ${metricRow("Savings rate", `${resA.finalSavingsRate.toFixed(1)}%`, `${resB.finalSavingsRate.toFixed(1)}%`, winnerSavingsRate)}
      ${metricRow("Total saved", fmt(resA.totalSaved), fmt(resB.totalSaved), winnerTotalSaved)}
    </tbody>
  </table>

  <p class="section-title">SCENARIO INPUTS</p>
  <table>
    <thead>
      <tr>
        <th class="label-col">Input</th>
        <th class="a">${runA.scenarioName}</th>
        <th class="b">${runB.scenarioName}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="metric-label">Income change</td>
        <td>${runA.inputs.incomeChangePercent >= 0 ? "+" : ""}${runA.inputs.incomeChangePercent}%</td>
        <td>${runB.inputs.incomeChangePercent >= 0 ? "+" : ""}${runB.inputs.incomeChangePercent}%</td>
      </tr>
      <tr>
        <td class="metric-label">Spending change</td>
        <td>${runA.inputs.spendingChangePercent >= 0 ? "+" : ""}${runA.inputs.spendingChangePercent}%</td>
        <td>${runB.inputs.spendingChangePercent >= 0 ? "+" : ""}${runB.inputs.spendingChangePercent}%</td>
      </tr>
      <tr>
        <td class="metric-label">Extra savings</td>
        <td>${runA.inputs.additionalMonthlySaving > 0 ? `+$${runA.inputs.additionalMonthlySaving}/mo` : "—"}</td>
        <td>${runB.inputs.additionalMonthlySaving > 0 ? `+$${runB.inputs.additionalMonthlySaving}/mo` : "—"}</td>
      </tr>
      <tr>
        <td class="metric-label">Time horizon</td>
        <td>${horizonLabel(runA.inputs.timeHorizonMonths)}</td>
        <td>${horizonLabel(runB.inputs.timeHorizonMonths)}</td>
      </tr>
    </tbody>
  </table>

  <p class="footer">AI Finance · Scenario snapshot</p>
</body>
</html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Share comparison" });
      } else {
        Alert.alert("Sharing unavailable", "Your device does not support sharing files.");
      }
    } catch {
      Alert.alert("Export failed", "Could not generate the comparison PDF. Please try again.");
    }
  }, [compareRuns]);

  const formatPct = (v: number) => (v >= 0 ? `+${v}%` : `${v}%`);
  const formatDollar = (v: number) => (v === 0 ? "$0" : `$${v.toLocaleString()}`);

  const fmtK = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `$${(Math.abs(v) / 1_000).toFixed(1)}k`;
    return `$${Math.abs(Math.round(v))}`;
  };

  // ─── List screen ───────────────────────────────────────────────────────────
  if (screen === "list") {
    const simsWithResults = simulations?.filter((r) => !!r.results) ?? [];
    const hasEnough = simsWithResults.length >= 2;
    return (
      <View style={[gs.flex, { backgroundColor: colors.background }]}>
        <ScrollView
          style={gs.flex}
          contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 16 }}
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

          {/* Compare mode hint */}
          {hasEnough && !selectMode && (() => {
            const firstWithResults = simulations?.find((r) => !!r.results);
            return firstWithResults ? (
              <View style={[compareHintStyles.banner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="columns" size={14} color={COMPARE_COLOR_A} />
                <Text style={[compareHintStyles.text, { color: colors.mutedForeground }]}>
                  Select two scenarios to compare them side by side
                </Text>
                <TouchableOpacity
                  onPress={() => handleToggleCompare(firstWithResults.id)}
                  style={[compareHintStyles.btn, { backgroundColor: COMPARE_COLOR_A + "18" }]}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: COMPARE_COLOR_A }}>Select</Text>
                </TouchableOpacity>
              </View>
            ) : null;
          })()}

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
                selectMode={selectMode}
                selected={compareIds.includes(run.id)}
                onToggleSelect={() => handleToggleCompare(run.id)}
              />
            ))
          )}
        </ScrollView>

        {/* Bottom bar: compare controls or normal */}
        {selectMode ? (
          <View style={[gs.fixedBottom, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                style={[gs.runBtn, { flex: 1, backgroundColor: colors.cardElevated, borderWidth: 1, borderColor: colors.border }]}
                onPress={handleCancelCompare}
                activeOpacity={0.8}
              >
                <Feather name="x" size={16} color={colors.textSecondary} />
                <Text style={[gs.runBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[gs.runBtn, { flex: 2, backgroundColor: compareIds.length === 2 ? COMPARE_COLOR_A : colors.border }]}
                onPress={handleStartCompare}
                disabled={compareIds.length !== 2}
                activeOpacity={0.8}
              >
                <Feather name="columns" size={16} color="#fff" />
                <Text style={gs.runBtnText}>
                  {compareIds.length === 2 ? "Compare These Two" : `Select ${2 - compareIds.length} more`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[gs.fixedBottom, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <TouchableOpacity style={[gs.runBtn, { backgroundColor: colors.primary }]} onPress={openBuilder} activeOpacity={0.8}>
              <Feather name="plus" size={18} color="#fff" />
              <Text style={gs.runBtnText}>New Scenario</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ─── Builder screen ────────────────────────────────────────────────────────
  if (screen === "builder") {
    return (
      <View style={[gs.flex, { backgroundColor: colors.background }]}>
        <ScrollView
          style={gs.flex}
          contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 16 }}
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

  // ─── Compare screen ────────────────────────────────────────────────────────
  if (screen === "compare" && compareRuns) {
    const [runA, runB] = compareRuns;
    const resA = runA.results!;
    const resB = runB.results!;

    const balA = resA.finalBalance - resA.startingBalance;
    const balB = resB.finalBalance - resB.startingBalance;

    // Determine winner per metric using utility
    const {
      winnerBalance,
      winnerSavingsRate,
      winnerTotalSaved,
      winnerFinalBalance,
      aWins,
      bWins,
      overallWinnerIsA,
    } = computeCompareWinners(runA, runB);

    const signedFmtK = (v: number) => {
      const abs = Math.abs(v);
      const prefix = v >= 0 ? "+" : "-";
      if (abs >= 1_000_000) return `${prefix}$${(abs / 1_000_000).toFixed(1)}M`;
      if (abs >= 1_000) return `${prefix}$${(abs / 1_000).toFixed(1)}k`;
      return `${prefix}$${Math.round(abs)}`;
    };

    const horizonA =
      runA.inputs.timeHorizonMonths < 12
        ? `${runA.inputs.timeHorizonMonths}mo`
        : runA.inputs.timeHorizonMonths === 12
        ? "1yr"
        : `${(runA.inputs.timeHorizonMonths / 12).toFixed(0)}yr`;
    const horizonB =
      runB.inputs.timeHorizonMonths < 12
        ? `${runB.inputs.timeHorizonMonths}mo`
        : runB.inputs.timeHorizonMonths === 12
        ? "1yr"
        : `${(runB.inputs.timeHorizonMonths / 12).toFixed(0)}yr`;

    return (
      <View style={[gs.flex, { backgroundColor: colors.background }]}>
        <ScrollView
          style={gs.flex}
          contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 16 }}
          onLayout={(e) => setChartWidth(e.nativeEvent.layout.width - 40)}
        >
          <View style={gs.navRow}>
            <TouchableOpacity
              onPress={() => { setScreen("list"); setCompareIds([]); }}
              style={gs.navBtn}
            >
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[gs.navTitle, { color: colors.text }]}>Side-by-Side</Text>
            <TouchableOpacity onPress={handleShareComparison} style={gs.navBtn}>
              <Feather name="share" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Winner banner */}
          {overallWinnerIsA !== null && (
            <View style={[
              gs.heroCard,
              { backgroundColor: (overallWinnerIsA ? COMPARE_COLOR_A : COMPARE_COLOR_B) + "18", borderColor: (overallWinnerIsA ? COMPARE_COLOR_A : COMPARE_COLOR_B) + "50", marginBottom: 16 }
            ]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Feather name="award" size={18} color={overallWinnerIsA ? COMPARE_COLOR_A : COMPARE_COLOR_B} />
                <Text style={{ fontSize: 13, fontWeight: "700", color: overallWinnerIsA ? COMPARE_COLOR_A : COMPARE_COLOR_B }}>
                  BETTER PATH
                </Text>
              </View>
              <Text style={[gs.heroValue, { color: overallWinnerIsA ? COMPARE_COLOR_A : COMPARE_COLOR_B, fontSize: 22, marginBottom: 2 }]}>
                {overallWinnerIsA ? runA.scenarioName : runB.scenarioName}
              </Text>
              <Text style={[gs.heroSub, { color: colors.mutedForeground }]}>
                Wins {overallWinnerIsA ? aWins : bWins} of {aWins + bWins} metrics compared
              </Text>
            </View>
          )}

          {/* Column headers */}
          <View style={[compareColStyles.headerRow, { borderColor: colors.border }]}>
            <View style={compareColStyles.labelCol} />
            <View style={[compareColStyles.col, { borderLeftColor: colors.border }]}>
              <View style={[compareColStyles.colorDot, { backgroundColor: COMPARE_COLOR_A }]} />
              <Text style={[compareColStyles.colTitle, { color: COMPARE_COLOR_A }]} numberOfLines={2}>{runA.scenarioName}</Text>
              <Text style={[compareColStyles.colSub, { color: colors.mutedForeground }]}>{horizonA}</Text>
              {runA.inputs.note ? (
                <Text style={[compareColStyles.colNote, { color: colors.mutedForeground, backgroundColor: COMPARE_COLOR_A + "14" }]} numberOfLines={2}>
                  {runA.inputs.note}
                </Text>
              ) : null}
            </View>
            <View style={[compareColStyles.col, { borderLeftColor: colors.border }]}>
              <View style={[compareColStyles.colorDot, { backgroundColor: COMPARE_COLOR_B }]} />
              <Text style={[compareColStyles.colTitle, { color: COMPARE_COLOR_B }]} numberOfLines={2}>{runB.scenarioName}</Text>
              <Text style={[compareColStyles.colSub, { color: colors.mutedForeground }]}>{horizonB}</Text>
              {runB.inputs.note ? (
                <Text style={[compareColStyles.colNote, { color: colors.mutedForeground, backgroundColor: COMPARE_COLOR_B + "14" }]} numberOfLines={2}>
                  {runB.inputs.note}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Chart */}
          <View
            style={[gs.section, { backgroundColor: colors.card, borderColor: colors.border }]}
            onLayout={(e) => setChartWidth(e.nativeEvent.layout.width - 32)}
          >
            <Text style={[gs.sectionLabel, { color: colors.mutedForeground, marginBottom: 16 }]}>BALANCE TRAJECTORIES</Text>
            {(() => {
              const dpA = resA.dataPoints ?? [];
              const dpB = resB.dataPoints ?? [];
              const hasData = hasEnoughChartData(resA, resB);
              if (!hasData) {
                return (
                  <View style={{ alignItems: "center", paddingVertical: 28 }}>
                    <Feather name="bar-chart-2" size={28} color={colors.mutedForeground} style={{ marginBottom: 10 }} />
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginBottom: 4 }}>
                      Not enough data to chart
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: "center", maxWidth: 240 }}>
                      One or both scenarios don't have enough data points to draw a trajectory.
                    </Text>
                  </View>
                );
              }
              return chartWidth > 10 ? (
                <CompareChart
                  dataPointsA={dpA}
                  dataPointsB={dpB}
                  labelA={runA.scenarioName}
                  labelB={runB.scenarioName}
                  width={chartWidth}
                />
              ) : null;
            })()}
          </View>

          {/* Diff table */}
          <View style={[gs.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[gs.sectionLabel, { color: colors.mutedForeground, marginBottom: 4 }]}>METRIC COMPARISON</Text>
            <View style={{ borderTopWidth: 1, borderColor: colors.border }}>
              <DiffRow
                label="Balance change"
                valueA={signedFmtK(balA)}
                valueB={signedFmtK(balB)}
                winnerIsA={winnerBalance}
                colors={colors}
              />
              <DiffRow
                label="Final balance"
                valueA={fmtK(resA.finalBalance)}
                valueB={fmtK(resB.finalBalance)}
                winnerIsA={winnerFinalBalance}
                colors={colors}
              />
              <DiffRow
                label="Savings rate"
                valueA={`${resA.finalSavingsRate.toFixed(1)}%`}
                valueB={`${resB.finalSavingsRate.toFixed(1)}%`}
                winnerIsA={winnerSavingsRate}
                colors={colors}
              />
              <DiffRow
                label="Total saved"
                valueA={fmtK(resA.totalSaved)}
                valueB={fmtK(resB.totalSaved)}
                winnerIsA={winnerTotalSaved}
                colors={colors}
              />
            </View>
          </View>

          {/* Inputs comparison */}
          <View style={[gs.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[gs.sectionLabel, { color: colors.mutedForeground, marginBottom: 4 }]}>SCENARIO INPUTS</Text>
            <View style={{ borderTopWidth: 1, borderColor: colors.border }}>
              <DiffRow
                label="Income change"
                valueA={`${runA.inputs.incomeChangePercent >= 0 ? "+" : ""}${runA.inputs.incomeChangePercent}%`}
                valueB={`${runB.inputs.incomeChangePercent >= 0 ? "+" : ""}${runB.inputs.incomeChangePercent}%`}
                winnerIsA={null}
                colors={colors}
              />
              <DiffRow
                label="Spending change"
                valueA={`${runA.inputs.spendingChangePercent >= 0 ? "+" : ""}${runA.inputs.spendingChangePercent}%`}
                valueB={`${runB.inputs.spendingChangePercent >= 0 ? "+" : ""}${runB.inputs.spendingChangePercent}%`}
                winnerIsA={null}
                colors={colors}
              />
              <DiffRow
                label="Extra savings"
                valueA={runA.inputs.additionalMonthlySaving > 0 ? `+$${runA.inputs.additionalMonthlySaving}/mo` : "—"}
                valueB={runB.inputs.additionalMonthlySaving > 0 ? `+$${runB.inputs.additionalMonthlySaving}/mo` : "—"}
                winnerIsA={null}
                colors={colors}
              />
              <DiffRow
                label="Time horizon"
                valueA={horizonA}
                valueB={horizonB}
                winnerIsA={null}
                colors={colors}
              />
            </View>
          </View>
        </ScrollView>

        <View style={[gs.fixedBottom, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              style={[gs.runBtn, { flex: 1, backgroundColor: colors.cardElevated, borderWidth: 1, borderColor: colors.border }]}
              onPress={() => { setScreen("list"); setCompareIds([]); }}
              activeOpacity={0.8}
            >
              <Feather name="arrow-left" size={18} color={colors.textSecondary} />
              <Text style={[gs.runBtnText, { color: colors.textSecondary }]}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[gs.runBtn, { flex: 2, backgroundColor: colors.primary }]}
              onPress={handleShareComparison}
              activeOpacity={0.8}
            >
              <Feather name="share" size={18} color="#fff" />
              <Text style={gs.runBtnText}>Share Comparison</Text>
            </TouchableOpacity>
          </View>
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
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 16 }}
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

// ─── Compare column header styles ─────────────────────────────────────────────

const compareColStyles = StyleSheet.create({
  headerRow: { flexDirection: "row", marginBottom: 16, borderRadius: 16, overflow: "hidden", borderWidth: 1 },
  labelCol: { flex: 1 },
  col: { flex: 2, borderLeftWidth: 1, padding: 12, alignItems: "center" },
  colorDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 6 },
  colTitle: { fontSize: 13, fontWeight: "700", textAlign: "center", marginBottom: 2 },
  colSub: { fontSize: 11, textAlign: "center" },
  colNote: { fontSize: 11, textAlign: "center", marginTop: 6, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, lineHeight: 16 },
});

const compareHintStyles = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16 },
  text: { flex: 1, fontSize: 12, lineHeight: 18 },
  btn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
});

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
  fixedBottom: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  runBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 16 },
  runBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  heroCard: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center", marginBottom: 16 },
  heroLabel: { fontSize: 13, marginBottom: 8, fontWeight: "500" },
  heroValue: { fontSize: 44, fontWeight: "900", marginBottom: 4 },
  heroSub: { fontSize: 14 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
});
