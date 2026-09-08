import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGetMyInbox, useMarkMessagesRead, useMarkAllMessagesRead } from "../../src/api/messages";
import { Screen, SectionCard, EmptyState, Button } from "../../src/components/ui";
import { colors, radius, spacing } from "../../src/theme/colors";
import { formatDateTime, formatTND } from "../../src/lib/format";

export default function MessagesScreen() {
  const inbox = useGetMyInbox();
  const markRead = useMarkMessagesRead();
  const markAll = useMarkAllMessagesRead();

  const messages = inbox?.messages ?? [];
  const unread = inbox?.unread ?? 0;

  const openMessage = (id: string, isUnread: boolean) => {
    if (isUnread) markRead({ ids: [id] });
  };

  return (
    <Screen>
      <View style={styles.head}>
        <View>
          <Text style={styles.title}>Messagerie</Text>
          <Text style={styles.subtitle}>
            {unread > 0 ? `${unread} message${unread > 1 ? "s" : ""} non lu${unread > 1 ? "s" : ""}` : "Tout est à jour"}
          </Text>
        </View>
        {unread > 0 ? (
          <Button title="Tout lire" variant="ghost" size="sm" onPress={() => markAll({})} />
        ) : null}
      </View>

      {messages.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon="mail-open-outline"
            title="Aucun message"
            subtitle="Les agences immobilières vous répondront ici après l'envoi d'une demande d'estimation."
          />
        </SectionCard>
      ) : (
        messages.map((m) => {
          const isUnread = m.direction === "in" && !m.readAt;
          return (
            <Pressable
              key={m._id}
              onPress={() => openMessage(m._id, isUnread)}
              style={({ pressed }) => [styles.msg, pressed && { opacity: 0.8 }]}
            >
              <View style={styles.msgTop}>
                <View style={[styles.avatar, isUnread && { backgroundColor: colors.primary }]}>
                  <Ionicons
                    name={m.direction === "out" ? "arrow-up" : "arrow-down"}
                    size={15}
                    color="#fff"
                  />
                </View>
                <View style={{ flex: 1, marginHorizontal: spacing.md }}>
                  <Text style={[styles.agency, isUnread && { fontWeight: "800" }]}>
                    {m.agency?.name ?? m.senderName ?? "baticost AI"}
                  </Text>
                  <Text style={styles.subject} numberOfLines={1}>
                    {m.subject ?? (m.direction === "in" ? "Message de l'agence" : "Votre réponse")}
                  </Text>
                </View>
                {isUnread ? <View style={styles.unreadDot} /> : null}
              </View>
              <Text style={[styles.content, isUnread && { color: colors.text, fontWeight: "500" }]} numberOfLines={3}>
                {m.content}
              </Text>
              {m.estimation?.estimatedValue ? (
                <View style={styles.estBadge}>
                  <Ionicons name="home" size={12} color={colors.primary} />
                  <Text style={styles.estText}>
                    Estimation {formatTND(m.estimation.estimatedValue)} ·{" "}
                    {[m.estimation.ville, m.estimation.gouvernorat].filter(Boolean).join(" — ")}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.date}>{formatDateTime(m.createdAt)}</Text>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  title: { fontSize: 24, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 3 },
  msg: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  msgTop: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  agency: { fontSize: 15, fontWeight: "700", color: colors.text },
  subject: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  content: { fontSize: 13.5, color: colors.muted, lineHeight: 19, marginTop: spacing.md },
  estBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: spacing.md,
    alignSelf: "flex-start",
  },
  estText: { fontSize: 12, fontWeight: "600", color: colors.primaryDark },
  date: { fontSize: 11, color: "#94a3b8", marginTop: spacing.md },
});
