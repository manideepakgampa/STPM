import { useState, useEffect } from "react";

/**
 * Shows the TransportLoader for a minimum duration when a page mounts.
 * Returns "visible" | "fading" | "hidden".
 */
export type LoaderPhase = "visible" | "fading" | "hidden";

export const usePageLoader = (minMs = 600, fadeMs = 400): LoaderPhase => {
  const [phase, setPhase] = useState<LoaderPhase>("visible");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("fading"), minMs);
    const t2 = setTimeout(() => setPhase("hidden"), minMs + fadeMs);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [minMs, fadeMs]);

  return phase;
};
