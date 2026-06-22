// Seed data for the handover prototype. All state lives in React state at
// runtime — this file just gives us a sensible starting point.
//
// Domain shape (post-restructure):
//   categories[]   — Flat / Corridor / Staircase / … each owns its own
//                    trades, stages, and stage→trade map.
//   contractors[]  — carry trade ids from any category they can work in.
//   sites[]        — each site has units; a unit just references a categoryId.
//   flatProgress   — keyed by unit id; tracks active stage idx + per-trade
//                    submissions, exactly as before.

let counter = 0;
export const uid = (prefix = "id") =>
  `${prefix}_${++counter}_${Date.now().toString(36)}`;

// Canonical tag order for a category: walk steps in declared order. Tags
// that aren't attached to any step are intentionally omitted — they only
// surface in the Step Management page, never in Progress Matrix / Handover /
// progression. This is the order both display + progression use.
export const getOrderedStages = (category) => {
  if (!category) return [];
  const stages = category.stages ?? [];
  const steps = category.steps ?? [];
  const byId = new Map(stages.map((s) => [s.id, s]));
  const seen = new Set();
  const ordered = [];
  steps.forEach((st) =>
    (st.stageIds ?? []).forEach((sid) => {
      const s = byId.get(sid);
      if (s && !seen.has(sid)) {
        ordered.push(s);
        seen.add(sid);
      }
    }),
  );
  return ordered;
};

const trade = (name) => ({ id: uid("trd"), name });
const stage = (name) => ({ id: uid("stg"), name });

// Build a category with its own trades/stages and a stage→trade mapping
// expressed as { stageIdx: [tradeIdx, …] } so the seed is readable.
// Steps start empty so the user explicitly authors them in Step Management —
// every tag is "unassigned" until they group them.
const buildCategory = (name, tradeNames, stageNames, mapping = {}) => {
  const trades = tradeNames.map(trade);
  const stages = stageNames.map(stage);
  const stageTradeMap = {};
  stages.forEach((s, i) => {
    const tids = (mapping[i] ?? [])
      .map((tIdx) => trades[tIdx]?.id)
      .filter(Boolean);
    stageTradeMap[s.id] = tids;
  });
  return { id: uid("cat"), name, trades, stages, stageTradeMap, steps: [] };
};

export const initialCategories = [
  buildCategory(
    "Flat",
    [
      "Plumbing",
      "Electrical",
      "Drylining",
      "Plastering",
      "Ventilation",
      "Carpentry",
      "Tiling",
      "Painting",
    ],
    [
      "Drylining 1st Side",
      "First Fix M&E",
      "Insulation",
      "Drylining 2nd Side",
      "Plastering",
      "Screed",
      "Second Fix Carpentry",
      "Second Fix M&E",
      "Tiling",
      "Decoration 1st Coat",
      "Kitchen Install",
      "Bathroom Install",
      "Flooring",
      "Decoration Final",
      "Sanitaryware",
      "Snagging",
      "Pre-Handover Clean",
      "Final Handover",
    ],
  ),
  buildCategory(
    "Corridor",
    ["Drylining", "Electrical", "Plastering", "Painting"],
    ["Drylining", "First Fix M&E", "Plastering", "Decoration"],
  ),
  buildCategory(
    "Staircase",
    ["Drylining", "Plastering", "Painting"],
    ["Drylining", "Plastering", "Decoration"],
  ),
];

// Look up a per-category trade id by category name + trade name (seed-only
// helper — runtime code references ids directly).
const tradeId = (catName, tradeName) => {
  const c = initialCategories.find((c) => c.name === catName);
  return c?.trades.find((t) => t.name === tradeName)?.id;
};

export const initialContractors = [
  {
    id: uid("ctr"),
    name: "Alex Reid",
    company: "Reid Drywall Co.",
    tradeIds: [
      tradeId("Flat", "Drylining"),
      tradeId("Corridor", "Drylining"),
      tradeId("Staircase", "Drylining"),
    ].filter(Boolean),
  },
  {
    id: uid("ctr"),
    name: "Priya Shah",
    company: "Bright Spark Electric",
    tradeIds: [
      tradeId("Flat", "Electrical"),
      tradeId("Corridor", "Electrical"),
    ].filter(Boolean),
  },
  {
    id: uid("ctr"),
    name: "Carlos Mendes",
    company: "Mendes Plastering Ltd.",
    tradeIds: [
      tradeId("Flat", "Plastering"),
      tradeId("Corridor", "Plastering"),
      tradeId("Staircase", "Plastering"),
    ].filter(Boolean),
  },
  {
    id: uid("ctr"),
    name: "Sam Chen",
    company: "Chen Carpentry",
    tradeIds: [tradeId("Flat", "Carpentry")].filter(Boolean),
  },
  {
    id: uid("ctr"),
    name: "Ola Adeyemi",
    company: "Adeyemi Paints",
    tradeIds: [
      tradeId("Flat", "Painting"),
      tradeId("Corridor", "Painting"),
      tradeId("Staircase", "Painting"),
    ].filter(Boolean),
  },
];

const catId = (name) => initialCategories.find((c) => c.name === name)?.id;
const unit = (name, categoryName) => ({
  id: uid("unt"),
  name,
  categoryId: catId(categoryName),
});

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

export const buildInitialProgress = (sites) => {
  const m = {};
  sites.forEach((s) =>
    s.units.forEach((u) => {
      m[u.id] = { activeStageIdx: 0, completions: [], stageSubmissions: {} };
    }),
  );
  return m;
};
