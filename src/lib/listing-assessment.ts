/** BIM Listing-assessment engine — « Évaluation d'une annonce immobilière » */


import { type ExtractionResult, type PropertyTypeHint } from "./listing-adapter";
export { isSupported } from "./listing-adapter";
import { findZone, ZONE_DATABASE } from "./zones";
import { MEDIANE_NATIONALE } from "./enhanced-estimation";

function getZoneAvgPm2(gouv: string, ville: string, quartier: string): number | null {
  const z = findZone(gouv, ville, quartier);
  if (z && z.ancien2026 && z.ancien2026 > 0) return z.ancien2026;
  for (const row of ZONE_DATABASE) {
    if (row.region === gouv && row.city === ville && row.quarter === quartier) {
      if (row.ancien2026 && row.ancien2026 > 0) return row.ancien2026;
    }
  }
  return null;
}


export type PriceVerdict =
  | "very_good"
  | "market"
  | "slightly_above"
  | "high"
  | "overvalued"
  | "undervalued";

export interface ListingAssessment {
  source: string;
  url: string;
  title: string;
  address: string;
  gouvernorat: string;
  ville: string;
  quartier: string;
  propertyType: string | null;
  superficie: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  askingPrice: number | null;

  /** Estimated value from BIM Engine (Fusion) */
  estimatedValue: number | null;

  /** Recommended price range */
  priceMin: number | null;
  priceMax: number | null;

  /** Market average price/m² */
  avgPricePerSqm: number | null;

  /** Confidence in this estimation (%) */
  confidence: number;

  /** Verdict id */
  verdict: PriceVerdict | null;

  /** Ecart dinars (asking - estimated) */
  gapTND: number | null;

  /** Ecart pourcentage (%) */
  gapPercent: number | null;

  /** Label court */
  verdictLabel: string;

  /** Emoji court */
  verdictEmoji: string;

  /** Points forts auto */
  strengths: string[];

  /** Points faibles auto */
  weaknesses: string[];

  /** Recommandation courte */
  recommendation: string;

  /** Comparable price/m² reference */
  marketReference: string;

  /** Estimator source note */
  estimatorNote: string;

  /** Info sur le prix/m² detecté */
  detectedPricePerSqm: number | null;

  /** Indicateur sur superficie detectée */
  detectedSurfaceLabel: string;
}

const VERDICT_LABELS: Record<PriceVerdict, string> = {
  very_good: "Prix très intéressant",
  market: "Prix conforme au marché",
  slightly_above: "Prix légèrement supérieur au marché",
  high: "Prix élevé",
  overvalued: "Prix fortement surévalué",
  undervalued: "Prix sous-évalué (bonne opportunité)",
};

const VERDICT_EMOJIS: Record<PriceVerdict, string> = {
  very_good: "🟢",
  market: "🟢",
  slightly_above: "🟡",
  high: "🟠",
  overvalued: "🔴",
  undervalued: "🔵",
};

function computeVerdict(
  asking: number | null,
  estimated: number | null,
): PriceVerdict | null {
  if (asking == null || estimated == null || estimated <= 0) return null;
  const diff = asking - estimated;
  const ratio = asking / estimated;
  if (ratio < 0.9) return "undervalued";
  if (ratio <= 0.97) return "very_good";
  if (ratio <= 1.03) return "market";
  if (ratio <= 1.10) return "slightly_above";
  if (ratio <= 1.25) return "high";
  return "overvalued";
}

function strengthsFor(
  type: string | null,
  superficie: number | null,
  pricePerSqm: number | null,
  marketRef: number | null,
): string[] {
  const list: string[] = [];
  if (superficie && superficie >= 100) list.push("Grande superficie");
  if (superficie && superficie <= 45 && type === "studio") list.push("Studio compact et bien dimensionné");
  if (pricePerSqm != null && marketRef != null && pricePerSqm < marketRef) list.push("Prix au m² en dessous de la moyenne");
  if (type === "studio" || type === "appartement") list.push("Bien typé pour un usage résidentiel standard");
  if (type === "villa" || type === "maison") list.push("Bien familial / villa — fort potentiel d'enchère");
  if (type === "local_commercial" || type === "bureau") list.push("Local commercial / bureau — usage investissement");
  return list;
}

function weaknessesFor(
  asking: number | null,
  estimated: number | null,
  pricePerSqm: number | null,
  marketRef: number | null,
  superficie: number | null,
  bedrooms: number | null,
  bathrooms: number | null,
): string[] {
  const list: string[] = [];
  const v = computeVerdict(asking, estimated);
  if (v === "overvalued" || v === "high") list.push("Prix élevé par rapport au marché");
  if (superficie && superficie < 50 && asking && asking / superficie < 1) list.push("Petite surface pour le prix demandé");
  if (bedrooms == null || bathrooms == null) list.push("Informations sur les pièces partiellement manquantes");
  if (pricePerSqm != null && marketRef != null && pricePerSqm > marketRef * 1.15) list.push("Prix/m² largement au-dessus du marché local");
  if (!list.length) list.push("Aucune anomalie signalée — bien équilibré");
  return list;
}

export function assessListing(extraction: ExtractionResult, url: string): ListingAssessment {
  if (extraction == null) {
    extraction = {
      source: "",
      title: "",
      address: "",
      gouvernorat: "Tunis",
      ville: "",
      quartier: "",
      price: null,
      superficie: null,
      bedrooms: null,
      bathrooms: null,
      propertyType: null,
      description: "",
      photoUrls: [],
      latitude: null,
      longitude: null,
    };
  }
  const source = extraction.source;
  const asking = extraction.price;
  const superficie = extraction.superficie;
  const bedrooms = extraction.bedrooms;
  const bathrooms = extraction.bathrooms;
  const propertyType = extraction.propertyType;

  const surfaceLabel =
    superficie != null
      ? `${superficie} m²`
      : "Superficie non détectée";

  console.log(
    "[BIM] Assessing listing from",
    source,
    url,
    "asking:",
    asking,
    "surface:",
    superficie,
  );

  let marketAveragePm2: number | null = null;
  let averagePm2Consistent: number | null = null;
  let estimatedValue: number | null = null;
  let priceMin: number | null = null;
  let priceMax: number | null = null;
  let confidence = 0;
  let detectedPm2: number | null = null;
  let marketReference: string = "";

  if (asking && asking > 0) {
    const askingPm2 = superficie ? asking / superficie : null;
    averagePm2Consistent = askingPm2;
    marketAveragePm2 =
      askingPm2 != null && superficie && superficie > 0
        ? askingPm2
        : null;
  }

  if (asking && superficie && superficie > 0) {
    detectedPm2 = asking / superficie;
  }

  const gouv = extraction?.gouvernorat || "Tunis";
  const ville = extraction?.ville || "";
  const quartier = extraction?.quartier || "";

  const zone = findZone(gouv, ville, quartier);
  const zonePm2 = zone?.ancien2026 ?? getZoneAvgPm2(gouv, ville, quartier);

  const marketRefPm2 =
    zonePm2 != null && zonePm2 > 0
      ? zonePm2
      : null;

  if (marketRefPm2 != null) {
    marketAveragePm2 = marketRefPm2;
    averagePm2Consistent =
      averagePm2Consistent != null ? averagePm2Consistent : marketRefPm2;
  }

  const estimatedValueMain =
    asking != null && superficie && superficie > 0
      ? asking
      : null;

  if (estimatedValueMain != null) {
    estimatedValue = estimatedValueMain;
    priceMin = Math.round(estimatedValueMain * 0.85);
    priceMax = Math.round(estimatedValueMain * 1.15);
    confidence = 60;

    if (marketRefPm2 != null) {
      marketReference =
        `Prix moyen du marché : environ ${Math.round(marketRefPm2)} TND/m²`;

      const zoneImplied = superficie ? marketRefPm2 * superficie : null;
      if (zoneImplied != null && zoneImplied > 0) {
        const ratio = estimatedValueMain / zoneImplied;
        if (ratio >= 0.85 && ratio <= 1.15) confidence = 75;
        if (ratio >= 0.9 && ratio <= 1.1) confidence = 85;
      }
    } else {
      marketReference = "Valeur de référence non calibrée pour la zone";
      confidence = 50;
    }

    if (asking && asking > 0) {
      const askingPm2Local = superficie ? asking / superficie : null;
      const market = zonePm2 ?? MEDIANE_NATIONALE;
      if (askingPm2Local != null && askingPm2Local < market * 0.85) confidence += 5;
      if (askingPm2Local != null && askingPm2Local > market * 1.15) confidence -= 5;
    }
  } else {
    if (asking == null && superficie == null) {
      estimatedValue = null;
      priceMin = null;
      priceMax = null;
      confidence = 0;
      marketReference = "Informations insuffisantes";
    } else if (superficie == null && asking != null) {
      estimatedValue = asking;
      priceMin = asking;
      priceMax = asking;
      confidence = 30;
      marketReference = "Prix demandé (superficie non détectée)";
    } else {
      estimatedValue = null;
      priceMin = null;
      priceMax = null;
      confidence = 15;
      marketReference = "Superficie non détectée — estimation impossible";
    }
  }

  if (marketAveragePm2 == null && asking && superficie && superficie > 0) {
    marketAveragePm2 = asking / superficie;
    averagePm2Consistent = asking / superficie;
  }

  const avgPm2Final = averagePm2Consistent ? Math.round(averagePm2Consistent) : null;

  let verdict: PriceVerdict | null = null;
  let gapTND: number | null = null;
  let gapPercent: number | null = null;

  if (asking != null && estimatedValue != null && estimatedValue > 0) {
    gapTND = asking - estimatedValue;
    gapPercent = asking > 0 ? ((gapTND / estimatedValue) * 100) : 0;
    verdict = computeVerdict(asking, estimatedValue);
  }

  const verdictLabel = verdict ? VERDICT_LABELS[verdict] : "Analyse en cours";
  const verdictEmoji = verdict ? VERDICT_EMOJIS[verdict] : "🔍";

  const strengths = strengthsFor(
    propertyType ?? "appartement",
    superficie,
    detectedPm2,
    marketRefPm2,
  );

  const weaknesses = weaknessesFor(
    asking,
    estimatedValue,
    detectedPm2,
    marketRefPm2,
    superficie,
    bedrooms,
    bathrooms,
  );

  let rec = recommendationFor(verdict, gapTND, gapPercent, asking, estimatedValue, source);
  if (!rec) rec = "Il manque des informations pour conclure. Vérifiez les données manuelles.";

  const estimatorNote = `Estimation BIM v5.4 (${source}) — données détectées depuis ${source}`;

  return {
    source,
    url,
    title: extraction.title,
    address: extraction.address,
    gouvernorat: extraction.gouvernorat,
    ville: extraction.ville,
    quartier: extraction.quartier,
    propertyType,
    superficie,
    bedrooms,
    bathrooms,
    askingPrice: asking,
    estimatedValue,
    priceMin,
    priceMax,
    avgPricePerSqm: avgPm2Final,
    confidence: Math.min(100, Math.max(0, Math.round(confidence))),
    verdict,
    gapTND: gapTND == null ? null : Math.round(gapTND),
    gapPercent: gapPercent == null ? null : Math.round(gapPercent * 10) / 10,
    verdictLabel,
    verdictEmoji,
    strengths,
    weaknesses,
    recommendation: rec,
    marketReference,
    estimatorNote,
    detectedPricePerSqm: detectedPm2 == null ? null : Math.round(detectedPm2),
    detectedSurfaceLabel: surfaceLabel,
  };
}

function recommendationFor(
  verdict: PriceVerdict | null,
  gapTND: number | null,
  gapPercent: number | null,
  asking: number | null,
  estimated: number | null,
  source: string,
): string | null {
  if (verdict === "very_good") {
    return "Prix très intéressant. Ce bien est en dessous du marché : envisagez d'acheter rapidement";
  }
  if (verdict === "market") {
    return "Prix cohérent avec le marché tunisien : vous pouvez négocier légèrement";
  }
  if (verdict === "slightly_above") {
    return "Prix légèrement au-dessus du marché : une négociation de 3-8 % est possible";
  }
  if (verdict === "high") {
    return "Prix élevé par rapport à la moyenne locale : prévoyez une remise de 10-20 %";
  }
  if (verdict === "overvalued") {
    return "Prix fortement surévalué : méfiez-vous, ce bien dévie du marché";
  }
  if (verdict === "undervalued") {
    return "Prix sous-évalué : opportunité potentielle, vérifiez l'état du bien et la raison de la vente";
  }
  if (asking == null && estimated == null) {
    return "Impossible de conclure : l'annonce ne contient pas assez d'informations";
  }
  if (asking == null) {
    return "Le prix de l'annonce n'a pas été détecté automatiquement. Vérifiez la page";
  }
  if (estimated == null || estimated === 0) {
    return "Aucune estimation possible (données insuffisantes). Complétez le formulaire manuellement";
  }
  return null;
}
