import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Seed the partners database
export const seedPartners = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("professionalPartners").take(1);
    if (existing.length > 0) return "already_seeded";

    const partners = [
      // Agences immobilières
      { name: "Immobilier Tunis Prestige", type: "agence" as const, gouvernorat: "Tunis", ville: "Tunis", address: "Avenue Habib Bourguiba, Tunis", phone: "+216 71 000 001", email: "contact@tunis-prestige.tn", description: "Agence immobilière de luxe spécialisée dans les biens haut de gamme à Tunis et sa banlieue.", rating: 4.8, isSubscribed: true },
      { name: "Agence El Mohandes", type: "agence" as const, gouvernorat: "Ariana", ville: "Ariana", address: "Rue du Lac, Ariana", phone: "+216 71 000 002", email: "contact@elmohandes.tn", description: "Expertise immobilière professionnelle pour particuliers et investisseurs.", rating: 4.5, isSubscribed: true },
      { name: "Sousse Immobilier", type: "agence" as const, gouvernorat: "Sousse", ville: "Sousse", address: "Boulevard de l'Environnement, Sousse", phone: "+216 73 000 003", email: "info@sousse-immobilier.tn", description: "Votre partenaire immobilier dans le Sahel tunisien.", rating: 4.3, isSubscribed: true },
      { name: "Sfax Properties", type: "agence" as const, gouvernorat: "Sfax", ville: "Sfax", address: "Route de Gabès, Sfax", phone: "+216 74 000 004", email: "contact@sfax-properties.tn", description: "Agence immobilière de référence à Sfax et dans le Sud.", rating: 4.6, isSubscribed: true },
      { name: "Nabeul Realty", type: "agence" as const, gouvernorat: "Nabeul", ville: "Nabeul", address: "Avenue de la Liberté, Nabeul", phone: "+216 72 000 005", email: "info@nabeulrealty.tn", description: "Spécialiste de l'immobilier dans la péninsule du Cap Bon.", rating: 4.4, isSubscribed: true },

      // Experts immobiliers
      { name: "Expertis Immo Tunisie", type: "expert" as const, gouvernorat: "Tunis", ville: "Tunis", address: "Rue de Marseille, Tunis", phone: "+216 71 100 001", email: "expert@expertis-immo.tn", description: "Cabinet d'expertise immobilière agréé par l'État tunisien. Évaluations professionnelles certifiées.", rating: 4.9, isSubscribed: true },
      { name: "Valuation Pro", type: "expert" as const, gouvernorat: "Sousse", ville: "Sousse", address: "Avenue Habib Bourguiba, Sousse", phone: "+216 73 100 002", email: "contact@valuationpro.tn", description: "Experts en évaluation immobilière depuis 15 ans. Estimations précises et rapides.", rating: 4.7, isSubscribed: true },

      // Notaires
      { name: "Me. Karim Ben Miled", type: "notaire" as const, gouvernorat: "Tunis", ville: "Tunis", address: "Rue d'Angleterre, Tunis", phone: "+216 71 200 001", email: "k.benmiled@notaire.tn", description: "Notaire spécialisé dans les transactions immobilières et la rédaction d'actes de vente.", rating: 4.8, isSubscribed: true },
      { name: "Me. Samia Bouaziz", type: "notaire" as const, gouvernorat: "Ariana", ville: "Ariana", address: "Rue des Jasmins, Ariana", phone: "+216 71 200 002", email: "s.bouaziz@notaire.tn", description: "Étude notariale moderne pour tous vos projets immobiliers.", rating: 4.6, isSubscribed: true },

      // Géomètres
      { name: "Géomètre Topo Service", type: "geometre" as const, gouvernorat: "Tunis", ville: "Tunis", address: "Avenue de Carthage, Tunis", phone: "+216 71 300 001", email: "contact@toposervice.tn", description: "Cabinet de géomètre expert pour vos plans cadastraux et bornage de terrains.", rating: 4.5, isSubscribed: true },
      { name: "GeoPrecis Tunisie", type: "geometre" as const, gouvernorat: "Sfax", ville: "Sfax", address: "Route El Ain, Sfax", phone: "+216 74 300 002", email: "info@geoprecis.tn", description: "Services de topographie et géomatique pour particuliers et professionnels.", rating: 4.3, isSubscribed: true },

      // Architectes
      { name: "Archilab Studio", type: "architecte" as const, gouvernorat: "Tunis", ville: "Tunis", address: "Rue du Saphir, Mutuelleville", phone: "+216 71 400 001", email: "studio@archilab.tn", description: "Studio d'architecture contemporaine. Conception de villas, rénovation et aménagement intérieur.", rating: 4.9, isSubscribed: true },
      { name: "Zaha Architecture", type: "architecte" as const, gouvernorat: "Sousse", ville: "Sousse", address: "Rue de Paris, Sousse", phone: "+216 73 400 002", email: "contact@zaha-archi.tn", description: "Architecte DPLG spécialisé dans les projets résidentiels et commerciaux.", rating: 4.7, isSubscribed: true },

      // Rénovation
      { name: "Rénovation Plus", type: "renovation" as const, gouvernorat: "Tunis", ville: "Tunis", address: "Zone Industrielle, Charguia", phone: "+216 71 500 001", email: "devis@renovationplus.tn", description: "Entreprise générale de rénovation. Devis gratuit pour tous types de travaux.", rating: 4.4, isSubscribed: true },
      { name: "BatiRenov", type: "renovation" as const, gouvernorat: "Nabeul", ville: "Hammamet", address: "Avenue des Nations Unies, Hammamet", phone: "+216 72 500 002", email: "contact@batirenove.tn", description: "Rénovation complète, extension et aménagement de combles et sous-sols.", rating: 4.2, isSubscribed: true },

      // Photographes immobiliers
      { name: "PhotoImmo Tunisie", type: "photographe" as const, gouvernorat: "Tunis", ville: "Tunis", address: "Rue du Lac, Tunis", phone: "+216 71 600 001", email: "studio@photoimmo.tn", description: "Photographie et vidéo immobilière professionnelle. Visites virtuelles 360° et drones.", rating: 4.8, isSubscribed: true },
      { name: "ImmoShoot", type: "photographe" as const, gouvernorat: "Sousse", ville: "Sousse", address: "Rue du Stade, Sousse", phone: "+216 73 600 002", email: "contact@immosshoot.tn", description: "Photographie architecturale et immobilière. Prestations rapides et professionnelles.", rating: 4.5, isSubscribed: true },
    ];

    for (const partner of partners) {
      const { gouvernorat, ville, specialty, ...rest } = partner as any;
      await ctx.db.insert("professionalPartners", {
        ...rest,
        regions: [gouvernorat],
        specialties: specialty ? [specialty] : undefined,
      });
    }

    return "seeded";
  },
});

// Get partners by region and type
export const getPartners = query({
  args: {
    region: v.string(),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Filter in memory so partners serving multiple regions match too
    let partners = await ctx.db.query("professionalPartners").collect();
    partners = partners.filter((p) => (p.regions || []).includes(args.region));

    if (args.type) {
      partners = partners.filter((p) => p.type === args.type);
    }

    return partners;
  },
});

// Get all partner types available in a region
export const getPartnerTypesByRegion = query({
  args: { region: v.string() },
  handler: async (ctx, args) => {
    const partners = await ctx.db.query("professionalPartners").collect();
    const filtered = partners.filter((p) =>
      (p.regions || []).includes(args.region),
    );

    const types = new Set(filtered.map((p) => p.type));
    return Array.from(types);
  },
});
