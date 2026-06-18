import { useEffect, useMemo, useState } from "react";
import { useApp } from "../store.jsx";
import { Card, Button, Select, Pill, EmptyHint, PageHeader } from "./ui.jsx";

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Handover() {
  const {
    sites, stages, stageTradeMap, trades, contractors, flatProgress,
    handovers, completeActiveStage,
  } = useApp();

  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const site = sites.find((s) => s.id === siteId);
  const [flatId, setFlatId] = useState(site?.flats[0]?.id ?? "");
  const flat = site?.flats.find((f) => f.id === flatId);
  const [contractorId, setContractorId] = useState("");

  // Keep flat in sync when site changes.
  useEffect(() => {
    if (!site) {
      setFlatId("");
      return;
    }
    if (!site.flats.find((f) => f.id === flatId)) {
      setFlatId(site.flats[0]?.id ?? "");
    }
  }, [site, flatId]);

  const progress = flat ? flatProgress[flat.id] : null;
  const activeIdx = progress?.activeStageIdx ?? 0;
  const activeStage = stages[activeIdx];
  const finished = !activeStage;

  const requiredTradeId = activeStage ? stageTradeMap[activeStage.id] : null;
  const requiredTrade = trades.find((t) => t.id === requiredTradeId);

  // Contractors who are tagged with the active stage's required trade — that's
  // the dropdown the user requested. If no trade is wired up, fall back to
  // every contractor so the demo isn't blocked.
  const eligibleContractors = useMemo(() => {
    if (!requiredTradeId) return contractors;
    return contractors.filter((c) => c.tradeIds.includes(requiredTradeId));
  }, [contractors, requiredTradeId]);

  // Reset selected contractor when the pool changes (new flat, new stage).
  useEffect(() => {
    if (!eligibleContractors.find((c) => c.id === contractorId)) {
      setContractorId(eligibleContractors[0]?.id ?? "");
    }
  }, [eligibleContractors, contractorId]);

  const tradeName = (id) => trades.find((t) => t.id === id)?.name ?? "—";
  const contractorLabel = (id) => {
    const c = contractors.find((x) => x.id === id);
    return c ? `${c.name}${c.company ? ` · ${c.company}` : ""}` : "Unknown";
  };

  const completionsByStage = useMemo(() => {
    const m = {};
    (progress?.completions ?? []).forEach((c) => {
      m[c.stageId] = c;
    });
    return m;
  }, [progress]);

  const flatHandovers = useMemo(
    () => handovers.filter((h) => h.flatId === flat?.id),
    [handovers, flat?.id],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Handover"
        description="The core demo. Pick a flat, see its active stage and required trade, choose the contractor who finished the work, and hand the flat over to the next stage."
      />

      <Card title="Pick site & flat">
        {sites.length === 0 ? (
          <EmptyHint>No sites yet — add one in Sites.</EmptyHint>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">
                Site
              </label>
              <Select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">
                Flat
              </label>
              <Select
                value={flatId}
                onChange={(e) => setFlatId(e.target.value)}
                disabled={!site || site.flats.length === 0}
              >
                {site?.flats.length ? (
                  site.flats.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))
                ) : (
                  <option>No flats</option>
                )}
              </Select>
            </div>
          </div>
        )}
      </Card>

      {flat && (
        <Card
          title={
            <span className="flex items-center gap-2">
              {flat.name}
              <Pill tone={finished ? "green" : "blue"}>
                {finished
                  ? "All stages complete"
                  : `Stage ${activeIdx + 1} of ${stages.length}`}
              </Pill>
            </span>
          }
        >
          {finished ? (
            <div className="rounded-md bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-700">
              ✓ Every configured stage for this flat has been handed over.
            </div>
          ) : !activeStage ? (
            <EmptyHint>No stages configured.</EmptyHint>
          ) : (
            <div className="grid gap-4 md:grid-cols-[1fr,260px]">
              <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
                  Active stage
                </div>
                <div className="mt-1 text-lg font-semibold text-ink">
                  {activeStage.name}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span>Required trade:</span>
                  {requiredTrade ? (
                    <Pill tone="blue">{requiredTrade.name}</Pill>
                  ) : (
                    <Pill tone="rose">no trade linked — wire one up in Configuration</Pill>
                  )}
                </div>

                <div className="mt-4">
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">
                    Contractor that performed the work
                  </label>
                  {eligibleContractors.length === 0 ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      No contractor has the “{requiredTrade?.name ?? "required"}”
                      trade. Add or tag one on the Contractors page.
                    </div>
                  ) : (
                    <Select
                      value={contractorId}
                      onChange={(e) => setContractorId(e.target.value)}
                    >
                      {eligibleContractors.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {c.company ? ` — ${c.company}` : ""}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <Button
                    variant="success"
                    disabled={!contractorId}
                    onClick={() => completeActiveStage(flat.id, contractorId)}
                  >
                    ✓ Mark stage complete &amp; handover →
                  </Button>
                  <span className="text-[11px] text-slate-500">
                    Advances to{" "}
                    <strong>
                      {stages[activeIdx + 1]?.name ?? "completion"}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Up next
                </div>
                {stages[activeIdx + 1] ? (
                  <>
                    <div className="mt-1 text-sm font-medium text-ink">
                      {stages[activeIdx + 1].name}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Trade:{" "}
                      {tradeName(stageTradeMap[stages[activeIdx + 1].id]) ?? "—"}
                    </div>
                  </>
                ) : (
                  <div className="mt-1 text-sm text-slate-500">
                    Final stage — completion ends the flat.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stage timeline */}
          <div className="mt-5">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Stage timeline
            </div>
            <ol className="space-y-1.5">
              {stages.map((s, i) => {
                const completion = completionsByStage[s.id];
                const isActive = i === activeIdx;
                const isDone = i < activeIdx;
                return (
                  <li
                    key={s.id}
                    className={`flex items-center gap-3 rounded-md border px-3 py-2 ${
                      isActive
                        ? "border-brand-300 bg-brand-50/60"
                        : isDone
                          ? "border-emerald-100 bg-emerald-50/40"
                          : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                        isDone
                          ? "bg-emerald-500 text-white"
                          : isActive
                            ? "bg-brand-600 text-white"
                            : "bg-white text-slate-500 ring-1 ring-slate-200"
                      }`}
                    >
                      {isDone ? "✓" : i + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium text-ink">
                      {s.name}
                    </span>
                    <Pill tone={stageTradeMap[s.id] ? "slate" : "rose"}>
                      {tradeName(stageTradeMap[s.id])}
                    </Pill>
                    {isDone && completion ? (
                      <span className="hidden md:inline text-[11px] text-slate-500">
                        by {contractorLabel(completion.contractorId)} ·{" "}
                        {formatTime(completion.at)}
                      </span>
                    ) : isActive ? (
                      <Pill tone="blue">active</Pill>
                    ) : (
                      <span className="text-[11px] text-slate-400">queued</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </Card>
      )}

      {/* Handover log */}
      <Card
        title="Handover log"
        right={
          <span className="text-[11px] text-slate-400">
            Most recent first {flat ? `· ${flat.name}` : ""}
          </span>
        }
      >
        {!flat ? (
          <EmptyHint>Pick a flat to see its handover events.</EmptyHint>
        ) : flatHandovers.length === 0 ? (
          <EmptyHint>No handovers yet — complete the active stage to start.</EmptyHint>
        ) : (
          <ul className="space-y-2">
            {flatHandovers.map((h) => {
              const fromStage = stages.find((s) => s.id === h.fromStageId);
              const toStage = stages.find((s) => s.id === h.toStageId);
              return (
                <li
                  key={h.id}
                  className="rounded-md border border-slate-100 bg-white px-3 py-2 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400">{formatTime(h.at)}</span>
                    <Pill tone="green">{contractorLabel(h.contractorId)}</Pill>
                    <span className="text-slate-500">completed</span>
                    <Pill tone="slate">{fromStage?.name ?? "?"}</Pill>
                    {toStage ? (
                      <>
                        <span className="text-slate-400">→ handover to</span>
                        <Pill tone="blue">{toStage.name}</Pill>
                        <span className="text-slate-500">
                          ({tradeName(h.toTradeId)})
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-slate-400">→</span>
                        <Pill tone="green">flat complete</Pill>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
