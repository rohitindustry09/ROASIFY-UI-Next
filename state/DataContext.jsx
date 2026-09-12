"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { get, set, del } from "idb-keyval";
import { aggregateMeta, aggregateGoogle, aggregateShopify, mergeAll } from "@/lib/merge";

const DataCtx = createContext(null);
const STORE_KEY = "roasify:sources:v1";

function mapToArray(map) {
  return map ? Array.from(map.entries()) : [];
}
function arrayToMap(arr) {
  return new Map(arr || []);
}

export function DataProvider({ children }) {
  const [sources, setSources] = useState({ meta: null, shopify: null, google: null });
  const [runCount, setRunCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const rawRowsRef = useRef({ meta: null, shopify: null, google: null });

  useEffect(() => {
    (async () => {
      try {
        const saved = await get(STORE_KEY);
        if (saved) {
          const restored = {};
          for (const key of ["meta", "shopify", "google"]) {
            const s = saved[key];
            restored[key] = s ? { ...s, map: arrayToMap(s.mapArray), mapArray: undefined } : null;
          }
          setSources(restored);
          if (restored.meta && restored.shopify) setRunCount(1);
        }
      } catch (e) {
        console.warn("Could not restore saved sources", e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = useCallback(async (next) => {
    const toSave = {};
    for (const key of ["meta", "shopify", "google"]) {
      const s = next[key];
      toSave[key] = s
        ? { name: s.name, size: s.size, rowCount: s.rowCount, mapArray: mapToArray(s.map) }
        : null;
    }
    try {
      await set(STORE_KEY, toSave);
    } catch (e) {
      console.warn("Could not persist sources", e);
    }
  }, []);

  const setFile = useCallback(
    (source, { name, size, rows }) => {
      let map;
      if (source === "meta") map = aggregateMeta(rows);
      else if (source === "shopify") map = aggregateShopify(rows);
      else if (source === "google") map = aggregateGoogle(rows);
      rawRowsRef.current[source] = rows;
      const entry = { name, size, rowCount: rows.length, map };
      setSources((prev) => {
        const next = { ...prev, [source]: entry };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const clearFile = useCallback(
    (source) => {
      rawRowsRef.current[source] = null;
      setSources((prev) => {
        const next = { ...prev, [source]: null };
        persist(next);
        return next;
      });
      setRunCount(0);
    },
    [persist]
  );

  const clearAll = useCallback(async () => {
    rawRowsRef.current = { meta: null, shopify: null, google: null };
    setSources({ meta: null, shopify: null, google: null });
    setRunCount(0);
    await del(STORE_KEY);
  }, []);

  const runMergeNow = useCallback(() => {
    if (!sources.meta || !sources.shopify) return;
    setRunCount((c) => c + 1);
  }, [sources]);

  const canMerge = Boolean(sources.meta && sources.shopify);

  const merged = useMemo(() => {
    if (!runCount || !sources.meta || !sources.shopify) return null;
    return mergeAll({
      metaMap: sources.meta.map,
      shopifyMap: sources.shopify.map,
      googleMap: sources.google?.map || null,
    });
  }, [runCount, sources]);

  const value = useMemo(
    () => ({ sources, setFile, clearFile, clearAll, merged, runMergeNow, canMerge, loaded }),
    [sources, setFile, clearFile, clearAll, merged, runMergeNow, canMerge, loaded]
  );

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useData() {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
