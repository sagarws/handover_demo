import { createContext, useContext, useMemo, useState, useCallback } from "react";
import {
  uid,
  initialCategories,
  initialContractors,
  initialSites,
  buildInitialProgress,
  getOrderedStages,
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
      let steps = [];
      if (copyFromCategoryId) {
        const src = categories.find((c) => c.id === copyFromCategoryId);
        if (src) {
          // Copy stage names with fresh ids. The new category gets a clean
          // empty stage→trade map because trades are not copied — the new
          // category starts with its own (empty) trade list.
          const stageIdMap = {};
          stages = src.stages.map((s) => {
            const fresh = { id: uid("stg"), name: s.name };
            stageIdMap[s.id] = fresh.id;
            return fresh;
          });
          stages.forEach((s) => {
            stageTradeMap[s.id] = [];
          });
          // Copy step structure mapping old stage ids → new ones.
          steps = (src.steps ?? []).map((st) => ({
            id: uid("stp"),
            name: st.name,
            stageIds: (st.stageIds ?? [])
              .map((sid) => stageIdMap[sid])
              .filter(Boolean),
          }));
        }
      }
      const newCat = {
        id: newId,
        name: trimmed,
        trades: [],
        stages,
        stageTradeMap,
        steps,
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
    if (!trimmed) return null;
    const newId = uid("trd");
    setCategories((cs) =>
      updateCategoryIn(cs, categoryId, (c) => ({
        ...c,
        trades: [...c.trades, { id: newId, name: trimmed }],
      })),
    );
    return newId;
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
  const addStage = useCallback((categoryId, name, stepId = null) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return null;
    const newStage = { id: uid("stg"), name: trimmed };
    setCategories((cs) =>
      updateCategoryIn(cs, categoryId, (c) => ({
        ...c,
        stages: [...c.stages, newStage],
        stageTradeMap: { ...c.stageTradeMap, [newStage.id]: [] },
        steps: stepId
          ? (c.steps ?? []).map((st) =>
              st.id === stepId
                ? { ...st, stageIds: [...st.stageIds, newStage.id] }
                : st,
            )
          : c.steps ?? [],
      })),
    );
    return newStage.id;
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
            steps: (c.steps ?? []).map((st) => ({
              ...st,
              stageIds: st.stageIds.filter((sid) => sid !== stageId),
            })),
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
  const reorderStage = useCallback((categoryId, fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    setCategories((cs) =>
      updateCategoryIn(cs, categoryId, (c) => {
        if (
          fromIdx < 0 || fromIdx >= c.stages.length ||
          toIdx < 0 || toIdx >= c.stages.length
        ) return c;
        const copy = c.stages.slice();
        const [moved] = copy.splice(fromIdx, 1);
        copy.splice(toIdx, 0, moved);
        return { ...c, stages: copy };
      }),
    );
  }, []);
  const reorderStageTrade = useCallback(
    (categoryId, stageId, fromIdx, toIdx) => {
      if (fromIdx === toIdx) return;
      setCategories((cs) =>
        updateCategoryIn(cs, categoryId, (c) => {
          const list = (c.stageTradeMap[stageId] ?? []).slice();
          if (
            fromIdx < 0 || fromIdx >= list.length ||
            toIdx < 0 || toIdx >= list.length
          ) return c;
          const [moved] = list.splice(fromIdx, 1);
          list.splice(toIdx, 0, moved);
          return {
            ...c,
            stageTradeMap: { ...c.stageTradeMap, [stageId]: list },
          };
        }),
      );
    },
    [],
  );
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

  // ---------- steps (per category) ----------
  // Steps group tags into ordered buckets. Each stage id can live in at most
  // one step's stageIds — `addStepStage` enforces that by detaching from any
  // sibling step first.
  const addStep = useCallback(
    (categoryId, { name, stageIds = [], newStageNames = [] }) => {
      const trimmed = (name || "").trim();
      if (!trimmed) return null;
      const newStageEntries = (newStageNames || [])
        .map((n) => n.trim())
        .filter(Boolean)
        .map((n) => ({ id: uid("stg"), name: n }));
      const newStepId = uid("stp");
      setCategories((cs) =>
        updateCategoryIn(cs, categoryId, (c) => {
          const allowedStageIds = new Set(c.stages.map((s) => s.id));
          const claimedExisting = (stageIds || []).filter((sid) =>
            allowedStageIds.has(sid),
          );
          const allClaimed = [
            ...claimedExisting,
            ...newStageEntries.map((s) => s.id),
          ];
          const stages = [...c.stages, ...newStageEntries];
          const stageTradeMap = { ...c.stageTradeMap };
          newStageEntries.forEach((s) => {
            stageTradeMap[s.id] = [];
          });
          // Detach claimed stages from other steps so each tag belongs to one.
          const claimedSet = new Set(claimedExisting);
          const steps = (c.steps ?? []).map((st) => ({
            ...st,
            stageIds: st.stageIds.filter((sid) => !claimedSet.has(sid)),
          }));
          steps.push({ id: newStepId, name: trimmed, stageIds: allClaimed });
          return { ...c, stages, stageTradeMap, steps };
        }),
      );
      return newStepId;
    },
    [],
  );
  const renameStep = useCallback((categoryId, stepId, name) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    setCategories((cs) =>
      updateCategoryIn(cs, categoryId, (c) => ({
        ...c,
        steps: (c.steps ?? []).map((st) =>
          st.id === stepId ? { ...st, name: trimmed } : st,
        ),
      })),
    );
  }, []);
  const removeStep = useCallback((categoryId, stepId) => {
    // Removing a step only deletes the grouping — the tags themselves stay
    // alive (they fall back into the unassigned bucket).
    setCategories((cs) =>
      updateCategoryIn(cs, categoryId, (c) => ({
        ...c,
        steps: (c.steps ?? []).filter((st) => st.id !== stepId),
      })),
    );
  }, []);
  const moveStep = useCallback((categoryId, idx, dir) => {
    setCategories((cs) =>
      updateCategoryIn(cs, categoryId, (c) => {
        const steps = (c.steps ?? []).slice();
        const j = idx + dir;
        if (j < 0 || j >= steps.length) return c;
        [steps[idx], steps[j]] = [steps[j], steps[idx]];
        return { ...c, steps };
      }),
    );
  }, []);
  const reorderStep = useCallback((categoryId, fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    setCategories((cs) =>
      updateCategoryIn(cs, categoryId, (c) => {
        const steps = (c.steps ?? []).slice();
        if (
          fromIdx < 0 || fromIdx >= steps.length ||
          toIdx < 0 || toIdx >= steps.length
        ) return c;
        const [moved] = steps.splice(fromIdx, 1);
        steps.splice(toIdx, 0, moved);
        return { ...c, steps };
      }),
    );
  }, []);
  const addStepStage = useCallback((categoryId, stepId, stageId) => {
    if (!stepId || !stageId) return;
    setCategories((cs) =>
      updateCategoryIn(cs, categoryId, (c) => ({
        ...c,
        steps: (c.steps ?? []).map((st) => {
          if (st.id === stepId) {
            if (st.stageIds.includes(stageId)) return st;
            return { ...st, stageIds: [...st.stageIds, stageId] };
          }
          // Detach from any other step so a tag belongs to one step at a time.
          return {
            ...st,
            stageIds: st.stageIds.filter((sid) => sid !== stageId),
          };
        }),
      })),
    );
  }, []);
  const removeStepStage = useCallback((categoryId, stepId, stageId) => {
    setCategories((cs) =>
      updateCategoryIn(cs, categoryId, (c) => ({
        ...c,
        steps: (c.steps ?? []).map((st) =>
          st.id === stepId
            ? { ...st, stageIds: st.stageIds.filter((sid) => sid !== stageId) }
            : st,
        ),
      })),
    );
  }, []);
  const reorderStepStage = useCallback(
    (categoryId, stepId, fromIdx, toIdx) => {
      if (fromIdx === toIdx) return;
      setCategories((cs) =>
        updateCategoryIn(cs, categoryId, (c) => ({
          ...c,
          steps: (c.steps ?? []).map((st) => {
            if (st.id !== stepId) return st;
            const list = st.stageIds.slice();
            if (
              fromIdx < 0 || fromIdx >= list.length ||
              toIdx < 0 || toIdx >= list.length
            ) return st;
            const [moved] = list.splice(fromIdx, 1);
            list.splice(toIdx, 0, moved);
            return { ...st, stageIds: list };
          }),
        })),
      );
    },
    [],
  );
  // Move a tag from any (or no) step into a target step. If `toIdx` is given,
  // insert at that position; otherwise append.
  const moveStageToStep = useCallback(
    (categoryId, stageId, toStepId, toIdx = null) => {
      if (!toStepId || !stageId) return;
      setCategories((cs) =>
        updateCategoryIn(cs, categoryId, (c) => ({
          ...c,
          steps: (c.steps ?? []).map((st) => {
            if (st.id === toStepId) {
              const cleaned = st.stageIds.filter((sid) => sid !== stageId);
              const next = cleaned.slice();
              const safeIdx =
                toIdx == null || toIdx < 0 || toIdx > next.length
                  ? next.length
                  : toIdx;
              next.splice(safeIdx, 0, stageId);
              return { ...st, stageIds: next };
            }
            return {
              ...st,
              stageIds: st.stageIds.filter((sid) => sid !== stageId),
            };
          }),
        })),
      );
    },
    [],
  );
  // Move a work category from one tag's link list to another tag's link list.
  // If `toIdx` is given, insert at that index in the destination; otherwise
  // append. No-op if the destination already has it.
  const moveStageTrade = useCallback(
    (categoryId, fromStageId, toStageId, tradeId_, toIdx = null) => {
      if (!fromStageId || !toStageId || !tradeId_) return;
      if (fromStageId === toStageId) return;
      setCategories((cs) =>
        updateCategoryIn(cs, categoryId, (c) => {
          const map = { ...c.stageTradeMap };
          const fromList = (map[fromStageId] ?? []).filter(
            (t) => t !== tradeId_,
          );
          const existingDst = map[toStageId] ?? [];
          if (existingDst.includes(tradeId_)) {
            map[fromStageId] = fromList;
            return { ...c, stageTradeMap: map };
          }
          const dst = existingDst.slice();
          const safeIdx =
            toIdx == null || toIdx < 0 || toIdx > dst.length
              ? dst.length
              : toIdx;
          dst.splice(safeIdx, 0, tradeId_);
          map[fromStageId] = fromList;
          map[toStageId] = dst;
          return { ...c, stageTradeMap: map };
        }),
      );
    },
    [],
  );

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
      const orderedStages = getOrderedStages(cat);
      const idx = progress.activeStageIdx;
      if (idx >= orderedStages.length) return;
      const currentStage = orderedStages[idx];
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
      const nextStage = stageComplete ? orderedStages[idx + 1] : null;
      const pendingTradeIds = required.filter((t) => !newSubsForStage[t]);

      setFlatProgress((fp) => {
        const prev = fp[unitId] ?? {
          activeStageIdx: 0, completions: [], stageSubmissions: {},
        };
        return {
          ...fp,
          [unitId]: {
            activeStageIdx: stageComplete
              ? Math.min(prev.activeStageIdx + 1, orderedStages.length)
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
      addStage, renameStage, removeStage, moveStage, reorderStage,
      addStageTrade, removeStageTrade, reorderStageTrade,
      addStep, renameStep, removeStep, moveStep, reorderStep,
      addStepStage, removeStepStage, reorderStepStage,
      moveStageToStep, moveStageTrade,
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
      addStage, renameStage, removeStage, moveStage, reorderStage,
      addStageTrade, removeStageTrade, reorderStageTrade,
      addStep, renameStep, removeStep, moveStep, reorderStep,
      addStepStage, removeStepStage, reorderStepStage,
      moveStageToStep, moveStageTrade,
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
