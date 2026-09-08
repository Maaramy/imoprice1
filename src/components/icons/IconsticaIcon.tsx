import { useMemo } from "react";

/**
 * Icônes Iconstica — chargeur SVG embarqué.
 *
 * Tous les fichiers SVG du dossier src/assets/icons/iconstica (sous-dossiers
 * compris) sont chargés au build (Vite glob). Le composant `IconsticaIcon`
 * retrouve un icône par nom (tolérant : `megaphone` matche megaphone.svg,
 * megaphone-line.svg, line/megaphone.svg…). Tant qu'un fichier n'existe pas
 * encore, le rendu de secours (`fallback`) est affiché — l'UI reste donc
 * identique à l'actuel (emoji / lucide) jusqu'à l'ajout des fichiers SVG.
 */

// Lazy ? Non : eager pour un lookup synchrone et zéro flash au montage.
// query "?raw" → contenu SVG brut (string), import "default" → la string elle-même.
const ICONSTICA_SVGS = import.meta.glob<string>("../assets/icons/iconstica/**/*.svg", {
  eager: true,
  query: "?raw",
  import: "default",
});

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function baseName(path: string): string {
  return path.split("/").pop()?.toLowerCase().replace(/\.svg$/, "") ?? "";
}

/** Retrouve le chemin (clé du glob) du premier SVG correspondant au nom demandé. */
function findIconPath(name: string): string | undefined {
  const target = normalize(name);
  if (!target) return undefined;
  const paths = Object.keys(ICONSTICA_SVGS);
  if (paths.length === 0) return undefined;
  // 1) nom exact (n'importe quel sous-dossier style) : megaphone.svg, line/megaphone.svg
  const exact = paths.find((p) => baseName(p) === target);
  if (exact) return exact;
  // 2) préfixe : megaphone-line.svg, megaphone-1.svg, line/megaphone-filled.svg…
  const prefix = paths.find((p) => baseName(p).startsWith(target));
  if (prefix) return prefix;
  // 3) contenu (débogage de noms légèrement différents)
  return paths.find((p) => baseName(p).includes(target));
}

export interface IconsticaIconProps extends React.SVGProps<SVGSVGElement> {
  /** Nom de l'icône Iconstica (ex. "megaphone", "chevron-left", "trash"). */
  name: string;
  /** Rendu de secours tant que le SVG n'existe pas dans src/assets/icons/iconstica/. */
  fallback?: React.ReactNode;
}

/** Icône Iconstica inline. Rend `fallback` tant que le fichier SVG est absent. */
export function IconsticaIcon({ name, className, fallback = null, ...rest }: IconsticaIconProps) {
  const parsed = useMemo(() => {
    const path = findIconPath(name);
    if (!path) return null;
    const raw = ICONSTICA_SVGS[path] ?? "";
    const inner = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] ?? raw;
    const viewBox = raw.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 24 24";
    return { inner, viewBox };
  }, [name]);

  if (!parsed) return <>{fallback}</>;

  return (
    <svg
      viewBox={parsed.viewBox}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: parsed.inner }}
      {...rest}
    />
  );
}