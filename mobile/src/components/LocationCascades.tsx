import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GOVERNORATS, VILLES_BY_GOUVERNORAT, villesOf, quartiersOf } from "../lib/locations";
import { SelectField, Button } from "./ui";
import { useGpsLocation } from "../hooks/use-location";
import { colors, radius, spacing } from "../theme/colors";

export interface LocationValue {
  gouvernorat: string;
  ville: string;
  quartier: string;
}

/** Gouvernorat auquel appartient une ville (inverse de VILLES_BY_GOUVERNORAT). */
function gouvernoratOfVille(ville: string): string | null {
  for (const g of GOVERNORATS) {
    if (villesOf(g).includes(ville)) return g;
  }
  return null;
}

/**
 * Cascade Gouvernorat → Ville → Quartier (données embarquées, fonctionne
 * hors-ligne) + bouton « Ma position » (GPS natif + géocodage inverse).
 */
export function LocationCascades({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
}) {
  const { getCurrentPosition, resolveLocation, loading, error } = useGpsLocation();

  const setGouvernorat = (gouvernorat: string) => {
    onChange({ gouvernorat, ville: "", quartier: "" });
  };
  const setVille = (ville: string) => {
    onChange({ ...value, ville, quartier: "" });
  };

  const useMyPosition = async () => {
    const pos = await getCurrentPosition();
    if (!pos) return;
    // 1) Géocodage inverse local → ville pressentie
    const resolved = await resolveLocation(pos, value.gouvernorat);
    // 2) On déduit le gouvernorat depuis la ville trouvée
    let gouvernorat = value.gouvernorat;
    if (resolved.ville) {
      const g = gouvernoratOfVille(resolved.ville);
      if (g) gouvernorat = g;
    }
    onChange({
      gouvernorat,
      ville: resolved.ville ?? value.ville,
      quartier: resolved.quartier ?? "",
    });
  };

  return (
    <View>
      <SelectField
        label="Gouvernorat"
        value={value.gouvernorat}
        placeholder="Choisir le gouvernorat"
        options={GOVERNORATS}
        onSelect={setGouvernorat}
        required
      />
      <SelectField
        label="Ville"
        value={value.ville}
        placeholder={value.gouvernorat ? "Choisir la ville" : "Choisir d'abord le gouvernorat"}
        options={villesOf(value.gouvernorat)}
        onSelect={setVille}
        required
      />
      <SelectField
        label="Quartier"
        value={value.quartier}
        placeholder={value.ville ? "Choisir le quartier (optionnel)" : "Choisir d'abord la ville"}
        options={quartiersOf(value.ville)}
        onSelect={(quartier) => onChange({ ...value, quartier })}
      />

      <Pressable
        onPress={useMyPosition}
        disabled={loading}
        style={({ pressed }) => [styles.gps, pressed && { opacity: 0.75 }]}
      >
        <Ionicons name="location" size={16} color={colors.primary} />
        <Text style={styles.gpsText}>
          {loading ? "Localisation en cours…" : "Utiliser ma position"}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.muted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {value.gouvernorat && value.ville && !value.quartier ? (
        <Text style={styles.hint}>
          Conseil : ajoutez le quartier pour une estimation plus précise.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gps: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  gpsText: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.primaryDark },
  hint: { fontSize: 12, color: colors.muted, marginBottom: spacing.md },
  error: { color: colors.danger, fontSize: 12, marginBottom: spacing.md },
});
