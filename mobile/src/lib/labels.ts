/**
 * Libellés métier — répliqués depuis src/convex/types.ts de la plateforme Web
 * (mêmes valeurs pour une expérience identique).
 */

export const PROPERTY_TYPES_LABELS: Record<string, string> = {
  maison: "Maison individuelle",
  villa: "Villa",
  appartement: "Appartement",
  studio: "Studio",
  duplex: "Duplex",
  immeuble: "Immeuble",
  local_commercial: "Local commercial",
  bureau: "Bureau",
  magasin: "Magasin",
  restaurant: "Restaurant",
  cafe: "Café",
  entrepot: "Entrepôt",
  atelier: "Atelier",
  terrain_constructible: "Terrain constructible",
  terrain_agricole: "Terrain agricole",
  ferme: "Ferme",
  garage: "Garage",
  parking: "Parking",
  depot: "Dépôt",
  mixte: "Bien mixte (résidentiel et commercial)",
};

/** Types pris en charge par le moteur de location (les 7). */
export const RENT_PROPERTY_TYPES = [
  "maison",
  "villa",
  "appartement",
  "studio",
  "duplex",
  "local_commercial",
  "bureau",
] as const;

export const RENT_PROPERTY_TYPES_LABELS: Record<string, string> = {
  maison: "Maison",
  villa: "Villa",
  appartement: "Appartement",
  studio: "Studio",
  duplex: "Duplex",
  local_commercial: "Local commercial",
  bureau: "Bureau",
};

export const PROPERTY_STATES = ["a_renover", "bon_etat", "excellent_etat", "luxe"] as const;

export const PROPERTY_STATES_LABELS: Record<string, string> = {
  a_renover: "À rénover",
  bon_etat: "Bon état",
  excellent_etat: "Excellent état",
  luxe: "Luxe",
};

export const RENT_FINISH_LEVELS = ["economique", "standard", "premium", "luxe"] as const;

export const RENT_FINISH_LABELS: Record<string, string> = {
  economique: "Économique",
  standard: "Standard",
  premium: "Premium",
  luxe: "Luxe",
};

/** Équipements du formulaire de location (clé moteur → libellé + icône). */
export const RENT_FEATURES: { key: string; label: string }[] = [
  { key: "isFurnished", label: "Meublé" },
  { key: "hasEquippedKitchen", label: "Cuisine équipée" },
  { key: "hasFiber", label: "Fibre optique" },
  { key: "hasInternet", label: "Internet" },
  { key: "hasCameras", label: "Caméras de sécurité" },
  { key: "hasSmartHome", label: "Domotique" },
  { key: "hasSolar", label: "Panneaux solaires" },
  { key: "hasAC", label: "Climatisation" },
  { key: "hasHeating", label: "Chauffage central" },
  { key: "hasElevator", label: "Ascenseur" },
  { key: "hasParking", label: "Parking" },
  { key: "hasGarden", label: "Jardin" },
  { key: "hasPool", label: "Piscine" },
  { key: "hasTerrace", label: "Terrasse" },
  { key: "hasBalcony", label: "Balcon" },
];

/** Équipements du formulaire de vente. */
export const SALE_FEATURES: { key: string; label: string }[] = [
  { key: "hasGarden", label: "Jardin" },
  { key: "hasPool", label: "Piscine" },
  { key: "hasTerrace", label: "Terrasse" },
  { key: "hasBalcony", label: "Balcon" },
  { key: "hasElevator", label: "Ascenseur" },
  { key: "hasParking", label: "Parking" },
  { key: "hasAC", label: "Climatisation" },
  { key: "hasHeating", label: "Chauffage" },
  { key: "hasSolar", label: "Installation solaire" },
];

/** Niveaux de marché locatif (couleurs affichées dans les résultats). */
export const RENT_LEVEL_COLORS: Record<string, string> = {
  tres_faible: "#3b82f6",
  faible: "#10b981",
  moyen: "#f59e0b",
  eleve: "#f97316",
  tres_eleve: "#ef4444",
};

export const RENT_LEVEL_LABELS: Record<string, string> = {
  tres_faible: "Très faible",
  faible: "Faible",
  moyen: "Moyen",
  eleve: "Élevé",
  tres_eleve: "Très élevé",
};

/** Profils de zone pour l'estimation par nuitée (courte durée). */
export const RENT_ZONE_TYPES = [
  "touristique",
  "urbain",
  "residentiel",
  "universitaire",
  "commercial",
] as const;

export const RENT_ZONE_LABELS: Record<string, string> = {
  touristique: "Zone touristique",
  urbain: "Zone urbaine",
  residentiel: "Zone résidentielle",
  universitaire: "Zone universitaire",
  commercial: "Zone commerciale",
};

/** Proximités (loc. courte durée) — clé moteur → libellé. */
export const RENT_NEARBY_LABELS: Record<string, string> = {
  nearBeach: "Plage",
  nearClinic: "Clinique",
  nearHospital: "Hôpital",
  nearUniversity: "Université",
  nearMall: "Centre commercial",
  nearTransport: "Transport public",
};
