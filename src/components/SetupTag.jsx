import { useEffect, useState } from "react";
import { useApp } from "../store.jsx";
import { Card, Button, Input, EmptyHint, PageHeader } from "./ui.jsx";
import {
  CategoryTabs,
  TradesCard,
  AddWorkCategoryModal,
} from "./StepManagement.jsx";

export function SetupTag() {
  const { categories } = useApp();
  const [activeCatId, setActiveCatId] = useState(categories[0]?.id ?? null);

  // Keep the selected tab valid even if the underlying list changes.
  useEffect(() => {
    if (!categories.find((c) => c.id === activeCatId)) {
      setActiveCatId(categories[0]?.id ?? null);
    }
  }, [categories, activeCatId]);

  const activeCat = categories.find((c) => c.id === activeCatId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Setup tag"
        description="Define each unit category's tags and the work categories required to complete them. Steps are configured on the Step Management page."
      />
      <CategoryTabs activeId={activeCatId} onSelect={setActiveCatId} />
      {activeCat ? (
        <div className="grid gap-5 md:grid-cols-4">
          <div className="md:col-span-1">
            <TradesCard category={activeCat} />
          </div>
          <div className="md:col-span-3">
            <TagRelationsCard category={activeCat} />
          </div>
        </div>
      ) : (
        <EmptyHint>No categories yet — add one above.</EmptyHint>
      )}
    </div>
  );
}

function TagRelationsCard({ category }) {
  const {
    addStage, renameStage, removeStage, moveStage,
    addTrade,
    addStageTrade, removeStageTrade,
  } = useApp();
  const [newTagName, setNewTagName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [addCategoryForTagId, setAddCategoryForTagId] = useState(null);
  const [overTagId, setOverTagId] = useState(null);

  const tradeName = (id) =>
    category.trades.find((t) => t.id === id)?.name ?? "—";

  const submitNew = () => {
    const name = newTagName.trim();
    if (!name) return;
    addStage(category.id, name);
    setNewTagName("");
  };

  return (
    <Card
      title={`Tags & work category relations · ${category.name}`}
      right={
        <span className="text-[11px] text-slate-400">
          Each tag lists the work categories it requires to complete
        </span>
      }
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Tag name e.g. Snagging"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitNew();
            }}
          />
          <Button onClick={submitNew} disabled={!newTagName.trim()}>
            + Add tag
          </Button>
        </div>

        {category.stages.length === 0 ? (
          <EmptyHint>No tags yet — add one above.</EmptyHint>
        ) : (
          <div className="space-y-2">
            {category.stages.map((s, i) => {
              const linkedIds = category.stageTradeMap[s.id] ?? [];
              const isEditing = editingId === s.id;
              const isOver = overTagId === s.id;
              return (
                <div
                  key={s.id}
                  onDragOver={(e) => {
                    if (
                      e.dataTransfer.types.includes("application/x-trade-pool")
                    ) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                      setOverTagId(s.id);
                    }
                  }}
                  onDragLeave={() =>
                    setOverTagId((v) => (v === s.id ? null : v))
                  }
                  onDrop={(e) => {
                    const tradeId = e.dataTransfer.getData(
                      "application/x-trade-pool",
                    );
                    if (tradeId) {
                      e.preventDefault();
                      addStageTrade(category.id, s.id, tradeId);
                      setOverTagId(null);
                    }
                  }}
                  className={`rounded-lg border-2 border-dashed bg-slate-50 p-3 transition ${
                    isOver
                      ? "border-emerald-500 ring-2 ring-emerald-400/40"
                      : "border-slate-300"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                      {i + 1}
                    </span>
                    {isEditing ? (
                      <>
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-8 w-48"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              renameStage(category.id, s.id, editingName.trim());
                              setEditingId(null);
                            }
                          }}
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
                        <span className="text-sm font-semibold text-ink">
                          {s.name}
                        </span>
                        <button
                          onClick={() => {
                            setEditingId(s.id);
                            setEditingName(s.name);
                          }}
                          className="rounded p-0.5 text-[11px] text-slate-400 hover:bg-white hover:text-slate-700"
                          title="Rename tag"
                        >
                          ✎
                        </button>
                        <div className="ml-auto flex items-center gap-1">
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
                          <button
                            onClick={() => {
                              if (confirm(`Delete tag "${s.name}"?`)) {
                                removeStage(category.id, s.id);
                              }
                            }}
                            className="rounded p-1 text-rose-500 hover:bg-white"
                            title="Delete tag"
                          >
                            ✕
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-3">
                    {linkedIds.length === 0 ? (
                      <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-400">
                        No work categories linked yet.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {linkedIds.map((tid) => (
                          <span
                            key={tid}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {tradeName(tid)}
                            <button
                              onClick={() =>
                                removeStageTrade(category.id, s.id, tid)
                              }
                              className="ml-0.5 rounded-full text-emerald-700/70 hover:text-rose-600"
                              title="Remove work category"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setAddCategoryForTagId(s.id)}
                    >
                      + Add work category
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {addCategoryForTagId && (
        <AddWorkCategoryModal
          category={category}
          tagId={addCategoryForTagId}
          onClose={() => setAddCategoryForTagId(null)}
          onAdd={({ existingIds, newNames }) => {
            const createdIds = (newNames || [])
              .map((n) => addTrade(category.id, n))
              .filter(Boolean);
            [...existingIds, ...createdIds].forEach((tid) =>
              addStageTrade(category.id, addCategoryForTagId, tid),
            );
            setAddCategoryForTagId(null);
          }}
        />
      )}
    </Card>
  );
}
