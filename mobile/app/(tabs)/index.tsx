import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../src/hooks/use-auth";
import { useIsOnline } from "../../src/hooks/use-network";
import { useRemainingEstimations } from "../../src/api/plans";
import { useGetUserEstimations } from "../../src/api/estimations";
import { useGetUserRentEstimations } from "../../src/api/rent";
import { Screen, SectionCard, StatCard, EmptyState } from "../../src/components/ui";
import { colors, gradients, radius, spacing } from "../../src/theme/colors";
import { formatTNDShort, formatDate } from "../../src/lib/format";
import { PROPERTY_TYPES_LABELS } from "../../src/lib/labels";

const PLAN_LABELS: Record<string, string> = {
  start: "Start (gratuit)",
  pro: "Pro",
  business: "Business",
};

export default function HomeScreen() {
  const { user } = useAuth();
  const online = useIsOnline();
  const quota = useRemainingEstimations();
  const estimations = useGetUserEstimations() ?? [];
  const rents = useGetUserRentEstimations() ?? [];

  const firstName = (user?.name ?? "Cher utilisateur").split(" ")[0];
  const planLabel = PLAN_LABELS[quota?.planType ?? ""] ?? quota?.planType ?? "—";

  const recent = [
    ...estimations.map((e) => ({
      id: `sale:${e._id}`,
      route: `/estimation/${e._id}` as const,
      title: PROPERTY_TYPES_LABELS[e.property?.propertyType ?? ""] ?? "Estimation vente",
      subtitle: [e.property?.quartier, e.property?.ville, e.property?.gouvernorat]
        .filter(Boolean)
        .join(" — "),
      value: formatTNDShort(e.estimatedValue),
      date: e.createdAt,
    })),
    ...rents.map((r) => ({
      id: `rent:${r._id}`,
      route: `/location/${r._id}` as const,
      title: `Loyer · ${PROPERTY_TYPES_LABELS[r.property?.propertyType ?? ""] ?? "bien"}`,
      subtitle: [r.property?.quartier, r.property?.ville, r.property?.gouvernorat]
        .filter(Boolean)
        .join(" — "),
      value: formatTNDShort(r.estimatedRent),
      date: r.createdAt,
    })),
  ]
    .sort((a, b) => b.date - a.date)
    .slice(0, 5);

  const quotaPct = quota ? Math.min((quota.remaining / Math.max(quota.estimationsLimit, 1)) * 100, 100) : 0;

  return (
    <Screen>
      {/* En-tête */}
      <View style={styles.head}>
        <View>
          <Text style={styles.greet}>Bonjour 👋</Text>
          <Text style={styles.name}>{firstName}</Text>
        </View>
        <View style={styles.planPill}>
          <Ionicons name="sparkles" size={14} color={colors.primary} />
          <Text style={styles.planText}>{planLabel}</Text>
        </View>
      </View>

      {/* Quota */}
      <LinearGradient colors={[...gradients.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quota}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={styles.quotaLabel}>Estimations restantes ce mois</Text>
          <Text style={styles.quotaCount}>
            {quota ? quota.remaining : "…"} / {quota?.estimationsLimit ?? "…"}
          </Text>
        </View>
        <View style={styles.quotaTrack}>
          <View style={[styles.quotaFill, { width: `${quotaPct}%` }]} />
        </View>
        {quota && !quota.canEstimate ? (
          <Text style={styles.quotaWarn}>
            {quota.reason === "limite_atteinte" ? "Quota atteint — passez à un forfait supérieur sur le Web." : "Quota indisponible pour le moment."}
          </Text>
        ) : null}
      </LinearGradient>

      {/* Actions rapides */}
      <Text style={styles.sectionTitle}>Commencer</Text>
      <View style={styles.actionsRow}>
        <QuickAction
          gradient={gradients.primary}
          icon="home"
          title="Estimer une vente"
          subtitle="Valeur marchande d'un bien"
          onPress={() => router.push("/estimation/new")}
        />
        <QuickAction
          gradient={gradients.rent}
          icon="key"
          title="Estimer un loyer"
          subtitle="Loyer mensuel recommandé"
          onPress={() => router.push("/location/new")}
        />
      </View>
      <View style={styles.actionsRow}>
        <QuickAction
          gradient={["#4f46e5", "#4338ca", "#3730a3"]}
          icon="time"
          title="Historique"
          subtitle={`${estimations.length + rents.length} estimations`}
          onPress={() => router.push("/historique")}
        />
      </View>

      {/* Dernières estimations */}
      <Text style={styles.sectionTitle}>Dernières estimations</Text>
      <SectionCard title={online ? "À jour" : "Données en cache"}>
        {recent.length === 0 ? (
          <EmptyState
            icon="calculator-outline"
            title="Aucune estimation"
            subtitle="Lancez votre première estimation pour voir le résultat ici."
          />
        ) : (
          recent.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push(item.route)}
              style={({ pressed }) => [styles.recentRow, pressed && { opacity: 0.7 }]}
            >
              <View style={{ flex: 1, marginRight: spacing.md }}>
                <Text style={styles.recentTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.recentSub} numberOfLines={1}>
                  {item.subtitle || "—"}
                </Text>
                <Text style={styles.recentDate}>{formatDate(item.date)}</Text>
              </View>
              <Text style={styles.recentValue}>{item.value}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          ))
        )}
      </SectionCard>

      {/* Mini stats */}
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <StatCard label="Ventes" value={String(estimations.length)} />
        <StatCard label="Loyers" value={String(rents.length)} />
      </View>
    </Screen>
  );
}

function QuickAction({
  gradient,
  icon,
  title,
  subtitle,
  onPress,
}: {
  gradient: readonly [string, string, string];
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={{ flex: 1 }} onPress={onPress}>
      {({ pressed }) => (
        <LinearGradient
          colors={[...gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.quick, pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }]}
        >
          <Ionicons name={icon} size={22} color="#fff" />
          <Text style={styles.quickTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.quickSub} numberOfLines={2}>
            {subtitle}
          </Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  greet: { fontSize: 14, color: colors.muted },
  name: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 2 },
  planPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  planText: { fontSize: 12, fontWeight: "700", color: colors.primaryDark },
  quota: { borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.xl },
  quotaLabel: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "600" },
  quotaCount: { color: "#fff", fontSize: 14, fontWeight: "800" },
  quotaTrack: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)", marginTop: 12, overflow: "hidden" },
  quotaFill: { height: "100%", backgroundColor: "#fff", borderRadius: 4 },
  quotaWarn: { color: "#fef9c3", fontSize: 12, marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: spacing.md, marginTop: spacing.sm },
  actionsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  quick: { borderRadius: radius.lg, padding: spacing.lg, minHeight: 128 },
  quickTitle: { color: "#fff", fontSize: 15, fontWeight: "800", marginTop: 10 },
  quickSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 3, lineHeight: 16 },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  recentTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  recentSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  recentDate: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  recentValue: { fontSize: 14, fontWeight: "800", color: colors.primary, marginRight: 6 },
});
