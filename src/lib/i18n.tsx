import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type Lang = "fr" | "ar";

type Dict = Record<string, string>;

const fr: Dict = {
  "nav.dashboard": "Dashboard",
  "nav.estimate": "Estimer",
  "nav.rent": "Loyer",
  "nav.agencies": "Agences",
  "nav.plans": "Forfaits",
  "nav.profile": "Profil",
  "nav.settings": "Paramètres",
  "nav.messages": "Messagerie",
  "nav.map": "Carte",
  "nav.alerts": "Alertes",
  "nav.compare": "Comparer",
  "nav.signout": "Déconnexion",
  "nav.agencySpace": "Espace Agence",
  "nav.admin": "Administration",
  "common.back": "Retour",
  "common.edit": "Modifier",
  "common.share": "Partager",
  "common.pdf": "PDF",
  "common.print": "Imprimer",
  "common.refresh": "Actualiser",
  "common.save": "Enregistrer",
  "common.cancel": "Annuler",
  "common.delete": "Supprimer",
  "common.search": "Rechercher...",
  "common.new": "Nouvelle estimation",
  "common.loading": "Chargement...",
  "common.compare": "Comparer",
  "common.close": "Fermer",
  "common.confirm": "Confirmer",
  "common.send": "Envoyer",
  "dashboard.greeting": "Bonjour",
  "dashboard.stats.estimations": "Estimations",
  "dashboard.stats.confidence": "Confiance moy.",
  "dashboard.stats.value": "Valeur totale",
  "dashboard.stats.properties": "Biens",
  "dashboard.tab.estimations": "Estimations",
  "dashboard.tab.rents": "Loyers",
  "dashboard.tab.messages": "Messagerie",
  "dashboard.tab.map": "Carte",
  "dashboard.tab.alerts": "Alertes",
  "dashboard.compare.select": "Sélectionner pour comparer",
  "dashboard.compare.selected": "sélectionné(s)",
  "dashboard.alerts.title": "Alertes prix du marché",
  "dashboard.alerts.empty": "Aucune alerte. Créez une alerte pour être averti quand le prix du marché atteint votre seuil.",
  "dashboard.alerts.create": "Nouvelle alerte",
  "dashboard.alerts.target": "Prix cible (TND/m²)",
  "dashboard.alerts.direction.above": "Me prévenir si le prix dépasse",
  "dashboard.alerts.direction.below": "Me prévenir si le prix baisse",
  "dashboard.alerts.status.active": "Active",
  "dashboard.alerts.status.triggered": "Déclenchée",
  "estimate.result.value": "Valeur estimée",
  "estimate.result.fast": "Vente rapide",
  "estimate.result.profit": "Max profit",
  "estimate.result.min": "Min",
  "estimate.result.max": "Max",
  "estimate.result.perSqm": "Prix / m²",
  "estimate.result.governorat": "Gouvernorat",
  "estimate.result.type": "Type",
  "estimate.result.surface": "Surface",
  "estimate.result.tabs.overview": "Aperçu",
  "estimate.result.tabs.evolution": "Évolution",
  "estimate.result.tabs.analysis": "Analyse",
  "estimate.result.tabs.agencies": "Agences",
  "estimate.result.simulator.title": "Simulateur de crédit",
  "estimate.result.simulator.price": "Prix du bien",
  "estimate.result.simulator.down": "Apport initial",
  "estimate.result.simulator.rate": "Taux annuel",
  "estimate.result.simulator.duration": "Durée",
  "estimate.result.simulator.monthly": "Mensualité",
  "estimate.result.simulator.interest": "Total intérêts",
  "estimate.result.simulator.total": "Coût total",
  "estimate.result.alert.create": "Créer une alerte prix",
  "estimate.result.alert.created": "Alerte créée",
  "estimate.result.history": "Historique de la valeur",
  "compare.title": "Comparateur de biens",
  "compare.empty": "Aucun bien sélectionné.",
  "compare.back": "Retour au dashboard",
  "compare.add": "Ajouter des biens",
  "compare.metric.value": "Valeur estimée",
  "compare.metric.range": "Fourchette",
  "compare.metric.fast": "Vente rapide",
  "compare.metric.profit": "Max profit",
  "compare.metric.perSqm": "Prix / m²",
  "compare.metric.confidence": "Confiance",
  "compare.metric.surface": "Surface",
  "compare.metric.location": "Localisation",
  "compare.metric.type": "Type",
  "compare.metric.year": "Évolution 1 an",
  "compare.metric.year3": "Évolution 3 ans",
  "compare.metric.year5": "Évolution 5 ans",
  "compare.metric.rent": "Loyer mensuel",
  "compare.metric.yield": "Rendement / an",
  "rent.result.reestimate": "Re-estimer",
  "rent.result.history": "Historique des loyers",
  "settings.language": "Langue / اللغة",
  "settings.language.desc": "Choisissez la langue de l'interface.",
  "lang.fr": "Français",
  "lang.ar": "العربية",
};

const ar: Dict = {
  "nav.dashboard": "لوحة القيادة",
  "nav.estimate": "تقدير",
  "nav.rent": "الإيجار",
  "nav.agencies": "الوكالات",
  "nav.plans": "الباقات",
  "nav.profile": "الملف الشخصي",
  "nav.settings": "الإعدادات",
  "nav.messages": "الرسائل",
  "nav.map": "الخريطة",
  "nav.alerts": "التنبيهات",
  "nav.compare": "مقارنة",
  "nav.signout": "تسجيل الخروج",
  "nav.agencySpace": "فضاء الوكالة",
  "nav.admin": "الإدارة",
  "common.back": "رجوع",
  "common.edit": "تعديل",
  "common.share": "مشاركة",
  "common.pdf": "PDF",
  "common.print": "طباعة",
  "common.refresh": "تحديث",
  "common.save": "حفظ",
  "common.cancel": "إلغاء",
  "common.delete": "حذف",
  "common.search": "بحث...",
  "common.new": "تقدير جديد",
  "common.loading": "جارٍ التحميل...",
  "common.compare": "مقارنة",
  "common.close": "إغلاق",
  "common.confirm": "تأكيد",
  "common.send": "إرسال",
  "dashboard.greeting": "مرحباً",
  "dashboard.stats.estimations": "التقديرات",
  "dashboard.stats.confidence": "متوسط الثقة",
  "dashboard.stats.value": "القيمة الإجمالية",
  "dashboard.stats.properties": "العقارات",
  "dashboard.tab.estimations": "التقديرات",
  "dashboard.tab.rents": "الإيجارات",
  "dashboard.tab.messages": "الرسائل",
  "dashboard.tab.map": "الخريطة",
  "dashboard.tab.alerts": "التنبيهات",
  "dashboard.compare.select": "تحديد للمقارنة",
  "dashboard.compare.selected": "محدد",
  "dashboard.alerts.title": "تنبيهات أسعار السوق",
  "dashboard.alerts.empty": "لا توجد تنبيهات. أنشئ تنبيهاً ليتم إشعارك عندما يصل سعر السوق إلى حدّك.",
  "dashboard.alerts.create": "تنبيه جديد",
  "dashboard.alerts.target": "السعر المستهدف (د.ت/م²)",
  "dashboard.alerts.direction.above": "أخبرني إذا تجاوز السعر",
  "dashboard.alerts.direction.below": "أخبرني إذا انخفض السعر",
  "dashboard.alerts.status.active": "نشط",
  "dashboard.alerts.status.triggered": "تم التفعيل",
  "estimate.result.value": "القيمة المقدَّرة",
  "estimate.result.fast": "بيع سريع",
  "estimate.result.profit": "أقصى ربح",
  "estimate.result.min": "الحد الأدنى",
  "estimate.result.max": "الحد الأقصى",
  "estimate.result.perSqm": "السعر / م²",
  "estimate.result.governorat": "الولاية",
  "estimate.result.type": "النوع",
  "estimate.result.surface": "المساحة",
  "estimate.result.tabs.overview": "نظرة عامة",
  "estimate.result.tabs.evolution": "التطور",
  "estimate.result.tabs.analysis": "التحليل",
  "estimate.result.tabs.agencies": "الوكالات",
  "estimate.result.simulator.title": "محاكي القرض العقاري",
  "estimate.result.simulator.price": "سعر العقار",
  "estimate.result.simulator.down": "الدفعة الأولى",
  "estimate.result.simulator.rate": "نسبة الفائدة السنوية",
  "estimate.result.simulator.duration": "المدة",
  "estimate.result.simulator.monthly": "القسط الشهري",
  "estimate.result.simulator.interest": "إجمالي الفوائد",
  "estimate.result.simulator.total": "التكلفة الإجمالية",
  "estimate.result.alert.create": "إنشاء تنبيه سعر",
  "estimate.result.alert.created": "تم إنشاء التنبيه",
  "estimate.result.history": "تاريخ القيمة",
  "compare.title": "مقارنة العقارات",
  "compare.empty": "لم يتم تحديد أي عقار.",
  "compare.back": "العودة إلى لوحة القيادة",
  "compare.add": "إضافة عقارات",
  "compare.metric.value": "القيمة المقدَّرة",
  "compare.metric.range": "النطاق",
  "compare.metric.fast": "بيع سريع",
  "compare.metric.profit": "أقصى ربح",
  "compare.metric.perSqm": "السعر / م²",
  "compare.metric.confidence": "الثقة",
  "compare.metric.surface": "المساحة",
  "compare.metric.location": "الموقع",
  "compare.metric.type": "النوع",
  "compare.metric.year": "التطور سنة",
  "compare.metric.year3": "التطور 3 سنوات",
  "compare.metric.year5": "التطور 5 سنوات",
  "compare.metric.rent": "الإيجار الشهري",
  "compare.metric.yield": "العائد السنوي",
  "rent.result.reestimate": "إعادة التقدير",
  "rent.result.history": "تاريخ الإيجارات",
  "settings.language": "Langue / اللغة",
  "settings.language.desc": "اختر لغة الواجهة.",
  "lang.fr": "Français",
  "lang.ar": "العربية",
};

const DICTS: Record<Lang, Dict> = { fr, ar };

interface I18nContextValue {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "baticost_lang";

function getInitialLang(): Lang {
  if (typeof window === "undefined") return "fr";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "ar" || stored === "fr") return stored;
  return "fr";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const dir: "ltr" | "rtl" = lang === "ar" ? "rtl" : "ltr";

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // localStorage peut être indisponible en sandbox
    }
  };

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    // Mise en page RTL : on laisse Tailwind gérer via `dir` + logical props,
    // on n'ajoute qu'une classe utilitaire pour le body.
    document.body.classList.toggle("lang-ar", lang === "ar");
    return () => {
      document.body.classList.remove("lang-ar");
    };
  }, [lang]);

  const t = (key: string) => DICTS[lang][key] ?? DICTS.fr[key] ?? key;

  return (
    <I18nContext.Provider value={{ lang, dir, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  // Hors provider (ex. tests unitaires), on retombe sur le français.
  if (!ctx) {
    return {
      lang: "fr",
      dir: "ltr",
      setLang: () => {},
      t: (key: string) => DICTS.fr[key] ?? key,
    };
  }
  return ctx;
}

/** Bascule FR / العربية — compacte, utilisable dans n'importe quel header. */
export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "fr" ? "ar" : "fr")}
      title={lang === "fr" ? "العربية" : "Français"}
      aria-label={lang === "fr" ? "Passer en arabe" : "Switch to French"}
      className={`inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 px-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shrink-0 ${className}`}
    >
      <span className="size-1.5 rounded-full bg-blue-500" aria-hidden="true" />
      {lang === "fr" ? "العربية" : "FR"}
    </button>
  );
}
