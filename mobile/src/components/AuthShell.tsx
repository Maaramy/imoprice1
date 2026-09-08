import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, radius, spacing } from "../theme/colors";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={["#eff6ff", "#f1f5f9", "#eef2ff"]} style={styles.bg}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.content}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="home" size={26} color="#fff" />
            </View>
            <Text style={styles.brandName}>
              imo<Text style={{ color: colors.primary }}>price</Text>{" "}
              <Text style={{ color: "#4f46e5" }}>AI</Text>
            </Text>
            <Text style={styles.tagline}>Estimation immobilière intelligente</Text>
          </View>
          <View style={styles.card}>{children}</View>
          <Text style={styles.foot}>Sécurisé · Même compte que la plateforme Web</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

export function AuthTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  content: { flex: 1, justifyContent: "center", padding: spacing.xl },
  brand: { alignItems: "center", marginBottom: spacing.xl },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  brandName: { fontSize: 26, fontWeight: "800", color: colors.text, marginTop: spacing.md },
  tagline: { fontSize: 13, color: colors.muted, marginTop: 4 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  title: { fontSize: 20, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
  foot: { textAlign: "center", fontSize: 11, color: colors.muted, marginTop: spacing.lg },
});
