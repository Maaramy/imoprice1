/**
 * Types partagés côté mobile — répliqués depuis src/convex/types.ts de la
 * plateforme Web (contrats exacts des mutations/queries/actions backend).
 */

export interface PropertyInput {
  address?: string;
  gouvernorat: string;
  ville: string;
  quartier: string;
  latitude?: number;
  longitude?: number;
  propertyType: string;
  terrainSurface?: number;
  builtSurface: number;
  floors?: number;
  bedrooms?: number;
  bathrooms?: number;
  kitchens?: number;
  livingRooms?: number;
  garages?: number;
  hasGarden: boolean;
  hasPool: boolean;
  hasTerrace: boolean;
  hasBalcony: boolean;
  hasElevator: boolean;
  hasParking: boolean;
  hasAC: boolean;
  hasHeating: boolean;
  hasSolar: boolean;
  yearBuilt?: number;
  generalState: string;
}

export interface ComparableProperty {
  id: string;
  type: string;
  surface: number;
  location: string;
  price: number;
  pricePerSqm: number;
  distance: string;
}

export interface EstimationResultData {
  estimatedValue: number;
  priceMin: number;
  priceMax: number;
  fastSalePrice: number;
  maxProfitPrice: number;
  avgPricePerSqm: number;
  confidenceIndex: number;
  valueYear1: number;
  valueYear3: number;
  valueYear5: number;
  positiveFactors: string[];
  negativeFactors: string[];
  improvementSuggestions: string[];
  comparableProperties: ComparableProperty[];
}

/** Document `estimations` (avec le bien associé quand il est enrichi). */
export interface EstimationDoc {
  _id: string;
  _creationTime: number;
  propertyId: string;
  userId: string;
  estimatedValue: number;
  priceMin: number;
  priceMax: number;
  fastSalePrice: number;
  maxProfitPrice: number;
  avgPricePerSqm: number;
  confidenceIndex: number;
  valueYear1: number;
  valueYear3: number;
  valueYear5: number;
  positiveFactors: string[];
  negativeFactors: string[];
  improvementSuggestions: string[];
  comparableProperties: ComparableProperty[];
  createdAt: number;
  property?: PropertyDoc | null;
}

export interface PropertyDoc {
  _id: string;
  _creationTime: number;
  address?: string;
  gouvernorat: string;
  ville: string;
  quartier: string;
  latitude?: number;
  longitude?: number;
  propertyType: string;
  terrainSurface?: number;
  builtSurface: number;
  floors?: number;
  bedrooms?: number;
  bathrooms?: number;
  kitchens?: number;
  livingRooms?: number;
  garages?: number;
  hasGarden: boolean;
  hasPool: boolean;
  hasTerrace: boolean;
  hasBalcony: boolean;
  hasElevator: boolean;
  hasParking: boolean;
  hasAC: boolean;
  hasHeating: boolean;
  hasSolar: boolean;
  yearBuilt?: number;
  generalState: string;
  estimatedValue?: number;
  priceMin?: number;
  priceMax?: number;
  confidenceIndex?: number;
  avgPricePerSqm?: number;
  published: boolean;
  createdAt: number;
  updatedAt: number;
}

/* ═══ MODULE LOCATION ═══ */

export type RentFinishLevel = "economique" | "standard" | "premium" | "luxe";

export interface RentPropertyInput {
  address?: string;
  gouvernorat?: string;
  ville?: string;
  quartier?: string;
  latitude?: number;
  longitude?: number;
  propertyType?: string;
  builtSurface?: number;
  terrainSurface?: number;
  bedrooms?: number;
  bathrooms?: number;
  kitchens?: number;
  livingRooms?: number;
  garages?: number;
  floor?: number;
  floors?: number;
  hasGarden?: boolean;
  hasPool?: boolean;
  hasTerrace?: boolean;
  hasBalcony?: boolean;
  hasElevator?: boolean;
  hasParking?: boolean;
  hasAC?: boolean;
  hasHeating?: boolean;
  hasSolar?: boolean;
  hasFiber?: boolean;
  hasInternet?: boolean;
  hasCameras?: boolean;
  hasSmartHome?: boolean;
  hasEquippedKitchen?: boolean;
  isFurnished?: boolean;
  yearBuilt?: number;
  generalState?: string;
  finishLevel?: RentFinishLevel;
  /** mensuel (longue durée) | nuitée (courte durée / tourisme) */
  estimationMode?: "mensuel" | "nuitée";
  /** Profil de zone : détection automatique si non renseigné */
  zoneType?: RentZoneType;
  /** Proximités valorisantes pour la location courte durée */
  nearBeach?: boolean;
  nearClinic?: boolean;
  nearHospital?: boolean;
  nearUniversity?: boolean;
  nearMall?: boolean;
  nearTransport?: boolean;
}

export type RentZoneType =
  | "touristique"
  | "urbain"
  | "residentiel"
  | "universitaire"
  | "commercial";

export interface RentZoneProfile {
  type: RentZoneType;
  label: string;
  detected: boolean;
  multiplier: number;
  nearby: string[];
}

export interface RentNightlySeason {
  key: "haute" | "moyenne" | "basse";
  label: string;
  months: string;
  nights: number;
  pricePerNight: number;
  occupancyRate: number;
  revenue: number;
  revenueShare: number;
  isBest: boolean;
  tip: string;
}

export interface RentNightlyEstimate {
  nightlyRent: number;
  nightlyMin: number;
  nightlyMax: number;
  occupancyRate: number;
  weeklyEstimate: number;
  monthlyEstimate: number;
  annualRevenue: number;
  nightlyYield: number;
  multiplier: number;
  seasons: RentNightlySeason[];
}

export type RentLevel = "tres_faible" | "faible" | "moyen" | "eleve" | "tres_eleve";

export interface RentForecastPoint {
  label: string;
  months: number;
  rent: number;
}

export interface RentForecastSummary {
  trend: "hausse" | "stabilite" | "baisse";
  change6m: number;
  change12m: number;
  change24m: number;
  confidence: number;
  message: string;
}

export interface RentComparable {
  id: string;
  type: string;
  surface: number;
  quartier: string;
  rent: number;
  rentPerSqm: number;
  distance: string;
  furnished?: boolean;
}

export interface RentMarketAverage {
  gouvernorat: number;
  ville: number;
  quartier: number;
  typeRatio: number;
  level: RentLevel;
}

export interface RentAdvisorQa {
  q: string;
  a: string;
}

export interface RentEstimationResult {
  estimatedRent: number;
  rentMin: number;
  rentMax: number;
  rentPerSqm: number;
  confidenceIndex: number;
  avgRentalDurationMonths: number;
  annualRent: number;
  grossYield: number;
  saleValue: number;
  forecast: RentForecastPoint[];
  forecastSummary: RentForecastSummary;
  marketAverages: RentMarketAverage;
  comparableRentals: RentComparable[];
  positiveFactors: string[];
  negativeFactors: string[];
  improvementSuggestions: string[];
  advisor: { questions: RentAdvisorQa[] };
  zoneProfile?: RentZoneProfile;
  nightly?: RentNightlyEstimate;
}

/** Document `rentEstimations`. */
export interface RentEstimationDoc {
  _id: string;
  _creationTime: number;
  userId: string;
  property: RentPropertyInput;
  estimatedRent: number;
  rentMin: number;
  rentMax: number;
  rentPerSqm: number;
  confidenceIndex: number;
  avgRentalDurationMonths: number;
  annualRent: number;
  grossYield: number;
  saleValue: number;
  forecast: RentForecastPoint[];
  forecastSummary: RentForecastSummary;
  marketAverages: RentMarketAverage;
  comparableRentals: RentComparable[];
  positiveFactors: string[];
  negativeFactors: string[];
  improvementSuggestions: string[];
  advisor: { questions: RentAdvisorQa[] };
  createdAt: number;
}

/* ═══ QUOTAS / ABONNEMENT ═══ */

export interface RemainingEstimations {
  canEstimate: boolean;
  remaining: number;
  planType: string | null;
  reason: string | null;
  estimationsLimit: number;
}

export interface SubscriptionDoc {
  _id: string;
  planType: string;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  estimationsLimit: number;
  estimationsUsed: number;
  quotaMonth?: string;
  endDate?: number;
  trialEndDate?: number;
}

/* ═══ UTILISATEUR ═══ */

export interface CurrentUser {
  _id: string;
  name?: string;
  image?: string;
  email?: string;
  phone?: string;
  role?: string;
}

/* ═══ MESSAGES ═══ */

export interface InboxMessage {
  _id: string;
  direction: "in" | "out";
  type: string;
  subject?: string;
  content: string;
  senderName?: string;
  readAt?: number;
  createdAt: number;
  agency?: {
    name: string;
    logoUrl?: string | null;
    phone?: string;
    email?: string;
    address?: string;
  } | null;
  estimation?: {
    estimatedValue?: number | null;
    fastSalePrice?: number | null;
    maxProfitPrice?: number | null;
    confidenceIndex?: number | null;
    propertyType?: string | null;
    gouvernorat?: string | null;
    ville?: string | null;
  } | null;
}
