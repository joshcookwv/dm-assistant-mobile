import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { parseCreditHeaders, type AiCreditState } from "@/lib/ai-contract";

type Listener = (credits: AiCreditState) => void;

let latestCredits: AiCreditState | null = null;
const listeners = new Set<Listener>();

export function updateAiCreditsFromHeaders(headers: Headers): void {
  const credits = parseCreditHeaders(headers);
  if (!credits) return;
  latestCredits = credits;
  for (const listener of listeners) listener(credits);
}

const AiCreditsContext = createContext<AiCreditState | null>(null);

export function AiCreditsProvider({ children }: { children: ReactNode }) {
  const [credits, setCredits] = useState<AiCreditState | null>(latestCredits);
  useEffect(() => {
    listeners.add(setCredits);
    return () => {
      listeners.delete(setCredits);
    };
  }, []);
  return <AiCreditsContext.Provider value={credits}>{children}</AiCreditsContext.Provider>;
}

export function useAiCredits(): AiCreditState | null {
  return useContext(AiCreditsContext);
}
