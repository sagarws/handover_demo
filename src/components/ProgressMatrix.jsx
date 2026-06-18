import { useMemo, useState } from "react";
import { useApp } from "../store.jsx";
import { Card, EmptyHint, Pill, PageHeader, Select } from "./ui.jsx";

const LEGEND = [
  { key: "done", label: "Done", className: "bg-emerald-500" },
  { key: "active", label: "Active", className: "bg-brand-500" },
  { key: "todo", label: "Not started", className: "bg-slate-200" },
];

export function ProgressMatrix() {
  const { sites, stages, stageTradeMap, trades, flatProgress } = useApp();
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");

  const site = sites.find((s) => s.id === siteId);

  const tradeName = (id) => trades.find((t) => t.id === id)?.name ?? "—";

  const stats = useMemo(() => {
    if (!site) return null;
    const total = site.flats.length * stages.length;
    let done = 0;
    let active = 0;
    site.flats.forEach((f) => {
      const p = flatProgress[f.id];
      if (!p) return;
      done += Math.min(p.activeStageIdx, stages.length);
      if (p.activeStageIdx < stages.length) active += 1;
    });
    return {
      total,
      done,
      active,
      pct: total ? Math.round((done / total) * 100) : 0,
    };
  }, [site, stages.length, flatProgress]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Progress Matrix"
        description="Each row is a flat, each column is a stage. The blue cell is the flat's currently-active stage — handovers move it one step to the right."
      />

      <Card
        title="Site"
        right={
          stats && (
            <span className="text-[11px] text-slate-500">
              {stats.done}/{stats.total} cells done · {stats.pct}% · {stats.active} flats still in progress
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
              <table className="w-full min-w-[640px] border-separate border-spacing-0 text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-white px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Flat
                    </th>
                    {stages.map((s, i) => (
                      <th
                        key={s.id}
                        className="px-1 py-2 text-center align-bottom"
                      >
                        <div className="mb-1 text-[10px] font-semibold text-slate-500">
                          {i + 1}
                        </div>
                        <div className="rotate-[-20deg] origin-bottom whitespace-nowrap text-[10px] font-medium text-slate-700">
                          {s.name}
                        </div>
                        {stageTradeMap[s.id] && (
                          <div className="mt-1 text-[9px] text-slate-400">
                            {tradeName(stageTradeMap[s.id])}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {site.flats.map((f) => {
                    const p = flatProgress[f.id] ?? { activeStageIdx: 0 };
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
                        {stages.map((s, i) => {
                          let cls = "bg-slate-200";
                          let title = "Not started";
                          if (i < p.activeStageIdx) {
                            cls = "bg-emerald-500";
                            title = "Done";
                          } else if (i === p.activeStageIdx) {
                            cls = "bg-brand-500";
                            title = "Active";
                          }
                          return (
                            <td key={s.id} className="p-1 text-center">
                              <div
                                className={`mx-auto h-5 w-5 rounded ${cls}`}
                                title={`${f.name} — ${s.name}: ${title}`}
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
          </>
        )}
      </Card>
    </div>
  );
}
