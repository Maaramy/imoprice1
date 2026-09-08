import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Screen } from "../../src/components/ui";
import { colors, gradients, radius, spacing } from "../../src/theme/colors";

export default function EstimationHubScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Estimation immobilière</Text>
      <Text style={styles.subtitle}>
        Choisissez le type d'estimation : vente/achat ou location. Les deux modules utilisent le
        même moteur d'intelligence artificielle du marché tunisien.
      </Text>

      <ModuleCard
        gradient={gradients.primary}
        icon="home"
        title="Estimation Vente / Achat"
        description="Valeur marchande du bien, fourchette de prix, scénarios de prix, projection à 5 ans et biens comparables."
        features={["Tous types de biens (20)", "Comparables du marché", "Projection de valeur"]}
        cta="Estimer une vente"
        onPress={() => router.push("/estimation/new")}
      />

      <ModuleCard
        gradient={gradients.rent}
        icon="key"
        title="Estimation Location"
        description="Loyer mensuel recommandé, prévisions 6/12/24 mois, rendement locatif et conseiller IA."
        features={["7 types de biens", "Prévision des loyers", "Rendement annuel"]}
        cta="Estimer un loyer"
        onPress={() => router.push("/location/new")}
      />

      <Pressable onPress={() => router.push("/historique")} style={({ pressed }) => [styles.alt, pressed && { opacity: 0.7 }]}>
        <View style={[styles.altIcon, { backgroundColor: colors.accentLight }]}>
          <Ionicons name="time" size={20} color={colors.accent} />
        </View>
        <View style={{ flex: 1, marginHorizontal: spacing.md }}>
          <Text style={styles.altTitle}>Historique complet</Text>
          <Text style={styles.altSub}>Toutes vos estimations vente et location</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>
    </Screen>
  );
}

function ModuleCard({
  gradient,
  icon,
  title,
  description,
  features,
  cta,
  onPress,
}: {
  gradient: readonly [string, string, string];
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  features: string[];
  cta: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ marginBottom: spacing.xl }}>
      {({ pressed }) => (
        <LinearGradient
          colors={[...gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <View style={styles.cardTop}>
            <View style={styles.cardIcon}>
              <Ionicons name={icon} size={24} color="#fff" />
            </View>
            <Ionicons name="arrow-forward-circle" size={26} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDesc}>{description}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {features.map((f) => (
              <View key={f} style={styles.featurePill}>
                <Ionicons name="checkmark-circle" size={13} color="#fff" />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.cardCta}>{cta} →</Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted, lineHeight: 20, marginTop: 6, marginBottom: spacing.xl },
  card: { borderRadius: radius.xl, padding: spacing.xl },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  cardDesc: { color: "rgba(255,255,255,0.9)", fontSize: 13.5, lineHeight: 19, marginTop: 6 },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  featureText: { color: "#fff", fontSize: 11.5, fontWeight: "600" },
  cardCta: { color: "#fff", fontSize: 14, fontWeight: "800", marginTop: 16 },
  alt: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  altIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  altTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  altSub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
});
