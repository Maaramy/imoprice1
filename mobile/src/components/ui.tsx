import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../theme/colors";

/* ═══════════ Screen (coquille d'écran) ═══════════ */

export function Screen({
  children,
  scroll = true,
  contentContainerStyle,
  keyboard = false,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: object;
  keyboard?: boolean;
}) {
  const inner = (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.scrollContent, { flex: 1 }, contentContainerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
  if (keyboard) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {inner}
      </KeyboardAvoidingView>
    );
  }
  return inner;
}

/** En-tête d'écran avec bouton retour. */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      ) : (
        <View style={{ width: 32 }} />
      )}
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? <View style={{ width: 32 }} />}
    </View>
  );
}

/* ═══════════ Bouton ═══════════ */

type ButtonVariant = "primary" | "rent" | "outline" | "ghost" | "danger";

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: object;
}) {
  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.primary, fg: "#fff" },
    rent: { bg: colors.accent, fg: "#fff" },
    outline: { bg: "transparent", fg: colors.primary, border: colors.primary },
    ghost: { bg: colors.primaryLight, fg: colors.primaryDark },
    danger: { bg: colors.danger, fg: "#fff" },
  };
  const p = palette[variant];
  const height = size === "lg" ? 54 : size === "sm" ? 38 : 48;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        {
          height,
          backgroundColor: p.bg,
          borderColor: p.border ?? "transparent",
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={p.fg} style={{ marginRight: 8 }} /> : null}
          <Text style={[styles.btnText, { color: p.fg, fontSize: size === "lg" ? 16 : 15 }]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/* ═══════════ Champ texte ═══════════ */

interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
}

export function TextField({ label, error, hint, style, ...props }: FieldProps) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          error ? { borderColor: colors.danger, borderWidth: 1.5 } : null,
          style,
        ]}
        {...props}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/* ═══════════ Selecteur modal (liste) ═══════════ */

export function SelectField({
  label,
  value,
  placeholder = "Sélectionner…",
  options,
  onSelect,
  required,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  options: string[];
  onSelect: (value: string) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>
        {label} {required ? <Text style={{ color: colors.danger }}>*</Text> : null}
      </Text>
      <Pressable
        onPress={() => {
          setQuery("");
          setOpen(true);
        }}
        style={({ pressed }) => [styles.input, styles.selectBox, pressed && { opacity: 0.7 }]}
      >
        <Text style={value ? { color: colors.text, fontSize: 15 } : { color: colors.muted, fontSize: 15 }} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>
            {options.length > 8 ? (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Rechercher…"
                placeholderTextColor={colors.muted}
                style={[styles.input, { marginBottom: spacing.sm }]}
              />
            ) : null}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 420 }}
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <Pressable
                    onPress={() => {
                      onSelect(item);
                      setOpen(false);
                    }}
                    style={[styles.optionRow, selected && { backgroundColor: colors.primaryLight }]}
                  >
                    <Text style={[styles.optionText, selected && { color: colors.primaryDark, fontWeight: "700" }]}>
                      {item}
                    </Text>
                    {selected ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text style={{ textAlign: "center", color: colors.muted, padding: spacing.xl }}>
                  Aucun résultat
                </Text>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ═══════════ Stepper numérique ═══════════ */

export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 50,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - step))}
          style={[styles.stepperBtn, value <= min && { opacity: 0.35 }]}
          hitSlop={6}
        >
          <Ionicons name="remove" size={18} color={colors.primary} />
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + step))}
          style={[styles.stepperBtn, value >= max && { opacity: 0.35 }]}
          hitSlop={6}
        >
          <Ionicons name="add" size={18} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

/* ═══════════ Switch (ligne) ═══════════ */

export function SwitchRow({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#cbd5e1", true: color ?? colors.primary }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

/* ═══════════ Grille de puces (type de bien) ═══════════ */

export function ChipGrid({
  items,
  selected,
  onSelect,
  columns = 2,
}: {
  items: { key: string; label: string }[];
  selected: string | null;
  onSelect: (key: string) => void;
  columns?: 2 | 3;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}>
      {items.map((it) => {
        const active = it.key === selected;
        return (
          <Pressable
            key={it.key}
            onPress={() => onSelect(it.key)}
            style={[
              styles.chip,
              { width: columns === 2 ? "48%" : "31%" },
              active && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
          >
            <Text style={[styles.chipText, active && { color: "#fff", fontWeight: "700" }]} numberOfLines={2}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ═══════════ Carte de section ═══════════ */

export function SectionCard({
  title,
  icon,
  accent,
  children,
}: {
  title?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      {title || icon ? (
        <View style={styles.cardHeader}>
          {icon ? (
            <Ionicons name={icon} size={18} color={accent ?? colors.primary} style={{ marginRight: 8 }} />
          ) : null}
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

/* ═══════════ Carte statistique ═══════════ */

export function StatCard({
  label,
  value,
  color = colors.text,
  small = false,
}: {
  label: string;
  value: string;
  color?: string;
  small?: boolean;
}) {
  return (
    <View style={[styles.statCard, small && { paddingVertical: spacing.md }]}>
      <Text style={[styles.statValue, { color }, small && { fontSize: 18 }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ═══════════ Etats vides / chargement / erreur ═══════════ */

export function LoadingView({ label = "Chargement…" }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.centerText}>{label}</Text>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
      <Text style={[styles.centerText, { color: colors.danger, marginTop: spacing.md }]}>{message}</Text>
      {onRetry ? (
        <Button title="Réessayer" variant="outline" onPress={onRetry} style={{ marginTop: spacing.lg }} />
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon = "file-tray-outline",
  title,
  subtitle,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={[styles.center, { paddingVertical: spacing.xxl * 1.5 }]}>
      <Ionicons name={icon} size={44} color="#cbd5e1" />
      <Text style={[styles.centerText, { color: colors.muted, fontWeight: "700", marginTop: spacing.md }]}>
        {title}
      </Text>
      {subtitle ? <Text style={styles.centerSub}>{subtitle}</Text> : null}
    </View>
  );
}

/* ═══════════ Styles ═══════════ */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  headerSubtitle: { fontSize: 12, color: colors.muted, marginTop: 2 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
  },
  btnText: { fontWeight: "700" },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    fontSize: 15,
    color: colors.text,
  },
  fieldError: { color: colors.danger, fontSize: 12, marginTop: 4 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 4 },
  selectBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: 40,
    maxHeight: "75%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionText: { fontSize: 15, color: colors.text },
  stepperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  stepperLabel: { fontSize: 14, color: colors.text, fontWeight: "500", flex: 1 },
  stepperControls: { flexDirection: "row", alignItems: "center" },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    minWidth: 44,
    textAlign: "center",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  switchLabel: { fontSize: 14, color: colors.text, flex: 1, marginRight: spacing.md },
  chip: {
    margin: 4,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    minHeight: 54,
    justifyContent: "center",
  },
  chipText: { fontSize: 13, color: colors.text, textAlign: "center" },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  statValue: { fontSize: 20, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 4, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  centerText: { marginTop: spacing.md, fontSize: 14, color: colors.muted, textAlign: "center" },
  centerSub: { fontSize: 13, color: colors.muted, marginTop: 6, textAlign: "center" },
});
