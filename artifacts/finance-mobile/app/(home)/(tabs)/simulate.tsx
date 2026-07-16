import React, { useState, useCallback } from "react";
import {
  View,
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
import { useBoldColors } from "@/hooks/useBoldColors";
import {
  BoldButton,
  BoldCard,
  BoldText,
  BoldBadge,
  BoldModal,
  BoldInput,
} from "@/components/bold";
import {
  checkCompareEligibility,
  hasEnoughChartData,
  computeCompareWinners,
} from "@/utils/compare-flow";

type Screen = "list" | "builder" | "results" | "compare";

const COMPARE_COLOR_A = "#6C63FF";
const COMPARE_COLOR_B = "#FF6B6B";

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
  const colors = useBoldColors();
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
  const lineColor = isPositive ? colors.success : colors.danger;
  const fillColor = isPositive ? colors.success + "28" : colors.danger + "28";

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
  const colors = useBoldColors();
  const H = 200;
  const padLeft = 58;
  const padBottom = 32;
  const cw = Math.max(width - padLeft - 8, 10);
  const ch = H - padBottom;

  if (width < 10) return null;

  const allBalances = [...dataPointsA.map((d) => d.balance), ...dataPointsB.map((d) => d.balance)];
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
      <View style={{ flexDirection: "row", gap: 20, marginTop: 8, paddingLeft: padLeft }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 20, height: 3, backgroundColor: COMPARE_COLOR_A, borderRadius: 2 }} />
          <BoldText variant="caption" color={colors.mutedForeground} numberOfLines={1}>{labelA}</BoldText>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 20, height: 3, backgroundColor: COMPARE_COLOR_B, borderRadius: 2 }} />
          <BoldText variant="caption" color={colors.mutedForeground} numberOfLines={1}>{labelB}</BoldText>
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
  const colors = useBoldColors();
  const steps = Math.round((max - min) / step);
  const currentStep = Math.round((value - min) / step);
  const pct = steps > 0 ? Math.max(0, Math.min(1, currentStep / steps)) : 0;

  const decrement = () => onChange(Math.max(min, Math.round((value - step) * 100) / 100));
  const increment = () => onChange(Math.min(max, Math.round((value + step) * 100) / 100));

  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
        <BoldText variant="bodyMD" weight="500" color={colors.textSecondary}>{label}</BoldText>
        <BoldText variant="bodyMD" weight="700" color={color}>{format(value)}</BoldText>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <TouchableOpacity onPress={decrement} style={{ width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center", backgroundColor: colors.cardElevated }}>
          <Feather name="minus" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" }}>
          <View style={{ height: "100%", borderRadius: 3, minWidth: 4, width: `${Math.round(pct * 100)}%`, backgroundColor: color }} />
        </View>
        <TouchableOpacity onPress={increment} style={{ width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center", backgroundColor: colors.cardElevated }}>
          <Feather name="plus" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
  const colors = useBoldColors();
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
      <BoldCard variant="outlined" padding="md" style={{ opacity: 0.5, marginBottom: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.mutedForeground }} />
            <BoldText variant="bodyMD" weight="700" color={colors.text} numberOfLines={1} style={{ flex: 1 }}>
              {run.scenarioName}
            </BoldText>
          </View>
          {!selectMode && (
            <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="trash-2" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
        <BoldText variant="bodySM" color={colors.mutedForeground} style={{ marginBottom: 8 }}>
          Simulation pending — run to see results
        </BoldText>
        <BoldText variant="caption" color={colors.mutedForeground}>{dateLabel}</BoldText>
      </BoldCard>
    );
  }

  const balanceChange = results.finalBalance - results.startingBalance;
  const isPositive = balanceChange >= 0;
  const changeColor = isPositive ? colors.success : colors.danger;

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
      <BoldCard variant="outlined" padding="md" style={{ borderColor: colors.primary, borderWidth: 2, marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: changeColor }} />
          <BoldText variant="caption" weight="700" color={colors.primary} style={{ flex: 1, letterSpacing: 0.6 }}>
            EDITING SCENARIO
          </BoldText>
          <TouchableOpacity onPress={handleCancelEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <BoldText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 6 }}>NAME</BoldText>
        <TextInput
          value={editName}
          onChangeText={setEditName}
          placeholder="Scenario name"
          placeholderTextColor={colors.mutedForeground}
          style={{
            borderWidth: 1,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            fontWeight: "600",
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.cardElevated,
            marginBottom: 14,
          }}
          maxLength={60}
          autoFocus
        />

        <BoldText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 6 }}>NOTE (optional)</BoldText>
        <TextInput
          value={editNote}
          onChangeText={setEditNote}
          placeholder="e.g. aggressive savings plan, worst-case scenario…"
          placeholderTextColor={colors.mutedForeground}
          style={{
            borderWidth: 1,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 14,
            fontWeight: "600",
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.cardElevated,
            marginBottom: 16,
          }}
          maxLength={120}
          multiline
        />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <BoldButton variant="outline" size="md" style={{ flex: 1 }} onPress={handleCancelEdit}>
            Cancel
          </BoldButton>
          <BoldButton variant="primary" size="md" style={{ flex: 2 }} onPress={handleSave} loading={isSaving} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </BoldButton>
        </View>
      </BoldCard>
    );
  }

  return (
    <TouchableOpacity
      style={{
        borderRadius: 16,
        borderWidth: selected ? 2 : 1,
        borderColor,
        backgroundColor: colors.card,
        padding: 16,
        marginBottom: 12,
      }}
      onPress={selectMode ? onToggleSelect : onOpen}
      activeOpacity={0.75}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          {selectMode ? (
            <View style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: selected ? COMPARE_COLOR_A : colors.border,
              backgroundColor: selected ? COMPARE_COLOR_A : "transparent",
              justifyContent: "center",
              alignItems: "center",
            }}>
              {selected && <Feather name="check" size={11} color="#fff" />}
            </View>
          ) : (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: changeColor }} />
          )}
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={selectMode ? onToggleSelect : () => setIsEditing(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}
          >
            <BoldText variant="bodyMD" weight="700" color={colors.text} numberOfLines={1}>
              {run.scenarioName}
            </BoldText>
            {currentNote ? (
              <BoldText variant="bodySM" color={colors.mutedForeground} style={{ marginTop: 1 }} numberOfLines={1}>
                {currentNote}
              </BoldText>
            ) : !selectMode ? (
              <BoldText variant="caption" color={colors.primary + "80"} style={{ marginTop: 1 }}>
                Tap to rename / add note
              </BoldText>
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

      <View style={{ flexDirection: "row", gap: 16, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <BoldText variant="caption" color={colors.mutedForeground}>Balance change</BoldText>
          <BoldText variant="bodyMD" weight="700" color={changeColor}>
            {isPositive ? "+" : "-"}{fmtK(balanceChange)}
          </BoldText>
        </View>
        <View style={{ flex: 1 }}>
          <BoldText variant="caption" color={colors.mutedForeground}>Savings rate</BoldText>
          <BoldText variant="bodyMD" weight="700" color={results.finalSavingsRate >= 10 ? colors.success : colors.warning}>
            {results.finalSavingsRate.toFixed(1)}%
          </BoldText>
        </View>
        <View style={{ flex: 1 }}>
          <BoldText variant="caption" color={colors.mutedForeground}>Horizon</BoldText>
          <BoldText variant="bodyMD" weight="700" color={colors.textSecondary}>{horizonLabel}</BoldText>
        </View>
      </View>

      {results.dataPoints && results.dataPoints.length > 1 && (
        <View style={{ marginBottom: 8 }}>
          <MiniSparkline dataPoints={results.dataPoints} color={changeColor} />
        </View>
      )}

      <BoldText variant="caption" color={colors.mutedForeground}>{dateLabel}</BoldText>
    </TouchableOpacity>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew, colors }: { onNew: () => void; colors: ReturnType<typeof useBoldColors> }) {
  const examples = [
    "What if I save $200/month?",
    "What if I cut spending 20%?",
    "What if I take on a $500/mo loan?",
  ];
  return (
    <View style={{ alignItems: "center", paddingTop: 60, paddingBottom: 40 }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center", backgroundColor: colors.primary + "20", marginBottom: 20 }}>
        <Feather name="layers" size={36} color={colors.primary} />
      </View>
      <BoldText variant="heading1" weight="700" color={colors.text} style={{ marginBottom: 10 }}>
        No simulations yet
      </BoldText>
      <BoldText variant="bodyMD" color={colors.mutedForeground} style={{ textAlign: "center", lineHeight: 22, marginBottom: 28, maxWidth: 280 }}>
        Run your first scenario to see how financial decisions play out over time.
      </BoldText>
      <View style={{ gap: 8, marginBottom: 32, alignSelf: "stretch" }}>
        {examples.map((ex) => (
          <View key={ex} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12, backgroundColor: colors.card }}>
            <Feather name="zap" size={11} color={colors.primary} />
            <BoldText variant="bodySM" color={colors.mutedForeground}>{ex}</BoldText>
          </View>
        ))}
      </View>
      <BoldButton variant="primary" size="lg" onPress={onNew} leftIcon={<Feather name="plus" size={16} color="#fff" />}>
        Create First Scenario
      </BoldButton>
    </View>
  );
}

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
  colors: ReturnType<typeof useBoldColors>;
}) {
  return (
    <BoldCard variant="outlined" padding="md" style={{ flex: 1, minWidth: "45%" }}>
      <Feather name={icon as any} size={14} color={color} style={{ marginBottom: 6 }} />
      <BoldText variant="bodyLG" weight="800" color={color} style={{ marginBottom: 2 }}>{value}</BoldText>
      <BoldText variant="caption" color={colors.mutedForeground}>{label}</BoldText>
    </BoldCard>
  );
}

// ─── Goal timeline row ────────────────────────────────────────────────────────

function GoalTimelineRow({ goal, colors }: { goal: any; colors: ReturnType<typeof useBoldColors> }) {
  const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
  const willFinish = goal.monthsToComplete !== null;
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <BoldText variant="bodySM" weight="600" color={colors.text} style={{ flex: 1 }} numberOfLines={1}>
          {goal.goalName}
        </BoldText>
        <BoldText variant="bodySM" weight="500" color={willFinish ? colors.success : colors.mutedForeground} style={{ marginLeft: 8 }}>
          {willFinish ? `✓ ${goal.completionLabel}` : "Beyond horizon"}
        </BoldText>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: "hidden" }}>
        <View style={{ height: "100%", borderRadius: 2, minWidth: 4, width: `${pct}%`, backgroundColor: willFinish ? colors.success : colors.mutedForeground }} />
      </View>
    </View>
  );
}

// ─── Input summary row ────────────────────────────────────────────────────────

function InputSummaryRow({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useBoldColors> }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <BoldText variant="bodySM" color={colors.mutedForeground}>{label}</BoldText>
      <BoldText variant="bodySM" weight="600" color={colors.textSecondary}>{value}</BoldText>
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
  colors: ReturnType<typeof useBoldColors>;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <BoldText variant="bodySM" color={colors.mutedForeground} style={{ flex: 1 }}>{label}</BoldText>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ width: 90, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingHorizontal: 8, paddingVertical: 4, backgroundColor: winnerIsA === true ? COMPARE_COLOR_A + "20" : "transparent", borderRadius: 8 }}>
          {winnerIsA === true && <Feather name="award" size={10} color={COMPARE_COLOR_A} style={{ marginRight: 3 }} />}
          <BoldText variant="bodySM" weight={winnerIsA === true ? "800" : "600"} color={winnerIsA === true ? COMPARE_COLOR_A : colors.textSecondary}>
            {valueA}
          </BoldText>
        </View>
        <View style={{ width: 90, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingHorizontal: 8, paddingVertical: 4, backgroundColor: winnerIsA === false ? COMPARE_COLOR_B + "20" : "transparent", borderRadius: 8 }}>
          {winnerIsA === false && <Feather name="award" size={10} color={COMPARE_COLOR_B} style={{ marginRight: 3 }} />}
          <BoldText variant="bodySM" weight={winnerIsA === false ? "800" : "600"} color={winnerIsA === false ? COMPARE_COLOR_B : colors.textSecondary}>
            {valueB}
          </BoldText>
        </View>
      </View>
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
  const colors = useBoldColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [screen, setScreen] = useState<Screen>("list");
  const [selectedRun, setSelectedRun] = useState<SimulationRun | null>(null);
  const [scenarioName, setScenarioName] = useState("My Scenario");
  const [inputs, setInputs] = useState<Omit<ScenarioInputs, "scenarioName">>(DEFAULT_INPUTS);
  const [chartWidth, setChartWidth] = useState(0);

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
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 16 }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <View>
              <BoldText variant="displayMD" weight="800" color={colors.text} style={{ marginBottom: 4 }}>
                Digital Twin Lab
              </BoldText>
              <BoldText variant="bodyMD" color={colors.mutedForeground}>
                Run what-if simulations on your finances
              </BoldText>
            </View>
            <BoldButton variant="primary" size="md" onPress={openBuilder} leftIcon={<Feather name="plus" size={16} color="#fff" />}>
              New
            </BoldButton>
          </View>

          {hasEnough && !selectMode && (() => {
            const firstWithResults = simulations?.find((r) => !!r.results);
            return firstWithResults ? (
              <BoldCard variant="outlined" padding="md" style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <Feather name="columns" size={14} color={COMPARE_COLOR_A} />
                <BoldText variant="bodySM" color={colors.mutedForeground} style={{ flex: 1, lineHeight: 18 }}>
                  Select two scenarios to compare them side by side
                </BoldText>
                <BoldButton variant="ghost" size="sm" onPress={() => handleToggleCompare(firstWithResults.id)}>
                  Select
                </BoldButton>
              </BoldCard>
            ) : null;
          })()}

          {listLoading ? (
            <View style={{ alignItems: "center", paddingVertical: 60 }}>
              <ActivityIndicator color={colors.primary} size="large" />
              <BoldText variant="bodyMD" color={colors.mutedForeground} style={{ marginTop: 12 }}>Loading scenarios…</BoldText>
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

        {selectMode ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: insets.bottom + 12, backgroundColor: colors.background }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <BoldButton variant="outline" size="lg" style={{ flex: 1 }} onPress={handleCancelCompare}>
                Cancel
              </BoldButton>
              <BoldButton
                variant="primary"
                size="lg"
                style={{ flex: 2 }}
                onPress={handleStartCompare}
                disabled={compareIds.length !== 2}
                leftIcon={<Feather name="columns" size={16} color="#fff" />}
              >
                {compareIds.length === 2 ? "Compare These Two" : `Select ${2 - compareIds.length} more`}
              </BoldButton>
            </View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: insets.bottom + 12, backgroundColor: colors.background }}>
            <BoldButton variant="primary" size="lg" fullWidth onPress={openBuilder} leftIcon={<Feather name="plus" size={18} color="#fff" />}>
              New Scenario
            </BoldButton>
          </View>
        )}
      </View>
    );
  }

  // ─── Builder screen ────────────────────────────────────────────────────────
  if (screen === "builder") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
            <TouchableOpacity onPress={() => setScreen("list")} style={{ width: 36, height: 36, justifyContent: "center", alignItems: "center" }}>
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <BoldText variant="heading3" weight="700" color={colors.text} style={{ flex: 1, textAlign: "center" }}>
              Scenario Builder
            </BoldText>
            <View style={{ width: 36 }} />
          </View>

          <BoldCard variant="outlined" padding="md" style={{ marginBottom: 16 }}>
            <BoldText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 14 }}>
              SCENARIO NAME
            </BoldText>
            <TextInput
              value={scenarioName}
              onChangeText={setScenarioName}
              placeholder="e.g. Cut dining by 30%"
              placeholderTextColor={colors.mutedForeground}
              style={{
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.cardElevated,
              }}
              maxLength={60}
            />
          </BoldCard>

          <BoldCard variant="outlined" padding="md" style={{ marginBottom: 16 }}>
            <BoldText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 14 }}>
              INCOME
            </BoldText>
            <SliderRow
              label="Income change"
              value={inputs.incomeChangePercent}
              min={-50} max={100} step={5}
              format={formatPct}
              onChange={(v) => setInputs((p) => ({ ...p, incomeChangePercent: v }))}
              color={inputs.incomeChangePercent >= 0 ? colors.success : colors.danger}
            />
          </BoldCard>

          <BoldCard variant="outlined" padding="md" style={{ marginBottom: 16 }}>
            <BoldText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 14 }}>
              SPENDING
            </BoldText>
            <SliderRow
              label="Spending change"
              value={inputs.spendingChangePercent}
              min={-60} max={60} step={5}
              format={formatPct}
              onChange={(v) => setInputs((p) => ({ ...p, spendingChangePercent: v }))}
              color={inputs.spendingChangePercent <= 0 ? colors.success : colors.danger}
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
          </BoldCard>

          <BoldCard variant="outlined" padding="md" style={{ marginBottom: 16 }}>
            <BoldText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 14 }}>
              SAVINGS
            </BoldText>
            <SliderRow
              label="Extra monthly savings"
              value={inputs.additionalMonthlySaving}
              min={0} max={2000} step={50}
              format={formatDollar}
              onChange={(v) => setInputs((p) => ({ ...p, additionalMonthlySaving: v }))}
              color={inputs.additionalMonthlySaving === 0 ? colors.mutedForeground : colors.success}
            />
          </BoldCard>

          <BoldCard variant="outlined" padding="md" style={{ marginBottom: 16 }}>
            <BoldText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 14 }}>
              TIME HORIZON
            </BoldText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {([3, 6, 12, 24, 36, 60] as const).map((mo) => {
                const label = mo < 12 ? `${mo}mo` : mo === 12 ? "1yr" : mo === 24 ? "2yr" : mo === 36 ? "3yr" : "5yr";
                const active = inputs.timeHorizonMonths === mo;
                return (
                  <TouchableOpacity
                    key={mo}
                    onPress={() => setInputs((p) => ({ ...p, timeHorizonMonths: mo }))}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      backgroundColor: active ? colors.primary : colors.cardElevated,
                      borderColor: active ? colors.primary : colors.border,
                    }}
                  >
                    <BoldText variant="bodySM" weight="600" color={active ? "#fff" : colors.mutedForeground}>
                      {label}
                    </BoldText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </BoldCard>
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: insets.bottom + 12, backgroundColor: colors.background }}>
          <BoldButton
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleRun}
            disabled={isRunning}
            loading={isRunning}
            leftIcon={isRunning ? undefined : <Feather name="play" size={18} color="#fff" />}
          >
            {isRunning ? "Simulating…" : "Run Simulation"}
          </BoldButton>
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

    const winnerColor = overallWinnerIsA === null ? colors.primary : overallWinnerIsA ? COMPARE_COLOR_A : COMPARE_COLOR_B;

    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 16 }}
          onLayout={(e) => setChartWidth(e.nativeEvent.layout.width - 40)}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => { setScreen("list"); setCompareIds([]); }}
              style={{ width: 36, height: 36, justifyContent: "center", alignItems: "center" }}
            >
              <Feather name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <BoldText variant="heading3" weight="700" color={colors.text} style={{ flex: 1, textAlign: "center" }}>
              Side-by-Side
            </BoldText>
            <TouchableOpacity onPress={handleShareComparison} style={{ width: 36, height: 36, justifyContent: "center", alignItems: "center" }}>
              <Feather name="share" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {overallWinnerIsA !== null && (
            <BoldCard
              variant="outlined"
              padding="lg"
              style={{
                alignItems: "center",
                marginBottom: 16,
                backgroundColor: winnerColor + "18",
                borderColor: winnerColor + "50",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Feather name="award" size={18} color={winnerColor} />
                <BoldText variant="caption" weight="700" color={winnerColor}>BETTER PATH</BoldText>
              </View>
              <BoldText variant="heading1" weight="900" color={winnerColor} style={{ marginBottom: 2 }}>
                {overallWinnerIsA ? runA.scenarioName : runB.scenarioName}
              </BoldText>
              <BoldText variant="bodySM" color={colors.mutedForeground}>
                Wins {overallWinnerIsA ? aWins : bWins} of {aWins + bWins} metrics compared
              </BoldText>
            </BoldCard>
          )}

          <View style={{ flexDirection: "row", marginBottom: 16, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flex: 1 }} />
            <View style={{ flex: 2, borderLeftWidth: 1, borderLeftColor: colors.border, padding: 12, alignItems: "center" }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COMPARE_COLOR_A, marginBottom: 6 }} />
              <BoldText variant="bodySM" weight="700" color={COMPARE_COLOR_A} style={{ textAlign: "center", marginBottom: 2 }} numberOfLines={2}>
                {runA.scenarioName}
              </BoldText>
              <BoldText variant="caption" color={colors.mutedForeground}>{horizonA}</BoldText>
              {runA.inputs.note ? (
                <BoldText variant="caption" color={colors.mutedForeground} style={{ marginTop: 6, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: COMPARE_COLOR_A + "14", lineHeight: 16 }} numberOfLines={2}>
                  {runA.inputs.note}
                </BoldText>
              ) : null}
            </View>
            <View style={{ flex: 2, borderLeftWidth: 1, borderLeftColor: colors.border, padding: 12, alignItems: "center" }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COMPARE_COLOR_B, marginBottom: 6 }} />
              <BoldText variant="bodySM" weight="700" color={COMPARE_COLOR_B} style={{ textAlign: "center", marginBottom: 2 }} numberOfLines={2}>
                {runB.scenarioName}
              </BoldText>
              <BoldText variant="caption" color={colors.mutedForeground}>{horizonB}</BoldText>
              {runB.inputs.note ? (
                <BoldText variant="caption" color={colors.mutedForeground} style={{ marginTop: 6, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: COMPARE_COLOR_B + "14", lineHeight: 16 }} numberOfLines={2}>
                  {runB.inputs.note}
                </BoldText>
              ) : null}
            </View>
          </View>

          <BoldCard variant="outlined" padding="md" style={{ marginBottom: 16 }}
            onLayout={(e) => setChartWidth(e.nativeEvent.layout.width - 32)}
          >
            <BoldText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 16 }}>
              BALANCE TRAJECTORIES
            </BoldText>
            {(() => {
              const dpA = resA.dataPoints ?? [];
              const dpB = resB.dataPoints ?? [];
              const hasData = hasEnoughChartData(resA, resB);
              if (!hasData) {
                return (
                  <View style={{ alignItems: "center", paddingVertical: 28 }}>
                    <Feather name="bar-chart-2" size={28} color={colors.mutedForeground} style={{ marginBottom: 10 }} />
                    <BoldText variant="bodyMD" weight="600" color={colors.textSecondary} style={{ marginBottom: 4 }}>
                      Not enough data to chart
                    </BoldText>
                    <BoldText variant="bodySM" color={colors.mutedForeground} style={{ textAlign: "center", maxWidth: 240 }}>
                      One or both scenarios don't have enough data points to draw a trajectory.
                    </BoldText>
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
          </BoldCard>

          <BoldCard variant="outlined" padding="md" style={{ marginBottom: 16 }}>
            <BoldText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 4 }}>
              METRIC COMPARISON
            </BoldText>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
              <DiffRow label="Balance change" valueA={signedFmtK(balA)} valueB={signedFmtK(balB)} winnerIsA={winnerBalance} colors={colors} />
              <DiffRow label="Final balance" valueA={fmtK(resA.finalBalance)} valueB={fmtK(resB.finalBalance)} winnerIsA={winnerFinalBalance} colors={colors} />
              <DiffRow label="Savings rate" valueA={`${resA.finalSavingsRate.toFixed(1)}%`} valueB={`${resB.finalSavingsRate.toFixed(1)}%`} winnerIsA={winnerSavingsRate} colors={colors} />
              <DiffRow label="Total saved" valueA={fmtK(resA.totalSaved)} valueB={fmtK(resB.totalSaved)} winnerIsA={winnerTotalSaved} colors={colors} />
            </View>
          </BoldCard>

          <BoldCard variant="outlined" padding="md" style={{ marginBottom: 16 }}>
            <BoldText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 4 }}>
              SCENARIO INPUTS
            </BoldText>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
              <DiffRow label="Income change" valueA={`${runA.inputs.incomeChangePercent >= 0 ? "+" : ""}${runA.inputs.incomeChangePercent}%`} valueB={`${runB.inputs.incomeChangePercent >= 0 ? "+" : ""}${runB.inputs.incomeChangePercent}%`} winnerIsA={null} colors={colors} />
              <DiffRow label="Spending change" valueA={`${runA.inputs.spendingChangePercent >= 0 ? "+" : ""}${runA.inputs.spendingChangePercent}%`} valueB={`${runB.inputs.spendingChangePercent >= 0 ? "+" : ""}${runB.inputs.spendingChangePercent}%`} winnerIsA={null} colors={colors} />
              <DiffRow label="Extra savings" valueA={runA.inputs.additionalMonthlySaving > 0 ? `+$${runA.inputs.additionalMonthlySaving}/mo` : "—"} valueB={runB.inputs.additionalMonthlySaving > 0 ? `+$${runB.inputs.additionalMonthlySaving}/mo` : "—"} winnerIsA={null} colors={colors} />
              <DiffRow label="Time horizon" valueA={horizonA} valueB={horizonB} winnerIsA={null} colors={colors} />
            </View>
          </BoldCard>
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: insets.bottom + 12, backgroundColor: colors.background }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <BoldButton variant="outline" size="lg" style={{ flex: 1 }} onPress={() => { setScreen("list"); setCompareIds([]); }} leftIcon={<Feather name="arrow-left" size={18} color={colors.textSecondary} />}>
              Back
            </BoldButton>
            <BoldButton variant="primary" size="lg" style={{ flex: 2 }} onPress={handleShareComparison} leftIcon={<Feather name="share" size={18} color="#fff" />}>
              Share Comparison
            </BoldButton>
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
  const changeColor = isPositive ? colors.success : colors.danger;

  const horizonText =
    run.inputs.timeHorizonMonths < 12
      ? `${run.inputs.timeHorizonMonths} months`
      : run.inputs.timeHorizonMonths === 12
      ? "1 year"
      : `${(run.inputs.timeHorizonMonths / 12).toFixed(0)} years`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 16 }}
        onLayout={(e) => setChartWidth(e.nativeEvent.layout.width - 40)}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <TouchableOpacity onPress={() => setScreen("list")} style={{ width: 36, height: 36, justifyContent: "center", alignItems: "center" }}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <BoldText variant="heading3" weight="700" color={colors.text} style={{ flex: 1, textAlign: "center" }} numberOfLines={1}>
            {run.scenarioName}
          </BoldText>
          <TouchableOpacity onPress={openBuilder} style={{ width: 36, height: 36, justifyContent: "center", alignItems: "center" }}>
            <Feather name="plus" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <BoldCard
          variant="outlined"
          padding="lg"
          style={{
            alignItems: "center",
            marginBottom: 16,
            backgroundColor: isPositive ? colors.success + "18" : colors.danger + "18",
            borderColor: changeColor + "50",
          }}
        >
          <BoldText variant="bodySM" color={colors.mutedForeground} style={{ marginBottom: 8 }}>
            Balance after {horizonText}
          </BoldText>
          <BoldText variant="displayXL" weight="900" color={changeColor} style={{ marginBottom: 4 }}>
            {isPositive ? "+" : "-"}{fmtK(Math.abs(balanceChange))}
          </BoldText>
          <BoldText variant="bodyMD" color={colors.mutedForeground}>
            {fmtK(results.startingBalance)} → {fmtK(results.finalBalance)}
          </BoldText>
        </BoldCard>

        <BoldCard variant="outlined" padding="md" style={{ marginBottom: 16 }}
          onLayout={(e) => setChartWidth(e.nativeEvent.layout.width - 32)}
        >
          <BoldText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 16 }}>
            BALANCE TRAJECTORY
          </BoldText>
          {chartWidth > 10 && results.dataPoints && results.dataPoints.length > 1 && (
            <BalanceChart dataPoints={results.dataPoints} width={chartWidth} />
          )}
        </BoldCard>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          <MetricCard label="Savings Rate" value={`${results.finalSavingsRate.toFixed(1)}%`} icon="trending-up" color={results.finalSavingsRate >= 15 ? colors.success : results.finalSavingsRate >= 0 ? colors.warning : colors.danger} colors={colors} />
          <MetricCard label="Avg Monthly Saved" value={fmtK(results.avgMonthlySavings)} icon="dollar-sign" color={results.avgMonthlySavings >= 0 ? colors.success : colors.danger} colors={colors} />
          <MetricCard label="Total Saved" value={fmtK(results.totalSaved)} icon="archive" color={colors.primary} colors={colors} />
          <MetricCard label="Monthly Income" value={fmtK(results.projectedMonthlyIncome)} icon="activity" color={colors.textSecondary} colors={colors} />
        </View>

        {run.narrative && (
          <BoldCard variant="outlined" padding="md" style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Feather name="cpu" size={14} color={colors.primary} />
              <BoldText variant="caption" weight="700" color={colors.primary}>AI ANALYSIS</BoldText>
            </View>
            <BoldText variant="bodyMD" color={colors.textSecondary} style={{ lineHeight: 24 }}>
              {run.narrative}
            </BoldText>
          </BoldCard>
        )}

        {results.goalTimelines && results.goalTimelines.length > 0 && (
          <BoldCard variant="outlined" padding="md" style={{ marginBottom: 16 }}>
            <BoldText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 14 }}>
              GOAL TIMELINES
            </BoldText>
            {results.goalTimelines.map((g) => (
              <GoalTimelineRow key={g.goalId} goal={g} colors={colors} />
            ))}
          </BoldCard>
        )}

        <BoldCard variant="outlined" padding="md" style={{ marginBottom: 16 }}>
          <BoldText variant="caption" color={colors.mutedForeground} style={{ marginBottom: 14 }}>
            SCENARIO INPUTS
          </BoldText>
          <InputSummaryRow label="Income change" value={`${run.inputs.incomeChangePercent >= 0 ? "+" : ""}${run.inputs.incomeChangePercent}%`} colors={colors} />
          <InputSummaryRow label="Spending change" value={`${run.inputs.spendingChangePercent >= 0 ? "+" : ""}${run.inputs.spendingChangePercent}%`} colors={colors} />
          {run.inputs.additionalMonthlySaving > 0 && <InputSummaryRow label="Extra savings" value={`+$${run.inputs.additionalMonthlySaving.toLocaleString()}/mo`} colors={colors} />}
          {run.inputs.newMonthlyObligation > 0 && <InputSummaryRow label="New obligation" value={`$${run.inputs.newMonthlyObligation.toLocaleString()}/mo`} colors={colors} />}
          {run.inputs.oneTimeExpense > 0 && <InputSummaryRow label="One-time expense" value={`$${run.inputs.oneTimeExpense.toLocaleString()}`} colors={colors} />}
          <InputSummaryRow label="Time horizon" value={horizonText} colors={colors} />
        </BoldCard>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: insets.bottom + 12, backgroundColor: colors.background }}>
        <BoldButton variant="primary" size="lg" fullWidth onPress={openBuilder} leftIcon={<Feather name="plus" size={18} color="#fff" />}>
          New Scenario
        </BoldButton>
      </View>
    </View>
  );
}
