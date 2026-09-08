import { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGetEstimation } from "../../src/api/estimations";
import {
  Screen,
  ScreenHeader,
  SectionCard,
  Button,
  StatCard,
  LoadingView,
  ErrorView,
} from "../../src/components/ui";
import {
  HeroCard,
  PriceRangeBar,
  ScenarioTiles,
  FactorList,
  ComparableList,
} from "../../src/components/ResultSections";
import { gradients, colors, spacing } from "../../src/theme/colors";
import { formatTND, formatPerSqm, formatDate } from "../../src/lib/format";
import { PROPERTY_TYPES_LABELS } from "../../src/lib/labels";
import { buildSaleReportHtml } from "../../src/lib/report-html";
import { exportAndShare, shareFile } from "../../src/lib/pdf";

export default function SaleResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const data = useGetEstimation(id);
  const [exporting, setExporting] = useState(false);

  if (data === undefined) return <LoadingView label="Chargement du rapport…" />;
  if (!data) return <ErrorView message="Estimation introuvable." onRetry={() => router.back()} />;

  const r = data as any;
  const p = r.property ?? {};
  const location = [p.quartier, p.ville, p.gouvernorat].filter(Boolean).join(" — ") || "Localisation non précisée";
  const typeLabel = PROPERTY_TYPES_LABELS[p.propertyType ?? ""] ?? p.propertyType ?? "Bien";

  const exportPdf = async () => {
    setExporting(true);
    try {
      await exportAndShare(buildSaleReportHtml(r, p), `baticost-estimation-${id.slice(0, 6)}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const shareText = async () => {
    await Share.share({
      title: "Estimation immobilière — baticost AI",
      message:
        `🏠 ${typeLabel} — ${location}\n` +
        `Valeur estimée : ${formatTND(r.estimatedValue)}\n` +
        `Fourchette : ${formatTND(r.priceMin)} – ${formatTND(r.priceMax)}\n` +
        `Prix au m² : ${formatPerSqm(r.avgPricePerSqm)} · Fiabilité ${r.confidenceIndex} %\n` +
        `— via l'application baticost AI`,
    });
  };

  return (
    <Screen>
      <ScreenHeader
        title="Rapport d'estimation"
        subtitle="Vente / Achat · BIM Engine"
        onBack={() => router.back()}
      />

      <HeroCard
        gradient={gradients.heroSale}
        badge={typeLabel}
        label={location}
        value={formatTND(r.estimatedValue)}
        sub={`${formatPerSqm(r.avgPricePerSqm)} · ${formatDate(r.createdAt)}`}
        confidence={r.confidenceIndex}
      />

      <PriceRangeBar min={r.priceMin} recommended={r.estimatedValue} max={r.priceMax} />

      <SectionCard title="Scénarios de prix" icon="pricetags">
        <ScenarioTiles
          scenarios={[
            { key: "prudent", label: "Vente rapide", value: formatTND(r.fastSalePrice), desc: "Pour vendre vite", color: "#f59e0b" },
            { key: "realiste", label: "Réaliste", value: formatTND(r.estimatedValue), desc: "Recommandé", color: colors.primary },
            { key: "optimiste", label: "Optimiste", value: formatTND(r.maxProfitPrice), desc: "Prix affiché", color: "#4f46e5" },
          ]}
        />
      </SectionCard>

      <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg }}>
        <StatCard label="Prix au m²" value={formatPerSqm(r.avgPricePerSqm)} />
        <StatCard label="Confiance" value={`${r.confidenceIndex} %`} color={colors.success} />
      </View>

      <SectionCard title="Projection de valeur" icon="trending-up">
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <StatCard label="1 an" value={formatTND(r.valueYear1)} small />
          <StatCard label="3 ans" value={formatTND(r.valueYear3)} small />
          <StatCard label="5 ans" value={formatTND(r.valueYear5)} small />
        </View>
      </SectionCard>

      <SectionCard title="Analyse IA" icon="analytics">
        <FactorList positive={r.positiveFactors ?? []} negative={r.negativeFactors ?? []} />
      </SectionCard>

      {(r.comparableProperties ?? []).length > 0 ? (
        <SectionCard title="Biens comparables" icon="git-compare">
          <ComparableList
            items={r.comparableProperties.map((c: any) => ({
              id: c.id ?? String(Math.random()),
              title: c.type,
              subtitle: `${c.location} · ${c.surface} m² · ${c.distance}`,
              value: formatTND(c.price),
              perSqm: formatPerSqm(c.pricePerSqm),
            }))}
            formatValue={formatTND}
          />
        </SectionCard>
      ) : null}

      {(r.improvementSuggestions ?? []).length > 0 ? (
        <SectionCard title="Recommandations IA" icon="bulb">
          {r.improvementSuggestions.map((s: string, i: number) => (
            <View key={i} style={styles.suggestRow}>
              <Ionicons name="bulb" size={16} color={colors.warning} />
              <Text style={styles.suggestText}>{s}</Text>
            </View>
          ))}
        </SectionCard>
      ) : null}

      <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.sm }}>
        <Button title="PDF" variant="outline" icon="document-text" onPress={exportPdf} loading={exporting} style={{ flex: 1 }} />
        <Button title="Partager" variant="ghost" icon="share-social" onPress={shareText} style={{ flex: 1 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  suggestRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  suggestText: { flex: 1, fontSize: 13.5, color: colors.text, lineHeight: 19 },
});
