import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useConvex } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import {
  useCreateProperty,
  useEstimateProperty,
  useUpdateProperty,
  createAndEstimateProperty,
} from "../../src/api/estimations";
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
import { pickPhotos, uploadPhoto, lightHaptic } from "../../src/lib/photos";
import {
  PROPERTY_TYPES_LABELS,
  PROPERTY_STATES,
  PROPERTY_STATES_LABELS,
  SALE_FEATURES,
} from "../../src/lib/labels";
import { colors, radius, spacing } from "../../src/theme/colors";

const REQUIRED_STATE = "bon_etat";

export default function NewSaleEstimationScreen() {
  const router = useRouter();
  const convex = useConvex();
  const createProperty = useCreateProperty();
  const estimateProperty = useEstimateProperty();
  const updateProperty = useUpdateProperty();
  const quota = useRemainingEstimations();

  const [location, setLocation] = useState({ gouvernorat: "", ville: "", quartier: "" });
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const [propertyType, setPropertyType] = useState("");
  const [builtSurface, setBuiltSurface] = useState("80");
  const [terrainSurface, setTerrainSurface] = useState("");
  const [floors, setFloors] = useState(1);

  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);
  const [kitchens, setKitchens] = useState(1);
  const [livingRooms, setLivingRooms] = useState(1);
  const [garages, setGarages] = useState(0);

  const [features, setFeatures] = useState<Record<string, boolean>>({});

  const [yearBuilt, setYearBuilt] = useState("");
  const [generalState, setGeneralState] = useState("");

  const [photos, setPhotos] = useState<{ uri: string }[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFeature = (key: string) => setFeatures((f) => ({ ...f, [key]: !f[key] }));

  const addPhotos = async (from: "camera" | "gallery") => {
    try {
      const picked = await pickPhotos(from, true);
      setPhotos((prev) => [...prev, ...picked]);
      setPhotoError(null);
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "Photos indisponibles");
    }
  };

  const submit = async () => {
    if (quota && !quota.canEstimate) {
      Alert.alert(
        "Quota atteint",
        quota.reason === "limite_atteinte"
          ? "Vous avez utilisé toutes vos estimations du mois. Passez à un forfait supérieur depuis la plateforme Web."
          : "Votre estimation est momentanément indisponible. Vérifiez votre abonnement.",
      );
      return;
    }
    if (!location.gouvernorat || !location.ville) {
      setError("Renseignez le gouvernorat et la ville du bien.");
      return;
    }
    if (!propertyType) {
      setError("Choisissez le type de bien.");
      return;
    }
    const built = Number(builtSurface);
    if (!built || built <= 0) {
      setError("La surface construite doit être supérieure à 0 m².");
      return;
    }
    const state = generalState || REQUIRED_STATE;

    setSubmitting(true);
    setError(null);
    try {
      const { propertyId, estimationId } = await createAndEstimateProperty(
        createProperty,
        estimateProperty,
        {
          address: address || undefined,
          gouvernorat: location.gouvernorat,
          ville: location.ville,
          quartier: location.quartier,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          propertyType,
          terrainSurface: terrainSurface ? Number(terrainSurface) : undefined,
          builtSurface: built,
          floors,
          bedrooms,
          bathrooms,
          kitchens,
          livingRooms,
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
          yearBuilt: yearBuilt ? Number(yearBuilt) : undefined,
          generalState: state,
        },
      );

      // Upload des photos (compressées) vers le stockage Convex, puis
      // rattachement au bien — optionnel, en arrière-plan.
      if (photos.length > 0) {
        try {
          const storageIds: string[] = [];
          for (const p of photos) {
            storageIds.push(await uploadPhoto(convex, p.uri));
          }
          await updateProperty({ propertyId, photoIds: storageIds });
        } catch {
          // Les photos sont optionnelles : l'estimation reste valide.
        }
      }

      lightHaptic();
      router.replace({ pathname: "/estimation/[id]", params: { id: estimationId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Estimation impossible. Réessayez.");
      setSubmitting(false);
    }
  };

  const quotaLimited = quota ? !quota.canEstimate : false;

  return (
    <Screen keyboard>
      <ScreenHeader title="Estimation vente / achat" subtitle="BIM Engine — marché tunisien" onBack={() => router.back()} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <SectionCard title="Localisation" icon="location">
        <LocationCascades value={location} onChange={setLocation} />
        <TextField label="Adresse (optionnel)" placeholder="Rue, numéro…" value={address} onChangeText={setAddress} />
      </SectionCard>

      <SectionCard title="Type & surface" icon="home">
        <Text style={styles.fieldLabel}>Type de bien *</Text>
        <ChipGrid
          items={Object.entries(PROPERTY_TYPES_LABELS).map(([key, label]) => ({ key, label }))}
          selected={propertyType}
          onSelect={setPropertyType}
        />
        <View style={styles.twoCol}>
          <TextField
            label="Surface construite (m²) *"
            placeholder="80"
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
        <Stepper label="Nombre d'étages" value={floors} onChange={setFloors} min={1} max={15} />
      </SectionCard>

      <SectionCard title="Pièces" icon="bed">
        <Stepper label="Chambres" value={bedrooms} onChange={setBedrooms} max={20} />
        <Stepper label="Salles de bain" value={bathrooms} onChange={setBathrooms} max={10} />
        <Stepper label="Cuisines" value={kitchens} onChange={setKitchens} max={5} />
        <Stepper label="Salons" value={livingRooms} onChange={setLivingRooms} max={5} />
        <Stepper label="Garages" value={garages} onChange={setGarages} max={10} />
      </SectionCard>

      <SectionCard title="Équipements" icon="options">
        <View style={styles.featureGrid}>
          {SALE_FEATURES.map((f) => (
            <View key={f.key} style={styles.featureItem}>
              <SwitchRow label={f.label} value={!!features[f.key]} onChange={() => toggleFeature(f.key)} />
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Construction" icon="construct">
        <TextField
          label="Année de construction (optionnel)"
          placeholder="Ex. 2015"
          value={yearBuilt}
          onChangeText={setYearBuilt}
          keyboardType="number-pad"
        />
        <Text style={styles.fieldLabel}>État général *</Text>
        <ChipGrid
          items={PROPERTY_STATES.map((s) => ({ key: s, label: PROPERTY_STATES_LABELS[s] }))}
          selected={generalState || REQUIRED_STATE}
          onSelect={setGeneralState}
        />
      </SectionCard>

      <SectionCard title="Photos du bien" icon="camera">
        <View style={styles.photoRow}>
          <PhotoButton icon="camera" label="Caméra" onPress={() => addPhotos("camera")} />
          <PhotoButton icon="images" label="Galerie" onPress={() => addPhotos("gallery")} />
        </View>
        {photoError ? <Text style={styles.error}>{photoError}</Text> : null}
        {photos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }}>
            {photos.map((p, i) => (
              <View key={i} style={styles.thumbWrap}>
                <Image source={{ uri: p.uri }} style={styles.thumb} />
                <Pressable
                  onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  style={styles.thumbRemove}
                  hitSlop={6}
                >
                  <Ionicons name="close" size={12} color="#fff" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}
        <Text style={styles.hint}>
          Photos envoyées en qualité compressée pour l'analyse de l'état et des équipements.
        </Text>
      </SectionCard>

      <Button
        title="Lancer l'estimation IA"
        onPress={submit}
        loading={submitting}
        size="lg"
        icon="sparkles"
        disabled={quotaLimited}
        style={{ marginTop: spacing.sm }}
      />
      {quotaLimited ? (
        <Text style={styles.quotaWarn}>Quota mensuel atteint — passez à un forfait supérieur sur le Web.</Text>
      ) : null}
      {submitting ? <LoadingView label="L'IA analyse votre bien…" /> : null}
    </Screen>
  );
}

function PhotoButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.photoBtn, pressed && { opacity: 0.8 }]}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.photoBtnText}>{label}</Text>
    </Pressable>
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
  twoCol: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.sm },
  featureGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
  featureItem: { width: "50%", paddingHorizontal: 5, marginBottom: 8 },
  photoRow: { flexDirection: "row", gap: spacing.md },
  photoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: radius.md,
    paddingVertical: 16,
  },
  photoBtnText: { fontSize: 14, fontWeight: "700", color: colors.primary },
  thumbWrap: { marginRight: spacing.sm, position: "relative" },
  thumb: { width: 84, height: 84, borderRadius: radius.md },
  thumbRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { fontSize: 12, color: colors.muted, marginTop: spacing.md },
  quotaWarn: { textAlign: "center", fontSize: 12.5, color: colors.warning, marginTop: spacing.md },
});
