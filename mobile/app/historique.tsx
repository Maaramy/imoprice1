import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGetUserEstimations } from "../src/api/estimations";
import { useGetUserRentEstimations } from "../src/api/rent";
import { Screen, ScreenHeader, SectionCard, EmptyState, ChipGrid } from "../src/components/ui";
import { colors, radius, spacing } from "../src/theme/colors";
import { formatTNDShort, formatDate } from "../src/lib/format";
import { PROPERTY_TYPES_LABELS, RENT_PROPERTY_TYPES_LABELS } from "../src/lib/labels";

type Filter = "tous" | "vente" | "loyer";

export default function HistoriqueScreen() {
  const router = useRouter();
  const estimations = useGetUserEstimations() ?? [];
  const rents = useGetUserRentEstimations() ?? [];
  const [filter, setFilter] = useState<Filter>("tous");

  const items: {
    id: string;
    kind: "vente" | "loyer";
    title: string;
    subtitle: string;
    value: string;
    date: number;
    route: string;
  }[] = [
    ...estimations.map((e) => ({
      id: e._id,
      kind: "vente" as const,
      title: PROPERTY_TYPES_LABELS[e.property?.propertyType ?? ""] ?? "Estimation vente",
      subtitle: [e.property?.quartier, e.property?.ville, e.property?.gouvernorat].filter(Boolean).join(" — "),
      value: formatTNDShort(e.estimatedValue),
      date: e.createdAt,
      route: `/estimation/${e._id}`,
    })),
    ...rents.map((r) => ({
      id: r._id,
      kind: "loyer" as const,
      title: `Loyer · ${RENT_PROPERTY_TYPES_LABELS[r.property?.propertyType ?? ""] ?? "bien"}`,
      subtitle: [r.property?.quartier, r.property?.ville, r.property?.gouvernorat].filter(Boolean).join(" — "),
      value: formatTNDShort(r.estimatedRent),
      date: r.createdAt,
      route: `/location/${r._id}`,
    })),
  ]
    .filter((i) => filter === "tous" || i.kind === filter)
    .sort((a, b) => b.date - a.date);

  return (
    <Screen>
      <ScreenHeader title="Historique" subtitle={`${estimations.length + rents.length} estimation(s)`} onBack={() => router.back()} />
      <ChipGrid
        items={[
          { key: "tous", label: "Tout" },
          { key: "vente", label: "Ventes" },
          { key: "loyer", label: "Loyers" },
        ]}
        selected={filter}
        onSelect={(k) => setFilter(k as Filter)}
        columns={3}
      />
      <View style={{ height: spacing.md }} />
      <SectionCard>
        {items.length === 0 ? (
          <EmptyState icon="time-outline" title="Aucune estimation" subtitle="Vos estimations vente et location apparaîtront ici." />
        ) : (
          items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push(item.route as any)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            >
              <View
                style={[
                  styles.kindIcon,
                  { backgroundColor: item.kind === "loyer" ? colors.accentLight : colors.primaryLight },
                ]}
              >
                <Ionicons name={item.kind === "loyer" ? "key" : "home"} size={16} color={item.kind === "loyer" ? colors.accent : colors.primary} />
              </View>
              <View style={{ flex: 1, marginHorizontal: spacing.md }}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.sub} numberOfLines={1}>{item.subtitle || "—"}</Text>
                <Text style={styles.date}>{formatDate(item.date)}</Text>
              </View>
              <Text style={styles.value}>{item.value}</Text>
              <Ionicons name="chevron-forward" size={15} color={colors.muted} />
            </Pressable>
          ))
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  kindIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontWeight: "700", color: colors.text },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  date: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  value: { fontSize: 14, fontWeight: "800", color: colors.primary, marginRight: 6 },
});
