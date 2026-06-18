import { useEffect, useState } from "react";
import { useApp } from "../store.jsx";
import { Card, Button, Input, Pill, EmptyHint, PageHeader, Select } from "./ui.jsx";

export function Configuration() {
  const { categories } = useApp();
  const [activeCatId, setActiveCatId] = useState(categories[0]?.id ?? null);

  // Keep the selected tab valid even if the underlying list changes
  // (a category was renamed, added, or removed elsewhere).
  useEffect(() => {
    if (!categories.find((c) => c.id === activeCatId)) {
      setActiveCatId(categories[0]?.id ?? null);
    }
  }, [categories, activeCatId]);

  const activeCat = categories.find((c) => c.id === activeCatId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Configuration"
        description="Each unit category (Flat, Corridor, Staircase, …) keeps its own trades, its own ordered stages, and its own trade↔stage relations. Switch tabs to configure each one independently."
      />
      <CategoryTabs activeId={activeCatId} onSelect={setActiveCatId} />
      {activeCat ? (
        <CategoryEditor key={activeCat.id} category={activeCat} />
      ) : (
        <EmptyHint>No categories yet — add one above.</EmptyHint>
      )}
    </div>
  );
}

// ---------- tabs + add-category dialog ----------

function CategoryTabs({ activeId, onSelect }) {
  const { categories, addCategory, renameCategory, removeCategory } = useApp();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [copyFromId, setCopyFromId] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const submitAdd = () => {
    const newId = addCategory({ name: newName, copyFromCategoryId: copyFromId || null });
    if (newId) {
      onSelect(newId);
      setAdding(false);
      setNewName("");
      setCopyFromId("");
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((c) => {
          const isActive = c.id === activeId;
          const isEditing = editingId === c.id;
          if (isEditing) {
            return (
              <div
                key={c.id}
                className="flex items-center gap-1 rounded-md border border-brand-300 bg-white p-1"
              >
                <Input
                  className="h-7 w-32"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={() => {
                    renameCategory(c.id, editName);
                    setEditingId(null);
                  }}
                >
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                  ✕
                </Button>
              </div>
            );
          }
          return (
            <div
              key={c.id}
              className={`group flex items-center gap-1 rounded-md border px-2 py-1 transition ${
                isActive
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"
              }`}
            >
              <button
                onClick={() => onSelect(c.id)}
                className="text-sm font-medium"
              >
                {c.name}
              </button>
              <span className="text-[10px] text-slate-400">
                {c.trades.length}·{c.stages.length}
              </span>
              <button
                onClick={() => {
                  setEditingId(c.id);
                  setEditName(c.name);
                }}
                className="rounded p-0.5 text-[11px] text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-700"
                title="Rename category"
              >
                ✎
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete "${c.name}" category and its units?`)) {
                    removeCategory(c.id);
                  }
                }}
                className="rounded p-0.5 text-[11px] text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-slate-100 hover:text-rose-600"
                title="Delete category (cascades to units)"
              >
                ✕
              </button>
            </div>
          );
        })}

        {adding ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-brand-300 bg-white p-2">
            <Input
              className="h-8 w-40"
              placeholder="New category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") submitAdd();
              }}
            />
            <Select
              className="h-8 w-44"
              value={copyFromId}
              onChange={(e) => setCopyFromId(e.target.value)}
            >
              <option value="">Start blank</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  Copy stages from “{c.name}”
                </option>
              ))}
            </Select>
            <Button size="sm" onClick={submitAdd} disabled={!newName.trim()}>
              Create
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setAdding(false);
                setNewName("");
                setCopyFromId("");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            + New category
          </Button>
        )}
      </div>
    </Card>
  );
}

// ---------- per-category editor ----------

function CategoryEditor({ category }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <TradesCard category={category} />
        <StagesCard category={category} />
      </div>
      <RelationBuilder category={category} />
    </div>
  );
}

function TradesCard({ category }) {
  const { addTrade, renameTrade, removeTrade } = useApp();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  return (
    <Card title={`Trades · ${category.name}`}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Tiling"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addTrade(category.id, newName);
                setNewName("");
              }
            }}
          />
          <Button
            onClick={() => {
              addTrade(category.id, newName);
              setNewName("");
            }}
            disabled={!newName.trim()}
          >
            Add
          </Button>
        </div>
        {category.trades.length === 0 ? (
          <EmptyHint>No trades yet — add one above.</EmptyHint>
        ) : (
          <ul className="space-y-1.5">
            {category.trades.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
              >
                {editingId === t.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="h-8"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        renameTrade(category.id, t.id, editingName.trim());
                        setEditingId(null);
                      }}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
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
                        setEditingName(t.name);
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => removeTrade(category.id, t.id)}
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

function StagesCard({ category }) {
  const { addStage, renameStage, removeStage, moveStage } = useApp();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const tradeName = (id) => category.trades.find((t) => t.id === id)?.name ?? "—";

  return (
    <Card
      title={`Stages · ${category.name}`}
      right={
        <span className="text-[11px] text-slate-400">
          Top → bottom drives matrix order
        </span>
      }
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Snagging"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addStage(category.id, newName);
                setNewName("");
              }
            }}
          />
          <Button
            onClick={() => {
              addStage(category.id, newName);
              setNewName("");
            }}
            disabled={!newName.trim()}
          >
            Add
          </Button>
        </div>
        {category.stages.length === 0 ? (
          <EmptyHint>No stages yet — add one above.</EmptyHint>
        ) : (
          <ul className="space-y-1.5">
            {category.stages.map((s, i) => {
              const linkedIds = category.stageTradeMap[s.id] ?? [];
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
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          renameStage(category.id, s.id, editingName.trim());
                          setEditingId(null);
                        }}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
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
                        onClick={() => moveStage(category.id, i, -1)}
                        disabled={i === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => moveStage(category.id, i, 1)}
                        disabled={i === category.stages.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(s.id);
                          setEditingName(s.name);
                        }}
                      >
                        Rename
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => removeStage(category.id, s.id)}
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

function RelationBuilder({ category }) {
  const { addStageTrade, removeStageTrade } = useApp();
  const [dragTradeId, setDragTradeId] = useState(null);
  const [overStageId, setOverStageId] = useState(null);
  const tradeById = (id) => category.trades.find((t) => t.id === id);

  return (
    <Card
      title={`Trade ↔ Stage relations · ${category.name}`}
      right={
        <span className="text-[11px] text-slate-400">
          Drag a trade onto a stage — multiple trades per stage allowed
        </span>
      }
    >
      {category.trades.length === 0 || category.stages.length === 0 ? (
        <EmptyHint>
          Add at least one trade and one stage in this category to build relations.
        </EmptyHint>
      ) : (
        <div className="grid gap-5 md:grid-cols-[260px,1fr]">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Trades
            </div>
            <div className="space-y-2">
              {category.trades.map((t) => (
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

          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Stages (drop targets · multiple trades allowed)
            </div>
            <ol className="space-y-2">
              {category.stages.map((s, i) => {
                const linkedIds = category.stageTradeMap[s.id] ?? [];
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
                      const tid =
                        e.dataTransfer.getData("text/plain") || dragTradeId;
                      if (tid) addStageTrade(category.id, s.id, tid);
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
                      <span className="text-[11px] text-slate-400">
                        drop trade here
                      </span>
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
                                onClick={() =>
                                  removeStageTrade(category.id, s.id, tid)
                                }
                                className="ml-0.5 rounded-full text-emerald-700/70 hover:text-rose-600"
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
