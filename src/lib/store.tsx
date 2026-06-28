"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { SalesDataset } from "./types";

const STORAGE_KEY = "sales-report-app:dataset";

type StoreValue = {
  dataset: SalesDataset | null;
  setDataset: (d: SalesDataset | null) => void;
  loaded: boolean;
};

const StoreContext = createContext<StoreValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [dataset, setDatasetState] = useState<SalesDataset | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SalesDataset;
        if (parsed && Array.isArray(parsed.rows)) {
          setDatasetState(parsed);
        }
      }
    } catch {
      // ignore corrupt storage
    } finally {
      setLoaded(true);
    }
  }, []);

  const setDataset = useCallback((d: SalesDataset | null) => {
    setDatasetState(d);
    try {
      if (d) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // storage quota etc.
    }
  }, []);

  const value = useMemo<StoreValue>(
    () => ({ dataset, setDataset, loaded }),
    [dataset, setDataset, loaded],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useDataset(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useDataset must be used within DataProvider");
  return ctx;
}
