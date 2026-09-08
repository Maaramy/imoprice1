import type {
  EstimationResultData,
  PropertyDoc,
  RentEstimationResult,
  RentPropertyInput,
} from "../api/types";
import { formatTND, formatPerSqm, formatPercent, formatDate } from "./format";
import { PROPERTY_TYPES_LABELS, RENT_FINISH_LABELS, PROPERTY_STATES_LABELS } from "./labels";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function shell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; }
  body { margin: 0; padding: 24px; color: #0f172a; background: #fff; }
  .brand { color: #2563eb; font-weight: 800; font-size: 20px; }
  .brand span { color: #4f46e5; }
  .muted { color: #64748b; }
  h1 { font-size: 22px; margin: 6px 0 2px; }
  h2 { font-size: 15px; margin: 24px 0 10px; color: #1e40af; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
  .hero { background: linear-gradient(135deg,#2563eb,#1e40af); color:#fff; border-radius:16px; padding:20px; margin:16px 0; }
  .hero.rent { background: linear-gradient(135deg,#10b981,#064e3b); }
  .hero .big { font-size: 30px; font-weight: 800; margin-top: 4px; }
  .hero .lbl { opacity: .85; font-size: 13px; }
  .grid { display: flex; flex-wrap: wrap; gap: 10px; margin: 12px 0; }
  .tile { flex: 1 1 40%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
  .tile .v { font-size: 17px; font-weight: 700; }
  .tile .l { font-size: 11px; color: #64748b; margin-top: 2px; }
  ul { margin: 6px 0; padding-left: 18px; }
  li { margin-bottom: 5px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td, th { padding: 8px 6px; border-bottom: 1px solid #e2e8f0; text-align: left; }
  th { color: #64748b; font-size: 11px; text-transform: uppercase; }
  .q { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; margin-bottom: 8px; }
  .q b { color: #2563eb; }
  .q p { font-size: 12.5px; color: #475569; margin: 6px 0 0; line-height: 1.5; }
  .foot { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px; }
</style></head><body>
${body}
<div class="foot">Rapport généré par imoprice AI — estimation IA du marché immobilier tunisien · ${esc(formatDate(Date.now()))}</div>
</body></html>`;
}

function propertyBlock(property: PropertyDoc | RentPropertyInput | undefined) {
  if (!property) return "";
  const p = property as any;
  const loc = [p.quartier, p.ville, p.gouvernorat].filter(Boolean).join(" — ") || "Localisation non précisée";
  return `<p class="muted">${esc(loc)} · ${esc(PROPERTY_TYPES_LABELS[p.propertyType] ?? p.propertyType ?? "—")} · ${p.builtSurface ? `${p.builtSurface} m²` : ""} · ${p.yearBuilt ?? ""}</p>`;
}

/** Rapport d'estimation VENTE. */
export function buildSaleReportHtml(
  result: EstimationResultData,
  property: PropertyDoc | undefined,
): string {
  const body = `
<div class="brand">imo<span>price</span> AI</div>
<h1>Rapport d'estimation — Vente / Achat</h1>
${propertyBlock(property)}
<div class="hero">
  <div class="lbl">Valeur marchande estimée</div>
  <div class="big">${formatTND(result.estimatedValue)}</div>
  <div class="lbl" style="margin-top:4px">${formatPerSqm(result.avgPricePerSqm)} · Fiabilité ${result.confidenceIndex} %</div>
</div>
<h2>Scénarios de prix</h2>
<div class="grid">
  <div class="tile"><div class="v">${formatTND(result.fastSalePrice)}</div><div class="l">Vente rapide (prudent)</div></div>
  <div class="tile"><div class="v">${formatTND(result.estimatedValue)}</div><div class="l">Réaliste (recommandé)</div></div>
  <div class="tile"><div class="v">${formatTND(result.maxProfitPrice)}</div><div class="l">Optimiste (prix affiché)</div></div>
  <div class="tile"><div class="v">${formatTND(result.priceMin)} – ${formatTND(result.priceMax)}</div><div class="l">Fourchette du marché</div></div>
</div>
<h2>Projection de valeur</h2>
<div class="grid">
  <div class="tile"><div class="v">${formatTND(result.valueYear1)}</div><div class="l">1 an</div></div>
  <div class="tile"><div class="v">${formatTND(result.valueYear3)}</div><div class="l">3 ans</div></div>
  <div class="tile"><div class="v">${formatTND(result.valueYear5)}</div><div class="l">5 ans</div></div>
</div>
<h2>Points forts &amp; vigilance</h2>
<h3 class="muted">Points forts</h3>
<ul>${result.positiveFactors.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
<h3 class="muted">Points de vigilance</h3>
<ul>${result.negativeFactors.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
<h2>Biens comparables</h2>
<table><tr><th>Type</th><th>Localisation</th><th>Surface</th><th>Prix</th><th>TND/m²</th></tr>
${(result.comparableProperties ?? [])
  .map(
    (c) =>
      `<tr><td>${esc(c.type)}</td><td>${esc(c.location)}</td><td>${c.surface} m²</td><td>${formatTND(c.price)}</td><td>${formatTND(c.pricePerSqm)}/m²</td></tr>`,
  )
  .join("")}
</table>
<h2>Recommandations IA</h2>
<ul>${(result.improvementSuggestions ?? []).map((f) => `<li>${esc(f)}</li>`).join("")}</ul>`;
  return shell("Rapport d'estimation vente — imoprice AI", body);
}

/** Rapport d'estimation LOYER. */
export function buildRentReportHtml(
  result: RentEstimationResult,
  property: RentPropertyInput | undefined,
): string {
  const level = result.marketAverages?.level;
  const body = `
<div class="brand">imo<span>price</span> AI</div>
<h1>Rapport d'estimation — Location</h1>
${propertyBlock(property)}
<div class="hero rent">
  <div class="lbl">Loyer mensuel recommandé</div>
  <div class="big">${formatTND(result.estimatedRent)}</div>
  <div class="lbl" style="margin-top:4px">${formatPerSqm(result.rentPerSqm)} · Fiabilité ${result.confidenceIndex} %</div>
</div>
<h2>Scénarios de loyer</h2>
<div class="grid">
  <div class="tile"><div class="v">${formatTND(result.rentMin)}</div><div class="l">Prudent (loyer d'appel)</div></div>
  <div class="tile"><div class="v">${formatTND(result.estimatedRent)}</div><div class="l">Réaliste (recommandé)</div></div>
  <div class="tile"><div class="v">${formatTND(result.rentMax)}</div><div class="l">Optimiste (bien valorisé)</div></div>
  <div class="tile"><div class="v">${formatPercent(result.grossYield)} / an</div><div class="l">Rendement brut locatif</div></div>
</div>
${result.nightly && result.nightly.nightlyRent > 0 ? `<h2>Location par nuitée · courte durée</h2>
<div class="grid">
  <div class="tile"><div class="v">${formatTND(result.nightly.nightlyRent)}</div><div class="l">Tarif / nuit recommandé</div></div>
  <div class="tile"><div class="v">${result.nightly.occupancyRate} %</div><div class="l">Taux d'occupation annuel</div></div>
  <div class="tile"><div class="v">${formatTND(result.nightly.annualRevenue)}</div><div class="l">Revenu annuel estimé</div></div>
  <div class="tile"><div class="v">${formatPercent(result.nightly.nightlyYield)}</div><div class="l">Rendement courte durée</div></div>
</div>
${result.zoneProfile ? `<p class="muted">Profil de zone : ${esc(result.zoneProfile.label)}${result.zoneProfile.nearby.length ? " — " + esc(result.zoneProfile.nearby.join(", ")) : ""} · multiplicateur ×${result.zoneProfile.multiplier} vs loyer mensuel/30 j</p>` : ""}
${result.nightly.seasons && result.nightly.seasons.length ? `<p class="sub">Hôte saisons — tarifs par période</p>
<table><tr><th>Saison</th><th>Période</th><th>Tarif / nuit</th><th>Occ.</th><th>Revenu saison</th></tr>
${result.nightly.seasons
  .map((s) => `<tr><td>${esc(s.label)}${s.isBest ? " ★" : ""}</td><td>${esc(s.months)}</td><td>${formatTND(s.pricePerNight)}</td><td>${s.occupancyRate} %</td><td>${formatTND(s.revenue)}</td></tr>`)
  .join("")}
</table>` : ""}
` : ""}
<h2>Prévision des loyers</h2>
<table><tr><th>Horizon</th><th>Loyer mensuel</th><th>Variation</th></tr>
${result.forecast
  .map((f) => {
    const change = f.months === 0 ? "—" : `${((f.rent / result.forecast[0].rent - 1) * 100).toFixed(1)} %`;
    return `<tr><td>${esc(f.label)}</td><td>${formatTND(f.rent)}</td><td>${change}</td></tr>`;
  })
  .join("")}
</table>
<p class="muted">Tendance : ${result.forecastSummary.trend === "hausse" ? "à la hausse" : result.forecastSummary.trend === "baisse" ? "à la baisse" : "stable"} — ${esc(result.forecastSummary.message)}</p>
<h2>Marché locatif (TND/m²/mois)</h2>
<div class="grid">
  <div class="tile"><div class="v">${result.marketAverages.gouvernorat.toFixed(1)}</div><div class="l">Gouvernorat</div></div>
  <div class="tile"><div class="v">${result.marketAverages.ville.toFixed(1)}</div><div class="l">Ville</div></div>
  <div class="tile"><div class="v">${result.marketAverages.quartier.toFixed(1)}</div><div class="l">Quartier · Niveau ${level ?? "—"}</div></div>
</div>
<h2>Points forts &amp; vigilance</h2>
<ul>${result.positiveFactors.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
<h3 class="muted">Points de vigilance</h3>
<ul>${result.negativeFactors.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
<h2>Comparables locatifs</h2>
<table><tr><th>Type</th><th>Quartier</th><th>Surface</th><th>Loyer</th><th>TND/m²</th></tr>
${result.comparableRentals
  .map(
    (c) =>
      `<tr><td>${esc(c.type)}</td><td>${esc(c.quartier)}</td><td>${c.surface} m²</td><td>${formatTND(c.rent)}</td><td>${c.rentPerSqm.toFixed(1)}</td></tr>`,
  )
  .join("")}
</table>
<h2>Conseiller IA</h2>
${result.advisor.questions
  .map((qa) => `<div class="q"><b>${esc(qa.q)}</b><p>${esc(qa.a)}</p></div>`)
  .join("")}`;
  return shell("Rapport d'estimation loyer — imoprice AI", body);
}
