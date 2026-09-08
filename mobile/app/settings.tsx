import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/hooks/use-auth";
import { useUpdateProfile } from "../src/api/users";
import { Screen, ScreenHeader, SectionCard, Button, TextField } from "../src/components/ui";
import { colors, spacing } from "../src/theme/colors";
import { lightHaptic } from "../src/lib/photos";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() });
      lightHaptic();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Mise à jour impossible");
    }
    setSaving(false);
  };

  const onSignOut = () => {
    Alert.alert("Se déconnecter", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Se déconnecter", style: "destructive", onPress: () => signOut() },
    ]);
  };

  return (
    <Screen keyboard>
      <ScreenHeader title="Paramètres" subtitle="Compte et préférences" onBack={() => router.back()} />

      <SectionCard title="Profil" icon="person">
        <TextField label="Nom complet" placeholder="Votre nom" value={name} onChangeText={setName} />
        <TextField label="Téléphone" placeholder="+216 XX XXX XXX" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Text style={styles.email}>{user?.email}</Text>
        <Button
          title={saved ? "Profil enregistré ✓" : "Enregistrer"}
          onPress={save}
          loading={saving}
          icon={saved ? "checkmark" : "save"}
          variant={saved ? "ghost" : "primary"}
        />
      </SectionCard>

      <SectionCard title="Notifications" icon="notifications">
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Notifications push</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </View>
        <Pressable onPress={() => router.push("/notifications")} hitSlop={8}>
          <Text style={styles.link}>Gérer les notifications</Text>
        </Pressable>
      </SectionCard>

      <SectionCard title="À propos" icon="information-circle">
        <Text style={styles.aboutLine}>
          baticost AI — estimation immobilière et locative par intelligence artificielle pour le
          marché tunisien.
        </Text>
        <Text style={styles.version}>Version 1.0.0 · Android · iOS en préparation</Text>
        <Text style={styles.privacy}>
          Vos données sont stockées de manière sécurisée (Keystore Android) et les mots de passe ne
          sont jamais stockés en clair.
        </Text>
      </SectionCard>

      <Button title="Se déconnecter" variant="danger" icon="log-out" onPress={onSignOut} style={{ marginTop: spacing.sm }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  email: { fontSize: 13, color: colors.muted, marginBottom: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  rowLabel: { fontSize: 14, color: colors.text, fontWeight: "600" },
  link: { color: colors.primary, fontSize: 13.5, fontWeight: "700", marginTop: 4 },
  aboutLine: { fontSize: 13, color: colors.text, lineHeight: 19 },
  version: { fontSize: 12, color: colors.muted, marginTop: spacing.md, fontWeight: "600" },
  privacy: { fontSize: 12, color: colors.muted, marginTop: spacing.md, lineHeight: 17 },
});
