import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/hooks/use-auth";
import { getResetErrorMessage, getResetVerifyErrorMessage } from "../../src/lib/errors";
import { AuthShell, AuthTitle } from "../../src/components/AuthShell";
import { Button, TextField } from "../../src/components/ui";
import { colors, spacing } from "../../src/theme/colors";

type Step = "email" | "otp" | "done";

export default function ResetPasswordScreen() {
  const { signIn } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    if (!email) {
      setError("Entrez votre adresse email");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn("password", { email: email.trim(), flow: "reset" });
      setStep("otp");
    } catch (err) {
      setError(getResetErrorMessage(err instanceof Error ? err.message : String(err)));
    }
    setLoading(false);
  };

  const verify = async () => {
    if (code.length !== 6) {
      setError("Le code comporte 6 chiffres");
      return;
    }
    if (newPassword !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn("password", {
        email: email.trim(),
        code,
        newPassword,
        flow: "reset-verification",
      });
      setStep("done");
    } catch (err) {
      setError(getResetVerifyErrorMessage(err instanceof Error ? err.message : String(err)));
    }
    setLoading(false);
  };

  return (
    <AuthShell>
      <Pressable onPress={() => router.back()} style={{ marginBottom: spacing.lg }} hitSlop={8}>
        <Text style={styles.back}>← Retour</Text>
      </Pressable>

      {step === "done" ? (
        <>
          <AuthTitle title="Mot de passe réinitialisé" subtitle="Connectez-vous avec votre nouveau mot de passe." />
          <Button title="Se connecter" onPress={() => router.replace("/login")} size="lg" icon="log-in-outline" />
        </>
      ) : step === "email" ? (
        <>
          <AuthTitle title="Mot de passe oublié" subtitle="Saisissez votre email : un code de vérification vous sera envoyé." />
          <TextField
            label="Email"
            placeholder="nom@exemple.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Envoyer le code" onPress={sendCode} loading={loading} size="lg" style={{ marginTop: spacing.md }} />
        </>
      ) : (
        <>
          <AuthTitle title="Code de vérification" subtitle={`Un code à 6 chiffres a été envoyé à ${email}`} />
          <TextField
            label="Code reçu"
            placeholder="6 chiffres"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            editable={!loading}
          />
          <TextField
            label="Nouveau mot de passe"
            placeholder="Min. 6 caractères"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            editable={!loading}
          />
          <TextField
            label="Confirmer le nouveau mot de passe"
            placeholder="Retapez le mot de passe"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            editable={!loading}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Réinitialiser" onPress={verify} loading={loading} size="lg" style={{ marginTop: spacing.md }} />
          <View style={styles.row}>
            <Text style={styles.muted}>Pas reçu de code ? </Text>
            <Pressable onPress={sendCode} hitSlop={8}>
              <Text style={styles.link}>Renvoyer</Text>
            </Pressable>
          </View>
        </>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  error: {
    color: colors.danger,
    fontSize: 13,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 10,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: "row", justifyContent: "center", marginTop: spacing.lg },
  link: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  muted: { color: colors.muted, fontSize: 14 },
});
