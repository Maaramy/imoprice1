/** Listing URL adapter — moteur « Évaluation d'une annonce immobilière » (BIM) */

export type ExtractionResult =
  | null
  | {
      source: string;
      title: string;
      address: string;
      gouvernorat: string;
      ville: string;
      quartier: string;
      price: number | null;
      superficie: number | null;
      bedrooms: number | null;
      bathrooms: number | null;
      propertyType: string | null;
      description: string;
      photoUrls: string[];
      latitude: number | null;
      longitude: number | null;
    };

export type PropertyTypeHint =
  | "appartement"
  | "studio"
  | "maison"
  | "villa"
  | "duplex"
  | "immeuble"
  | "local_commercial"
  | "bureau"
  | "magasin"
  | "terrain_constructible";

export function detectDomain(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host;
  } catch {
    return null;
  }
}

/** Vrai si l'annonce provient d'un portail immobilier pris en charge. */
export function isSupported(url: string): boolean {
  const host = detectDomain(url);
  if (!host) return false;
  return SUPPORTED_DOMAINS.some((domain) => {
    const bare = domain.replace(/^www\./, "");
    return host === bare || host.endsWith('.' + bare);
  });
}

const MUBABAB_DOMAIN = "mubawab.tn";
const TAYARA_DOMAIN = "tayara.tn";
const TECNOCASA_DOMAIN = "tecnocasa.tn";
const REMAX_DOMAIN = "remax.tn";
const JUMIA_IMMO_DOMAIN = "immobilier.jumia.tn";

export const SUPPORTED_DOMAINS = [
  MUBABAB_DOMAIN,
  TAYARA_DOMAIN,
  TECNOCASA_DOMAIN,
  REMAX_DOMAIN,
  JUMIA_IMMO_DOMAIN,
  "www.mubawab.tn",
  "www.tayara.tn",
  "www.tecnocasa.tn",
  "www.remax.tn",
  "www.immobilier.jumia.tn",
] as const;


function parseDir(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = value.match(/(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 && n < 1000 ? n : null;
}

function parsePrice(value: string | null | undefined): number | null {
  if (!value) return null;
  const cleaned = value
    .replace(/^[\s\u00A0]+/g, "")
    .replace(/,/g, ".")
    .replace(/DT\s*$/i, "")
    .trim();
  const m = cleaned.match(/[-+]?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 500 ? n : null;
}

export function extractFromMubawab(html: string, url: string): ExtractionResult {
  if (!html) return null;

  const doc = parseHtml(html);
  if (!doc) return null;

  const title =
    firstNodeText(doc, "meta[name=description]") ||
    firstNodeText(doc, "h1") ||
    firstNodeText(doc, "title") ||
    "";

  const desc = firstNodeText(doc, "meta[name=description]") || "";

  const rawPrice = firstNodeTextBySel(
    doc,
    '[id^="prix" i], [class*="prix" i], [itemprop="price"]',
  );
  const price =
    parsePrice(rawPrice) ??
    (() => {
      const lines = collectTextBySel(doc, ".details, .annonce-details, [class*='details']");
      for (const line of lines) {
        const p = parsePrice(line);
        if (p) return p;
      }
      return null;
    })();

  const rawSurface = firstNodeTextBySel(
    doc,
    '[class*="superficie" i], [class*="surface" i], [itemprop="floorSize"], [itemprop="area"]',
  );
  const superficie =
    parseSurface(rawSurface) ??
    (() => {
      const lines = collectTextBySel(
        doc,
        ".details, .annonce-details, [class*='details'], [class*='caracteristiques']",
      );
      for (const line of lines) {
        const s = parseSurface(line);
        if (s) return s;
      }
      return null;
    })();

  const rawBedrooms =
    firstNodeTextBySel(doc, '[class*="chambre" i], [itemprop="bedrooms"]') ||
    firstNodeTextBySel(doc, "[class*='chambres' i]") ||
    "";
  const bedrooms = parseDir(rawBedrooms);

  const rawBathrooms =
    firstNodeTextBySel(doc, '[class*="salle" i], [itemprop="bathrooms"]') ||
    "";
  const bathrooms = parseDir(rawBathrooms);

  const metaGouv =
    firstNodeText(doc, 'meta[name="mubawab:gouvernorat"]') ||
    firstNodeText(doc, 'meta[property="mubawab:gouvernorat"]') ||
    "";
  const metaVille =
    firstNodeText(doc, 'meta[name="mubawab:ville"]') ||
    firstNodeText(doc, 'meta[property="mubawab:ville"]') ||
    "";

  let gouvernorat = metaGouv || "Tunis";
  let ville = metaVille || "";

  const address =
    firstNodeText(doc, "meta[property='og:street-address']") ||
    firstNodeText(doc, "[class*='adresse' i]") ||
    "";

  if (!ville && address) {
    const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) ville = parts[1];
    if (parts.length >= 1 && !ville) ville = parts[0];
  }

  if (!ville && gouvernorat) ville = gouvernorat;

  let quartier = firstNodeTextBySel(
    doc,
    "[class*='quartier' i], [class*='ville' i], [itemprop='addressLocality']",
  ) || "";

  if (!quartier && ville) quartier = ville;

  const photos = extractPhotoUrls(doc);

  return {
    source: MUBABAB_DOMAIN,
    title: cleanTitle(title),
    address: cleanText(address || gouvernorat + (ville ? ", " + ville : "") || desc),
    gouvernorat: trimFloors(gouvernorat),
    ville: trimFloors(ville || gouvernorat),
    quartier: trimFloors(quartier),
    price,
    superficie,
    bedrooms,
    bathrooms,
    propertyType: null,
    description: desc,
    photoUrls: photos,
    latitude: null,
    longitude: null,
  };
}

export function extractFromTayara(html: string, url: string): ExtractionResult {
  if (!html) return null;
  const doc = parseHtml(html);
  if (!doc) return null;

  const title =
    firstNodeText(doc, "meta[name=description]") ||
    firstNodeText(doc, "h1") ||
    firstNodeText(doc, "title") ||
    "";

  const desc = firstNodeText(doc, "meta[name=description]") || "";

  const rawPrice = firstNodeTextBySel(
    doc,
    "[itemprop='price'], [class*='price' i], [class*='prix' i], .price",
  );
  const price = parsePrice(rawPrice);

  const rawSurface = firstNodeTextBySel(
    doc,
    "[itemprop='area'], [class*='surface' i], [class*='superficie' i], [class*='m2' i]",
  );
  const superficie = parseSurface(rawSurface);

  const rawBedrooms =
    firstNodeTextBySel(doc, "[itemprop='bedrooms'], [class*='chambre' i]") ||
    firstNodeTextBySel(doc, "[class*='chambres' i]") ||
    "";
  const bedrooms = parseDir(rawBedrooms);

  const rawBathrooms =
    firstNodeTextBySel(doc, "[itemprop='bathrooms'], [class*='salle' i], [class*='douche' i]") ||
    "";
  const bathrooms = parseDir(rawBathrooms);

  let gouvernorat = "";
  let ville = "";
  let quartier = "";

  const rows = collectRows(doc, "[class*='characteristics' i], [class*='infos' i], [class*='details' i], [id*='characteristics']");
  for (const row of rows) {
    const without = row.replace(/\s+/g, " ").trim();
    if (!gouvernorat) gouvernorat = detectGouvInText(without);
    if (!ville) ville = detectVilleInText(without);
    if (!quartier) quartier = detectQuartierInText(without);
  }

  const address =
    firstNodeText(doc, "[class*='adresse' i]") ||
    firstNodeText(doc, "meta[property='og:street-address']") ||
    "";

  if (!ville && address) {
    const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) ville = parts[1];
    if (parts.length >= 1 && !ville) ville = parts[0];
  }
  if (!ville && gouvernorat) ville = gouvernorat;
  if (!quartier && ville) quartier = ville;

  const photos = extractPhotoUrls(doc);

  return {
    source: TAYARA_DOMAIN,
    title: cleanTitle(title),
    address: cleanText(address || gouvernorat + (ville ? ", " + ville : "") || desc),
    gouvernorat: trimFloors(gouvernorat || "Tunis"),
    ville: trimFloors(ville || gouvernorat || "Tunis"),
    quartier: trimFloors(quartier),
    price,
    superficie,
    bedrooms,
    bathrooms,
    propertyType: null,
    description: desc,
    photoUrls: photos,
    latitude: null,
    longitude: null,
  };
}

function parseHtml(html: string): Document | null {
  const doc = parseDom(html);
  if (!doc) return null;
  return doc;
}

function parseDom(html: string): Document | null {
  const parser = getDomParser();
  if (!parser) return null;
  const doc = parser.parseFromString(html, "text/html");
  if (!doc || doc.getElementsByTagName("parsererror").length > 0) return null;
  return doc;
}

function getDomParser(): DOMParser | null {
  if (typeof DOMParser === "undefined") return null;
  return new DOMParser();
}

function nodeListToArray<T extends Node>(nodes: NodeListOf<T>): T[] {
  return Array.from(nodes);
}

function firstNodeText(doc: Document | null, selector: string): string {
  if (!doc) return "";
  const n = doc.querySelector(selector);
  return n ? n.textContent || "" : "";
}

function firstNodeTextBySel(
  doc: Document,
  selector: string,
): string {
  const n = doc.querySelector(selector);
  return n ? n.textContent || "" : "";
}

function collectTextBySel(
  doc: Document,
  selector: string,
): string[] {
  return nodeListToArray(doc.querySelectorAll(selector)).map(
    (el) => el.textContent || "",
  );
}

function collectRows(
  doc: Document,
  selector: string,
): string[] {
  return nodeListToArray(doc.querySelectorAll(selector)).map((row) => {
    const cells = nodeListToArray(row.querySelectorAll("[class*='field' i], [class*='label' i], div, span, p"))
      .map((c) => (c.textContent || "").trim())
      .filter(Boolean)
      .join(" · ");
    return cells;
  });
}

function parseSurface(value: string | null | undefined): number | null {
  if (!value) return null;
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/[^0-9.,]/g, "")
    .replace(/,(\d{2})$/, ".$1")
    .replace(/,/g, ".");
  const m = cleaned.match(/^\s*([0-9]+(?:\.[0-9]+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 3 && n < 5000 ? n : null;
}

function cleanTitle(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[-—–]+/g, " — ")
    .trim()
    .slice(0, 180);
}

function cleanText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

function trimFloors(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/\s+/g, " ")
    .replace(/\s?\([^)]*\)\s?/g, "")
    .replace(/[–—\-]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

function detectGouvInText(text: string): string {
  const list = [
    "Tunis","Ariana","Ben Arous","Manouba","Nabeul",
    "Zaghouan","Bizerte","Béja","Jendouba","Kef",
    "Siliana","Sousse","Monastir","Mahdia","Sfax",
    "Kairouan","Kasserine","Sidi Bouzid","Gabès","Médenine",
    "Tataouine","Gafsa","Tozeur","Kébili",
  ];
  const upper = text;
  for (const g of list) {
    if (upper.includes(g)) return g;
  }
  return "";
}

function detectVilleInText(text: string): string {
  const list = [
    "La Marsa","Carthage","Sidi Bou Saïd","Le Bardo","El Menzah",
    "Ariana","Raoued","La Soukra","Sousse","Sfax",
    "Bizerte","Nabeul","Hammamet","Monastir","Moknine",
    "Mahdia","Kairouan","Gabès","Médenine","Djerba",
    "Tataouine","Gafsa","Tozeur","Douz","Kébili",
    "Tunis",
  ];
  for (const v of list) {
    if (text.includes(v)) return v;
  }
  return "";
}

function detectQuartierInText(text: string): string {
  const list = [
    "Centre","Centre Ville","Médina","Centre Ville",
    "Sahloul","Ennasr","Menzel","El Mourouj","Borj",
    "Cité","Zone","Quartier",
  ];
  for (const q of list) {
    if (text.includes(q)) return text.slice(0, 60);
  }
  return "";
}

function extractPhotoUrls(doc: Document | null): string[] {
  if (!doc) return [];
  const urls: string[] = [];
  const seen = new Set<string>();
  const candidates: string[] = [];

  try {
    nodeListToArray(doc.querySelectorAll("img"))
      .forEach((img) => {
        const src =
          (img.getAttribute("src") || "") +
          (img.getAttribute("data-src") || "") +
          (img.getAttribute("data-lazy-src") || "") +
          (img.getAttribute("data-original") || "");
        candidates.push(...src.split(/\s+/).filter(Boolean));
      });
    nodeListToArray(doc.querySelectorAll("[data-image],[data-src]"))
      .forEach((el) => {
        candidates.push(
          (el.getAttribute("data-image") || "") +
          (el.getAttribute("data-src") || "") +
          (el.getAttribute("data-lazy-src") || "") +
          (el.getAttribute("data-original") || ""),
        );
      });
  } catch {
    /* ignore */
  }

  for (const raw of candidates) {
    try {
      const u = new URL(raw, "https://example.com");
      const normalized = u.toString().replace(/[?#].*/, "").replace(/\/+$/, "");
      if (
        /\.(jpg|jpeg|png|webp|avif|svg|gif)\b/i.test(normalized) &&
        u.hostname !== window?.location?.hostname &&
        !/placeholder|default|blank|empty|icon|logo|no-photo|nophoto/i.test(
          normalized,
        )
      ) {
        if (!seen.has(normalized)) {
          seen.add(normalized);
          urls.push(normalized);
        }
      }
    } catch {
      /* ignore */
    }
  }

  return urls.slice(0, 20);
}

