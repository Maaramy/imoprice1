import { useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, Pressable, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGetRentEstimation } from "../../src/api/rent";
import {
  useGetActiveAgencies,
  useGetAgencyResponsesForRentEstimation,
  useSendRentEstimationToAgency,
} from "../../src/api/agencies";
import {
  Screen,
  ScreenHeader,
  SectionCard,
  Button,
  StatCard,
  LoadingView,
  ErrorView,
  EmptyState,
} from "../../src/components/ui";
import {
  HeroCard,
  PriceRangeBar,
  ScenarioTiles,
  FactorList,
  ComparableList,
  ForecastChart,
  MarketAverageRow,
  AdvisorList,
} from "../../src/components/ResultSections";
import { gradients, colors, radius, spacing } from "../../src/theme/colors";
import { formatTND, formatPerSqm, formatPercent, formatDate } from "../../src/lib/format";
import { RENT_PROPERTY_TYPES_LABELS } from "../../src/lib/labels";
import { buildRentReportHtml } from "../../src/lib/report-html";
import { exportAndShare } from "../../src/lib/pdf";

export default function RentResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const data = useGetRentEstimation(id);
  const [exporting, setExporting] = useState(false);

  // ── Agences partenaires (même démarche que le Web) ──
  const [agencyModal, setAgencyModal] = useState<{ id: string; name: string } | null>(null);
  const [scenario, setScenario] = useState("realiste");
  const [agencyMsg, setAgencyMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sentRecap, setSentRecap] = useState<{ scenario: string; price: number; name: string } | null>(null);
  const sendRentToAgency = useSendRentEstimationToAgency();
  const agencies = useGetActiveAgencies((data as any)?.property?.gouvernorat);
  const agencyResponses = useGetAgencyResponsesForRentEstimation(id);

  if (data === undefined) return <LoadingView label="Chargement du rapport…" />;
  if (!data) return <ErrorView message="Estimation introuvable." onRetry={() => router.back()} />;

  const r = data as any;
  const p = r.property ?? {};
  const location = [p.quartier, p.ville, p.gouvernorat].filter(Boolean).join(" — ") || "Localisation non précisée";
  const typeLabel = RENT_PROPERTY_TYPES_LABELS[p.propertyType ?? ""] ?? p.propertyType ?? "Bien";

  const scenarios = [
    { key: "prudent", label: "Prudent", price: r.rentMin, desc: "Loyer d'appel", color: "#f59e0b" },
    { key: "realiste", label: "Réaliste", price: r.estimatedRent, desc: "Recommandé", color: colors.accent },
    { key: "optimiste", label: "Optimiste", price: r.rentMax, desc: "Bien valorisé", color: colors.primary },
  ];

  const sendToAgency = async () => {
    if (!agencyModal || !id) return;
    setSending(true);
    try {
      await sendRentToAgency({
        rentEstimationId: id,
        agencyPartnerId: agencyModal.id,
        message: agencyMsg.trim() || undefined,
        rentPriceScenario: scenario,
      });
      const sc = scenarios.find((s) => s.key === scenario) ?? scenarios[1];
      setSentRecap({ scenario: sc.label, price: sc.price, name: agencyModal.name });
    } catch (e: any) {
      Alert.alert("Erreur", e?.data?.message || e?.message || "Impossible d'envoyer l'estimation");
    } finally {
      setSending(false);
    }
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      await exportAndShare(buildRentReportHtml(r, p), `imoprice-loyer-${id.slice(0, 6)}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const shareText = async () => {
    const night = r.nightly?.nightlyRent
      ? `\nNuitée courte durée : ${formatTND(r.nightly.nightlyRent)}/nuit · Revenu annuel ${formatTND(r.nightly.annualRevenue)}\n`
      : "";
    await Share.share({
      title: "Estimation loyer — imoprice AI",
      message:
        `🔑 ${typeLabel} — ${location}\n` +
        `Loyer mensuel recommandé : ${formatTND(r.estimatedRent)}\n` +
        `Fourchette : ${formatTND(r.rentMin)} – ${formatTND(r.rentMax)}\n` +
        `Prix au m² : ${formatPerSqm(r.rentPerSqm)} · Rendement ${formatPercent(r.grossYield)}\n` +
        night +
        `— via l'application imoprice AI`,
    });
  };

  const trendColor =
    r.forecastSummary?.trend === "hausse"
      ? colors.success
      : r.forecastSummary?.trend === "baisse"
        ? colors.danger
        : colors.muted;

  return (
    <Screen>
      <ScreenHeader title="Rapport de location" subtitle="Loyer mensuel · BIM Engine" onBack={() => router.back()} />

      <HeroCard
        gradient={gradients.heroRent}
        badge={`${typeLabel} · Loyer mensuel`}
        label={location}
        value={formatTND(r.estimatedRent)}
        sub={`${formatPerSqm(r.rentPerSqm)}/mois · ${formatDate(r.createdAt)}`}
        confidence={r.confidenceIndex}
      />

      <PriceRangeBar min={r.rentMin} recommended={r.estimatedRent} max={r.rentMax} />

      <SectionCard title="Scénarios de loyer" icon="pricetags">
        <ScenarioTiles
          scenarios={[
            { key: "prudent", label: "Prudent", value: formatTND(r.rentMin), desc: "Loyer d'appel", color: "#f59e0b" },
            { key: "realiste", label: "Réaliste", value: formatTND(r.estimatedRent), desc: "Recommandé", color: colors.accent },
            { key: "optimiste", label: "Optimiste", value: formatTND(r.rentMax), desc: "Bien valorisé", color: colors.primary },
          ]}
        />
      </SectionCard>

      {r.nightly?.nightlyRent ? (
        <SectionCard title="Location par nuitée · courte durée" icon="moon">
          <View style={styles.nightHero}>
            <Text style={styles.nightValue}>{formatTND(r.nightly.nightlyRent)}<Text style={styles.nightUnit}> / nuit</Text></Text>
            <Text style={styles.nightSub}>
              Fourchette {formatTND(r.nightly.nightlyMin)} – {formatTND(r.nightly.nightlyMax)} · Occupation {r.nightly.occupancyRate} %
            </Text>
          </View>
          {r.zoneProfile ? (
            <View style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                <View style={styles.zoneChip}>
                  <Text style={styles.zoneChipText}>{r.zoneProfile.label}</Text>
                </View>
                <View style={styles.zoneChipAlt}>
                  <Text style={styles.zoneChipTextAlt}>
                    {r.zoneProfile.detected ? "détectée par l'IA" : "profil renseigné"} · ×{r.zoneProfile.multiplier}
                  </Text>
                </View>
                {(r.zoneProfile.nearby ?? []).map((n: string) => (
                  <View key={n} style={styles.nearbyChip}>
                    <Text style={styles.nearbyChipText}>{n}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.md }}>
            <StatCard label="Revenu annuel est." value={formatTND(r.nightly.annualRevenue)} small />
            <StatCard label="Rendement courte durée" value={formatPercent(r.nightly.nightlyYield)} small color={colors.accent} />
          </View>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <StatCard label="Semaine (7 nuits)" value={formatTND(r.nightly.weeklyEstimate)} small />
            <StatCard label="Mois courte durée" value={formatTND(r.nightly.monthlyEstimate)} small />
          </View>

          {r.nightly?.seasons?.length ? (
            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.seasonSectionTitle}>Hôte saisons — tarifs par période</Text>
              {r.nightly.seasons.map((s: any) => {
                const accent =
                  s.key === "haute" ? colors.warning : s.key === "moyenne" ? colors.accent : colors.info;
                return (
                  <View key={s.key} style={[styles.seasonRow, { borderLeftColor: accent }]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={[styles.seasonTitle, { color: accent }]}>{s.label}</Text>
                        {s.isBest ? (
                          <View style={styles.bestChip}>
                            <Text style={styles.bestChipText}>★ Meilleure</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.seasonMonths}>{s.months}</Text>
                      <Text style={styles.seasonTip}>{s.tip}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", marginLeft: spacing.md }}>
                      <Text style={styles.seasonPrice}>
                        {formatTND(s.pricePerNight)}
                        <Text style={styles.seasonUnit}> /nuit</Text>
                      </Text>
                      <Text style={styles.seasonMeta}>
                        {s.occupancyRate}% occ. · {s.revenueShare}% du revenu
                      </Text>
                      <Text style={[styles.seasonMeta, { fontWeight: "700", color: accent }]}>
                        {formatTND(s.revenue)}/saison
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </SectionCard>
      ) : null}

      <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg }}>
        <StatCard label="Prix au m²/mois" value={formatPerSqm(r.rentPerSqm)} />
        <StatCard label="Rendement brut" value={formatPercent(r.grossYield)} color={colors.accent} />
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg }}>
        <StatCard label="Durée moyenne de location" value={`${r.avgRentalDurationMonths} mois`} small />
        <StatCard label="Loyer annuel" value={formatTND(r.annualRent)} small />
      </View>

      <SectionCard title="Prévision des loyers" icon="trending-up">
        <ForecastChart points={r.forecast ?? []} />
        <View style={[styles.trendBox, { borderLeftColor: trendColor }]}>
          <Text style={[styles.trendTitle, { color: trendColor }]}>
            Tendance :{" "}
            {r.forecastSummary?.trend === "hausse" ? "à la hausse" : r.forecastSummary?.trend === "baisse" ? "à la baisse" : "stable"}
          </Text>
          <Text style={styles.trendMsg}>{r.forecastSummary?.message}</Text>
        </View>
      </SectionCard>

      <SectionCard title="Marché locatif" icon="map">
        <MarketAverageRow label="Gouvernorat" value={r.marketAverages?.gouvernorat} level={r.marketAverages?.level} />
        <MarketAverageRow label="Ville" value={r.marketAverages?.ville} level={r.marketAverages?.level} />
        <MarketAverageRow label="Quartier" value={r.marketAverages?.quartier} level={r.marketAverages?.level} />
      </SectionCard>

      <SectionCard title="Analyse IA" icon="analytics">
        <FactorList positive={r.positiveFactors ?? []} negative={r.negativeFactors ?? []} />
      </SectionCard>

      {(r.comparableRentals ?? []).length > 0 ? (
        <SectionCard title="Comparables locatifs" icon="git-compare">
          <ComparableList
            items={r.comparableRentals.map((c: any) => ({
              id: c.id ?? String(Math.random()),
              title: `${c.type} · ${c.surface} m²`,
              subtitle: `${c.quartier} · ${c.distance}${c.furnished ? " · Meublé" : ""}`,
              value: formatTND(c.rent),
              perSqm: formatPerSqm(c.rentPerSqm),
            }))}
            formatValue={formatTND}
          />
        </SectionCard>
      ) : null}

      {(r.advisor?.questions ?? []).length > 0 ? (
        <SectionCard title="Conseiller IA" icon="sparkles">
          <AdvisorList questions={r.advisor.questions} />
        </SectionCard>
      ) : null}

      {/* ═══ AGENCES PARTENAIRES ═══ */}
      <SectionCard title="Agences partenaires" icon="business">
        {agencies === undefined ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.xl }} />
        ) : agencies.length === 0 ? (
          <EmptyState
            icon="business-outline"
            title={`Aucune agence à ${p.gouvernorat || "votre région"}`}
            subtitle="Les agences partenaires de votre région apparaîtront ici."
          />
        ) : (
          agencies.map((a: any) => (
            <View key={a._id} style={styles.agencyRow}>
              <View style={styles.agencyInfo}>
                <Text style={styles.agencyName} numberOfLines={1}>
                  {a.name}
                </Text>
                <Text style={styles.agencyMeta} numberOfLines={1}>
                  {a.address}
                  {a.regions?.length ? ` · ${a.regions.join(", ")}` : ""}
                </Text>
                <Text style={styles.agencyMeta}>{a.phone}</Text>
              </View>
              <View style={styles.agencyActions}>
                <Button
                  variant="outline"
                  size="sm"
                  title="Appeler"
                  icon="call"
                  onPress={() => a.phone && Linking.openURL(`tel:${a.phone}`)}
                />
                <Button
                  variant="rent"
                  size="sm"
                  title="Envoyer"
                  icon="send"
                  onPress={() => {
                    setAgencyModal({ id: a._id, name: a.name });
                    setScenario("realiste");
                    setAgencyMsg("");
                    setSentRecap(null);
                  }}
                />
              </View>
            </View>
          ))
        )}
      </SectionCard>

      {/* ═══ RÉPONSES DES AGENCES (contre-offres de loyer) ═══ */}
      {agencyResponses !== undefined && agencyResponses.length > 0 ? (
        <SectionCard title="Réponses des agences" icon="chatbubbles">
          {agencyResponses.map((res: any) => {
            const diff = res.estimatedRent
              ? Math.round(((res.suggestedPrice - res.estimatedRent) / res.estimatedRent) * 100)
              : 0;
            return (
              <View key={res._id} style={styles.responseRow}>
                <View style={styles.responseHeader}>
                  <Text style={styles.agencyName} numberOfLines={1}>
                    {res.agencyName}
                  </Text>
                  <Text style={[styles.responseDiff, { color: diff >= 0 ? colors.success : colors.warning }]}>
                    {diff >= 0 ? "+" : ""}
                    {diff}% vs estimé
                  </Text>
                </View>
                <Text style={styles.responsePrice}>
                  {formatTND(res.suggestedPrice)} <Text style={styles.responseUnit}>/ mois</Text>
                </Text>
                {res.agencyMessage ? (
                  <Text style={styles.responseMsg}>“{res.agencyMessage}”</Text>
                ) : null}
              </View>
            );
          })}
        </SectionCard>
      ) : null}

      <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.sm }}>
        <Button title="PDF" variant="rent" icon="document-text" onPress={exportPdf} loading={exporting} style={{ flex: 1 }} />
        <Button title="Partager" variant="ghost" icon="share-social" onPress={shareText} style={{ flex: 1 }} />
      </View>

      {/* ═══ MODAL ENVOI À UNE AGENCE (scénario + aperçu) ═══ */}
      <Modal
        visible={!!agencyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAgencyModal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setAgencyModal(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            {sentRecap ? (
              <View>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Estimation envoyée</Text>
                  <Pressable
                    onPress={() => {
                      setAgencyModal(null);
                      setSentRecap(null);
                    }}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={22} color={colors.muted} />
                  </Pressable>
                </View>
                <View style={styles.recapBox}>
                  <Ionicons name="checkmark-circle" size={36} color={colors.success} />
                  <Text style={styles.recapTitle}>Envoyée à {sentRecap.name}</Text>
                  <Text style={styles.recapText}>
                    Scénario envoyé : {sentRecap.scenario} · {formatTND(sentRecap.price)}/mois
                  </Text>
                  {r.nightly?.nightlyRent ? (
                    <Text style={styles.recapText}>
                      Aussi visible par l'agence : {formatTND(r.nightly.nightlyRent)}/nuit
                    </Text>
                  ) : null}
                </View>
                <Button
                  title="Fermer"
                  onPress={() => {
                    setAgencyModal(null);
                    setSentRecap(null);
                  }}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            ) : (
              <View>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Envoyer à {agencyModal?.name}</Text>
                  <Pressable onPress={() => setAgencyModal(null)} hitSlop={8}>
                    <Ionicons name="close" size={22} color={colors.muted} />
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>Scénario de loyer à partager</Text>
                <View style={styles.scenarioRow}>
                  {scenarios.map((s) => {
                    const active = scenario === s.key;
                    return (
                      <Pressable
                        key={s.key}
                        onPress={() => setScenario(s.key)}
                        style={[
                          styles.scenarioTile,
                          active && { borderColor: s.color, backgroundColor: `${s.color}15` },
                        ]}
                      >
                        <View style={[styles.scenarioDot, { backgroundColor: s.color }]} />
                        <Text style={styles.scenarioLabel}>{s.label}</Text>
                        <Text style={styles.scenarioPrice}>{formatTND(s.price)}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.previewBox}>
                  <Text style={styles.previewTitle}>
                    Aperçu de ce que {agencyModal?.name} recevra
                  </Text>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewKey}>Bien</Text>
                    <Text style={styles.previewValue}>
                      {typeLabel} · {p.builtSurface ? `${p.builtSurface} m²` : "surface —"} · {location}
                    </Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewKey}>Scénario</Text>
                    <Text style={styles.previewValue}>
                      {scenarios.find((s) => s.key === scenario)?.label} ·{" "}
                      {formatTND(scenarios.find((s) => s.key === scenario)!.price)}/mois
                    </Text>
                  </View>
                  {r.nightly?.nightlyRent ? (
                    <View style={styles.previewRow}>
                      <Text style={styles.previewKey}>Nuitée</Text>
                      <Text style={styles.previewValue}>{formatTND(r.nightly.nightlyRent)}/nuit</Text>
                    </View>
                  ) : null}
                  <View style={styles.previewRow}>
                    <Text style={styles.previewKey}>Coordonnées</Text>
                    <Text style={styles.previewValue}>Nom · Email · Téléphone inclus</Text>
                  </View>
                </View>

                <TextInput
                  value={agencyMsg}
                  onChangeText={setAgencyMsg}
                  placeholder="Bonjour, je souhaite confier la gestion locative de mon bien à votre agence..."
                  placeholderTextColor={colors.muted}
                  multiline
                  style={styles.msgInput}
                />

                <Button
                  title="Envoyer l'estimation"
                  variant="rent"
                  icon="send"
                  loading={sending}
                  onPress={sendToAgency}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nightHero: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  nightValue: { fontSize: 26, fontWeight: "800", color: colors.text },
  nightUnit: { fontSize: 15, fontWeight: "600", color: colors.muted },
  nightSub: { fontSize: 12.5, color: colors.muted, marginTop: 6 },
  zoneChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  zoneChipText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  zoneChipAlt: {
    backgroundColor: colors.bg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  zoneChipTextAlt: { fontSize: 12, fontWeight: "600", color: colors.muted },
  nearbyChip: {
    backgroundColor: "#eef2ff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  nearbyChipText: { fontSize: 12, fontWeight: "600", color: "#4338ca" },
  trendBox: {
    marginTop: spacing.md,
    borderLeftWidth: 3,
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: spacing.md,
  },
  trendTitle: { fontSize: 14, fontWeight: "800" },
  trendMsg: { fontSize: 12.5, color: colors.muted, marginTop: 4, lineHeight: 18 },
  /* ── Agences ── */
  agencyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  agencyInfo: { flex: 1, minWidth: 0 },
  agencyName: { fontSize: 14, fontWeight: "700", color: colors.text },
  agencyMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  agencyActions: { gap: 6 },
  /* ── Réponses ── */
  responseRow: {
    backgroundColor: colors.accentLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  responseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 4,
  },
  responseDiff: { fontSize: 11, fontWeight: "700" },
  responsePrice: { fontSize: 16, fontWeight: "800", color: colors.text },
  responseUnit: { fontSize: 12, fontWeight: "600", color: colors.muted },
  responseMsg: {
    fontSize: 12,
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    lineHeight: 17,
  },
  /* ── Modal d'envoi ── */
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: 40,
    maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 },
  scenarioRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
  scenarioTile: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  scenarioDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  scenarioLabel: { fontSize: 11, fontWeight: "700", color: colors.text },
  scenarioPrice: { fontSize: 11, color: colors.muted, marginTop: 2 },
  previewBox: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  previewTitle: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.muted,
    marginBottom: 8,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: 6,
  },
  previewKey: { fontSize: 12, color: colors.muted },
  previewValue: { fontSize: 12, fontWeight: "700", color: colors.text, flex: 1, textAlign: "right" },
  msgInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    minHeight: 84,
    textAlignVertical: "top",
  },
  recapBox: {
    alignItems: "center",
    backgroundColor: colors.accentLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  recapTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 8 },
  recapText: { fontSize: 12.5, color: colors.muted, marginTop: 4, textAlign: "center" },
  /* ── Hôte saisons ── */
  seasonSectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.muted,
    marginBottom: 8,
  },
  seasonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderLeftWidth: 3,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  seasonTitle: { fontSize: 13, fontWeight: "800" },
  bestChip: { backgroundColor: "#fef3c7", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  bestChipText: { fontSize: 9, fontWeight: "700", color: "#b45309" },
  seasonMonths: { fontSize: 11, color: colors.muted, marginTop: 2 },
  seasonTip: { fontSize: 10, color: colors.muted, marginTop: 4, lineHeight: 14 },
  seasonPrice: { fontSize: 15, fontWeight: "800", color: colors.text },
  seasonUnit: { fontSize: 11, fontWeight: "600", color: colors.muted },
  seasonMeta: { fontSize: 10.5, color: colors.muted, marginTop: 2 },
});
