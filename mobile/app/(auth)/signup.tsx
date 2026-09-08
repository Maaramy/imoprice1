import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/hooks/use-auth";
import { getSignUpErrorMessage } from "../../src/lib/errors";
import { AuthShell, AuthTitle } from "../../src/components/AuthShell";
import { Button, TextField } from "../../src/components/ui";
import { colors, spacing } from "../../src/theme/colors";

const MIN_PW = 6;

export default function SignupScreen() {
  const { signIn } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name || !email || !password || !confirm) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (password.length < MIN_PW) {
      setError(`Le mot de passe doit contenir au moins ${MIN_PW} caractères`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn("password", {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        confirmPassword: confirm,
        flow: "signUp",
      });
    } catch (err) {
      setError(getSignUpErrorMessage(err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthTitle title="Créer un compte" subtitle="Estimez la valeur de vos biens et vos loyers avec l'IA." />
      <TextField label="Nom complet" placeholder="Votre nom" value={name} onChangeText={setName} editable={!loading} />
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
        label="Téléphone (optionnel)"
        placeholder="+216 XX XXX XXX"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        editable={!loading}
      />
      <TextField
        label="Mot de passe"
        placeholder={`Min. ${MIN_PW} caractères`}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />
      <TextField
        label="Confirmer le mot de passe"
        placeholder="Retapez le mot de passe"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        editable={!loading}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Créer mon compte" onPress={submit} loading={loading} size="lg" icon="person-add-outline" style={{ marginTop: spacing.md }} />

      <View style={styles.row}>
        <Text style={styles.muted}>Déjà un compte ? </Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={[styles.link, { fontWeight: "700" }]}>Se connecter</Text>
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
