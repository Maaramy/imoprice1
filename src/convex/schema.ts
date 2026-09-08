import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

// Property types supported by the platform
const propertyTypeValidator = v.union(
  v.literal("maison"),
  v.literal("villa"),
  v.literal("appartement"),
  v.literal("studio"),
  v.literal("duplex"),
  v.literal("immeuble"),
  v.literal("local_commercial"),
  v.literal("bureau"),
  v.literal("magasin"),
  v.literal("restaurant"),
  v.literal("cafe"),
  v.literal("entrepot"),
  v.literal("atelier"),
  v.literal("terrain_constructible"),
  v.literal("terrain_agricole"),
  v.literal("ferme"),
  v.literal("garage"),
  v.literal("parking"),
  v.literal("depot"),
  v.literal("mixte"),
);
export type PropertyType = Infer<typeof propertyTypeValidator>;

const propertyStateValidator = v.union(
  v.literal("a_renover"),
  v.literal("bon_etat"),
  v.literal("excellent_etat"),
  v.literal("luxe"),
);
export type PropertyState = Infer<typeof propertyStateValidator>;

export const PROPERTY_TYPES: PropertyType[] = [
  "maison", "villa", "appartement", "studio", "duplex",
  "immeuble", "local_commercial", "bureau", "magasin",
  "restaurant", "cafe", "entrepot", "atelier",
  "terrain_constructible", "terrain_agricole", "ferme",
  "garage", "parking", "depot", "mixte",
];

export const PROPERTY_TYPES_LABELS: Record<PropertyType, string> = {
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

export const PROPERTY_STATES = ["a_renover", "bon_etat", "excellent_etat", "luxe"] as const;
export const PROPERTY_STATES_LABELS: Record<string, string> = {
  a_renover: "À rénover",
  bon_etat: "Bon état",
  excellent_etat: "Excellent état",
  luxe: "Luxe",
};

export const TUNISIAN_GOUVERNORATS = [
  "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul",
  "Zaghouan", "Bizerte", "Béja", "Jendouba", "Kef",
  "Siliana", "Sousse", "Monastir", "Mahdia", "Sfax",
  "Kairouan", "Kasserine", "Sidi Bouzid", "Gabès", "Médenine",
  "Tataouine", "Gafsa", "Tozeur", "Kébili",
] as const;

// Professional partner types
const partnerTypeValidator = v.union(
  v.literal("agence"),
  v.literal("expert"),
  v.literal("notaire"),
  v.literal("geometre"),
  v.literal("architecte"),
  v.literal("renovation"),
  v.literal("photographe"),
);

export const PARTNER_TYPES_LABELS: Record<string, string> = {
  agence: "Agence immobilière",
  expert: "Expert immobilier",
  notaire: "Notaire",
  geometre: "Géomètre",
  architecte: "Architecte",
  renovation: "Entreprise de rénovation",
  photographe: "Photographe immobilier",
};

// Agency specialties + regions are defined in ./types (pure data, no imports)
// so they can be imported from the browser without pulling in convex/server.
export { AGENCY_SPECIALTIES, TUNISIA_REGIONS } from "./types";

const agencySpecialtyValidator = v.union(
  v.literal("résidentiel"),
  v.literal("commercial"),
  v.literal("terrain"),
  v.literal("luxe"),
  v.literal("location"),
  v.literal("investissement"),
);

const schema = defineSchema(
  {
    ...authTables,

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
    }).index("email", ["email"]),

    // Properties – the core entity representing a real estate asset
    properties: defineTable({
      userId: v.id("users"),

      // Location
      address: v.optional(v.string()),
      gouvernorat: v.string(),
      ville: v.string(),
      quartier: v.string(),
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),

      // Type
      propertyType: propertyTypeValidator,

      // Dimensions
      terrainSurface: v.optional(v.number()),
      builtSurface: v.number(),
      floors: v.optional(v.number()),

      // Rooms
      bedrooms: v.optional(v.number()),
      bathrooms: v.optional(v.number()),
      kitchens: v.optional(v.number()),
      livingRooms: v.optional(v.number()),
      garages: v.optional(v.number()),

      // Features
      hasGarden: v.boolean(),
      hasPool: v.boolean(),
      hasTerrace: v.boolean(),
      hasBalcony: v.boolean(),
      hasElevator: v.boolean(),
      hasParking: v.boolean(),
      hasAC: v.boolean(),
      hasHeating: v.boolean(),
      hasSolar: v.boolean(),

      // Construction
      yearBuilt: v.optional(v.number()),
      generalState: propertyStateValidator,

      // Document storage IDs
      photoIds: v.optional(v.array(v.string())),
      videoUrl: v.optional(v.string()),
      architecturalPlanId: v.optional(v.string()),
      deedId: v.optional(v.string()),
      cadastralPlanId: v.optional(v.string()),
      certificateId: v.optional(v.string()),

      // Estimation results (filled after AI analysis)
      estimatedValue: v.optional(v.number()),
      priceMin: v.optional(v.number()),
      priceMax: v.optional(v.number()),
      fastSalePrice: v.optional(v.number()),
      maxProfitPrice: v.optional(v.number()),
      confidenceIndex: v.optional(v.number()),
      avgPricePerSqm: v.optional(v.number()),

      // Publishing
      published: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),

      // Valeur estimée au fil du temps (chaque (re)estimation ajoute un point)
      valuationHistory: v.optional(
        v.array(v.object({ value: v.number(), createdAt: v.number() })),
      ),
    })
      .index("by_user", ["userId"])
      .index("by_published", ["published"])
      .index("by_gouvernorat", ["gouvernorat"]),

    // Estimation results (keeps historical record)
    estimations: defineTable({
      propertyId: v.id("properties"),
      userId: v.id("users"),

      estimatedValue: v.number(),
      priceMin: v.number(),
      priceMax: v.number(),
      fastSalePrice: v.number(),
      maxProfitPrice: v.number(),
      avgPricePerSqm: v.number(),
      confidenceIndex: v.number(),

      // Yearly projections
      valueYear1: v.number(),
      valueYear3: v.number(),
      valueYear5: v.number(),

      // Analysis
      positiveFactors: v.array(v.string()),
      negativeFactors: v.array(v.string()),
      improvementSuggestions: v.array(v.string()),

      // Comparable properties data
      comparableProperties: v.any(),

      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_property", ["propertyId"]),

    // Rent estimations — « Estimation des loyers par IA »
    // Each doc stores a snapshot of the rental property + the full AI result.
    rentEstimations: defineTable({
      userId: v.id("users"),
      // Snapshot of the property used for the estimation
      property: v.any(),

      estimatedRent: v.number(),
      rentMin: v.number(),
      rentMax: v.number(),
      rentPerSqm: v.number(),
      confidenceIndex: v.number(),
      avgRentalDurationMonths: v.number(),
      annualRent: v.number(),
      grossYield: v.number(),
      saleValue: v.number(),

      forecast: v.any(),
      forecastSummary: v.any(),
      marketAverages: v.any(),
      comparableRentals: v.any(),

      positiveFactors: v.array(v.string()),
      negativeFactors: v.array(v.string()),
      improvementSuggestions: v.array(v.string()),
      advisor: v.any(),

      // Location courte durée (par nuitée) — profil de zone + estimation
      zoneProfile: v.optional(v.any()),
      nightly: v.optional(v.any()),

      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_created", ["userId", "createdAt"]),

    // Professional partners directory
    professionalPartners: defineTable({
      userId: v.optional(v.id("users")),
      name: v.string(),
      type: partnerTypeValidator,
      specialties: v.optional(v.array(v.string())),
      regions: v.array(v.string()),
      address: v.string(),
      phone: v.string(),
      email: v.string(),
      website: v.optional(v.string()),
      description: v.string(),
      rating: v.optional(v.number()),
      logoUrl: v.optional(v.string()),
      isSubscribed: v.boolean(),
    })
      .index("by_type", ["type"])
      .index("by_region", ["regions"]),

    // Published property listings for buyers
    listings: defineTable({
      propertyId: v.id("properties"),
      userId: v.id("users"),
      title: v.string(),
      description: v.string(),
      price: v.number(),
      status: v.union(
        v.literal("active"),
        v.literal("sold"),
        v.literal("withdrawn"),
      ),
      contactEmail: v.string(),
      contactPhone: v.optional(v.string()),
      publishedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["status"]),

    // Agency requests - users send their estimation (vente OU location) to an agency
    agencyRequests: defineTable({
      // Estimation vente/achat (optionnel : les demandes de location n'ont pas de doc property)
      estimationId: v.optional(v.id("estimations")),
      propertyId: v.optional(v.id("properties")),
      // Estimation de loyer (mensuel / nuitée)
      rentEstimationId: v.optional(v.id("rentEstimations")),
      userId: v.id("users"),
      agencyPartnerId: v.id("professionalPartners"),
      userName: v.string(),
      userEmail: v.string(),
      userPhone: v.optional(v.string()),
      message: v.optional(v.string()),
      // Price scenario the user chose to share: optimiste | realiste | vente_rapide
      priceScenario: v.optional(
        v.union(v.literal("optimiste"), v.literal("realiste"), v.literal("vente_rapide")),
      ),
      // Rent price scenario the user chose to share: prudent | realiste | optimiste
      rentPriceScenario: v.optional(
        v.union(v.literal("prudent"), v.literal("realiste"), v.literal("optimiste")),
      ),
      // Besoin / intention du client dans la relation avec l'agence :
      // vendeur | acheteur (estimation vente/achat), bailleur | locataire (estimation location)
      clientNeed: v.optional(
        v.union(v.literal("vendeur"), v.literal("acheteur"), v.literal("bailleur"), v.literal("locataire")),
      ),
      // Agency's counter-offer back to the user
      suggestedPrice: v.optional(v.number()),
      agencyMessage: v.optional(v.string()),
      suggestedAt: v.optional(v.number()),
      status: v.union(
        v.literal("pending"),
        v.literal("read"),
        v.literal("contacted"),
        v.literal("suggested"),
      ),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_agency", ["agencyPartnerId"])
      .index("by_agency_status", ["agencyPartnerId", "status"]),

    // User inbox — messages received from agencies (suggested prices, status updates)
    // and replies sent by the user to an agency.
    messages: defineTable({
      userId: v.id("users"),
      agencyPartnerId: v.optional(v.id("professionalPartners")),
      requestId: v.optional(v.id("agencyRequests")),
      // in = received by the user · out = sent by the user (visible to the agency)
      direction: v.union(v.literal("in"), v.literal("out")),
      type: v.union(
        v.literal("suggest_price"),
        v.literal("status"),
        v.literal("message"),
        v.literal("system"),
      ),
      subject: v.optional(v.string()),
      content: v.string(),
      senderName: v.optional(v.string()),
      senderLogo: v.optional(v.string()),
      suggestedPrice: v.optional(v.number()),
      readAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_read", ["userId", "readAt"])
      .index("by_request", ["requestId"]),

    // Shared reports (for secure link sharing)
    sharedReports: defineTable({
      estimationId: v.id("estimations"),
      propertyId: v.id("properties"),
      userId: v.id("users"),
      token: v.string(),
      createdAt: v.number(),
      expiresAt: v.optional(v.number()),
    })
      .index("by_token", ["token"])
      .index("by_user", ["userId"]),

    // Alertes prix du marché — l'utilisateur surveille le prix / m² d'un
    // gouvernorat/type ; le cron quotidien déclenche l'alerte au franchissement.
    priceAlerts: defineTable({
      userId: v.id("users"),
      gouvernorat: v.string(),
      propertyType: v.optional(v.string()),
      // above = m'avertir si le prix dépasse · below = m'avertir si le prix baisse
      direction: v.union(v.literal("above"), v.literal("below")),
      // Prix cible exprimé en TND / m²
      targetPrice: v.number(),
      // Prix / m² du marché au moment de la création
      basePriceAtCreation: v.number(),
      triggered: v.boolean(),
      triggeredAt: v.optional(v.number()),
      lastCheckedAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_triggered", ["triggered"])
      .index("by_user_triggered", ["userId", "triggered"]),

    // Site-wide configuration (bank details, D17, plan overrides, market config)
    // Single document with key "main"
    siteSettings: defineTable({
      key: v.string(),
      bankDetails: v.optional(
        v.object({
          beneficiary: v.string(),
          bank: v.string(),
          agency: v.string(),
          rib: v.string(),
          swift: v.string(),
          reason: v.string(),
        }),
      ),
      d17Details: v.optional(
        v.object({
          beneficiary: v.string(),
          ccp: v.string(),
          center: v.string(),
          reason: v.string(),
        }),
      ),
      // Optional per-plan price/limit/trial overrides
      planOverrides: v.optional(v.any()),
      // Optional estimation engine overrides (market prices, multipliers)
      marketConfig: v.optional(v.any()),
      updatedAt: v.number(),
    }).index("by_key", ["key"]),

    // User subscriptions / plans
    subscriptions: defineTable({
      userId: v.id("users"),
      planType: v.union(
        v.literal("start"),
        v.literal("pro"),
        v.literal("expert"),
        v.literal("agence"),
      ),
      status: v.union(
        v.literal("active"),
        v.literal("expired"),
        v.literal("cancelled"),
      ),
      startDate: v.number(),
      endDate: v.optional(v.number()),
      estimationsUsed: v.number(),
      estimationsLimit: v.number(),
      trialEndDate: v.optional(v.number()),
      // Month key ("YYYY-MM", UTC) the current estimationsUsed counter belongs to.
      // Used to reset the monthly estimation quota automatically.
      quotaMonth: v.optional(v.string()),
      paymentStatus: v.union(
        v.literal("pending"),
        v.literal("paid"),
        v.literal("free"),
      ),
      // Payment method used: simulation (demo), bank transfer (virement) or D17 (Poste Tunisie)
      paymentMethod: v.optional(
        v.union(
          v.literal("simulation"),
          v.literal("virement"),
          v.literal("d17"),
        ),
      ),
      // Optional user-provided payment reference (bank transfer ref / D17 voucher number)
      paymentRef: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["status"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
