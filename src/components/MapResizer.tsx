import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

/**
 * Calls map.invalidateSize() when:
 * 1. The component mounts
 * 2. The window resizes (debounced)
 * 3. A MutationObserver detects the container became visible
 *
 * This fixes Leaflet's common sizing issues inside hidden containers
 * (e.g. Tabs, drawers, modals, collapsibles).
 */
export default function MapResizer() {
  const map = useMap();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Invalidate on mount
    const invalidate = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        map.invalidateSize({ animate: false });
      }, 80);
    };

    invalidate();

    // Invalidate on window resize (debounced)
    const onResize = () => invalidate();
    window.addEventListener("resize", onResize);

    // MutationObserver: detect when the map container becomes visible
    const container = map.getContainer();
    const observer = new MutationObserver(() => {
      if (container.offsetParent !== null) {
        invalidate();
      }
    });
    observer.observe(container, {
      attributes: true,
      attributeFilter: ["class", "style"],
      subtree: false,
    });

    // Also observe parent elements for display changes
    let parent = container.parentElement;
    const parentsToObserve: Element[] = [];
    while (parent && parent !== document.body) {
      parentsToObserve.push(parent);
      parent = parent.parentElement;
    }
    const parentObserver = new MutationObserver(() => {
      if (container.offsetParent !== null) {
        invalidate();
      }
    });
    parentsToObserve.forEach((p) => {
      parentObserver.observe(p, {
        attributes: true,
        attributeFilter: ["class", "style", "hidden"],
        subtree: false,
      });
    });

    return () => {
      window.removeEventListener("resize", onResize);
      observer.disconnect();
      parentObserver.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [map]);

  return null;
}

/**
 * Returns true on touch devices so child components can disable
 * scroll-wheel zoom on mobile (prevents accidental zooming while scrolling).
 */
export function isTouchDevice(): boolean {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}
