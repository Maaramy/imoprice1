import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/hooks/use-auth";
import { getSignInErrorMessage } from "../../src/lib/errors";
import { AuthShell, AuthTitle } from "../../src/components/AuthShell";
import { Button, TextField } from "../../src/components/ui";
import { colors, spacing } from "../../src/theme/colors";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn("password", { email: email.trim(), password, flow: "signIn" });
      // La navigation est pilotée par le changement d'état d'authentification.
    } catch (err) {
      setError(getSignInErrorMessage(err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthTitle title="Connexion" subtitle="Retrouvez vos estimations et analysez vos biens en quelques secondes." />
      <TextField
        label="Email"
        placeholder="nom@exemple.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        editable={!loading}
      />
      <TextField
        label="Mot de passe"
        placeholder="Votre mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        editable={!loading}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Se connecter" onPress={submit} loading={loading} size="lg" icon="log-in-outline" style={{ marginTop: spacing.md }} />

      <View style={styles.row}>
        <Pressable onPress={() => router.push("/reset-password")} hitSlop={8}>
          <Text style={styles.link}>Mot de passe oublié ?</Text>
        </Pressable>
      </View>
      <View style={[styles.row, { marginTop: spacing.md }]}>
        <Text style={styles.muted}>Pas encore de compte ? </Text>
        <Pressable onPress={() => router.push("/signup")} hitSlop={8}>
          <Text style={[styles.link, { fontWeight: "700" }]}>Créer un compte</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  error: {
    color: colors.danger,
    fontSize: 13,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 10,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: "row", justifyContent: "center", marginTop: spacing.lg },
  link: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  muted: { color: colors.muted, fontSize: 14 },
});
