import { useState } from "react";
import { useApp } from "../store.jsx";
import { Card, Button, Input, Pill, EmptyHint, PageHeader } from "./ui.jsx";

export function Configuration() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Configuration"
        description="Define the trades and progress-matrix stages, then drag a trade onto a stage to declare which trade is responsible for it. The active stage's trade decides which contractors appear in the handover dropdown."
      />
      <div className="grid gap-5 md:grid-cols-2">
        <TradesCard />
        <StagesCard />
      </div>
      <RelationBuilder />
    </div>
  );
}

function TradesCard() {
  const { trades, addTrade, renameTrade, removeTrade } = useApp();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  return (
    <Card title="Trades">
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Tiling"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addTrade(name);
                setName("");
              }
            }}
          />
          <Button
            onClick={() => {
              addTrade(name);
              setName("");
            }}
            disabled={!name.trim()}
          >
            Add
          </Button>
        </div>
        {trades.length === 0 ? (
          <EmptyHint>No trades yet — add one above.</EmptyHint>
        ) : (
          <ul className="space-y-1.5">
            {trades.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
              >
                {editingId === t.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        renameTrade(t.id, editName.trim());
                        setEditingId(null);
                      }}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-ink">{t.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(t.id);
                        setEditName(t.name);
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => removeTrade(t.id)}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function StagesCard() {
  const {
    stages, addStage, renameStage, removeStage, moveStage,
    stageTradeMap, trades,
  } = useApp();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const tradeName = (id) => trades.find((t) => t.id === id)?.name ?? "—";

  return (
    <Card
      title="Stages (ordered)"
      right={
        <span className="text-[11px] text-slate-400">
          Sequence top→bottom drives matrix
        </span>
      }
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Snagging"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addStage(name);
                setName("");
              }
            }}
          />
          <Button
            onClick={() => {
              addStage(name);
              setName("");
            }}
            disabled={!name.trim()}
          >
            Add
          </Button>
        </div>
        {stages.length === 0 ? (
          <EmptyHint>No stages yet — add one above.</EmptyHint>
        ) : (
          <ul className="space-y-1.5">
            {stages.map((s, i) => {
              const linkedIds = stageTradeMap[s.id] ?? [];
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                    {i + 1}
                  </span>
                  {editingId === s.id ? (
                    <>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          renameStage(s.id, editName.trim());
                          setEditingId(null);
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-ink">{s.name}</span>
                      <div className="flex flex-wrap items-center gap-1">
                        {linkedIds.length === 0 ? (
                          <Pill tone="rose">no trade</Pill>
                        ) : (
                          linkedIds.map((tid) => (
                            <Pill key={tid} tone="blue">
                              {tradeName(tid)}
                            </Pill>
                          ))
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => moveStage(i, -1)}
                        disabled={i === 0}
                        title="Move up"
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => moveStage(i, 1)}
                        disabled={i === stages.length - 1}
                        title="Move down"
                      >
                        ↓
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(s.id);
                          setEditName(s.name);
                        }}
                      >
                        Rename
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => removeStage(s.id)}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}

// ---------- drag-and-drop trade ↔ stage relation builder ----------

function RelationBuilder() {
  const { trades, stages, stageTradeMap, addStageTrade, removeStageTrade } = useApp();
  const [dragTradeId, setDragTradeId] = useState(null);
  const [overStageId, setOverStageId] = useState(null);

  const tradeById = (id) => trades.find((t) => t.id === id);

  return (
    <Card
      title="Trade ↔ Stage relations"
      right={
        <span className="text-[11px] text-slate-400">
          Drag a trade node onto a stage — multiple trades per stage allowed
        </span>
      }
    >
      {(trades.length === 0 || stages.length === 0) ? (
        <EmptyHint>Add at least one trade and one stage to build relations.</EmptyHint>
      ) : (
        <div className="grid gap-5 md:grid-cols-[260px,1fr]">
          {/* Left: trade nodes */}
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Trades
            </div>
            <div className="space-y-2">
              {trades.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => {
                    setDragTradeId(t.id);
                    e.dataTransfer.effectAllowed = "link";
                    e.dataTransfer.setData("text/plain", t.id);
                  }}
                  onDragEnd={() => {
                    setDragTradeId(null);
                    setOverStageId(null);
                  }}
                  className={`cursor-grab select-none rounded-lg border bg-white px-3 py-2 text-sm shadow-sm transition active:cursor-grabbing ${
                    dragTradeId === t.id
                      ? "border-brand-500 ring-2 ring-brand-500/30"
                      : "border-slate-200 hover:border-brand-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand-500" />
                    <span className="font-medium text-ink">{t.name}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    Drag onto a stage →
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: stage drop zones */}
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Stages (drop targets · multiple trades allowed)
            </div>
            <ol className="space-y-2">
              {stages.map((s, i) => {
                const linkedIds = stageTradeMap[s.id] ?? [];
                const isOver = overStageId === s.id;
                return (
                  <li
                    key={s.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "link";
                      setOverStageId(s.id);
                    }}
                    onDragLeave={() => setOverStageId((v) => (v === s.id ? null : v))}
                    onDrop={(e) => {
                      e.preventDefault();
                      const tradeId = e.dataTransfer.getData("text/plain") || dragTradeId;
                      if (tradeId) addStageTrade(s.id, tradeId);
                      setOverStageId(null);
                      setDragTradeId(null);
                    }}
                    className={`flex flex-wrap items-center gap-2 rounded-lg border-2 border-dashed bg-white px-3 py-2 transition ${
                      isOver
                        ? "border-brand-500 bg-brand-50"
                        : linkedIds.length
                          ? "border-emerald-200"
                          : "border-slate-200"
                    }`}
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium text-ink">
                      {s.name}
                    </span>
                    {linkedIds.length === 0 ? (
                      <span className="text-[11px] text-slate-400">drop trade here</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {linkedIds.map((tid) => {
                          const t = tradeById(tid);
                          return (
                            <span
                              key={tid}
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {t?.name ?? "—"}
                              <button
                                onClick={() => removeStageTrade(s.id, tid)}
                                className="ml-0.5 rounded-full text-emerald-700/70 hover:text-rose-600"
                                title="Unlink this trade"
                              >
                                ✕
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
    </Card>
  );
}
