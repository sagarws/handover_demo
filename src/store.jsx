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
  const addUnit = useCallback((siteId, { name, type }) => {
    const trimmedName = name.trim();
    const trimmedType = (type || "").trim() || "Flat";
    if (!trimmedName) return;
    const unitId = uid("unt");
    setSites((ss) =>
      ss.map((s) =>
        s.id === siteId
          ? { ...s, units: [...s.units, { id: unitId, name: trimmedName, type: trimmedType }] }
          : s,
      ),
    );
    setFlatProgress((fp) => ({
      ...fp,
      [unitId]: { activeStageIdx: 0, completions: [], stageSubmissions: {} },
    }));
  }, []);
  const removeUnit = useCallback((siteId, unitId) => {
    setSites((ss) =>
      ss.map((s) =>
        s.id === siteId ? { ...s, units: s.units.filter((u) => u.id !== unitId) } : s,
      ),
    );
    setFlatProgress((fp) => {
      const next = { ...fp };
      delete next[unitId];
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
  // Submit a single trade slot for the flat's currently-active stage.
  //   - The slot is keyed by (stageId, tradeId).
  //   - The stage only advances when every required trade has a submission.
  //   - If the stage has no trades configured we treat it as a 1-slot stage
  //     so the demo isn't blocked.
  const completeActiveStage = useCallback(
    (flatId, contractorId, tradeId) => {
      const progress = flatProgress[flatId];
      if (!progress) return;
      const idx = progress.activeStageIdx;
      if (idx >= stages.length) return;
      const currentStage = stages[idx];
      const required = stageTradeMap[currentStage.id] ?? [];

      // Reject obviously-invalid submissions so the log stays clean.
      if (required.length > 0 && !required.includes(tradeId)) return;
      const existingSubs = progress.stageSubmissions?.[currentStage.id] ?? {};
      if (existingSubs[tradeId]) return; // slot already filled

      const nowIso = new Date().toISOString();
      const newSubsForStage = {
        ...existingSubs,
        [tradeId]: { contractorId, at: nowIso },
      };
      const slotCount = required.length || 1;
      const filledCount = required.length > 0
        ? required.filter((t) => newSubsForStage[t]).length
        : Object.keys(newSubsForStage).length;
      const stageComplete = filledCount >= slotCount;
      const nextStage = stageComplete ? stages[idx + 1] : null;
      const pendingTradeIds = required.filter((t) => !newSubsForStage[t]);

      setFlatProgress((fp) => {
        const prev = fp[flatId] ?? {
          activeStageIdx: 0, completions: [], stageSubmissions: {},
        };
        return {
          ...fp,
          [flatId]: {
            activeStageIdx: stageComplete
              ? Math.min(prev.activeStageIdx + 1, stages.length)
              : prev.activeStageIdx,
            completions: [
              ...prev.completions,
              { stageId: currentStage.id, tradeId, contractorId, at: nowIso },
            ],
            stageSubmissions: {
              ...prev.stageSubmissions,
              [currentStage.id]: newSubsForStage,
            },
          },
        };
      });

      setHandovers((hs) => [
        {
          id: uid("hov"),
          at: nowIso,
          flatId,
          stageId: currentStage.id,
          tradeId,
          contractorId,
          stageAdvanced: stageComplete,
          filledCount,
          slotCount,
          pendingTradeIds,
          nextStageId: nextStage?.id ?? null,
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
      addSite, updateSite, removeSite, addUnit, removeUnit,
      addSiteAccess, removeSiteAccess,
      completeActiveStage,
    }),
    [
      trades, stages, stageTradeMap, contractors, sites, flatProgress, handovers,
      addTrade, renameTrade, removeTrade,
      addStage, renameStage, removeStage, moveStage,
      addStageTrade, removeStageTrade,
      addContractor, removeContractor,
      addSite, updateSite, removeSite, addUnit, removeUnit,
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
