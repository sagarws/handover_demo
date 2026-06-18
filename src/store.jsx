import { createContext, useContext, useMemo, useState, useCallback } from "react";
import {
  uid,
  initialTrades,
  initialStages,
  initialStageTradeMap,
  initialContractors,
  initialSites,
  buildInitialProgress,
} from "./data.js";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [trades, setTrades] = useState(initialTrades);
  const [stages, setStages] = useState(initialStages);
  const [stageTradeMap, setStageTradeMap] = useState(initialStageTradeMap);
  const [contractors, setContractors] = useState(initialContractors);
  const [sites, setSites] = useState(initialSites);
  const [flatProgress, setFlatProgress] = useState(() => buildInitialProgress(initialSites));
  const [handovers, setHandovers] = useState([]);

  // ---------- trades ----------
  const addTrade = useCallback((name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setTrades((ts) => [...ts, { id: uid("trd"), name: trimmed }]);
  }, []);
  const renameTrade = useCallback((id, name) => {
    setTrades((ts) => ts.map((t) => (t.id === id ? { ...t, name } : t)));
  }, []);
  const removeTrade = useCallback((id) => {
    setTrades((ts) => ts.filter((t) => t.id !== id));
    setStageTradeMap((m) => {
      const next = {};
      Object.entries(m).forEach(([k, arr]) => {
        next[k] = (arr ?? []).filter((tid) => tid !== id);
      });
      return next;
    });
    setContractors((cs) =>
      cs.map((c) => ({ ...c, tradeIds: c.tradeIds.filter((t) => t !== id) })),
    );
  }, []);

  // ---------- stages ----------
  const addStage = useCallback((name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newStage = { id: uid("stg"), name: trimmed };
    setStages((ss) => [...ss, newStage]);
    setStageTradeMap((m) => ({ ...m, [newStage.id]: [] }));
  }, []);
  const renameStage = useCallback((id, name) => {
    setStages((ss) => ss.map((s) => (s.id === id ? { ...s, name } : s)));
  }, []);
  const removeStage = useCallback((id) => {
    setStages((ss) => ss.filter((s) => s.id !== id));
    setStageTradeMap((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
  }, []);
  const moveStage = useCallback((idx, dir) => {
    setStages((ss) => {
      const j = idx + dir;
      if (j < 0 || j >= ss.length) return ss;
      const copy = ss.slice();
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      return copy;
    });
  }, []);
  // Add a trade to a stage's list (idempotent).
  const addStageTrade = useCallback((stageId, tradeId) => {
    if (!tradeId) return;
    setStageTradeMap((m) => {
      const curr = m[stageId] ?? [];
      if (curr.includes(tradeId)) return m;
      return { ...m, [stageId]: [...curr, tradeId] };
    });
  }, []);
  // Remove a single trade from a stage's list.
  const removeStageTrade = useCallback((stageId, tradeId) => {
    setStageTradeMap((m) => {
      const curr = m[stageId] ?? [];
      return { ...m, [stageId]: curr.filter((t) => t !== tradeId) };
    });
  }, []);

  // ---------- contractors ----------
  const addContractor = useCallback((draft) => {
    if (!draft.name?.trim()) return;
    setContractors((cs) => [
      ...cs,
      {
        id: uid("ctr"),
        name: draft.name.trim(),
        company: draft.company?.trim() || "",
        tradeIds: draft.tradeIds || [],
      },
    ]);
  }, []);
  const removeContractor = useCallback((id) => {
    setContractors((cs) => cs.filter((c) => c.id !== id));
  }, []);

  // ---------- sites ----------
  const addSite = useCallback((draft) => {
    if (!draft.name?.trim()) return;
    const id = uid("ste");
    const site = {
      id,
      name: draft.name.trim(),
      address: draft.address?.trim() || "",
      access: [],
      flats: [],
    };
    setSites((ss) => [...ss, site]);
  }, []);
  const updateSite = useCallback((id, patch) => {
    setSites((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);
  const removeSite = useCallback((id) => {
    setSites((ss) => ss.filter((s) => s.id !== id));
  }, []);
  const addFlat = useCallback((siteId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const flatId = uid("flt");
    setSites((ss) =>
      ss.map((s) =>
        s.id === siteId ? { ...s, flats: [...s.flats, { id: flatId, name: trimmed }] } : s,
      ),
    );
    setFlatProgress((fp) => ({ ...fp, [flatId]: { activeStageIdx: 0, completions: [] } }));
  }, []);
  const removeFlat = useCallback((siteId, flatId) => {
    setSites((ss) =>
      ss.map((s) =>
        s.id === siteId ? { ...s, flats: s.flats.filter((f) => f.id !== flatId) } : s,
      ),
    );
    setFlatProgress((fp) => {
      const next = { ...fp };
      delete next[flatId];
      return next;
    });
  }, []);
  const addSiteAccess = useCallback((siteId, person) => {
    const trimmed = person.trim();
    if (!trimmed) return;
    setSites((ss) =>
      ss.map((s) =>
        s.id === siteId && !s.access.includes(trimmed)
          ? { ...s, access: [...s.access, trimmed] }
          : s,
      ),
    );
  }, []);
  const removeSiteAccess = useCallback((siteId, person) => {
    setSites((ss) =>
      ss.map((s) =>
        s.id === siteId ? { ...s, access: s.access.filter((p) => p !== person) } : s,
      ),
    );
  }, []);

  // ---------- handover (the demo's pivot) ----------
  // Completing the active stage of a flat:
  //   1. Record who completed it (contractorId of the current stage's trade).
  //   2. Log a handover entry showing the trade hand-off to the next stage.
  //   3. Advance the flat's activeStageIdx by one (so the next stage becomes
  //      active and its required trade defines the next dropdown).
  const completeActiveStage = useCallback(
    (flatId, contractorId) => {
      const progress = flatProgress[flatId];
      if (!progress) return;
      const idx = progress.activeStageIdx;
      if (idx >= stages.length) return; // already finished
      const currentStage = stages[idx];
      const nextStage = stages[idx + 1];

      const nowIso = new Date().toISOString();
      setFlatProgress((fp) => {
        const prev = fp[flatId] ?? { activeStageIdx: 0, completions: [] };
        return {
          ...fp,
          [flatId]: {
            activeStageIdx: Math.min(prev.activeStageIdx + 1, stages.length),
            completions: [
              ...prev.completions,
              { stageId: currentStage.id, contractorId, at: nowIso },
            ],
          },
        };
      });
      setHandovers((hs) => [
        {
          id: uid("hov"),
          at: nowIso,
          flatId,
          fromStageId: currentStage.id,
          toStageId: nextStage?.id ?? null,
          fromTradeIds: stageTradeMap[currentStage.id] ?? [],
          toTradeIds: nextStage ? stageTradeMap[nextStage.id] ?? [] : [],
          contractorId,
        },
        ...hs,
      ]);
    },
    [stages, stageTradeMap, flatProgress],
  );

  const value = useMemo(
    () => ({
      // data
      trades, stages, stageTradeMap, contractors, sites, flatProgress, handovers,
      // actions
      addTrade, renameTrade, removeTrade,
      addStage, renameStage, removeStage, moveStage,
      addStageTrade, removeStageTrade,
      addContractor, removeContractor,
      addSite, updateSite, removeSite, addFlat, removeFlat,
      addSiteAccess, removeSiteAccess,
      completeActiveStage,
    }),
    [
      trades, stages, stageTradeMap, contractors, sites, flatProgress, handovers,
      addTrade, renameTrade, removeTrade,
      addStage, renameStage, removeStage, moveStage,
      addStageTrade, removeStageTrade,
      addContractor, removeContractor,
      addSite, updateSite, removeSite, addFlat, removeFlat,
      addSiteAccess, removeSiteAccess,
      completeActiveStage,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
