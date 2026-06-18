// Seed data for the handover prototype. All state lives in React state at
// runtime — this file just gives us a sensible starting point.

let counter = 0;
export const uid = (prefix = "id") => `${prefix}_${++counter}_${Date.now().toString(36)}`;

const trade = (name) => ({ id: uid("trd"), name });
const stage = (name) => ({ id: uid("stg"), name });

export const initialTrades = [
  trade("Drylining"),
  trade("M&E (First Fix)"),
  trade("Plastering"),
  trade("Carpentry (Second Fix)"),
  trade("Painting & Decoration"),
];

export const initialStages = [
  stage("Drylining 1st Side"),
  stage("First Fix M&E"),
  stage("Plastering"),
  stage("Second Fix Carpentry"),
  stage("Decoration Final"),
];

// stageTradeMap: { [stageId]: tradeId[] }  — many-to-many; a stage can
// accept work from contractors of any listed trade.
export const initialStageTradeMap = (() => {
  const m = {};
  initialStages.forEach((s, i) => {
    const primary = initialTrades[i]?.id;
    m[s.id] = primary ? [primary] : [];
  });
  // Seed one stage with two trades so the multi-trade case shows up out of
  // the box — "First Fix M&E" can be handed over by either M&E or Drylining.
  const firstFix = initialStages[1];
  if (firstFix && initialTrades[0] && !m[firstFix.id].includes(initialTrades[0].id)) {
    m[firstFix.id] = [...m[firstFix.id], initialTrades[0].id];
  }
  return m;
})();

export const initialContractors = [
  { id: uid("ctr"), name: "Alex Reid", company: "Reid Drywall Co.", tradeIds: [initialTrades[0].id] },
  { id: uid("ctr"), name: "Priya Shah", company: "Bright Spark Electric", tradeIds: [initialTrades[1].id] },
  { id: uid("ctr"), name: "Carlos Mendes", company: "Mendes Plastering Ltd.", tradeIds: [initialTrades[2].id] },
  { id: uid("ctr"), name: "Sam Chen", company: "Chen Carpentry", tradeIds: [initialTrades[3].id] },
  { id: uid("ctr"), name: "Ola Adeyemi", company: "Adeyemi Paints", tradeIds: [initialTrades[4].id] },
];

// A site is composed of typed "units" — flats *and* shared parts like
// corridors, staircases, lobbies. Each unit tracks its own progress cursor.
// The `type` field is free-form so operators can add anything (lift shaft,
// roof plant, etc.); UNIT_TYPE_SUGGESTIONS just powers the datalist.
export const UNIT_TYPE_SUGGESTIONS = [
  "Flat",
  "Corridor",
  "Staircase",
  "Lobby",
  "Lift Shaft",
  "Roof Plant",
  "Common Area",
];

const unit = (name, type = "Flat") => ({ id: uid("unt"), name, type });

const buildSite = (name, address, units, access) => ({
  id: uid("ste"),
  name,
  address,
  access,
  units,
});

export const initialSites = [
  buildSite(
    "Riverside Phase 1 — Block A",
    "Wapping High Street, London E1W",
    [
      unit("A101", "Flat"),
      unit("A102", "Flat"),
      unit("A103", "Flat"),
      unit("A201", "Flat"),
      unit("Floor 1 Corridor", "Corridor"),
      unit("Staircase A", "Staircase"),
    ],
    ["Sarah Chen (Site Manager)", "Mark Williams (Subcontractor Mgr)"],
  ),
  buildSite(
    "Greenfield Mews",
    "Greenfield Road, Manchester M4",
    [unit("B01", "Flat"), unit("B02", "Flat")],
    ["Emma Roberts (Office)"],
  ),
];

// flatProgress[unitId] = {
//   activeStageIdx,
//   completions: [{ stageId, tradeId, contractorId, at }],
//   stageSubmissions: { [stageId]: { [tradeId]: { contractorId, at } } }
// }
// Keyed by unit id (any unit type — flat, corridor, staircase…). A stage
// with N linked trades requires N per-trade submissions before it advances.
export const buildInitialProgress = (sites) => {
  const m = {};
  sites.forEach((s) => s.units.forEach((u) => {
    m[u.id] = { activeStageIdx: 0, completions: [], stageSubmissions: {} };
  }));
  return m;
};
