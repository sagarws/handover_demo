import { useEffect, useMemo, useState } from "react";
import { useApp } from "../store.jsx";
import {
  Card, Button, Select, Pill, EmptyHint, PageHeader, Combobox,
} from "./ui.jsx";

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
    sites, categories, contractors, flatProgress, handovers,
    getCategory, completeActiveStage,
  } = useApp();

  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const site = sites.find((s) => s.id === siteId);
  const [unitId, setUnitId] = useState(site?.units[0]?.id ?? "");
  const unit = site?.units.find((f) => f.id === unitId);
  const [contractorId, setContractorId] = useState("");
  const [submitTradeId, setSubmitTradeId] = useState("");

  // Lookups.
  const category = unit ? getCategory(unit.categoryId) : null;
  const stages = category?.stages ?? [];
  const stageTradeMap = category?.stageTradeMap ?? {};
  const trades = category?.trades ?? [];
  const tradeName = (id) => trades.find((t) => t.id === id)?.name ?? "—";
  const contractorLabel = (id) => {
    const c = contractors.find((x) => x.id === id);
    return c ? `${c.name}${c.company ? ` · ${c.company}` : ""}` : "Unknown";
  };

  // Keep unit selection in sync when site changes.
  useEffect(() => {
    if (!site) return setUnitId("");
    if (!site.units.find((f) => f.id === unitId)) {
      setUnitId(site.units[0]?.id ?? "");
    }
  }, [site, unitId]);

  const progress = unit ? flatProgress[unit.id] : null;
  const activeIdx = progress?.activeStageIdx ?? 0;
  const activeStage = stages[activeIdx];
  const finished = stages.length > 0 && !activeStage;

  const requiredTradeIds = activeStage ? stageTradeMap[activeStage.id] ?? [] : [];
  const activeSubmissions = activeStage
    ? progress?.stageSubmissions?.[activeStage.id] ?? {}
    : {};
  const unfilledTradeIds = useMemo(
    () => requiredTradeIds.filter((tid) => !activeSubmissions[tid]),
    [requiredTradeIds, activeSubmissions],
  );

  // A contractor is eligible if they carry one of the still-unfilled
  // category-scoped trade ids.
  const eligibleContractors = useMemo(() => {
    if (requiredTradeIds.length === 0) return contractors;
    if (unfilledTradeIds.length === 0) return [];
    return contractors.filter((c) =>
      c.tradeIds.some((tid) => unfilledTradeIds.includes(tid)),
    );
  }, [contractors, requiredTradeIds, unfilledTradeIds]);

  const availableSubmitTradeIds = useMemo(() => {
    const c = contractors.find((x) => x.id === contractorId);
    if (!c) return [];
    if (requiredTradeIds.length === 0) return c.tradeIds;
    return c.tradeIds.filter((tid) => unfilledTradeIds.includes(tid));
  }, [contractors, contractorId, requiredTradeIds, unfilledTradeIds]);

  useEffect(() => {
    if (!eligibleContractors.find((c) => c.id === contractorId)) {
      setContractorId(eligibleContractors[0]?.id ?? "");
    }
  }, [eligibleContractors, contractorId]);

  useEffect(() => {
    if (!availableSubmitTradeIds.includes(submitTradeId)) {
      setSubmitTradeId(availableSubmitTradeIds[0] ?? "");
    }
  }, [availableSubmitTradeIds, submitTradeId]);

  const completionsByStage = useMemo(() => {
    const m = {};
    (progress?.completions ?? []).forEach((c) => {
      (m[c.stageId] ||= []).push(c);
    });
    return m;
  }, [progress]);

  const flatHandovers = useMemo(
    () => handovers.filter((h) => h.flatId === unit?.id),
    [handovers, unit?.id],
  );

  const slotCount = requiredTradeIds.length || 1;
  const filledCount =
    requiredTradeIds.length > 0
      ? requiredTradeIds.filter((t) => activeSubmissions[t]).length
      : Object.keys(activeSubmissions).length;
  const stagePct = Math.round((filledCount / slotCount) * 100);

  // Build searchable unit options grouped by category for the Combobox.
  const unitOptions = useMemo(() => {
    if (!site) return [];
    return site.units.map((u) => {
      const cat = getCategory(u.categoryId);
      return {
        value: u.id,
        label: u.name,
        group: cat?.name ?? "Unknown",
        hint: cat ? `${cat.stages.length} stages` : "",
      };
    });
  }, [site, getCategory]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Handover"
        description="Pick a unit and submit its active stage's trade slots one at a time. Each unit walks the stage list defined for its category — a flat, a corridor and a staircase progress completely independently. A stage only advances once every linked trade has been handed over."
      />

      <Card title="Pick site & unit">
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
                Unit (type to search · grouped by category)
              </label>
              <Combobox
                value={unitId}
                onChange={setUnitId}
                options={unitOptions}
                placeholder={site?.units.length ? "Type or pick a unit…" : "No units on this site"}
                emptyLabel="No units match"
                disabled={!site || site.units.length === 0}
              />
            </div>
          </div>
        )}
      </Card>

      {unit && (
        <Card
          title={
            <span className="flex items-center gap-2">
              {unit.name}
              <Pill tone="slate">{category?.name ?? "—"}</Pill>
              <Pill tone={finished ? "green" : "blue"}>
                {stages.length === 0
                  ? "No stages in category"
                  : finished
                    ? "All stages complete"
                    : `Stage ${activeIdx + 1} of ${stages.length}`}
              </Pill>
            </span>
          }
        >
          {stages.length === 0 ? (
            <EmptyHint>
              The “{category?.name}” category has no stages — define some in
              Configuration.
            </EmptyHint>
          ) : finished ? (
            <div className="rounded-md bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-700">
              ✓ Every stage on this unit has been handed over.
            </div>
          ) : !activeStage ? (
            <EmptyHint>No active stage.</EmptyHint>
          ) : (
            <div className="grid gap-4 md:grid-cols-[1fr,260px]">
              <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
                      Active stage
                    </div>
                    <div className="mt-1 text-lg font-semibold text-ink">
                      {activeStage.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold text-brand-700">
                      {stagePct}%
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {filledCount} of {slotCount} trades submitted
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white ring-1 ring-brand-200">
                  {Array.from({ length: slotCount }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 ${
                        i < filledCount ? "bg-emerald-500" : "bg-transparent"
                      } ${i > 0 ? "border-l border-white" : ""}`}
                    />
                  ))}
                </div>

                <div className="mt-4">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Required trades
                  </div>
                  {requiredTradeIds.length === 0 ? (
                    <Pill tone="rose">
                      no trade linked — wire one up in Configuration
                    </Pill>
                  ) : (
                    <ul className="space-y-1.5">
                      {requiredTradeIds.map((tid) => {
                        const sub = activeSubmissions[tid];
                        return (
                          <li
                            key={tid}
                            className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs ${
                              sub
                                ? "border-emerald-200 bg-emerald-50/60"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <span
                              className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                                sub
                                  ? "bg-emerald-500 text-white"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {sub ? "✓" : "○"}
                            </span>
                            <span className="font-medium text-ink">
                              {tradeName(tid)}
                            </span>
                            {sub ? (
                              <span className="ml-auto text-[11px] text-slate-500">
                                {contractorLabel(sub.contractorId)} ·{" "}
                                {formatTime(sub.at)}
                              </span>
                            ) : (
                              <span className="ml-auto text-[11px] text-slate-400">
                                pending
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {unfilledTradeIds.length > 0 && (
                  <div className="mt-4 space-y-3 rounded-md border border-slate-200 bg-white p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Submit next trade
                    </div>
                    {eligibleContractors.length === 0 ? (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        No contractor carries any of the pending trades for the
                        “{category?.name}” category. Tag a contractor on the
                        Contractors page.
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-500">
                            Contractor
                          </label>
                          <Select
                            value={contractorId}
                            onChange={(e) => setContractorId(e.target.value)}
                          >
                            {eligibleContractors.map((c) => {
                              const matches = c.tradeIds
                                .filter((tid) => unfilledTradeIds.includes(tid))
                                .map(tradeName)
                                .join(", ");
                              return (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                  {c.company ? ` — ${c.company}` : ""}
                                  {matches ? ` (${matches})` : ""}
                                </option>
                              );
                            })}
                          </Select>
                        </div>

                        {availableSubmitTradeIds.length > 1 && (
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-slate-500">
                              Submitting under trade
                            </label>
                            <Select
                              value={submitTradeId}
                              onChange={(e) => setSubmitTradeId(e.target.value)}
                            >
                              {availableSubmitTradeIds.map((tid) => (
                                <option key={tid} value={tid}>
                                  {tradeName(tid)}
                                </option>
                              ))}
                            </Select>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            variant="success"
                            disabled={!contractorId || !submitTradeId}
                            onClick={() =>
                              completeActiveStage(
                                unit.id,
                                contractorId,
                                submitTradeId,
                              )
                            }
                          >
                            ✓ Submit handover{" "}
                            {submitTradeId
                              ? `(${tradeName(submitTradeId)})`
                              : ""}
                          </Button>
                          <span className="text-[11px] text-slate-500">
                            {filledCount + 1 >= slotCount
                              ? `Final slot — completes stage, advances to ${
                                  stages[activeIdx + 1]?.name ?? "completion"
                                }`
                              : `Stage stays active — ${
                                  slotCount - filledCount - 1
                                } more trade(s) needed`}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
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
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                      <span>Trades:</span>
                      {(stageTradeMap[stages[activeIdx + 1].id] ?? []).length ===
                      0 ? (
                        <Pill tone="rose">none</Pill>
                      ) : (
                        (stageTradeMap[stages[activeIdx + 1].id] ?? []).map(
                          (tid) => (
                            <Pill key={tid} tone="slate">
                              {tradeName(tid)}
                            </Pill>
                          ),
                        )
                      )}
                    </div>
                  </>
                ) : (
                  <div className="mt-1 text-sm text-slate-500">
                    Final stage — completion ends this unit.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stage timeline — this unit's category stages */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Stage timeline · {category?.name} category
              </span>
              <span className="text-[11px] text-slate-400">
                {stages.length} stages defined
              </span>
            </div>
            <ol className="space-y-1.5">
              {stages.map((s, i) => {
                const subs = progress?.stageSubmissions?.[s.id] ?? {};
                const isActive = i === activeIdx;
                const isDone = i < activeIdx;
                const tradeIds = stageTradeMap[s.id] ?? [];
                const total = tradeIds.length || 1;
                const filled =
                  tradeIds.length > 0
                    ? tradeIds.filter((t) => subs[t]).length
                    : Object.keys(subs).length;
                return (
                  <li
                    key={s.id}
                    className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 ${
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
                    <div className="flex flex-wrap gap-1">
                      {tradeIds.length === 0 ? (
                        <Pill tone="rose">no trade</Pill>
                      ) : (
                        tradeIds.map((tid) => (
                          <Pill key={tid} tone={subs[tid] ? "green" : "slate"}>
                            {subs[tid] ? "✓ " : ""}
                            {tradeName(tid)}
                          </Pill>
                        ))
                      )}
                    </div>
                    {isDone ? (
                      <span className="hidden md:inline text-[11px] text-slate-500">
                        {(completionsByStage[s.id] ?? []).length} submission(s)
                      </span>
                    ) : isActive ? (
                      <Pill tone="blue">
                        {filled}/{total} done
                      </Pill>
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

      <Card
        title="Handover log"
        right={
          <span className="text-[11px] text-slate-400">
            Most recent first {unit ? `· ${unit.name}` : ""}
          </span>
        }
      >
        {!unit ? (
          <EmptyHint>Pick a unit to see its handover events.</EmptyHint>
        ) : flatHandovers.length === 0 ? (
          <EmptyHint>
            No submissions yet — fill the first trade slot above.
          </EmptyHint>
        ) : (
          <ul className="space-y-2">
            {flatHandovers.map((h) => {
              const stage = stages.find((s) => s.id === h.stageId);
              const nextStage = stages.find((s) => s.id === h.nextStageId);
              return (
                <li
                  key={h.id}
                  className="rounded-md border border-slate-100 bg-white px-3 py-2 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400">{formatTime(h.at)}</span>
                    <Pill tone="green">{contractorLabel(h.contractorId)}</Pill>
                    <span className="text-slate-500">submitted</span>
                    <Pill tone="blue">{tradeName(h.tradeId)}</Pill>
                    <span className="text-slate-500">for</span>
                    <Pill tone="slate">{stage?.name ?? "?"}</Pill>
                    {h.stageAdvanced ? (
                      nextStage ? (
                        <>
                          <span className="text-slate-400">
                            → stage complete · handover to
                          </span>
                          <Pill tone="blue">{nextStage.name}</Pill>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-400">→</span>
                          <Pill tone="green">unit complete</Pill>
                        </>
                      )
                    ) : (
                      <>
                        <span className="text-slate-400">→</span>
                        <Pill tone="amber">
                          {h.filledCount}/{h.slotCount} done · waiting for{" "}
                          {h.pendingTradeIds.map(tradeName).join(", ")}
                        </Pill>
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
