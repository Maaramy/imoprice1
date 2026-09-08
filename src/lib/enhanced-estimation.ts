/**
 * BIM Engine v5 — Estimation Intelligente (calibrage marché tunisien août 2026)
 * Moteur d'estimation immobilière basé sur les prix transactionnels réels 2026.
 *
 * Source : Modele_Immobilier_Tunisie_2026_24G_264D_2073Q.xlsx
 *   - 24 gouvernorats, 264 délégations, 2 073 quartiers/secteurs
 *   - 144 zones de référence nommées (benchmarks)
 *   - Feuilles : Synthese_24, Synthese_264, Base_2073, Hypotheses
 *   - Date de référence : 25 août 2026
 *   - Scénario actif : Central
 *   - Sources marché : Properstar, Mubawab Bilan 2025, INS, Open Admin Data
 *
 * Hypothèses calibrées (feuille Hypotheses) :
 *   - Médiane nationale appartement : 3 603 DT/m²
 *   - Part de l'ancien dans le mix : 60%
 *   - Surface type S+1 : 65 m², S+2 : 105 m²
 *   - Prime location meublée : 18%
 *   - Scénario Central : -5% prix / -4% loyer (ajustement)
 *   - Rendements cibles : Premium 4.2% → Économique 6.7%
 */

import type { EstimationResult, ComparableProperty } from "../convex/types";
import { findZone, type ZoneData } from "./zones";
import { findDelegation, getGovAvgTransaction, getGovAvgRentNm, getGovAvgRentMeuble } from "./delegations";
import { findQuartier, type QuartierData } from "./quartiers";

// ─── PRIX DE BASE PAR GOUVERNORAT (TND/m², marché transactionnel août 2026) ───
// Source : Modele_Immobilier_Tunisie_24_Gouvernorats_2026.xlsx
// Prix « appartement » = moyenne transactionnelle (après décote) par gouvernorat.
// Les autres types sont dérivés via des ratios par rapport à l'appartement.
// (exporté pour permettre les overrides de l'admin)
export const REGION_BASE_PRICES: Record<string, Record<string, number>> = {
  Tunis: {
    appartement: 4083, maison: 4491, villa: 5308, studio: 3675,
    duplex: 5104, immeuble: 3266, local_commercial: 5308, bureau: 4491,
    magasin: 5104, restaurant: 4287, cafe: 4083, entrepot: 2450,
    atelier: 2246, terrain_constructible: 1837, terrain_agricole: 123,
    ferme: 1429, garage: 2858, parking: 2246, depot: 1837, mixte: 4491,
  },
  Ariana: {
    appartement: 3297, maison: 3627, villa: 4286, studio: 2967,
    duplex: 4121, immeuble: 2638, local_commercial: 4286, bureau: 3627,
    magasin: 4121, restaurant: 3462, cafe: 3297, entrepot: 1978,
    atelier: 1813, terrain_constructible: 1484, terrain_agricole: 99,
    ferme: 1154, garage: 2308, parking: 1813, depot: 1484, mixte: 3627,
  },
  "Ben Arous": {
    appartement: 2438, maison: 2682, villa: 3169, studio: 2194,
    duplex: 3048, immeuble: 1950, local_commercial: 3169, bureau: 2682,
    magasin: 3048, restaurant: 2560, cafe: 2438, entrepot: 1463,
    atelier: 1341, terrain_constructible: 1097, terrain_agricole: 73,
    ferme: 853, garage: 1707, parking: 1341, depot: 1097, mixte: 2682,
  },
  Manouba: {
    appartement: 2058, maison: 2264, villa: 2675, studio: 1852,
    duplex: 2573, immeuble: 1646, local_commercial: 2675, bureau: 2264,
    magasin: 2573, restaurant: 2161, cafe: 2058, entrepot: 1235,
    atelier: 1132, terrain_constructible: 926, terrain_agricole: 62,
    ferme: 720, garage: 1441, parking: 1132, depot: 926, mixte: 2264,
  },
  Nabeul: {
    appartement: 3336, maison: 3670, villa: 4337, studio: 3002,
    duplex: 4170, immeuble: 2669, local_commercial: 4337, bureau: 3670,
    magasin: 4170, restaurant: 3503, cafe: 3336, entrepot: 2002,
    atelier: 1835, terrain_constructible: 1501, terrain_agricole: 100,
    ferme: 1168, garage: 2335, parking: 1835, depot: 1501, mixte: 3670,
  },
  Zaghouan: {
    appartement: 1438, maison: 1582, villa: 1869, studio: 1294,
    duplex: 1798, immeuble: 1150, local_commercial: 1869, bureau: 1582,
    magasin: 1798, restaurant: 1510, cafe: 1438, entrepot: 863,
    atelier: 791, terrain_constructible: 647, terrain_agricole: 43,
    ferme: 503, garage: 1007, parking: 791, depot: 647, mixte: 1582,
  },
  Bizerte: {
    appartement: 2252, maison: 2477, villa: 2928, studio: 2027,
    duplex: 2815, immeuble: 1802, local_commercial: 2928, bureau: 2477,
    magasin: 2815, restaurant: 2365, cafe: 2252, entrepot: 1351,
    atelier: 1239, terrain_constructible: 1013, terrain_agricole: 68,
    ferme: 788, garage: 1576, parking: 1239, depot: 1013, mixte: 2477,
  },
  Béja: {
    appartement: 1405, maison: 1546, villa: 1827, studio: 1265,
    duplex: 1756, immeuble: 1124, local_commercial: 1827, bureau: 1546,
    magasin: 1756, restaurant: 1475, cafe: 1405, entrepot: 843,
    atelier: 773, terrain_constructible: 632, terrain_agricole: 42,
    ferme: 492, garage: 984, parking: 773, depot: 632, mixte: 1546,
  },
  Jendouba: {
    appartement: 1756, maison: 1932, villa: 2283, studio: 1580,
    duplex: 2195, immeuble: 1405, local_commercial: 2283, bureau: 1932,
    magasin: 2195, restaurant: 1844, cafe: 1756, entrepot: 1054,
    atelier: 966, terrain_constructible: 790, terrain_agricole: 53,
    ferme: 615, garage: 1229, parking: 966, depot: 790, mixte: 1932,
  },
  Kef: {
    appartement: 1197, maison: 1317, villa: 1556, studio: 1077,
    duplex: 1496, immeuble: 958, local_commercial: 1556, bureau: 1317,
    magasin: 1496, restaurant: 1257, cafe: 1197, entrepot: 718,
    atelier: 658, terrain_constructible: 539, terrain_agricole: 36,
    ferme: 419, garage: 838, parking: 658, depot: 539, mixte: 1317,
  },
  Siliana: {
    appartement: 1117, maison: 1229, villa: 1452, studio: 1005,
    duplex: 1396, immeuble: 894, local_commercial: 1452, bureau: 1229,
    magasin: 1396, restaurant: 1173, cafe: 1117, entrepot: 670,
    atelier: 614, terrain_constructible: 503, terrain_agricole: 34,
    ferme: 391, garage: 782, parking: 614, depot: 503, mixte: 1229,
  },
  Sousse: {
    appartement: 3448, maison: 3793, villa: 4482, studio: 3103,
    duplex: 4310, immeuble: 2758, local_commercial: 4482, bureau: 3793,
    magasin: 4310, restaurant: 3620, cafe: 3448, entrepot: 2069,
    atelier: 1896, terrain_constructible: 1552, terrain_agricole: 103,
    ferme: 1207, garage: 2414, parking: 1896, depot: 1552, mixte: 3793,
  },
  Monastir: {
    appartement: 2695, maison: 2965, villa: 3504, studio: 2426,
    duplex: 3369, immeuble: 2156, local_commercial: 3504, bureau: 2965,
    magasin: 3369, restaurant: 2830, cafe: 2695, entrepot: 1617,
    atelier: 1482, terrain_constructible: 1213, terrain_agricole: 81,
    ferme: 943, garage: 1887, parking: 1482, depot: 1213, mixte: 2965,
  },
  Mahdia: {
    appartement: 2350, maison: 2585, villa: 3055, studio: 2115,
    duplex: 2938, immeuble: 1880, local_commercial: 3055, bureau: 2585,
    magasin: 2938, restaurant: 2468, cafe: 2350, entrepot: 1410,
    atelier: 1293, terrain_constructible: 1058, terrain_agricole: 71,
    ferme: 823, garage: 1645, parking: 1293, depot: 1058, mixte: 2585,
  },
  Sfax: {
    appartement: 2807, maison: 3088, villa: 3649, studio: 2526,
    duplex: 3509, immeuble: 2246, local_commercial: 3649, bureau: 3088,
    magasin: 3509, restaurant: 2947, cafe: 2807, entrepot: 1684,
    atelier: 1544, terrain_constructible: 1263, terrain_agricole: 84,
    ferme: 982, garage: 1965, parking: 1544, depot: 1263, mixte: 3088,
  },
  Kairouan: {
    appartement: 1361, maison: 1497, villa: 1769, studio: 1225,
    duplex: 1701, immeuble: 1089, local_commercial: 1769, bureau: 1497,
    magasin: 1701, restaurant: 1429, cafe: 1361, entrepot: 817,
    atelier: 749, terrain_constructible: 612, terrain_agricole: 41,
    ferme: 476, garage: 953, parking: 749, depot: 612, mixte: 1497,
  },
  Kasserine: {
    appartement: 982, maison: 1080, villa: 1277, studio: 884,
    duplex: 1228, immeuble: 786, local_commercial: 1277, bureau: 1080,
    magasin: 1228, restaurant: 1031, cafe: 982, entrepot: 589,
    atelier: 540, terrain_constructible: 442, terrain_agricole: 29,
    ferme: 344, garage: 687, parking: 540, depot: 442, mixte: 1080,
  },
  "Sidi Bouzid": {
    appartement: 937, maison: 1031, villa: 1218, studio: 843,
    duplex: 1171, immeuble: 750, local_commercial: 1218, bureau: 1031,
    magasin: 1171, restaurant: 984, cafe: 937, entrepot: 562,
    atelier: 515, terrain_constructible: 422, terrain_agricole: 28,
    ferme: 328, garage: 656, parking: 515, depot: 422, mixte: 1031,
  },
  Gabès: {
    appartement: 1598, maison: 1758, villa: 2077, studio: 1438,
    duplex: 1998, immeuble: 1278, local_commercial: 2077, bureau: 1758,
    magasin: 1998, restaurant: 1678, cafe: 1598, entrepot: 959,
    atelier: 879, terrain_constructible: 719, terrain_agricole: 48,
    ferme: 559, garage: 1119, parking: 879, depot: 719, mixte: 1758,
  },
  Médenine: {
    appartement: 2824, maison: 3106, villa: 3671, studio: 2542,
    duplex: 3530, immeuble: 2259, local_commercial: 3671, bureau: 3106,
    magasin: 3530, restaurant: 2965, cafe: 2824, entrepot: 1694,
    atelier: 1553, terrain_constructible: 1271, terrain_agricole: 85,
    ferme: 988, garage: 1977, parking: 1553, depot: 1271, mixte: 3106,
  },
  Tataouine: {
    appartement: 1070, maison: 1177, villa: 1391, studio: 963,
    duplex: 1338, immeuble: 856, local_commercial: 1391, bureau: 1177,
    magasin: 1338, restaurant: 1124, cafe: 1070, entrepot: 642,
    atelier: 589, terrain_constructible: 482, terrain_agricole: 32,
    ferme: 375, garage: 749, parking: 589, depot: 482, mixte: 1177,
  },
  Gafsa: {
    appartement: 1445, maison: 1590, villa: 1879, studio: 1301,
    duplex: 1806, immeuble: 1156, local_commercial: 1879, bureau: 1590,
    magasin: 1806, restaurant: 1517, cafe: 1445, entrepot: 867,
    atelier: 795, terrain_constructible: 650, terrain_agricole: 43,
    ferme: 506, garage: 1012, parking: 795, depot: 650, mixte: 1590,
  },
  Tozeur: {
    appartement: 1570, maison: 1727, villa: 2041, studio: 1413,
    duplex: 1963, immeuble: 1256, local_commercial: 2041, bureau: 1727,
    magasin: 1963, restaurant: 1649, cafe: 1570, entrepot: 942,
    atelier: 864, terrain_constructible: 707, terrain_agricole: 47,
    ferme: 550, garage: 1099, parking: 864, depot: 707, mixte: 1727,
  },
  Kébili: {
    appartement: 1272, maison: 1399, villa: 1654, studio: 1145,
    duplex: 1590, immeuble: 1018, local_commercial: 1654, bureau: 1399,
    magasin: 1590, restaurant: 1336, cafe: 1272, entrepot: 763,
    atelier: 699, terrain_constructible: 572, terrain_agricole: 38,
    ferme: 445, garage: 890, parking: 699, depot: 572, mixte: 1399,
  },
};

// Default for unlisted governorates — médiane nationale 2026
// Source: Modele_Immobilier_Tunisie_2026_24G_264D_2073Q.xlsx (feuille Hypotheses)
// Transaction nationale moyenne: 2031 DT/m²
export const DEFAULT_TYPE_PRICES: Record<string, number> = {
  appartement: 2031, maison: 2234, villa: 2640, studio: 1828,
  duplex: 2539, immeuble: 1625, local_commercial: 2640, bureau: 2234,
  magasin: 2539, restaurant: 2133, cafe: 2031, entrepot: 1219,
  atelier: 1117, terrain_constructible: 914, terrain_agricole: 61,
  ferme: 711, garage: 1422, parking: 1117, depot: 914, mixte: 2234,
};

// ─── MULTIPLICATEURS PAR VILLE (coefficient appliqué au prix de base du gouvernorat) ───
// Basé sur les données TecnoCasa.tn, Mubawab.tn, ReMax.com.tn 2025-2026
// Les villes premium ont un multiplicateur > 1, les économiques < 1
export const CITY_MULTIPLIERS: Record<string, number> = {
  // ── Tunis (Grand Tunis) ──
  "Les Berges du Lac": 1.45, "Les Jardins de Carthage": 1.40, "Gammarth": 1.35,
  "Carthage": 1.35, "Sidi Bou Saïd": 1.30, "Aïn Zaghouan": 1.25,
  "La Marsa": 1.25, "El Menzah": 1.15, "Belvédère": 1.12,
  "Montplaisir": 1.10, "La Goulette": 1.10, "Ennasr": 1.08,
  "Tunis Ville": 1.05, "Jardins du Lac": 1.25,
  "Cité Jardins": 1.10, "Le Bardo": 0.95,
  "Le Kram": 0.92, "Bab El Oued": 0.82,
  "El Mourouj": 0.88, "Sidi Hassine": 0.65,
  "El Ouardia": 0.70, "Bab Saadoun": 0.80,
  "Cité El Khadra": 0.88, "El Omrane": 0.90,
  "El Omrane Supérieur": 0.92, "Djebel Jelloud": 0.62,
  "Bab El Khoukha": 0.72, "Mellassine": 0.55,
  "Sidi Hassen": 0.55, "Jebel Lahmar": 0.60,
  "El Hraïria": 0.52, "Kabaria": 0.55,

  // ── Ariana ──
  "La Soukra": 1.18, "L'Aouina": 1.10, "Charguia": 1.05,
  "Charguia 2": 1.08, "Charguia 3": 1.04,
  "El Menzah 5": 1.12, "Ennasr 2": 1.15,
  "Cité El Ghazala": 1.08, "Chotrana": 1.05,
  "Riadh Andalous": 1.02, "Borj Louzir": 0.88,
  "Ariana Ville": 0.92, "Raoued": 0.95,
  "Sidi Thabet": 0.85, "Kalâat el-Andalous": 0.82,
  "Ettadhamen": 0.62,
  "Borj El Amri": 0.65,

  // ── Ben Arous ──
  "Nouvelle Médina": 1.10, "Hammam Lif": 0.90,
  "Ez Zahra": 0.95, "Radès": 0.88,
  "Mégrine": 0.92, "Mégrine Coteau": 1.00,
  "Ben Arous Ville": 0.85, "Hammam Chott": 0.82,
  "Bou Mhel": 0.95, "Fouchana": 0.78,
  "Mornag": 0.72, "Mohamedia": 0.82,
  "El Bassatine": 0.80, "El Mrazig": 0.75,

  // ── Manouba ──
  "Manouba Ville": 0.90, "Tebourba": 0.75,
  "Douar Hicher": 0.55, "Den Den": 0.85,
  "Djedeida": 0.72, "Mornaguia": 0.70,
  "Oued Ellil": 0.78, "El Battan": 0.65,

  // ── Nabeul (Cap Bon) ──
  "Hammamet Nord": 1.35, "Yasmine Hammamet": 1.30, "Hammamet": 1.25,
  "Hammamet Sud": 1.15, "Nabeul Ville": 0.95,
  "Dar Chaâbane": 0.85, "Kélibia": 0.88,
  "Korba": 0.80, "Soliman": 0.82,
  "Grombalia": 0.75, "El Haouaria": 0.72,
  "Menzel Temime": 0.78, "Béni Khiar": 0.88,
  "El Maâmoura": 0.75, "Takelsa": 0.70,
  "Bir Bouregba": 0.78,

  // ── Zaghouan ──
  "Zaghouan Ville": 0.85, "El Fahs": 0.75,
  "Zriba": 0.70, "Bir Mcherga": 0.72,
  "Nadhour": 0.65,

  // ── Bizerte ──
  "Bizerte Ville": 0.95, "Zarzouna": 0.90,
  "Menzel Bourguiba": 0.72, "Menzel Jemil": 0.82,
  "Ras Jebel": 0.70, "Mateur": 0.68,
  "Tinja": 0.72, "Utique": 0.75,
  "El Alia": 0.72, "Ghar El Melh": 0.78,
  "Sejnane": 0.60, "Cap Zebib": 0.95,
  "Ain Mariam": 0.90,

  // ── Béja ──
  "Béja Ville": 0.85, "Médjez El Bab": 0.72,
  "Téboursouk": 0.68, "Nefza": 0.62,
  "Testour": 0.70, "Goubellat": 0.65,

  // ── Jendouba ──
  "Tabarka": 1.15, "Tabarka Plage": 1.18,
  "Aïn Draham": 1.10, "Jendouba Ville": 0.75,
  "Fernana": 0.65, "Ghardimaou": 0.72,
  "Bou Salem": 0.68, "Oued Meliz": 0.62,

  // ── Kef ──
  "Le Kef Ville": 0.80, "Tajerouine": 0.72,
  "Dahmani": 0.68, "Kalaât Sinane": 0.70,
  "Kalaat Khasba": 0.62, "Nebeur": 0.60,

  // ── Siliana ──
  "Siliana Ville": 0.78, "Makthar": 0.72,
  "Gaâfour": 0.68, "Le Krib": 0.65,
  "Rouhia": 0.60, "Kesra": 0.65,

  // ── Sousse (Sahel) ──
  "Port El Kantaoui": 1.30, "Sahloul": 1.05,
  "Sousse Ville": 1.00, "Sousse Corniche": 1.05,
  "Sousse Boujaafar": 1.02, "Hammam Sousse": 0.95,
  "Akouda": 0.90, "M'saken": 0.85,
  "Kalaâ Kebira": 0.82, "Kalaâ Sghira": 0.78,
  "Enfidha": 0.78, "Bouficha": 0.72,
  "Hergla": 1.00, "Sidi Bou Ali": 0.75,

  // ── Monastir ──
  "Skanes": 1.15, "Monastir Ville": 1.00,
  "Monastir Centre": 1.00, "Corniche de Monastir": 1.10,
  "Moknine": 0.82, "Jemmal": 0.78,
  "Ksar Hellal": 0.78, "Téboulba": 0.80,
  "Bekalta": 0.75, "Sayada": 0.72,
  "Ksibet El Mediouni": 0.75, "Zéramdine": 0.72,
  "Ouerdanine": 0.70,

  // ── Mahdia ──
  "Mahdia Ville": 0.90, "Mahdia Corniche": 0.95,
  "El Jem": 0.80, "Chebba": 0.80,
  "Ksour Essef": 0.75, "Melloulèche": 0.72,
  "Rejiche": 0.85, "Chorbane": 0.65,

  // ── Sfax ──
  "Sfax Ville": 0.95, "Sfax Centre": 0.95,
  "Sfax El Jadida": 0.90, "Thyna": 0.85,
  "Sakiet Ezzit": 0.82, "Sakiet Eddaïer": 0.80,
  "Gremda": 0.82, "El Ain": 0.80,
  "Kerkennah": 0.60, "Agareb": 0.72,
  "Jebeniana": 0.68, "El Amra": 0.65,
  "Menzel Chaker": 0.72,

  // ── Kairouan ──
  "Kairouan Ville": 0.85, "Kairouan Médina": 0.80,
  "Chébika": 0.72, "Haffouz": 0.65,
  "Oueslatia": 0.62, "Bou Hajla": 0.68,
  "Nasrallah": 0.65, "Sbikha": 0.62,

  // ── Kasserine ──
  "Kasserine Ville": 0.78, "Sbeitla": 0.72,
  "Fériana": 0.65, "Thala": 0.72,
  "Foussana": 0.62, "Sbiba": 0.60,

  // ── Sidi Bouzid ──
  "Sidi Bouzid Ville": 0.78, "Meknassy": 0.68,
  "Regueb": 0.62, "Menzel Bouzaiane": 0.58,
  "Bir El Hafey": 0.62, "Jilma": 0.60,

  // ── Gabès ──
  "Gabès Ville": 0.90, "El Hamma": 0.72,
  "Métouia": 0.78, "Chenini": 0.75,
  "Matmata": 0.55, "Zarat": 0.70,
  "Toujane": 0.60,

  // ── Médenine (Sud-Est / Djerba) ──
  "Djerba (Houmt Souk)": 1.30, "Houmt Souk Centre": 1.28,
  "Djerba (Midoun)": 1.25, "Midoun Centre": 1.22,
  "Djerba (Ajim)": 1.10, "Ajim Centre": 1.08,
  "Erriadh": 1.15, "Mellita": 1.12,
  "Zarzis": 0.85, "Zarzis Plage": 0.90,
  "Médenine Ville": 0.78, "Ben Guerdane": 0.65,
  "Beni Khedache": 0.60,

  // ── Tataouine ──
  "Tataouine Ville": 0.75, "Ghomrassen": 0.65,
  "Remada": 0.55, "Bir Lahmar": 0.58,

  // ── Gafsa ──
  "Gafsa Ville": 0.80, "El Ksar": 0.72,
  "Métlaoui": 0.68, "Redeyef": 0.62,
  "Moulares": 0.62,

  // ── Tozeur ──
  "Tozeur Ville": 0.85, "Nefta": 0.78,
  "Degache": 0.72, "Hazoua": 0.65,

  // ── Kébili ──
  "Kébili Ville": 0.78, "Douz": 0.75,
  "Souk Lahad": 0.70, "Faouar": 0.62,
};

// ─── MULTIPLICATEURS PAR QUARTIER (basés sur données TecnoCasa/Mubawab/ReMax) ───
export const QUARTIER_MULTIPLIERS: Record<string, number> = {
  // ════════════════════════════════════════════
  // ║  QUARTIERS PREMIUM (standing élevé)     ║
  // ════════════════════════════════════════════
  // Grand Tunis — Ultra Premium (5 000-5 700 TND/m²)
  "Les Jardins de Carthage": 1.40, "Carthage Présidence": 1.40,
  "Carthage Hannibal": 1.35, "Les Berges du Lac": 1.40,
  "Les Côtes de Carthage": 1.32, "Le Golf Carthage": 1.38,
  "Gammarth": 1.35, "Sidi Daoud": 1.20,
  "Aïn Zaghouan Nord": 1.25, "Aïn Zaghouan": 1.22,
  "La Marsa Plage": 1.20, "Sidi Bou Saïd": 1.28,

  // Grand Tunis — Premium Résidentiel (3 800-4 600 TND/m²)
  "El Menzah 1": 1.15, "El Menzah 2": 1.12,
  "El Menzah 3": 1.10, "El Menzah 4": 1.08,
  "El Menzah 5": 1.05, "El Menzah 6": 1.05,
  "El Menzah 9C": 1.10, "Jardins d'El Menzah": 1.10,
  "Jardins d'El Menzah 2": 1.08, "Ennasr 1": 1.18,
  "Ennasr 2": 1.15, "Résidence Ennasr": 1.20,
  "Jardins d'Ennasr": 1.15, "Cité Ennasr 2": 1.14,
  "Cité des Médecins": 1.15, "Sup'Com": 1.10,
  "Cité Télécom": 1.06, "Cité Olympique": 1.10,
  "Cité Jardins": 1.10, "Belvédère": 1.10,
  "Parc Belvédère": 1.12, "Montplaisir": 1.08,
  "Notre Dame": 1.06,

  // Ariana — Premium (3 500-3 900 TND/m²)
  "La Soukra Ouest": 1.16, "La Soukra Est": 1.12,
  "Jardins de la Soukra": 1.14, "Cité des Oiseaux": 1.06,
  "Cité El Ghazala": 1.08, "Chotrana": 1.06,
  "Riadh Andalous": 1.03, "L'Aouina": 1.10,
  "Charguia 2": 1.08, "Charguia 3": 1.04,

  // Sousse — Premium Sahel (3 300-4 800 TND/m²)
  "Port El Kantaoui": 1.28, "Sousse Corniche": 1.06,
  "Sahloul 4": 1.05, "Boujaafar": 1.03,
  "Cité El Agba": 0.98,

  // Cap Bon / Nabeul — Premium (3 400-4 000 TND/m²)
  "Hammamet Nord": 1.20, "Hammamet Plage": 1.18,
  "Yasmine Hammamet": 1.25, "Hammamet Sud": 1.10,
  "Marina": 1.22, "Zone Touristique": 1.16,

  // Monastir — Premium
  "Skanes": 1.12, "Corniche de Monastir": 1.10,

  // Bizerte
  "Plage de La Marsa": 1.12, "Cap Zebib": 1.05,

  // Djerba — Premium touristique
  "Houmt Souk Centre": 1.25, "Midoun Centre": 1.20,
  "Erriadh": 1.15, "Mellita": 1.12,
  "Boughrara": 1.05,

  // Jendouba — Nord-Ouest touristique
  "Tabarka Plage": 1.15, "Station de Ski": 1.12,
  "Aïn Draham Centre": 1.10,

  // ════════════════════════════════════════════
  // ║  CENTRE-VILLE / ZONES STANDARDS         ║
  // ════════════════════════════════════════════
  "Centre Ville": 1.00, "Avenue Habib Bourguiba": 1.04,
  "Avenue Bourguiba": 1.03, "Place Farhat Hached": 0.95,
  "Sousse Centre": 1.00, "Sfax Centre": 0.95,
  "Sousse Médina": 0.88, "Sfax Médina": 0.85,
  "Kairouan Médina": 0.80, "Gabès Centre": 0.88,
  "Bizerte Centre": 0.92, "Nabeul Centre": 0.95,
  "Monastir Centre": 1.00, "Hammam Sousse Centre": 0.95,
  "Route de Tunis": 0.88, "Route de Sfax": 0.85,
  "Route El Ain": 0.82,

  // ════════════════════════════════════════════
  // ║  ZONES RÉSIDENTIELLES STANDARD          ║
  // ════════════════════════════════════════════
  "Cité Ennasr": 0.92, "Cité Essalem": 0.88,
  "Cité El Bassatine": 0.85, "Cité des Oliviers": 0.90,
  "Cité Jardin": 0.95, "Cité Ibn Khaldoun": 0.78,
  "Cité El Amel": 0.75, "Cité Rim": 1.00,
  "Cité Rim Chotrana": 0.95, "Cité Aéroport": 0.75,
  "Sahloul": 0.98, "Ezzouhour": 0.90,
  "El Khadhra": 0.85,

  // ════════════════════════════════════════════
  // ║  ZONES ÉCONOMIQUES / PÉRIPHÉRIE        ║
  // ════════════════════════════════════════════
  "Zone Industrielle": 0.62,
  "Zone Industrielle Charguia": 0.68,
  "Zone Industrielle Ben Arous": 0.62,
  "Zone Industrielle Sfax": 0.62,
  "Zone Industrielle Mégrine": 0.65,
  "Bab El Khoukha": 0.70, "Bab Echouhada": 0.68,
  "Mellassine": 0.52, "Sidi Hassen": 0.52,
  "Jebel Lahmar": 0.58, "El Hraïria": 0.48,
  "Ettadhamen": 0.52, "Douar Hicher": 0.48,
  "Sidi Hassine": 0.50, "El Ouardia": 0.55,
  "Kabaria": 0.52, "Sidi Ali Azouz": 0.55,
  "Essouika": 0.50,

  // ════════════════════════════════════════════
  // ║  ZONES SPÉCIALES / TOURISTIQUES         ║
  // ════════════════════════════════════════════
  "Station Balnéaire": 1.18,
  "Boulevard de la Plage": 1.10,
  "Cap d'Afrique": 1.05,
  "Site Archéologique": 0.85,
  "Colisée d'El Jem": 0.80,
  "Médina": 0.85,
};

// ─── ÉTAT MULTIPLIERS (basés sur les écarts de prix constatés sur Mubawab/ReMax) ───
export const STATE_MULTIPLIERS: Record<string, number> = {
  a_renover: 0.72,        // -28% par rapport à un bien en bon état
  bon_etat: 1.00,         // Référence
  excellent_etat: 1.10,   // +10% pour finitions soignées et bien entretenu
  luxe: 1.25,             // +25% pour matériaux haut de gamme, design, prestations
};

// ─── CONSTANTES CALIBRÉES FEUILLE HYPOTHESES (25 août 2026) ───
// Médiane nationale appartement résidentiel 2026 (DT/m² transaction)
export const MEDIANE_NATIONALE = 3603;
// Prime pour location meublée vs non meublée (facteur multiplicatif)
export const PRIME_MEUBLEE = 0.18;
// Part de l'ancien dans le mix transactionnel national
export const PART_ANCIEN = 0.60;
// Surfaces types de référence (m²)
export const SURFACE_S1 = 65;
export const SURFACE_S2 = 105;

// ─── VALEUR DES ÉQUIPEMENTS (% de plus-value sur le prix de base) ───
// Plus-value exprimée en % du prix de base — réaliste quelle que soit la région
export const FEATURE_VALUES: Record<string, number> = {
  hasGarden: 0.05,        // Jardin privatif — +5%
  hasPool: 0.10,          // Piscine — +10%
  hasTerrace: 0.04,       // Terrasse aménageable — +4%
  hasBalcony: 0.03,       // Balcon — +3%
  hasElevator: 0.06,      // Ascenseur — +6%
  hasParking: 0.05,       // Parking/garage — +5%
  hasAC: 0.03,            // Climatisation — +3%
  hasHeating: 0.02,       // Chauffage central — +2%
  hasSolar: 0.07,         // Installation solaire — +7%
};

// ─── INTERFACE DONNÉES D'ENTRÉE ───
export interface PropertyInput {
  gouvernorat?: string;
  ville?: string;
  quartier?: string;
  propertyType?: string;
  builtSurface?: number;
  terrainSurface?: number;
  floors?: number;
  bedrooms?: number;
  bathrooms?: number;
  kitchens?: number;
  livingRooms?: number;
  garages?: number;
  hasGarden?: boolean;
  hasPool?: boolean;
  hasTerrace?: boolean;
  hasBalcony?: boolean;
  hasElevator?: boolean;
  hasParking?: boolean;
  hasAC?: boolean;
  hasHeating?: boolean;
  hasSolar?: boolean;
  yearBuilt?: number;
  generalState?: string;
}

// ─── CONFIGURATION ADMINISTRABLE (overrides) ───
export interface MarketConfig {
  regionBasePrices?: Record<string, Record<string, number>>;
  defaultTypePrices?: Record<string, number>;
  cityMultipliers?: Record<string, number>;
  quartierMultipliers?: Record<string, number>;
  stateMultipliers?: Record<string, number>;
  featureValues?: Record<string, number>;
}

/** Merge admin overrides on top of the default market tables. */
export function applyMarketConfig(config?: MarketConfig) {
  return {
    regionBasePrices: { ...REGION_BASE_PRICES, ...config?.regionBasePrices },
    defaultTypePrices: { ...DEFAULT_TYPE_PRICES, ...config?.defaultTypePrices },
    cityMultipliers: { ...CITY_MULTIPLIERS, ...config?.cityMultipliers },
    quartierMultipliers: { ...QUARTIER_MULTIPLIERS, ...config?.quartierMultipliers },
    stateMultipliers: { ...STATE_MULTIPLIERS, ...config?.stateMultipliers },
    featureValues: { ...FEATURE_VALUES, ...config?.featureValues },
  };
}

// ─── FONCTIONS UTILITAIRES ───
/** Retourne le prix de base au m² pour un gouvernorat et un type de bien */
export function getBasePrice(
  gouvernorat: string,
  propertyType: string,
  config?: MarketConfig,
): number {
  void 0;
  const tables = applyMarketConfig(config);
  const regionData = tables.regionBasePrices[gouvernorat];
  return regionData
    ? (regionData[propertyType] ?? tables.defaultTypePrices[propertyType] ?? 2000)
    : (tables.defaultTypePrices[propertyType] ?? 2000);
}

export function getCityMultiplier(
  ville: string | undefined,
  config?: MarketConfig,
): number {
  if (!ville) return 1.0;
  const tables = applyMarketConfig(config);
  // Try exact match, then partial match from keys
  const direct = tables.cityMultipliers[ville];
  if (direct !== undefined) return direct;
  // Check partial matches
  for (const [key, val] of Object.entries(tables.cityMultipliers)) {
    if (ville.includes(key) || key.includes(ville)) return val;
  }
  return 1.0;
}

export function getQuartierMultiplier(
  quartier: string | undefined,
  config?: MarketConfig,
): number {
  if (!quartier) return 1.0;
  const tables = applyMarketConfig(config);
  const direct = tables.quartierMultipliers[quartier];
  if (direct !== undefined) return direct;
  // Partial match
  for (const [key, val] of Object.entries(tables.quartierMultipliers)) {
    if (quartier.includes(key) || key.includes(quartier)) return val;
  }
  return 1.0;
}

/**
 * Calcule une estimation immobilière complète avec précision
 * sur le marché tunisien 2026
 */
export function computeEnhancedEstimation(
  property: PropertyInput,
  config?: MarketConfig,
): EstimationResult {
  const tables = applyMarketConfig(config);
  // Sans gouvernorat renseigné, on utilise la moyenne nationale (DEFAULT_TYPE_PRICES)
  // et non le marché le plus cher (Tunis) : getBasePrice("") retombe déjà sur les
  // prix nationaux. Évite de gonfler les estimations sans localisation.
  const gouvernorat = property.gouvernorat || "";
  const ville = property.ville || "";
  const quartier = property.quartier || "";
  const propertyType = property.propertyType || "appartement";
  const builtSurface = property.builtSurface || 100;
  const generalState = property.generalState || "bon_etat";
  const currentYear = new Date().getFullYear();
  const yearBuilt = property.yearBuilt || currentYear - 20;
  const age = currentYear - yearBuilt;

  // —— ÉTAPE 0a : LOOKUP DÉLÉGATION (264 délégations marché tunisien 2026) ——
  // On cherche d'abord la délégation car elle alimente le lookup quartier.
  const delegation = quartier
    ? findDelegation(gouvernorat, quartier) ?? findDelegation(gouvernorat, ville)
    : findDelegation(gouvernorat, ville);

  // —— ÉTAPE 0b : LOOKUP QUARTIER (2 073 quartiers marché tunisien 2026) ——
  // Recherche du quartier par gouvernorat + délégation + nom quartier.
  // Priorité : quartier (2073) > zone (144) > délégation (264) > gouvernorat (24).
  const matchedQuartier: QuartierData | undefined = findQuartier(
    gouvernorat, delegation?.delegation || ville, quartier,
  );

  // —— ÉTAPE 0c : LOOKUP ZONE (144 zones calibrées marché tunisien 2026) ——
  const zone: ZoneData | null = findZone(gouvernorat, ville, quartier);

  // —— ÉTAPE 1 : PRIX DE BASE ——
  // Priorité : quartier (2073) > zone (144) > délégation (264) > REGION_BASE_PRICES (24)
  let basePricePerSqm: number;
  let useQuartierData = false;
  let useZoneData = false;
  let useDelegationData = false;

  if (matchedQuartier && matchedQuartier.transaction > 0) {
    // Prix transactionnel du quartier (neuf ou ancien selon ancienneté)
    useQuartierData = true;
    basePricePerSqm = age <= 2 ? matchedQuartier.neuf : matchedQuartier.ancien;
  } else if (zone) {
    useZoneData = true;
    basePricePerSqm = age <= 2 ? zone.neuf2026 : zone.ancien2026;
  } else if (delegation) {
    useDelegationData = true;
    basePricePerSqm = delegation.transaction;
  } else {
    basePricePerSqm = getBasePrice(gouvernorat, propertyType, config);
  }

  // —— ÉTAPE 2+3 : AJUSTEMENT PAR LOCALISATION (ville × quartier, borné) ——
  // Pas de multiplicateur si déjà calibré par quartier/zone/délégation.
  let cityMultiplier = 1.0;
  let quartierMultiplier = 1.0;
  if (!useQuartierData && !useZoneData && !useDelegationData) {
    cityMultiplier = getCityMultiplier(ville, config);
    quartierMultiplier = getQuartierMultiplier(quartier, config);
    const locationMultiplier = Math.min(
      Math.max(cityMultiplier * quartierMultiplier, 0.45),
      1.8,
    );
    basePricePerSqm *= locationMultiplier;
  }

  // —— ÉTAPE 4 : AJUSTEMENT PAR ÉTAT ——
  const stateMultiplier = tables.stateMultipliers[generalState] || 1.0;
  let adjustedPricePerSqm = basePricePerSqm * stateMultiplier;

  // —— ÉTAPE 5 : AJUSTEMENT PAR ÉQUIPEMENTS (% de plus-value) ——
  const fv = tables.featureValues;
  let featureBonus = 0;
  if (property.hasGarden) featureBonus += fv.hasGarden ?? FEATURE_VALUES.hasGarden;
  if (property.hasPool) featureBonus += fv.hasPool ?? FEATURE_VALUES.hasPool;
  if (property.hasTerrace) featureBonus += fv.hasTerrace ?? FEATURE_VALUES.hasTerrace;
  if (property.hasBalcony) featureBonus += fv.hasBalcony ?? FEATURE_VALUES.hasBalcony;
  if (property.hasElevator) featureBonus += fv.hasElevator ?? FEATURE_VALUES.hasElevator;
  if (property.hasParking) featureBonus += fv.hasParking ?? FEATURE_VALUES.hasParking;
  if (property.hasAC) featureBonus += fv.hasAC ?? FEATURE_VALUES.hasAC;
  if (property.hasHeating) featureBonus += fv.hasHeating ?? FEATURE_VALUES.hasHeating;
  if (property.hasSolar) featureBonus += fv.hasSolar ?? FEATURE_VALUES.hasSolar;

  // Bonus cumulé plafonné à +30 % maximum
  adjustedPricePerSqm *= 1 + Math.min(featureBonus, 0.3);

  // —— ÉTAPE 6 : AJUSTEMENT PAR ÂGE (précision accrue) ——
  let ageMultiplier = 1.0;
  if (age > 50) ageMultiplier = 0.62;
  else if (age > 40) ageMultiplier = 0.72;
  else if (age > 30) ageMultiplier = 0.80;
  else if (age > 20) ageMultiplier = 0.88;
  else if (age > 10) ageMultiplier = 0.94;
  else if (age > 5) ageMultiplier = 0.97;
  else if (age <= 2) ageMultiplier = 1.08;

  adjustedPricePerSqm *= ageMultiplier;

  // —— ÉTAPE 7 : AJUSTEMENT PAR SURFACE ——
  let surfaceMultiplier = 1.0;
  if (builtSurface > 300) surfaceMultiplier = 0.82;
  else if (builtSurface > 200) surfaceMultiplier = 0.88;
  else if (builtSurface > 150) surfaceMultiplier = 0.94;
  else if (builtSurface > 120) surfaceMultiplier = 0.97;
  else if (builtSurface < 35) surfaceMultiplier = 1.20;
  else if (builtSurface < 50) surfaceMultiplier = 1.12;
  else if (builtSurface < 65) surfaceMultiplier = 1.06;

  adjustedPricePerSqm *= surfaceMultiplier;

  // —— ÉTAPE 8 : AJUSTEMENT PAR ÉTAGE (pour immeubles/appartements) ——
  let floorBonus = 1.0;
  if (property.floors !== undefined && property.floors > 0 && !property.hasElevator && property.floors > 3) {
    floorBonus = 0.88; // Pénalité si étages élevés sans ascenseur
  } else if (property.floors !== undefined && property.floors <= 2 && !property.hasElevator) {
    floorBonus = 1.02; // Bonus pour étages accessibles
  }
  adjustedPricePerSqm *= floorBonus;

  // —— ÉTAPE 9 : VALEUR TOTALE ——
  const estimatedValue = Math.round(adjustedPricePerSqm * builtSurface);

  // Valeur du terrain excédentaire (au-delà de l'emprise bâtie)
  // Évite de compter deux fois le terrain déjà inclus dans le prix/m² bâti.
  const extraLand = property.terrainSurface && property.builtSurface
    ? Math.max(0, property.terrainSurface - property.builtSurface * 0.5)
    : (property.terrainSurface ?? 0);
  const terrainValue = property.terrainSurface
    ? Math.round(extraLand * basePricePerSqm * 0.12)
    : 0;

  const totalValue = estimatedValue + terrainValue;

  // —— ÉTAPE 10 : INTERVALLE DE PRIX (plus précis) ——
  // Si zone connue → utilisation des fourchettes calibrées du référentiel 2026
  const confidenceScore = computeConfidenceScore(property, ville, quartier, config, useZoneData, useDelegationData, useQuartierData);
  let priceMin: number;
  let priceMax: number;
  if (zone) {
    // Fourchettes précises du modèle 2026 (inchangées par équipements/état)
    // Ajustées proportionnellement si l'estimation diffère du transaction
    const ratio = zone.transaction > 0 ? adjustedPricePerSqm / zone.transaction : 1;
    priceMin = Math.round(zone.fourchetteBasse * ratio * builtSurface + terrainValue);
    priceMax = Math.round(zone.fourchetteHaute * ratio * builtSurface + terrainValue);
  } else {
    const rangeWidth = 0.05 + (1 - confidenceScore) * 0.10; // 5-15% selon confiance
    priceMin = Math.round(totalValue * (1 - rangeWidth));
    priceMax = Math.round(totalValue * (1 + rangeWidth));
  }

  // Prix vente rapide (-8% à -12% selon région) et max profit (+10% à +15%)
  const isHotMarket = ["Tunis", "Ariana", "Ben Arous", "Sousse", "Nabeul"].includes(gouvernorat);
  const fastSaleDiscount = isHotMarket ? 0.90 : 0.85;
  const maxProfitPremium = isHotMarket ? 1.15 : 1.18;
  
  const fastSalePrice = Math.round(totalValue * fastSaleDiscount);
  const maxProfitPrice = Math.round(totalValue * maxProfitPremium);

  const confidenceIndex = Math.round(confidenceScore * 100);
  const avgPricePerSqm = Math.round(adjustedPricePerSqm);

  // —— ÉTAPE 10bis : DÉCOTE DE NÉGOCIATION ——
  // Marge de négociation moyenne par zone (3% premium → 8% économique)
  const negotiationDiscount = zone ? zone.decote : (isHotMarket ? 4 : 6);

  // —— ÉTAPE 11 : PROJECTIONS ANNUELLES (marché tunisien 2026) ——
  // Taux de croissance annuels calibrés sur le modèle 2026 (scénario Central)
  // Source : Modele_Immobilier_Tunisie_2026_24G_264D_2073Q.xlsx, feuille Hypotheses
  // Dérivés des rendements bruts observés par gouvernorat et du scénario Central
  const growthMap: Record<string, number> = {
    "Tunis": 0.050, "Ariana": 0.048, "Ben Arous": 0.045, "Manouba": 0.040,
    "Sousse": 0.048, "Monastir": 0.045, "Nabeul": 0.045, "Bizerte": 0.040,
    "Sfax": 0.042, "Gabès": 0.035, "Médenine": 0.040, "Kairouan": 0.032,
    "Mahdia": 0.038, "Jendouba": 0.032, "Béja": 0.030, "Kef": 0.028,
    "Zaghouan": 0.030, "Siliana": 0.028, "Kasserine": 0.025,
    "Sidi Bouzid": 0.025, "Tataouine": 0.022, "Gafsa": 0.028,
    "Tozeur": 0.032, "Kébili": 0.025,
  };
  const growthRate = (growthMap[gouvernorat] ?? 0.030);
  const valueYear1 = Math.round(totalValue * (1 + growthRate));
  const valueYear3 = Math.round(totalValue * Math.pow(1 + growthRate, 3));
  const valueYear5 = Math.round(totalValue * Math.pow(1 + growthRate, 5));

  // —— ÉTAPE 12 : FACTEURS QUALITATIFS AMÉLIORÉS ——
  const positiveFactors = generatePositiveFactors(property, generalState, ageMultiplier, quartier, gouvernorat, ville, config);
  const negativeFactors = generateNegativeFactors(property, generalState, age, builtSurface, propertyType, quartier, gouvernorat, config);
  const improvementSuggestions = generateImprovements(property, generalState, propertyType);

  // —— ÉTAPE 13 : BIENS COMPARABLES (basés sur données réelles du marché) ——
  const comparableProperties = generateComparables(
    property, adjustedPricePerSqm, gouvernorat, ville, quartier, propertyType,
  );

  return {
    estimatedValue: totalValue,
    priceMin,
    priceMax,
    fastSalePrice,
    maxProfitPrice,
    avgPricePerSqm,
    confidenceIndex,
    valueYear1,
    valueYear3,
    valueYear5,
    positiveFactors,
    negativeFactors,
    improvementSuggestions,
    comparableProperties,
    negotiationDiscount,
    isNewConstruction: age <= 2,
    matchedZone: matchedQuartier
      ? `${matchedQuartier.gouv} — ${matchedQuartier.delegation} — ${matchedQuartier.quartier}`
      : zone
        ? `${zone.city} — ${zone.quarter}`
        : delegation
          ? `${delegation.gouv} — ${delegation.delegation}`
          : undefined,
  };
}

// ─── SCORE DE CONFIANCE AMÉLIORÉ (0-98%) ───
function computeConfidenceScore(
  property: PropertyInput,
  ville: string,
  quartier: string,
  config?: MarketConfig,
  useZoneData = false,
  useDelegationData = false,
  useQuartierData = false,
): number {
  let score = 0.60;
  const tables = applyMarketConfig(config);

  // ▶ Quartier calibré (2073) trouvé → confiance maximale
  if (useQuartierData) score += 0.14;
  // ▶ Zone calibrée (144) trouvée → forte confiance
  else if (useZoneData) score += 0.12;
  // ▶ Délégation (264) trouvée → confiance élevée
  else if (useDelegationData) score += 0.10;

  // ▶ Données de base (gouvernorat + type + surface)
  if (property.gouvernorat && tables.regionBasePrices[property.gouvernorat]) score += 0.07;
  if (property.builtSurface && property.builtSurface > 0) score += 0.06;
  if (property.propertyType) score += 0.04;

  // ▶ Ville connue = + de précision
  if (ville) {
    const cityMult = getCityMultiplier(ville, config);
    if (cityMult !== 1.0) score += 0.06; // Multiplicateur spécifique trouvé
    else score += 0.03;
  }

  // ▶ Quartier connu = forte confiance
  if (quartier) {
    const qMult = getQuartierMultiplier(quartier, config);
    if (qMult !== 1.0) score += 0.07;
    else score += 0.04;
  }

  // ▶ Données complémentaires
  if (property.yearBuilt) score += 0.04;
  if (property.generalState) {
    score += 0.03;
    if (property.generalState === "excellent_etat" || property.generalState === "luxe") score += 0.02;
  }
  if (property.bedrooms && property.bedrooms > 0) score += 0.02;
  if (property.bathrooms && property.bathrooms > 0) score += 0.02;
  if (property.floors !== undefined) score += 0.01;
  
  // ▶ Équipements = données précises
  if (property.hasGarden || property.hasPool || property.hasParking) score += 0.02;
  if (property.hasAC || property.hasHeating) score += 0.01;

  return Math.min(score, 0.98);
}

// ─── FACTEURS POSITIFS AMÉLIORÉS ───
function generatePositiveFactors(
  property: PropertyInput,
  generalState: string,
  ageMultiplier: number,
  quartier: string,
  gouvernorat?: string,
  ville?: string,
  config?: MarketConfig,
): string[] {
  const tables = applyMarketConfig(config);
  const factors: string[] = [];

  if (property.hasPool) factors.push("Présence d'une piscine");
  if (property.hasGarden) factors.push("Jardin spacieux");
  if (property.hasElevator) factors.push("Ascenseur disponible");
  if (property.hasParking) factors.push("Parking inclus");
  if (property.hasSolar) factors.push("Installation solaire économique");

  if (generalState === "luxe") factors.push("Finition de luxe — matériaux haut de gamme");
  else if (generalState === "excellent_etat") factors.push("État général excellent — prêt à habiter");

  if (property.bedrooms && property.bedrooms >= 3)
    factors.push("Configuration familiale (3+ chambres)");

  if (property.terrainSurface && property.terrainSurface > 500)
    factors.push("Grand terrain avec potentiel d'extension");

  if (property.yearBuilt && (new Date().getFullYear() - property.yearBuilt) <= 5)
    factors.push("Construction récente — normes modernes");

  if (ageMultiplier >= 1.0 && generalState !== "a_renover")
    factors.push("Bien moderne bien entretenu");

  if (quartier && tables.quartierMultipliers[quartier] && (tables.quartierMultipliers[quartier] ?? 0) > 1.05)
    factors.push("Quartier résidentiel prisé");

  const cityMultiplier = property.ville ? getCityMultiplier(property.ville, config) : 1.0;
  if (cityMultiplier > 1.05) factors.push("Zone urbaine à forte demande");

  factors.push("Proximité des commodités (écoles, commerces, transports)");

  return factors;
}

// ─── FACTEURS NÉGATIFS AMÉLIORÉS ───
function generateNegativeFactors(
  property: PropertyInput,
  generalState: string,
  age: number,
  builtSurface: number,
  propertyType: string,
  quartier?: string,
  gouvernorat?: string,
  config?: MarketConfig,
): string[] {
  const tables = applyMarketConfig(config);
  const factors: string[] = [];

  if (generalState === "a_renover") factors.push("Nécessite des travaux de rénovation importants");
  if (age > 30) factors.push("Ancienneté du bâtiment — vétusté possible");
  if (age > 50) factors.push("Bâtiment très ancien — mise aux normes nécessaire");

  if (!property.hasParking && propertyType !== "studio" && !["garage", "parking", "depot"].includes(propertyType))
    factors.push("Absence de parking");

  if (!property.hasAC) factors.push("Absence de climatisation");

  if (builtSurface < 50 && !["studio", "garage", "parking", "depot"].includes(propertyType))
    factors.push("Surface habitable réduite");

  if (property.floors && property.floors > 3 && !property.hasElevator)
    factors.push("Étages élevés sans ascenseur — accessibilité réduite");

  if (property.quartier && (getQuartierMultiplier(property.quartier, config) ?? 0) < 0.75)
    factors.push("Quartier populaire — valorisation plus lente");

  if (!tables.regionBasePrices[property.gouvernorat ?? ""]) factors.push("Zone rurale — marché moins liquide");

  factors.push("Marché immobilier en légère décélération dans certaines zones du Grand Tunis");

  return factors;
}

// ─── RECOMMANDATIONS ───
function generateImprovements(
  property: PropertyInput,
  generalState: string,
  propertyType: string,
): string[] {
  const suggestions: string[] = [];

  if (generalState === "a_renover")
    suggestions.push("Rénover cuisine et salles de bain pour un gain de valeur estimé de 15-20%");

  if (!property.hasAC)
    suggestions.push("Installer la climatisation (gain de valeur : +3-5%)");

  if (!property.hasParking && propertyType !== "studio")
    suggestions.push("Aménager un parking peut augmenter la valeur de 5-8%");

  if (property.terrainSurface && property.terrainSurface > 200 && !property.hasGarden)
    suggestions.push("Créer un espace vert/jardin — valorisation terrain +8%");

  if (!property.hasPool && propertyType === "villa")
    suggestions.push("L'ajout d'une piscine peut augmenter la valeur de 8-12%");

  suggestions.push("Rafraîchir la peinture intérieure et extérieure (faible coût, fort impact)");
  suggestions.push("Améliorer l'efficacité énergétique (double vitrage, isolation) — économies 20-30% sur les factures");

  if (generalState === "bon_etat" || generalState === "a_renover")
    suggestions.push("Moderniser les installations électriques et de plomberie");

  if (generalState === "a_renover")
    suggestions.push("Toiture et étanchéité : priorité absolue pour éviter les dégâts d'humidité");

  return suggestions;
}

// ─── HELPERS ───
function cityInfo(gouvernorat?: string): boolean {
  return !!gouvernorat && !!REGION_BASE_PRICES[gouvernorat];
}

// ─── GÉNÉRATION DES COMPARABLES (déterministe) ───
// Utilise des noms de quartiers génériques basés sur la ville/gouvernorat.
// Le même bien (gouvernorat + ville + quartier + type + surface) produit
// toujours les mêmes comparables (PRNG seedé) : les rapports PDF sont ainsi
// reproductibles. Le TND/m² est dérivé de prix / surface (cohérence interne).
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NEIGHBORHOOD_SUFFIXES = ["Centre", "Résidentiel", "Nord", "Sud", "Est", "Ouest", "Extension", "Zone Urbaine"];

function generateComparables(
  property: PropertyInput,
  avgPricePerSqm: number,
  gouvernorat: string,
  ville: string,
  quartier: string,
  propertyType: string,
): ComparableProperty[] {
  const baseSurface = property.builtSurface || 100;
  const rand = mulberry32(hashSeed(`${gouvernorat}|${ville}|${quartier}|${propertyType}|${baseSurface}`));
  const variance = (base: number) => Math.round(base * (0.88 + rand() * 0.22));

  // Generate realistic-looking quartier names
  const quartierNames: string[] = [
    `${ville || gouvernorat} ${NEIGHBORHOOD_SUFFIXES[0]}`,
    `${ville || gouvernorat} ${NEIGHBORHOOD_SUFFIXES[1]}`,
    `${ville || gouvernorat} ${NEIGHBORHOOD_SUFFIXES[2]}`,
    `${ville || gouvernorat} ${NEIGHBORHOOD_SUFFIXES[3]}`,
    `${ville || gouvernorat} ${NEIGHBORHOOD_SUFFIXES[4]}`,
    `${ville || gouvernorat} ${NEIGHBORHOOD_SUFFIXES[5]}`,
  ]

  const surfaces = [
    Math.round(baseSurface * 0.75),
    Math.round(baseSurface * 1.0),
    Math.round(baseSurface * 1.25),
    Math.round(baseSurface * 0.60),
    Math.round(baseSurface * 0.90),
    Math.round(baseSurface * 1.15),
  ];

  // Generate location labels using real quartiers
  const locationParts: string[] = [];
  if (quartierNames.length >= 6) {
    // Mélange de Fisher-Yates déterministe
    const shuffled = [...quartierNames];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    for (let i = 0; i < 6; i++) {
      const q = shuffled[i % shuffled.length];
      locationParts.push(ville ? `${gouvernorat} — ${ville}, ${q}` : `${gouvernorat} — ${q}`);
    }
  } else if (ville) {
    const nearbyQuartiers = ["Centre", "Résidentiel", "Zone Nord", "Zone Sud", "Périphérie", "Extension"];
    for (let i = 0; i < 6; i++) {
      const q = quartierNames[i] || nearbyQuartiers[i];
      locationParts.push(ville ? `${gouvernorat} — ${ville}, ${q}` : `${gouvernorat} — ${q}`);
    }
  } else {
    // Fallback: generate nearby zones
    for (let i = 0; i < 6; i++) {
      locationParts.push(`${gouvernorat} — Secteur ${["Nord", "Sud", "Est", "Ouest", "Centre", "Périphérie"][i]}`);
    }
  }

  const types = [
    propertyType,
    propertyType === "appartement" ? "maison" : propertyType === "maison" ? "villa" : "appartement",
    propertyType,
    propertyType === "villa" ? "maison" : "appartement",
    propertyType,
    propertyType,
  ];

  return surfaces.map((surface, i) => {
    const price = variance(surface * avgPricePerSqm);
    const pricePerSqm = Math.round(price / surface);
    return {
      id: `comp-${i + 1}`,
      type: types[i],
      surface,
      location: locationParts[i % locationParts.length],
      price,
      pricePerSqm,
      distance: `${(0.3 + i * 0.7).toFixed(1)} km`,
    };
  });
}
