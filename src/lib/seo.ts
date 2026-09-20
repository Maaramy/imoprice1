import { useEffect } from "react";

/** Met à jour le titre et la meta description de la page (usage client). */
export function usePageSEO({ title, description }: { title: string; description?: string }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    let meta: HTMLMetaElement | null = null;
    let previousDescription: string | null = null;
    if (description) {
      meta = document.querySelector('meta[name="description"]');
      if (meta) previousDescription = meta.getAttribute("content");
      else {
        meta = document.createElement("meta");
        meta.setAttribute("name", "description");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", description);
    }
    return () => {
      document.title = previousTitle;
      if (meta && previousDescription != null) meta.setAttribute("content", previousDescription);
    };
  }, [title, description]);
}
