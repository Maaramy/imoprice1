import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useCreateRentEstimation, runRentEstimation } from "../../src/api/rent";
import { useRemainingEstimations } from "../../src/api/plans";
import { LocationCascades } from "../../src/components/LocationCascades";
import {
  Screen,
  ScreenHeader,
  SectionCard,
  Button,
  TextField,
  Stepper,
  SwitchRow,
  ChipGrid,
  LoadingView,
} from "../../src/components/ui";
import { lightHaptic } from "../../src/lib/photos";
import {
  RENT_PROPERTY_TYPES,
  RENT_PROPERTY_TYPES_LABELS,
  RENT_FINISH_LEVELS,
  RENT_FINISH_LABELS,
  PROPERTY_STATES,
  PROPERTY_STATES_LABELS,
  RENT_FEATURES,
  RENT_ZONE_TYPES,
  RENT_ZONE_LABELS,
  RENT_NEARBY_LABELS,
} from "../../src/lib/labels";
import { colors, spacing } from "../../src/theme/colors";

export default function NewRentEstimationScreen() {
  const router = useRouter();
  const createRent = useCreateRentEstimation();
  const quota = useRemainingEstimations();

  const [location, setLocation] = useState({ gouvernorat: "", ville: "", quartier: "" });
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const [propertyType, setPropertyType] = useState("");
  const [builtSurface, setBuiltSurface] = useState("70");
  const [terrainSurface, setTerrainSurface] = useState("");
  const [floor, setFloor] = useState(2);
  const [floors, setFloors] = useState(4);

  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);
  const [livingRooms, setLivingRooms] = useState(1);
  const [kitchens, setKitchens] = useState(1);
  const [garages, setGarages] = useState(0);

  const [features, setFeatures] = useState<Record<string, boolean>>({});

  const [finishLevel, setFinishLevel] = useState("");
  const [generalState, setGeneralState] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");

  const [estimationMode, setEstimationMode] = useState<"mensuel" | "nuitée">("mensuel");
  const [zoneType, setZoneType] = useState("");
  const [nearby, setNearby] = useState<Record<string, boolean>>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFeature = (key: string) => setFeatures((f) => ({ ...f, [key]: !f[key] }));

  const submit = async () => {
    if (quota && !quota.canEstimate) {
      Alert.alert("Quota atteint", "Passez à un forfait supérieur depuis la plateforme Web.");
      return;
    }
    if (!location.gouvernorat) {
      setError("Renseignez le gouvernorat du bien.");
      return;
    }
    if (!propertyType) {
      setError("Choisissez le type de bien.");
      return;
    }
    const built = Number(builtSurface);
    if (!built || built <= 0) {
      setError("La surface habitable doit être supérieure à 0 m².");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const { estimationId } = await runRentEstimation(createRent, {
        address: address || undefined,
        gouvernorat: location.gouvernorat,
        ville: location.ville,
        quartier: location.quartier,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        propertyType,
        builtSurface: built,
        terrainSurface: terrainSurface ? Number(terrainSurface) : undefined,
        floor,
        floors,
        bedrooms,
        bathrooms,
        livingRooms,
        kitchens,
        garages,
        hasGarden: !!features.hasGarden,
        hasPool: !!features.hasPool,
        hasTerrace: !!features.hasTerrace,
        hasBalcony: !!features.hasBalcony,
        hasElevator: !!features.hasElevator,
        hasParking: !!features.hasParking,
        hasAC: !!features.hasAC,
        hasHeating: !!features.hasHeating,
        hasSolar: !!features.hasSolar,
        hasFiber: !!features.hasFiber,
        hasInternet: !!features.hasInternet,
        hasCameras: !!features.hasCameras,
        hasSmartHome: !!features.hasSmartHome,
        hasEquippedKitchen: !!features.hasEquippedKitchen,
        isFurnished: !!features.isFurnished,
        yearBuilt: yearBuilt ? Number(yearBuilt) : undefined,
        generalState: generalState || undefined,
        finishLevel: (finishLevel as any) || undefined,
        estimationMode,
        zoneType: (zoneType || undefined) as any,
        nearBeach: !!nearby.nearBeach,
        nearClinic: !!nearby.nearClinic,
        nearHospital: !!nearby.nearHospital,
        nearUniversity: !!nearby.nearUniversity,
        nearMall: !!nearby.nearMall,
        nearTransport: !!nearby.nearTransport,
      });

      lightHaptic();
      router.replace({ pathname: "/location/[id]", params: { id: estimationId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Estimation impossible. Réessayez.");
      setSubmitting(false);
    }
  };

  const quotaLimited = quota ? !quota.canEstimate : false;

  return (
    <Screen keyboard>
      <ScreenHeader title="Estimation loyer" subtitle="BIM Engine — marché locatif tunisien" onBack={() => router.back()} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <SectionCard title="Type de location" icon="moon">
        <View style={styles.modeRow}>
          {([
            { v: "mensuel", l: "Mensuel", d: "Longue durée" },
            { v: "nuitée", l: "Nuitée", d: "Courte durée" },
          ] as const).map((m) => {
            const active = estimationMode === m.v;
            return (
              <View key={m.v} style={{ flex: 1 }}>
                <ChipGrid
                  items={[{ key: m.v, label: `${m.l} — ${m.d}` }]}
                  selected={active ? m.v : ""}
                  onSelect={() => setEstimationMode(m.v)}
                />
              </View>
            );
          })}
        </View>
        {estimationMode === "nuitée" ? (
          <View style={{ marginTop: spacing.md }}>
            <Text style={styles.fieldLabel}>Profil de zone (détection auto si vide)</Text>
            <ChipGrid
              items={[
                { key: "", label: "✨ Automatique" },
                ...RENT_ZONE_TYPES.map((z) => ({ key: z, label: RENT_ZONE_LABELS[z] })),
              ]}
              selected={zoneType}
              onSelect={setZoneType}
            />
            <View style={{ height: spacing.md }} />
            <Text style={styles.fieldLabel}>Proximités valorisantes (optionnel)</Text>
            <View style={styles.featureGrid}>
              {Object.keys(RENT_NEARBY_LABELS).map((k) => (
                <View key={k} style={styles.featureItem}>
                  <SwitchRow
                    label={RENT_NEARBY_LABELS[k]}
                    value={!!nearby[k]}
                    onChange={() => setNearby((n) => ({ ...n, [k]: !n[k] }))}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard title="Localisation" icon="location">
        <LocationCascades value={location} onChange={setLocation} />
        <TextField label="Adresse (optionnel)" placeholder="Rue, numéro…" value={address} onChangeText={setAddress} />
      </SectionCard>

      <SectionCard title="Type & surface" icon="key">
        <ChipGrid
          items={RENT_PROPERTY_TYPES.map((t) => ({ key: t, label: RENT_PROPERTY_TYPES_LABELS[t] }))}
          selected={propertyType}
          onSelect={setPropertyType}
        />
        <View style={styles.twoCol}>
          <TextField
            label="Surface habitable (m²) *"
            placeholder="70"
            value={builtSurface}
            onChangeText={setBuiltSurface}
            keyboardType="number-pad"
            style={{ marginBottom: 0 }}
          />
          <TextField
            label="Surface terrain (m²)"
            placeholder="Optionnel"
            value={terrainSurface}
            onChangeText={setTerrainSurface}
            keyboardType="number-pad"
            style={{ marginBottom: 0 }}
          />
        </View>
        <Stepper label="Étage où se situe le bien" value={floor} onChange={setFloor} min={0} max={20} />
        <Stepper label="Étages du bâtiment" value={floors} onChange={setFloors} min={1} max={30} />
      </SectionCard>

      <SectionCard title="Pièces" icon="bed">
        <Stepper label="Chambres" value={bedrooms} onChange={setBedrooms} max={20} />
        <Stepper label="Salles de bain" value={bathrooms} onChange={setBathrooms} max={10} />
        <Stepper label="Salons" value={livingRooms} onChange={setLivingRooms} max={5} />
        <Stepper label="Cuisines" value={kitchens} onChange={setKitchens} max={5} />
        <Stepper label="Garages" value={garages} onChange={setGarages} max={10} />
      </SectionCard>

      <SectionCard title="Équipements locatifs" icon="options">
        <View style={styles.featureGrid}>
          {RENT_FEATURES.map((f) => (
            <View key={f.key} style={styles.featureItem}>
              <SwitchRow label={f.label} value={!!features[f.key]} onChange={() => toggleFeature(f.key)} />
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Finition & état" icon="construct">
        <Text style={styles.fieldLabel}>Niveau de finition</Text>
        <ChipGrid
          items={RENT_FINISH_LEVELS.map((l) => ({ key: l, label: RENT_FINISH_LABELS[l] }))}
          selected={finishLevel}
          onSelect={setFinishLevel}
        />
        <View style={{ height: spacing.md }} />
        <Text style={styles.fieldLabel}>État général</Text>
        <ChipGrid
          items={PROPERTY_STATES.map((s) => ({ key: s, label: PROPERTY_STATES_LABELS[s] }))}
          selected={generalState}
          onSelect={setGeneralState}
        />
        <View style={{ height: spacing.md }} />
        <TextField
          label="Année de construction (optionnel)"
          placeholder="Ex. 2015"
          value={yearBuilt}
          onChangeText={setYearBuilt}
          keyboardType="number-pad"
        />
      </SectionCard>

      <Button
        title={estimationMode === "nuitée" ? "Estimer la nuitée" : "Estimer le loyer mensuel"}
        onPress={submit}
        loading={submitting}
        variant="rent"
        size="lg"
        icon="sparkles"
        disabled={quotaLimited}
        style={{ marginTop: spacing.sm }}
      />
      {quotaLimited ? (
        <Text style={styles.quotaWarn}>Quota mensuel atteint — passez à un forfait supérieur sur le Web.</Text>
      ) : null}
      {submitting ? <LoadingView label="L'IA analyse le marché locatif…" /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    color: colors.danger,
    fontSize: 13,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 10,
    marginBottom: spacing.md,
  },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 8 },
  twoCol: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  modeRow: { flexDirection: "row", gap: spacing.md },
  featureGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
  featureItem: { width: "50%", paddingHorizontal: 5, marginBottom: 8 },
  quotaWarn: { textAlign: "center", fontSize: 12.5, color: colors.warning, marginTop: spacing.md },
});
