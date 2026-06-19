import { useMemo, useState } from "react";
import { useApp } from "../store.jsx";
import { Card, EmptyHint, Pill, PageHeader, Select } from "./ui.jsx";

const LEGEND = [
  { key: "done", label: "Done", className: "bg-emerald-500" },
  { key: "active", label: "Active (partial)", className: "bg-brand-500" },
  { key: "todo", label: "Not started", className: "bg-slate-200" },
];

export function ProgressMatrix() {
  const { sites, categories, flatProgress } = useApp();
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const site = sites.find((s) => s.id === siteId);

  // Group this site's units by their category. Each group renders its own
  // matrix using that category's own stage list — flats, corridors and
  // staircases each progress along their own track.
  const groups = useMemo(() => {
    if (!site) return [];
    const byCat = new Map();
    site.units.forEach((u) => {
      if (!byCat.has(u.categoryId)) byCat.set(u.categoryId, []);
      byCat.get(u.categoryId).push(u);
    });
    return [...byCat.entries()]
      .map(([catId, units]) => ({
        category: categories.find((c) => c.id === catId),
        units,
      }))
      .filter((g) => g.category);
  }, [site, categories]);

  // Total / done is summed per category (each category has its own stages
  // count), with partial credit for the active stage.
  const stats = useMemo(() => {
    if (!site) return null;
    let total = 0;
    let done = 0;
    let active = 0;
    groups.forEach(({ category, units }) => {
      const stages = category.stages;
      units.forEach((f) => {
        const p = flatProgress[f.id];
        if (!p) return;
        total += stages.length;
        done += Math.min(p.activeStageIdx, stages.length);
        const activeStage = stages[p.activeStageIdx];
        if (activeStage) {
          const required = category.stageTradeMap[activeStage.id] ?? [];
          const subs = p.stageSubmissions?.[activeStage.id] ?? {};
          const slots = required.length || 1;
          const filled =
            required.length > 0
              ? required.filter((t) => subs[t]).length
              : Object.keys(subs).length;
          done += filled / slots;
          active += 1;
        }
      });
    });
    return {
      total,
      done: Math.round(done * 10) / 10,
      active,
      pct: total ? Math.round((done / total) * 100) : 0,
    };
  }, [site, groups, flatProgress]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Progress Matrix"
        description="One matrix per unit category. Columns are the tags defined in that category; the active cell fills one notch per work category submitted and only flips fully green once every linked work category has been handed over."
      />

      <Card
        title="Site"
        right={
          stats && (
            <span className="text-[11px] text-slate-500">
              {stats.done}/{stats.total} cells done · {stats.pct}% ·{" "}
              {stats.active} units still in progress
            </span>
          )
        }
      >
        {sites.length === 0 ? (
          <EmptyHint>No sites yet — add one in Sites.</EmptyHint>
        ) : (
          <Select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}
      </Card>

      {!site ? (
        <Card title="Matrix">
          <EmptyHint>Pick a site above.</EmptyHint>
        </Card>
      ) : groups.length === 0 ? (
        <Card title="Matrix">
          <EmptyHint>
            This site has no units yet — add some on the Sites page.
          </EmptyHint>
        </Card>
      ) : (
        <>
          <Card title="Legend">
            <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
              {LEGEND.map((l) => (
                <span key={l.key} className="inline-flex items-center gap-1.5">
                  <span className={`h-3 w-3 rounded ${l.className}`} />
                  {l.label}
                </span>
              ))}
            </div>
          </Card>
          {groups.map(({ category, units }) => (
            <CategoryMatrix
              key={category.id}
              category={category}
              units={units}
              flatProgress={flatProgress}
            />
          ))}
        </>
      )}
    </div>
  );
}

function CategoryMatrix({ category, units, flatProgress }) {
  const stages = category.stages;
  const tradeName = (id) =>
    category.trades.find((t) => t.id === id)?.name ?? "—";

  return (
    <Card
      title={`${category.name} (${units.length})`}
      right={
        <span className="text-[11px] text-slate-400">
          {stages.length} tags · independent progress per row
        </span>
      }
    >
      {stages.length === 0 ? (
        <EmptyHint>
          “{category.name}” has no tags — define some in Configuration.
        </EmptyHint>
      ) : (
        <div className="scroll-x overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {category.name}
                </th>
                {stages.map((s, i) => {
                  const ids = category.stageTradeMap[s.id] ?? [];
                  return (
                    <th
                      key={s.id}
                      className="min-w-[110px] border-b border-slate-100 px-2 py-2 align-top"
                    >
                      <div className="flex flex-col items-center gap-1 text-center">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                          {i + 1}
                        </span>
                        <span className="text-[11px] font-semibold leading-tight text-ink">
                          {s.name}
                        </span>
                        {ids.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-1">
                            {ids.map((tid) => (
                              <span
                                key={tid}
                                className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                              >
                                {tradeName(tid)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {units.map((u) => {
                const p = flatProgress[u.id] ?? {
                  activeStageIdx: 0,
                  stageSubmissions: {},
                };
                const finished = p.activeStageIdx >= stages.length;
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="sticky left-0 z-10 bg-white px-2 py-2 text-xs font-semibold text-ink">
                      {u.name}
                      {finished && (
                        <Pill tone="green" className="ml-2">
                          completed
                        </Pill>
                      )}
                    </td>
                    {stages.map((s, i) => (
                      <td
                        key={s.id}
                        className="border-b border-slate-50 p-1 text-center"
                      >
                        <Cell
                          flatProgress={p}
                          stage={s}
                          stageIdx={i}
                          category={category}
                          unitName={u.name}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// One matrix cell. Done = full emerald; future = grey; active = split into
// equal slots, one per linked trade, so partial completion is visible.
function Cell({ flatProgress, stage, stageIdx, category, unitName }) {
  const activeIdx = flatProgress.activeStageIdx ?? 0;
  if (stageIdx < activeIdx) {
    return (
      <div
        className="mx-auto h-6 w-10 rounded-md bg-emerald-500"
        title={`${unitName} — ${stage.name}: done`}
      />
    );
  }
  if (stageIdx > activeIdx) {
    return (
      <div
        className="mx-auto h-6 w-10 rounded-md bg-slate-200"
        title={`${unitName} — ${stage.name}: not started`}
      />
    );
  }
  const required = category.stageTradeMap[stage.id] ?? [];
  const subs = flatProgress.stageSubmissions?.[stage.id] ?? {};
  const slots =
    required.length > 0
      ? required.map((tid) => ({ tid, filled: Boolean(subs[tid]) }))
      : [{ tid: "_", filled: false }];
  const filledCount = slots.filter((s) => s.filled).length;
  const pct = Math.round((filledCount / slots.length) * 100);
  return (
    <div
      className="mx-auto flex h-6 w-10 overflow-hidden rounded-md ring-2 ring-brand-500/40"
      title={`${unitName} — ${stage.name}: ${pct}% (${filledCount}/${slots.length})`}
    >
      {slots.map((slot, i) => (
        <div
          key={slot.tid + i}
          className={`flex-1 ${
            slot.filled ? "bg-emerald-500" : "bg-brand-500"
          } ${i > 0 ? "border-l border-white" : ""}`}
        />
      ))}
    </div>
  );
}
