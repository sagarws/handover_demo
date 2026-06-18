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

// Build a site with flats; each flat tracks its own active-stage cursor.
const buildSite = (name, address, flatNames, access) => {
  const id = uid("ste");
  return {
    id,
    name,
    address,
    access,
    flats: flatNames.map((n) => ({ id: uid("flt"), name: n })),
  };
};

export const initialSites = [
  buildSite(
    "Riverside Phase 1 — Block A",
    "Wapping High Street, London E1W",
    ["A101", "A102", "A103", "A201"],
    ["Sarah Chen (Site Manager)", "Mark Williams (Subcontractor Mgr)"],
  ),
  buildSite(
    "Greenfield Mews",
    "Greenfield Road, Manchester M4",
    ["B01", "B02"],
    ["Emma Roberts (Office)"],
  ),
];

// flatProgress[flatId] = {
//   activeStageIdx,
//   completions: [{ stageId, tradeId, contractorId, at }],
//   stageSubmissions: { [stageId]: { [tradeId]: { contractorId, at } } }
// }
// A stage with N linked trades requires N per-trade submissions before it
// advances. completions is a flat append-only log; stageSubmissions is the
// per-slot map the UI reads from.
export const buildInitialProgress = (sites) => {
  const m = {};
  sites.forEach((s) => s.flats.forEach((f) => {
    m[f.id] = { activeStageIdx: 0, completions: [], stageSubmissions: {} };
  }));
  return m;
};
