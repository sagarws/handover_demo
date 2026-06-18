import { createContext, useContext, useMemo, useState, useCallback } from "react";
import {
  uid,
  initialCategories,
  initialContractors,
  initialSites,
  buildInitialProgress,
} from "./data.js";

const AppContext = createContext(null);

// Tiny helper for the per-category reducers — apply `patch(category)` to the
// matching category in-place (immutably) without rewriting boilerplate at
// every call-site.
const updateCategoryIn = (categories, id, patch) =>
  categories.map((c) => (c.id === id ? patch(c) : c));

export function AppProvider({ children }) {
  const [categories, setCategories] = useState(initialCategories);
  const [contractors, setContractors] = useState(initialContractors);
  const [sites, setSites] = useState(initialSites);
  const [flatProgress, setFlatProgress] = useState(() =>
    buildInitialProgress(initialSites),
  );
  const [handovers, setHandovers] = useState([]);

  // ---------- lookups ----------
  const getCategory = useCallback(
    (id) => categories.find((c) => c.id === id) ?? null,
    [categories],
  );
  const getUnit = useCallback(
    (unitId) => {
      for (const s of sites) {
        const u = s.units.find((x) => x.id === unitId);
        if (u) return u;
      }
      return null;
    },
    [sites],
  );

  // ---------- categories ----------
  const addCategory = useCallback(
    ({ name, copyFromCategoryId }) => {
      const trimmed = (name || "").trim();
      if (!trimmed) return null;
      const newId = uid("cat");
      let stages = [];
      let stageTradeMap = {};
      if (copyFromCategoryId) {
        const src = categories.find((c) => c.id === copyFromCategoryId);
        if (src) {
          // Copy stage names with fresh ids. The new category gets a clean
          // empty stage→trade map because trades are not copied — the new
          // category starts with its own (empty) trade list.
          stages = src.stages.map((s) => ({ id: uid("stg"), name: s.name }));
          stages.forEach((s) => {
            stageTradeMap[s.id] = [];
          });
        }
      }
      const newCat = {
        id: newId,
        name: trimmed,
        trades: [],
        stages,
        stageTradeMap,
      };
      setCategories((cs) => [...cs, newCat]);
      return newId;
    },
    [categories],
  );
  const renameCategory = useCallback((id, name) => {
    setCategories((cs) =>
      updateCategoryIn(cs, id, (c) => ({ ...c, name: name.trim() || c.name })),
    );
  }, []);
  const removeCategory = useCallback(
    (id) => {
      const cat = categories.find((c) => c.id === id);
      // Cascade: remove units of this category from every site, and their
      // progress entries; also drop the category's trade ids from
      // contractor.tradeIds so we don't have dangling references.
      const removedUnitIds = [];
      sites.forEach((s) =>
        s.units.forEach((u) => {
          if (u.categoryId === id) removedUnitIds.push(u.id);
        }),
      );
      setSites((ss) =>
        ss.map((s) => ({
          ...s,
          units: s.units.filter((u) => u.categoryId !== id),
        })),
      );
      setFlatProgress((fp) => {
        const next = { ...fp };
        removedUnitIds.forEach((uid_) => delete next[uid_]);
        return next;
      });
      if (cat) {
        const drop = new Set(cat.trades.map((t) => t.id));
        setContractors((cs) =>
          cs.map((c) => ({
            ...c,
            tradeIds: c.tradeIds.filter((t) => !drop.has(t)),
          })),
        );
      }
      setCategories((cs) => cs.filter((c) => c.id !== id));
    },
    [categories, sites],
  );

  // ---------- trades (per category) ----------
  const addTrade = useCallback((categoryId, name) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    setCategories((cs) =>
      updateCategoryIn(cs, categoryId, (c) => ({
        ...c,
        trades: [...c.trades, { id: uid("trd"), name: trimmed }],
      })),
    );
  }, []);
  const renameTrade = useCallback((categoryId, tradeId_, name) => {
    setCategories((cs) =>
      updateCategoryIn(cs, categoryId, (c) => ({
        ...c,
        trades: c.trades.map((t) => (t.id === tradeId_ ? { ...t, name } : t)),
      })),
    );
  }, []);
  const removeTrade = useCallback((categoryId, tradeId_) => {
    setCategories((cs) =>
      updateCategoryIn(cs, categoryId, (c) => {
        const newMap = {};
        Object.entries(c.stageTradeMap).forEach(([k, ids]) => {
          newMap[k] = (ids ?? []).filter((t) => t !== tradeId_);
        });
        return {
          ...c,
          trades: c.trades.filter((t) => t.id !== tradeId_),
          stageTradeMap: newMap,
        };
      }),
    );
    setContractors((cs) =>
      cs.map((c) => ({
        ...c,
        tradeIds: c.tradeIds.filter((t) => t !== tradeId_),
      })),
    );
  }, []);

  // ---------- stages (per category) ----------
  const addStage = useCallback((categoryId, name) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    const newStage = { id: uid("stg"), name: trimmed };
    setCategories((cs) =>
      updateCategoryIn(cs, categoryId, (c) => ({
        ...c,
        stages: [...c.stages, newStage],
        stageTradeMap: { ...c.stageTradeMap, [newStage.id]: [] },
      })),
    );
  }, []);
  const renameStage = useCallback((categoryId, stageId, name) => {
    setCategories((cs) =>
      updateCategoryIn(cs, categoryId, (c) => ({
        ...c,
        stages: c.stages.map((s) => (s.id === stageId ? { ...s, name } : s)),
      })),
    );
  }, []);
  const removeStage = useCallback(
    (categoryId, stageId) => {
      setCategories((cs) =>
        updateCategoryIn(cs, categoryId, (c) => {
          const newMap = { ...c.stageTradeMap };
          delete newMap[stageId];
          return {
            ...c,
            stages: c.stages.filter((s) => s.id !== stageId),
            stageTradeMap: newMap,
          };
        }),
      );
      // Clamp progress cursors so they don't point past the new length, and
      // drop any submissions recorded against the removed stage.
      const cat = categories.find((c) => c.id === categoryId);
      if (!cat) return;
      const affectedUnits = sites
        .flatMap((s) => s.units)
        .filter((u) => u.categoryId === categoryId)
        .map((u) => u.id);
      setFlatProgress((fp) => {
        const next = { ...fp };
        const newLen = cat.stages.length - 1;
        affectedUnits.forEach((id) => {
          if (!next[id]) return;
          const { activeStageIdx, stageSubmissions, ...rest } = next[id];
          const filteredSubs = { ...stageSubmissions };
          delete filteredSubs[stageId];
          next[id] = {
            ...next[id],
            ...rest,
            activeStageIdx: Math.min(activeStageIdx, Math.max(newLen, 0)),
            stageSubmissions: filteredSubs,
          };
        });
        return next;
      });
    },
    [categories, sites],
  );
  const moveStage = useCallback((categoryId, idx, dir) => {
    setCategories((cs) =>
      updateCategoryIn(cs, categoryId, (c) => {
        const j = idx + dir;
        if (j < 0 || j >= c.stages.length) return c;
        const copy = c.stages.slice();
        [copy[idx], copy[j]] = [copy[j], copy[idx]];
        return { ...c, stages: copy };
      }),
    );
  }, []);
  const addStageTrade = useCallback((categoryId, stageId, tradeId_) => {
    if (!tradeId_) return;
    setCategories((cs) =>
      updateCategoryIn(cs, categoryId, (c) => {
        const curr = c.stageTradeMap[stageId] ?? [];
        if (curr.includes(tradeId_)) return c;
        return {
          ...c,
          stageTradeMap: { ...c.stageTradeMap, [stageId]: [...curr, tradeId_] },
        };
      }),
    );
  }, []);
  const removeStageTrade = useCallback((categoryId, stageId, tradeId_) => {
    setCategories((cs) =>
      updateCategoryIn(cs, categoryId, (c) => {
        const curr = c.stageTradeMap[stageId] ?? [];
        return {
          ...c,
          stageTradeMap: {
            ...c.stageTradeMap,
            [stageId]: curr.filter((t) => t !== tradeId_),
          },
        };
      }),
    );
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
    setSites((ss) => [
      ...ss,
      {
        id: uid("ste"),
        name: draft.name.trim(),
        address: draft.address?.trim() || "",
        access: [],
        units: [],
      },
    ]);
  }, []);
  const updateSite = useCallback((id, patch) => {
    setSites((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);
  const removeSite = useCallback((id) => {
    setSites((ss) => ss.filter((s) => s.id !== id));
  }, []);
  const addUnit = useCallback((siteId, { name, categoryId }) => {
    const trimmed = (name || "").trim();
    if (!trimmed || !categoryId) return;
    const unitId = uid("unt");
    setSites((ss) =>
      ss.map((s) =>
        s.id === siteId
          ? {
              ...s,
              units: [
                ...s.units,
                { id: unitId, name: trimmed, categoryId },
              ],
            }
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
        s.id === siteId
          ? { ...s, units: s.units.filter((u) => u.id !== unitId) }
          : s,
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
        s.id === siteId
          ? { ...s, access: s.access.filter((p) => p !== person) }
          : s,
      ),
    );
  }, []);

  // ---------- handover (the demo's pivot) ----------
  const completeActiveStage = useCallback(
    (unitId, contractorId, tradeId_) => {
      const progress = flatProgress[unitId];
      if (!progress) return;
      const unit = getUnit(unitId);
      if (!unit) return;
      const cat = getCategory(unit.categoryId);
      if (!cat) return;
      const idx = progress.activeStageIdx;
      if (idx >= cat.stages.length) return;
      const currentStage = cat.stages[idx];
      const required = cat.stageTradeMap[currentStage.id] ?? [];
      if (required.length > 0 && !required.includes(tradeId_)) return;
      const existingSubs = progress.stageSubmissions?.[currentStage.id] ?? {};
      if (existingSubs[tradeId_]) return;

      const nowIso = new Date().toISOString();
      const newSubsForStage = {
        ...existingSubs,
        [tradeId_]: { contractorId, at: nowIso },
      };
      const slotCount = required.length || 1;
      const filledCount =
        required.length > 0
          ? required.filter((t) => newSubsForStage[t]).length
          : Object.keys(newSubsForStage).length;
      const stageComplete = filledCount >= slotCount;
      const nextStage = stageComplete ? cat.stages[idx + 1] : null;
      const pendingTradeIds = required.filter((t) => !newSubsForStage[t]);

      setFlatProgress((fp) => {
        const prev = fp[unitId] ?? {
          activeStageIdx: 0, completions: [], stageSubmissions: {},
        };
        return {
          ...fp,
          [unitId]: {
            activeStageIdx: stageComplete
              ? Math.min(prev.activeStageIdx + 1, cat.stages.length)
              : prev.activeStageIdx,
            completions: [
              ...prev.completions,
              {
                stageId: currentStage.id,
                tradeId: tradeId_,
                contractorId,
                at: nowIso,
              },
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
          flatId: unitId,
          categoryId: cat.id,
          stageId: currentStage.id,
          tradeId: tradeId_,
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
    [flatProgress, getCategory, getUnit],
  );

  const value = useMemo(
    () => ({
      categories, contractors, sites, flatProgress, handovers,
      getCategory, getUnit,
      addCategory, renameCategory, removeCategory,
      addTrade, renameTrade, removeTrade,
      addStage, renameStage, removeStage, moveStage,
      addStageTrade, removeStageTrade,
      addContractor, removeContractor,
      addSite, updateSite, removeSite, addUnit, removeUnit,
      addSiteAccess, removeSiteAccess,
      completeActiveStage,
    }),
    [
      categories, contractors, sites, flatProgress, handovers,
      getCategory, getUnit,
      addCategory, renameCategory, removeCategory,
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
