import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import { useGetMyInbox } from "../src/api/messages";
import { Screen, ScreenHeader, SectionCard, Button } from "../src/components/ui";
import { colors, radius, spacing } from "../src/theme/colors";
import { formatDateTime } from "../src/lib/format";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

type PermStatus = "granted" | "denied" | "undetermined" | "unknown";

export default function NotificationsScreen() {
  const router = useRouter();
  const inbox = useGetMyInbox();
  const [status, setStatus] = useState<PermStatus>("unknown");
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    Notifications.getPermissionsAsync().then((p) => setStatus(p.status as PermStatus));
  }, []);

  const enable = async () => {
    const perm = await Notifications.requestPermissionsAsync();
    setStatus(perm.status as PermStatus);
    if (perm.status === "granted") {
      try {
        const token = await Notifications.getExpoPushTokenAsync();
        setPushToken(token.data);
      } catch {
        // Jeton indisponible (Expo Go sans projet EAS) — ignoré.
      }
      Alert.alert("Notifications activées", "Vous recevrez les réponses des agences et les rappels.");
    }
  };

  const messages = inbox?.messages ?? [];

  return (
    <Screen>
      <ScreenHeader title="Notifications" subtitle="Alertes et messages" onBack={() => router.back()} />

      <SectionCard title="Notifications push" icon="notifications">
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: status === "granted" ? colors.success : status === "denied" ? colors.danger : colors.warning },
            ]}
          />
          <Text style={styles.statusText}>
            {status === "granted"
              ? "Notifications activées sur cet appareil"
              : status === "denied"
                ? "Notifications désactivées — activez-les dans les réglages Android"
                : "Notifications non activées"}
          </Text>
        </View>
        {status !== "granted" ? (
          <Button title="Activer les notifications" onPress={enable} variant="primary" icon="notifications" style={{ marginTop: spacing.md }} />
        ) : null}
        {pushToken ? <Text style={styles.token}>Jeton push enregistré : {pushToken.slice(0, 24)}…</Text> : null}
        <Text style={styles.hint}>
          Réponses des agences, résultats d'estimation et rappels de renouvellement.
        </Text>
      </SectionCard>

      <SectionCard title="Messages récents" icon="mail">
        {messages.length === 0 ? (
          <Text style={styles.empty}>Aucun message pour le moment.</Text>
        ) : (
          messages.slice(0, 5).map((m) => (
            <View key={m._id} style={styles.msgRow}>
              <View style={styles.msgDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.msgTitle} numberOfLines={1}>
                  {m.agency?.name ?? m.senderName ?? "imoprice AI"}
                </Text>
                <Text style={styles.msgContent} numberOfLines={2}>{m.content}</Text>
                <Text style={styles.msgDate}>{formatDateTime(m.createdAt)}</Text>
              </View>
            </View>
          ))
        )}
        <Pressable onPress={() => router.push("/(tabs)/messages")} style={styles.linkRow} hitSlop={8}>
          <Text style={styles.link}>Ouvrir la messagerie</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { flex: 1, fontSize: 14, color: colors.text },
  token: { fontSize: 11, color: colors.muted, marginTop: spacing.md },
  hint: { fontSize: 12, color: colors.muted, marginTop: spacing.md, lineHeight: 17 },
  empty: { fontSize: 13.5, color: colors.muted },
  msgRow: { flexDirection: "row", gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  msgDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  msgTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  msgContent: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  msgDate: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.md },
  link: { fontSize: 14, fontWeight: "700", color: colors.primary },
});
