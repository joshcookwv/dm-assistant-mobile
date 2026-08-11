import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import {
  addProStatusListener,
  customerHasPro,
  getProStatus,
  type ProStatus,
} from "@/lib/purchases";

interface ProAccessContextValue extends ProStatus {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const EMPTY_STATUS: ProStatus = {
  configured: false,
  isPro: false,
  appUserId: null,
  customerInfo: null,
};

const ProAccessContext = createContext<ProAccessContextValue>({
  ...EMPTY_STATUS,
  loading: true,
  error: null,
  refresh: async () => undefined,
});

export function ProAccessProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ProStatus>(EMPTY_STATUS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await getProStatus());
    } catch (err) {
      setStatus(EMPTY_STATUS);
      setError(err instanceof Error ? err.message : "Couldn't check Pro access.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let removeListener: () => void = () => {};
    const timeout = setTimeout(() => {
      refresh().finally(() => {
        if (!active) return;
        removeListener = addProStatusListener((customerInfo) => {
          setStatus((current) => ({
            ...current,
            configured: true,
            isPro: customerHasPro(customerInfo),
            customerInfo,
          }));
          setLoading(false);
          setError(null);
        });
      });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timeout);
      removeListener();
    };
  }, [refresh]);

  return (
    <ProAccessContext.Provider value={{ ...status, loading, error, refresh }}>
      {children}
    </ProAccessContext.Provider>
  );
}

export function useProAccess(): ProAccessContextValue {
  return useContext(ProAccessContext);
}
