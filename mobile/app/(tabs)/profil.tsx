import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/hooks/use-auth";
import { useRemainingEstimations } from "../../src/api/plans";
import { useGetUserEstimations } from "../../src/api/estimations";
import { useGetUserRentEstimations } from "../../src/api/rent";
import { Screen, StatCard, SectionCard } from "../../src/components/ui";
import { clearAllCache } from "../../src/lib/offline";
import { colors, radius, spacing } from "../../src/theme/colors";

const PLAN_LABELS: Record<string, string> = {
  start: "Start",
  pro: "Pro",
  business: "Business",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  user: "Utilisateur",
  member: "Membre",
};

export default function ProfilScreen() {
  const { user, isAuthenticated, signOut } = useAuth();
  const quota = useRemainingEstimations();
  const estimations = useGetUserEstimations() ?? [];
  const rents = useGetUserRentEstimations() ?? [];

  const initials = (user?.name ?? user?.email ?? "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const onSignOut = () => {
    Alert.alert("Se déconnecter", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Se déconnecter",
        style: "destructive",
        onPress: async () => {
          await clearAllCache();
          await signOut();
        },
      },
    ]);
  };

  if (!isAuthenticated) return null;

  return (
    <Screen>
      {/* Carte identité */}
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.name ?? "Utilisateur"}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="sparkles" size={12} color={colors.primary} />
            <Text style={[styles.badgeText, { color: colors.primaryDark }]}>
              {PLAN_LABELS[quota?.planType ?? ""] ?? quota?.planType ?? "—"}
            </Text>
          </View>
          {user?.role ? (
            <View style={[styles.badge, { backgroundColor: colors.accentLight }]}>
              <Text style={[styles.badgeText, { color: colors.accent }]}>{ROLE_LABELS[user.role] ?? user.role}</Text>
            </View>
          ) : null}
        </View>
        {quota ? (
          <Text style={styles.quotaText}>
            {quota.remaining} estimation{quota.remaining > 1 ? "s" : ""} restante{quota.remaining > 1 ? "s" : ""} ce mois
          </Text>
        ) : null}
      </View>

      {/* Statistiques */}
      <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg }}>
        <StatCard label="Ventes" value={String(estimations.length)} />
        <StatCard label="Loyers" value={String(rents.length)} />
      </View>

      {/* Menu */}
      <SectionCard>
        <MenuItem icon="time-outline" label="Historique des estimations" onPress={() => router.push("/historique")} />
        <MenuItem icon="notifications-outline" label="Notifications" onPress={() => router.push("/notifications")} />
        <MenuItem icon="settings-outline" label="Paramètres" onPress={() => router.push("/settings")} />
        <MenuItem icon="help-circle-outline" label="Aide & support" onPress={() => router.push("/settings")} />
      </SectionCard>

      <Pressable onPress={onSignOut} style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.8 }]}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.signOutText}>Se déconnecter</Text>
      </Pressable>

      <Text style={styles.version}>imoprice AI mobile · v1.0.0</Text>
    </Screen>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={19} color={colors.primary} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: "center", paddingVertical: spacing.xl },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  name: { fontSize: 21, fontWeight: "800", color: colors.text },
  email: { fontSize: 14, color: colors.muted, marginTop: 3 },
  phone: { fontSize: 13, color: colors.muted, marginTop: 2 },
  badges: { flexDirection: "row", gap: 8, marginTop: spacing.md },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  quotaText: { fontSize: 12.5, color: colors.muted, marginTop: spacing.md },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text, marginLeft: spacing.md },
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderRadius: radius.lg,
    paddingVertical: 15,
    marginTop: spacing.xl,
  },
  signOutText: { color: colors.danger, fontSize: 15, fontWeight: "700" },
  version: { textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: spacing.xl },
});
