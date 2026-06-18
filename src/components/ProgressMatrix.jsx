import { useMemo, useState } from "react";
import { useApp } from "../store.jsx";
import { Card, EmptyHint, Pill, PageHeader, Select } from "./ui.jsx";

const LEGEND = [
  { key: "done", label: "Done", className: "bg-emerald-500" },
  { key: "active", label: "Active (partial)", className: "bg-brand-500" },
  { key: "todo", label: "Not started", className: "bg-slate-200" },
];

export function ProgressMatrix() {
  const { sites, stages, stageTradeMap, trades, flatProgress } = useApp();
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");

  const site = sites.find((s) => s.id === siteId);
  const tradeName = (id) => trades.find((t) => t.id === id)?.name ?? "—";

  // Stats roll up all stages of all flats including partial credit for the
  // active stage (e.g. 1/2 of a stage's trades submitted = 0.5 cells done).
  const stats = useMemo(() => {
    if (!site) return null;
    const total = site.flats.length * stages.length;
    let done = 0;
    let active = 0;
    site.flats.forEach((f) => {
      const p = flatProgress[f.id];
      if (!p) return;
      done += Math.min(p.activeStageIdx, stages.length);
      const activeStage = stages[p.activeStageIdx];
      if (activeStage) {
        const required = stageTradeMap[activeStage.id] ?? [];
        const subs = p.stageSubmissions?.[activeStage.id] ?? {};
        const slots = required.length || 1;
        const filled = required.length > 0
          ? required.filter((t) => subs[t]).length
          : Object.keys(subs).length;
        done += filled / slots;
        active += 1;
      }
    });
    return {
      total,
      done: Math.round(done * 10) / 10,
      active,
      pct: total ? Math.round((done / total) * 100) : 0,
    };
  }, [site, stages, stageTradeMap, flatProgress]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Progress Matrix"
        description="Each row is a flat, each column is a stage. The active cell fills proportionally — one notch per trade submitted — and only flips fully green when every linked trade has been handed over."
      />

      <Card
        title="Site"
        right={
          stats && (
            <span className="text-[11px] text-slate-500">
              {stats.done}/{stats.total} cells done · {stats.pct}% ·{" "}
              {stats.active} flats still in progress
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

      <Card title="Matrix">
        {!site ? (
          <EmptyHint>Pick a site above.</EmptyHint>
        ) : site.flats.length === 0 ? (
          <EmptyHint>This site has no flats yet.</EmptyHint>
        ) : stages.length === 0 ? (
          <EmptyHint>No stages defined — add some in Configuration.</EmptyHint>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
              {LEGEND.map((l) => (
                <span key={l.key} className="inline-flex items-center gap-1.5">
                  <span className={`h-3 w-3 rounded ${l.className}`} />
                  {l.label}
                </span>
              ))}
            </div>
            <div className="scroll-x overflow-x-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-0 text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-white px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Flat
                    </th>
                    {stages.map((s, i) => {
                      const ids = stageTradeMap[s.id] ?? [];
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
                  {site.flats.map((f) => {
                    const p = flatProgress[f.id] ?? {
                      activeStageIdx: 0,
                      stageSubmissions: {},
                    };
                    const finished = p.activeStageIdx >= stages.length;
                    return (
                      <tr key={f.id} className="hover:bg-slate-50">
                        <td className="sticky left-0 z-10 bg-white px-2 py-2 text-xs font-semibold text-ink">
                          {f.name}
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
                              stageTradeMap={stageTradeMap}
                              tradeName={tradeName}
                              flatName={f.name}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// Renders one matrix cell. Done = full emerald. Future = grey. Active stage
// uses a horizontal split — N equal slots, one per linked trade, each slot
// goes emerald the moment its trade has submitted. That visualises the
// "stage percentage divided by number of categories" rule directly.
function Cell({ flatProgress, stage, stageIdx, stageTradeMap, tradeName, flatName }) {
  const activeIdx = flatProgress.activeStageIdx ?? 0;
  if (stageIdx < activeIdx) {
    return (
      <div
        className="mx-auto h-6 w-10 rounded-md bg-emerald-500"
        title={`${flatName} — ${stage.name}: done`}
      />
    );
  }
  if (stageIdx > activeIdx) {
    return (
      <div
        className="mx-auto h-6 w-10 rounded-md bg-slate-200"
        title={`${flatName} — ${stage.name}: not started`}
      />
    );
  }
  // Active cell — partial fill, one slot per linked trade.
  const required = stageTradeMap[stage.id] ?? [];
  const subs = flatProgress.stageSubmissions?.[stage.id] ?? {};
  const slots = required.length > 0
    ? required.map((tid) => ({
        tid,
        filled: Boolean(subs[tid]),
        label: tradeName(tid),
      }))
    : [{ tid: "_", filled: false, label: "—" }];
  const filledCount = slots.filter((s) => s.filled).length;
  const pct = Math.round((filledCount / slots.length) * 100);
  return (
    <div
      className="mx-auto flex h-6 w-10 overflow-hidden rounded-md ring-2 ring-brand-500/40"
      title={`${flatName} — ${stage.name}: ${pct}% (${filledCount}/${slots.length})`}
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
