import { useMemo, useState } from "react";
import { useApp } from "../store.jsx";
import { getOrderedStages } from "../data.js";
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
      const stages = getOrderedStages(category);
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
  const stages = getOrderedStages(category);
  const tradeName = (id) =>
    category.trades.find((t) => t.id === id)?.name ?? "—";

  // Group ordered tag columns by their owning step so we can render a top
  // header row that spans each step's range. Tags not in a step fall under
  // an "Unassigned" group at the end.
  const stepOf = (stageId) =>
    (category.steps ?? []).find((st) => st.stageIds.includes(stageId));
  const stepGroups = [];
  stages.forEach((s) => {
    const step = stepOf(s.id);
    const groupKey = step?.id ?? "_unassigned";
    const last = stepGroups[stepGroups.length - 1];
    if (last && last.key === groupKey) {
      last.tags.push(s);
    } else {
      stepGroups.push({
        key: groupKey,
        name: step?.name ?? "Unassigned",
        unassigned: !step,
        tags: [s],
      });
    }
  });
  // Per-tag position within its step group: drives the colored outer border
  // (left edge on first tag of group, right edge on last, etc.).
  const stageGroupInfo = {};
  stepGroups.forEach((g) => {
    g.tags.forEach((tag, idx) => {
      stageGroupInfo[tag.id] = {
        group: g,
        isFirst: idx === 0,
        isLast: idx === g.tags.length - 1,
      };
    });
  });
  const stepBorder = (g) =>
    g.unassigned ? "border-amber-400" : "border-brand-400";

  return (
    <Card
      title={`${category.name} (${units.length})`}
      right={
        <span className="text-[11px] text-slate-400">
          {(category.steps ?? []).length} step
          {(category.steps ?? []).length === 1 ? "" : "s"} ·{" "}
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
          <table className="w-full min-w-[640px] border-separate border-spacing-x-2 border-spacing-y-0 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {category.name}
                </th>
                {stepGroups.map((g) => (
                  <th
                    key={g.key}
                    colSpan={g.tags.length}
                    className={`border-x-2 border-t-2 rounded-t-lg px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider ${
                      g.unassigned
                        ? "border-amber-400 bg-amber-50/40 text-amber-700"
                        : "border-brand-400 bg-brand-50/40 text-brand-700"
                    }`}
                  >
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 ${
                        g.unassigned
                          ? "bg-amber-100 ring-1 ring-amber-300"
                          : "bg-brand-100 ring-1 ring-brand-300"
                      }`}
                    >
                      {g.name}
                    </span>
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 z-10 bg-white" />
                {stages.map((s, i) => {
                  const ids = category.stageTradeMap[s.id] ?? [];
                  const info = stageGroupInfo[s.id];
                  const stepCls = stepBorder(info.group);
                  return (
                    <th
                      key={s.id}
                      className={`min-w-[110px] border-t border-slate-200 px-2 py-2 align-top ${
                        info.isFirst ? `border-l-2 ${stepCls}` : "border-l border-slate-200"
                      } ${
                        info.isLast ? `border-r-2 ${stepCls}` : "border-r border-slate-200"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1 text-center">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                          {i + 1}
                        </span>
                        <span className="text-[11px] font-semibold leading-tight text-ink">
                          {s.name}
                        </span>
                        {ids.length > 0 && (
                          <div className="flex flex-col items-center gap-1">
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
              {units.map((u, rowIdx) => {
                const p = flatProgress[u.id] ?? {
                  activeStageIdx: 0,
                  stageSubmissions: {},
                };
                const finished = p.activeStageIdx >= stages.length;
                const isLast = rowIdx === units.length - 1;
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
                    {stages.map((s, i) => {
                      const info = stageGroupInfo[s.id];
                      const stepCls = stepBorder(info.group);
                      return (
                        <td
                          key={s.id}
                          className={`p-1 text-center ${
                            info.isFirst ? `border-l-2 ${stepCls}` : "border-l border-slate-200"
                          } ${
                            info.isLast ? `border-r-2 ${stepCls}` : "border-r border-slate-200"
                          } ${
                            isLast
                              ? `border-b-2 ${stepCls} ${
                                  info.isFirst ? "rounded-bl-lg" : ""
                                } ${info.isLast ? "rounded-br-lg" : ""}`
                              : ""
                          }`}
                        >
                          <Cell
                            flatProgress={p}
                            stage={s}
                            stageIdx={i}
                            category={category}
                            unitName={u.name}
                          />
                        </td>
                      );
                    })}
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
