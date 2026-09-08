import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, radius, spacing } from "../theme/colors";
import { formatTND, formatPerSqm } from "../lib/format";
import { RENT_LEVEL_COLORS, RENT_LEVEL_LABELS } from "../lib/labels";
import type { RentForecastPoint } from "../api/types";

/* ═══════════ Héro gradient ═══════════ */

export function HeroCard({
  gradient,
  badge,
  label,
  value,
  sub,
  confidence,
}: {
  gradient: readonly [string, string, string];
  badge: string;
  label: string;
  value: string;
  sub?: string;
  confidence?: number;
}) {
  return (
    <LinearGradient colors={[...gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={styles.heroTop}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>{badge}</Text>
        </View>
        {confidence !== undefined ? (
          <View style={styles.confidence}>
            <Ionicons name="shield-checkmark" size={14} color="#fff" />
            <Text style={styles.confidenceText}>Fiabilité {confidence} %</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.heroLabel}>{label}</Text>
      <Text style={styles.heroValue}>{value}</Text>
      {sub ? <Text style={styles.heroSub}>{sub}</Text> : null}
    </LinearGradient>
  );
}

/* ═══════════ Fourchette de prix ═══════════ */

export function PriceRangeBar({
  min,
  recommended,
  max,
  format = (n) => formatTND(n),
}: {
  min: number;
  recommended: number;
  max: number;
  format?: (n: number) => string;
}) {
  const span = Math.max(max - min, 1);
  const left = Math.max(((recommended - min) / span) * 100 - 4, 0);
  const width = Math.min(8, ((max - min) / recommended) * 100 || 8);
  return (
    <View style={styles.rangeCard}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={styles.rangeValue}>{format(min)}</Text>
        <Text style={[styles.rangeValue, { color: colors.primary, fontWeight: "800" }]}>
          {format(recommended)}
        </Text>
        <Text style={styles.rangeValue}>{format(max)}</Text>
      </View>
      <View style={styles.rangeTrack}>
        <View style={styles.rangeFill} />
        <View style={[styles.rangeMarker, { left: `${left}%`, width: `${width}%` }]} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={styles.rangeLabel}>Fourchette basse</Text>
        <Text style={styles.rangeLabel}>Recommandé</Text>
        <Text style={styles.rangeLabel}>Fourchette haute</Text>
      </View>
    </View>
  );
}

/* ═══════════ Tuiles de scénarios ═══════════ */

export function ScenarioTiles({
  scenarios,
}: {
  scenarios: { key: string; label: string; value: string; desc: string; color: string }[];
}) {
  return (
    <View style={{ flexDirection: "row", gap: spacing.md }}>
      {scenarios.map((s) => (
        <View key={s.key} style={[styles.scenario, s.key === "realiste" && styles.scenarioActive]}>
          <View style={[styles.scenarioDot, { backgroundColor: s.color }]} />
          <Text style={styles.scenarioLabel}>{s.label}</Text>
          <Text style={styles.scenarioValue}>{s.value}</Text>
          <Text style={styles.scenarioDesc}>{s.desc}</Text>
        </View>
      ))}
    </View>
  );
}

/* ═══════════ Liste de facteurs ═══════════ */

export function FactorList({
  positive,
  negative,
}: {
  positive: string[];
  negative: string[];
}) {
  return (
    <View>
      <Text style={styles.sectionLabel}>Points forts</Text>
      {positive.map((f, i) => (
        <View key={`p${i}`} style={styles.factorRow}>
          <Ionicons name="checkmark-circle" size={17} color={colors.success} />
          <Text style={styles.factorText}>{f}</Text>
        </View>
      ))}
      <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>Points de vigilance</Text>
      {negative.map((f, i) => (
        <View key={`n${i}`} style={styles.factorRow}>
          <Ionicons name="alert-circle" size={17} color={colors.warning} />
          <Text style={styles.factorText}>{f}</Text>
        </View>
      ))}
    </View>
  );
}

/* ═══════════ Comparables ═══════════ */

export function ComparableList({
  items,
  formatValue,
}: {
  items: { id: string; title: string; subtitle: string; value: string; perSqm: string }[];
  formatValue: (n: number) => string;
}) {
  return (
    <View>
      {items.map((c) => (
        <View key={c.id} style={styles.compRow}>
          <View style={styles.compLeft}>
            <Text style={styles.compTitle} numberOfLines={1}>
              {c.title}
            </Text>
            <Text style={styles.compSub} numberOfLines={1}>
              {c.subtitle}
            </Text>
          </View>
          <View style={styles.compRight}>
            <Text style={styles.compValue}>{c.value}</Text>
            <Text style={styles.compPerSqm}>{c.perSqm}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/* ═══════════ Graphique de prévision (barres) ═══════════ */

export function ForecastChart({ points }: { points: RentForecastPoint[] }) {
  const max = Math.max(...points.map((p) => p.rent), 1);
  return (
    <View>
      {points.map((p) => {
        const change = p.months === 0 ? null : ((p.rent - points[0].rent) / points[0].rent) * 100;
        return (
          <View key={p.label} style={styles.forecastRow}>
            <Text style={styles.forecastLabel}>{p.label}</Text>
            <View style={styles.forecastTrack}>
              <View
                style={[
                  styles.forecastBar,
                  { width: `${Math.max((p.rent / max) * 100, 6)}%`, backgroundColor: change && change >= 0 ? colors.accent : colors.warning },
                ]}
              />
            </View>
            <View style={styles.forecastRight}>
              <Text style={styles.forecastValue}>{formatTND(p.rent)}</Text>
              {change !== null && change !== 0 ? (
                <Text style={[styles.forecastChange, { color: change >= 0 ? colors.success : colors.danger }]}>
                  {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)} %
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ═══════════ Moyennes de marché colorées ═══════════ */

export function MarketAverageRow({
  label,
  value,
  level,
}: {
  label: string;
  value: number;
  level: string;
}) {
  const color = RENT_LEVEL_COLORS[level] ?? colors.muted;
  const levelLabel = RENT_LEVEL_LABELS[level] ?? level;
  return (
    <View style={styles.marketRow}>
      <Text style={styles.marketLabel}>{label}</Text>
      <Text style={styles.marketValue}>{formatPerSqm(value)}</Text>
      <View style={[styles.levelBadge, { backgroundColor: color + "22" }]}>
        <View style={[styles.levelDot, { backgroundColor: color }]} />
        <Text style={[styles.levelText, { color }]}>{levelLabel}</Text>
      </View>
    </View>
  );
}

/* ═══════════ Conseiller IA (Q/R) ═══════════ */

export function AdvisorList({ questions }: { questions: { q: string; a: string }[] }) {
  return (
    <View>
      {questions.map((qa, i) => (
        <View key={i} style={styles.advisorCard}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <Ionicons name="sparkles" size={15} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.advisorQ}>{qa.q}</Text>
          </View>
          <Text style={styles.advisorA}>{qa.a}</Text>
        </View>
      ))}
    </View>
  );
}

/* ═══════════ Styles ═══════════ */

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    shadowColor: "#0f172a",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  heroBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  confidence: { flexDirection: "row", alignItems: "center", gap: 4 },
  confidenceText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  heroLabel: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginBottom: 6 },
  heroValue: { color: "#fff", fontSize: 34, fontWeight: "800", letterSpacing: 0.5 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 8 },
  rangeCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  rangeValue: { fontSize: 14, fontWeight: "700", color: colors.text },
  rangeTrack: { height: 8, borderRadius: 4, backgroundColor: colors.border, marginVertical: 10, position: "relative" },
  rangeFill: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 4, backgroundColor: colors.primaryLight },
  rangeMarker: { position: "absolute", top: -3, height: 14, borderRadius: 4, backgroundColor: colors.primary },
  rangeLabel: { fontSize: 11, color: colors.muted },
  scenario: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
  },
  scenarioActive: { borderColor: colors.primary, borderWidth: 2 },
  scenarioDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 6 },
  scenarioLabel: { fontSize: 12, fontWeight: "700", color: colors.muted },
  scenarioValue: { fontSize: 15, fontWeight: "800", color: colors.text, marginTop: 4, textAlign: "center" },
  scenarioDesc: { fontSize: 11, color: colors.muted, textAlign: "center", marginTop: 4 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: 8 },
  factorRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  factorText: { flex: 1, fontSize: 13.5, color: colors.text, lineHeight: 19 },
  compRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  compLeft: { flex: 1, marginRight: spacing.md },
  compTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  compSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  compRight: { alignItems: "flex-end" },
  compValue: { fontSize: 14, fontWeight: "700", color: colors.text },
  compPerSqm: { fontSize: 11, color: colors.muted, marginTop: 2 },
  forecastRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  forecastLabel: { width: 74, fontSize: 12, color: colors.muted },
  forecastTrack: { flex: 1, height: 18, backgroundColor: colors.bg, borderRadius: 6, overflow: "hidden", marginHorizontal: 8 },
  forecastBar: { height: "100%", borderRadius: 6 },
  forecastRight: { width: 108, alignItems: "flex-end" },
  forecastValue: { fontSize: 13, fontWeight: "700", color: colors.text },
  forecastChange: { fontSize: 11, fontWeight: "600", marginTop: 1 },
  marketRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  marketLabel: { flex: 1, fontSize: 13.5, color: colors.text },
  marketValue: { fontSize: 13.5, fontWeight: "700", color: colors.text, marginRight: 10 },
  levelBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: radius.full, paddingHorizontal: 9, paddingVertical: 4 },
  levelDot: { width: 7, height: 7, borderRadius: 4 },
  levelText: { fontSize: 11, fontWeight: "700" },
  advisorCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  advisorQ: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.text },
  advisorA: { fontSize: 13, color: colors.muted, lineHeight: 19 },
});
