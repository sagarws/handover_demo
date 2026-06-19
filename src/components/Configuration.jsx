import { useEffect, useState } from "react";
import { useApp } from "../store.jsx";
import { Card, Button, Input, EmptyHint, PageHeader, Select, Combobox } from "./ui.jsx";

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
        description="Group each category's tags into ordered Steps. Tags and work categories themselves are managed on the Setup tag page."
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

export function CategoryTabs({ activeId, onSelect }) {
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
                  Copy tags from “{c.name}”
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

export function CategoryEditor({ category }) {
  return (
    <div className="grid gap-5 md:grid-cols-4">
      <div className="md:col-span-1">
        <TagsReferenceCard category={category} />
      </div>
      <div className="md:col-span-3">
        <StepBundleBuilder category={category} />
      </div>
    </div>
  );
}

// Read-only tag list for the Configuration page — shows every tag defined in
// the Setup tag page along with its current step assignment, but no CRUD.
function TagsReferenceCard({ category }) {
  const stepOf = (sid) =>
    (category.steps ?? []).find((st) => st.stageIds.includes(sid));

  return (
    <Card
      title={`Tags · ${category.name}`}
      right={
        <span className="text-[11px] text-slate-400">
          From Setup tag
        </span>
      }
    >
      {category.stages.length === 0 ? (
        <EmptyHint>
          No tags yet — define them on the Setup tag page first.
        </EmptyHint>
      ) : (
        <ul className="space-y-1.5">
          {category.stages.map((s, i) => {
            const step = stepOf(s.id);
            return (
              <li
                key={s.id}
                className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-ink">{s.name}</span>
                {step ? (
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                    {step.name}
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    unassigned
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function TradesCard({ category }) {
  const { addTrade, renameTrade, removeTrade } = useApp();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  return (
    <Card title={`Work categories · ${category.name}`}>
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
          <EmptyHint>No work categories yet — add one above.</EmptyHint>
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


function StepBundleBuilder({ category }) {
  const {
    addStage, renameStage, removeStage,
    addStep, renameStep, removeStep, moveStep, reorderStep,
    removeStepStage, reorderStepStage,
  } = useApp();
  const [editingTagId, setEditingTagId] = useState(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [editingStepId, setEditingStepId] = useState(null);
  const [editingStepName, setEditingStepName] = useState("");
  const [addingTagForStepId, setAddingTagForStepId] = useState(null);
  const [showAddStep, setShowAddStep] = useState(false);
  // Drag state: kind = 'step' | 'tag'
  const [drag, setDrag] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const tradeName = (id) =>
    category.trades.find((t) => t.id === id)?.name ?? "—";
  const stageById = (id) => category.stages.find((s) => s.id === id);

  const steps = category.steps ?? [];

  const clearDrag = () => {
    setDrag(null);
    setOverIdx(null);
  };

  // ------- one tag card (shared by steps + unassigned bucket) -------
  const renderTagCard = (s, j, stepId) => {
    const linkedIds = category.stageTradeMap[s.id] ?? [];
    const isEditing = editingTagId === s.id;
    // Tags are exclusive to a step: only accept drops from the same step
    // (reorder) — cross-step moves are forbidden, the user must detach first.
    const tagDropTargetable =
      drag?.kind === "tag" &&
      stepId &&
      drag.stepId === stepId &&
      !(drag.idx === j);
    const isTagOver =
      tagDropTargetable &&
      overIdx?.kind === "tag" &&
      overIdx.stepId === stepId &&
      overIdx.idx === j;
    return (
      <div
        key={s.id}
        onDragOver={(e) => {
          if (tagDropTargetable) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
            setOverIdx({ kind: "tag", stepId, idx: j });
          }
        }}
        onDragLeave={() =>
          setOverIdx((v) =>
            v?.kind === "tag" && v.stepId === stepId && v.idx === j
              ? null
              : v,
          )
        }
        onDrop={(e) => {
          if (
            drag?.kind === "tag" &&
            stepId &&
            drag.stepId === stepId
          ) {
            e.preventDefault();
            e.stopPropagation();
            reorderStepStage(category.id, stepId, drag.idx, j);
            clearDrag();
          }
        }}
        className={`rounded-lg border-2 border-dashed bg-white p-3 transition ${
          isTagOver
            ? "border-brand-500 ring-2 ring-brand-400/40"
            : "border-slate-300"
        } ${
          drag?.kind === "tag" && drag.stepId === stepId && drag.idx === j
            ? "opacity-50"
            : ""
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            draggable
            onDragStart={(e) => {
              setDrag({ kind: "tag", stepId, idx: j, stageId: s.id });
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", `tag:${s.id}`);
              const card = e.currentTarget.closest("div.rounded-lg");
              if (card) e.dataTransfer.setDragImage(card, 16, 16);
            }}
            onDragEnd={clearDrag}
            className="cursor-grab active:cursor-grabbing text-slate-400 select-none"
            title="Drag to reorder within this step"
          >
            ⋮⋮
          </span>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
            {j + 1}
          </span>
          {isEditing ? (
            <>
              <Input
                value={editingTagName}
                onChange={(e) => setEditingTagName(e.target.value)}
                className="h-8 w-48"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    renameStage(category.id, s.id, editingTagName.trim());
                    setEditingTagId(null);
                  }
                }}
              />
              <Button
                size="sm"
                onClick={() => {
                  renameStage(category.id, s.id, editingTagName.trim());
                  setEditingTagId(null);
                }}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingTagId(null)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm font-semibold text-ink">{s.name}</span>
              <button
                onClick={() => {
                  setEditingTagId(s.id);
                  setEditingTagName(s.name);
                }}
                className="rounded p-0.5 text-[11px] text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="Rename tag"
              >
                ✎
              </button>
              <div className="ml-auto flex items-center gap-1">
                {stepId && (
                  <button
                    onClick={() =>
                      removeStepStage(category.id, stepId, s.id)
                    }
                    title="Detach from this step (keeps the tag)"
                    className="rounded p-1 text-[11px] text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    ⇲
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm(`Delete tag "${s.name}"?`)) {
                      removeStage(category.id, s.id);
                    }
                  }}
                  className="rounded p-1 text-rose-500 hover:bg-slate-100"
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
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-400">
              No work categories linked · set them on the Setup tag page.
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
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ------- one Step container -------
  const renderStep = (step, i) => {
    const isStepOver =
      drag?.kind === "step" &&
      overIdx?.kind === "step" &&
      overIdx.idx === i &&
      drag.idx !== i;
    const isEditing = editingStepId === step.id;
    const tags = step.stageIds
      .map(stageById)
      .filter(Boolean);
    return (
      <div
        key={step.id}
        onDragOver={(e) => {
          if (drag?.kind === "step") {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setOverIdx({ kind: "step", idx: i });
          }
        }}
        onDragLeave={() =>
          setOverIdx((v) =>
            v?.kind === "step" && v.idx === i ? null : v,
          )
        }
        onDrop={(e) => {
          if (drag?.kind === "step") {
            e.preventDefault();
            reorderStep(category.id, drag.idx, i);
            clearDrag();
          }
        }}
        className={`rounded-xl border-2 bg-slate-50/60 p-4 transition ${
          isStepOver
            ? "border-brand-500 ring-2 ring-brand-400/40"
            : "border-slate-300"
        } ${drag?.kind === "step" && drag.idx === i ? "opacity-50" : ""}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            draggable
            onDragStart={(e) => {
              setDrag({ kind: "step", idx: i });
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", `step:${i}`);
              const card = e.currentTarget.closest("div.rounded-xl");
              if (card) e.dataTransfer.setDragImage(card, 16, 16);
            }}
            onDragEnd={clearDrag}
            className="cursor-grab text-slate-400 select-none active:cursor-grabbing"
            title="Drag to reorder step"
          >
            ⋮⋮
          </span>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">
            {i + 1}
          </span>
          {isEditing ? (
            <>
              <Input
                value={editingStepName}
                onChange={(e) => setEditingStepName(e.target.value)}
                className="h-8 w-56"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    renameStep(category.id, step.id, editingStepName.trim());
                    setEditingStepId(null);
                  }
                }}
              />
              <Button
                size="sm"
                onClick={() => {
                  renameStep(category.id, step.id, editingStepName.trim());
                  setEditingStepId(null);
                }}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingStepId(null)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <span className="text-base font-semibold text-ink">
                {step.name}
              </span>
              <button
                onClick={() => {
                  setEditingStepId(step.id);
                  setEditingStepName(step.name);
                }}
                className="rounded p-0.5 text-[11px] text-slate-400 hover:bg-white hover:text-slate-700"
                title="Rename step"
              >
                ✎
              </button>
              <span className="text-[11px] text-slate-400">
                {tags.length} tag{tags.length === 1 ? "" : "s"}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => moveStep(category.id, i, -1)}
                  disabled={i === 0}
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => moveStep(category.id, i, 1)}
                  disabled={i === steps.length - 1}
                >
                  ↓
                </Button>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Remove step "${step.name}"? Its tags will become unassigned.`,
                      )
                    ) {
                      removeStep(category.id, step.id);
                    }
                  }}
                  className="rounded p-1 text-rose-500 hover:bg-white"
                  title="Remove step (keeps its tags as unassigned)"
                >
                  ✕
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mt-3 space-y-2">
          {tags.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-400">
              No tags in this step yet — add one below.
            </div>
          ) : (
            tags.map((s, j) => renderTagCard(s, j, step.id))
          )}

          {addingTagForStepId === step.id ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-dashed border-brand-300 bg-brand-50/40 p-3">
              <div className="min-w-[260px] flex-1">
                <Combobox
                  value=""
                  onChange={(stageId) => {
                    addStepStage(category.id, step.id, stageId);
                    setAddingTagForStepId(null);
                  }}
                  options={category.stages.map((s) => {
                    const owner = (category.steps ?? []).find((st) =>
                      st.stageIds.includes(s.id),
                    );
                    return {
                      value: s.id,
                      label: s.name,
                      disabled: !!owner,
                      hint: owner ? `in ${owner.name}` : undefined,
                      disabledReason: owner
                        ? `Already in "${owner.name}" — detach it first`
                        : undefined,
                    };
                  })}
                  onAdd={(name) => addStage(category.id, name, step.id)}
                  placeholder="Search tags or type a new name…"
                  emptyLabel="No matching tags"
                  addLabel="+ Create tag"
                />
              </div>
              <Button
                variant="ghost"
                onClick={() => setAddingTagForStepId(null)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setAddingTagForStepId(step.id)}
            >
              + Add tag
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card
      title={`Steps · ${category.name}`}
      right={
        <span className="text-[11px] text-slate-400">
          Step → Tag → Work category · top-to-bottom drives matrix order
        </span>
      }
    >
      <div className="space-y-4">
        {steps.length === 0 ? (
          <EmptyHint>No steps yet — add one below.</EmptyHint>
        ) : null}

        {steps.map(renderStep)}

        <Button variant="secondary" onClick={() => setShowAddStep(true)}>
          + Add step
        </Button>
      </div>

      {showAddStep && (
        <AddStepModal
          category={category}
          onClose={() => setShowAddStep(false)}
          onCreate={({ name, stageIds, newStageNames }) => {
            addStep(category.id, { name, stageIds, newStageNames });
            setShowAddStep(false);
          }}
        />
      )}
    </Card>
  );
}

function AddStepModal({ category, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [stageIds, setStageIds] = useState([]);
  const [newNamesText, setNewNamesText] = useState("");

  const toggle = (id) =>
    setStageIds((curr) =>
      curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id],
    );

  const assignedTo = (sid) => {
    const owner = (category.steps ?? []).find((st) =>
      st.stageIds.includes(sid),
    );
    return owner?.name ?? null;
  };

  const newStageNames = newNamesText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const canCreate =
    name.trim().length > 0 &&
    (stageIds.length > 0 || newStageNames.length > 0);

  return (
    <div
      className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4"
      onMouseDown={onClose}
    >
      <div
        className="my-8 w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-ink">
            Add step · {category.name}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </header>
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">
              Step name
            </label>
            <Input
              autoFocus
              placeholder="e.g. Step 1, First Fix, Finishes"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">
              Choose existing tags
            </label>
            {category.stages.length === 0 ? (
              <EmptyHint>No tags exist yet — add new ones below.</EmptyHint>
            ) : (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2">
                {category.stages.map((s) => {
                  const on = stageIds.includes(s.id);
                  const owner = assignedTo(s.id);
                  const disabled = !!owner;
                  return (
                    <label
                      key={s.id}
                      title={
                        disabled
                          ? `Already in "${owner}" — detach it first`
                          : undefined
                      }
                      className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition ${
                        disabled
                          ? "cursor-not-allowed border-transparent bg-slate-100 text-slate-400"
                          : on
                            ? "cursor-pointer border-brand-300 bg-brand-50 text-brand-700"
                            : "cursor-pointer border-transparent bg-white text-slate-700 hover:border-brand-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={disabled}
                        onChange={() => !disabled && toggle(s.id)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed"
                      />
                      <span className="flex-1">{s.name}</span>
                      {owner && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          in {owner}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
            {stageIds.length > 0 && (
              <div className="mt-2 text-[11px] text-slate-500">
                {stageIds.length} existing tag(s) will move into this step
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">
              Or create new tags (comma-separated)
            </label>
            <Input
              placeholder="e.g. Snagging, Final Clean, Handover"
              value={newNamesText}
              onChange={(e) => setNewNamesText(e.target.value)}
            />
            {newStageNames.length > 0 && (
              <div className="mt-2 text-[11px] text-slate-500">
                {newStageNames.length} new tag(s) will be created
              </div>
            )}
          </div>
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!canCreate}
            onClick={() =>
              onCreate({
                name: name.trim(),
                stageIds,
                newStageNames,
              })
            }
          >
            Create step
          </Button>
        </footer>
      </div>
    </div>
  );
}

export function AddWorkCategoryModal({ category, tagId, onClose, onAdd }) {
  const tag = category.stages.find((s) => s.id === tagId);
  const linked = new Set(category.stageTradeMap[tagId] ?? []);
  const available = category.trades.filter((t) => !linked.has(t.id));
  const [selected, setSelected] = useState([]);
  const [newNamesText, setNewNamesText] = useState("");

  const toggle = (id) =>
    setSelected((curr) =>
      curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id],
    );

  const existingNames = new Set(
    category.trades.map((t) => t.name.toLowerCase()),
  );
  const newNames = newNamesText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const newNamesDedup = [];
  const seenNew = new Set();
  newNames.forEach((n) => {
    const k = n.toLowerCase();
    if (!seenNew.has(k) && !existingNames.has(k)) {
      seenNew.add(k);
      newNamesDedup.push(n);
    }
  });
  const duplicateCount = newNames.length - newNamesDedup.length;

  const canSubmit = selected.length > 0 || newNamesDedup.length > 0;

  return (
    <div
      className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4"
      onMouseDown={onClose}
    >
      <div
        className="my-8 w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-ink">
            Add work category · {tag?.name ?? "Tag"}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </header>
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-2 block text-[11px] font-medium text-slate-500">
              Choose existing ({available.length} available)
            </label>
            {category.trades.length === 0 ? (
              <EmptyHint>
                No work categories in this category yet — create new ones
                below.
              </EmptyHint>
            ) : available.length === 0 ? (
              <EmptyHint>
                All existing work categories are already linked to this tag.
              </EmptyHint>
            ) : (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2">
                {available.map((t) => {
                  const on = selected.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition ${
                        on
                          ? "border-brand-300 bg-brand-50 text-brand-700"
                          : "border-transparent bg-white text-slate-700 hover:border-brand-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(t.id)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="flex-1">{t.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">
              Or create new work categories (comma-separated)
            </label>
            <Input
              placeholder="e.g. Tiling, Glazing, Snagging"
              value={newNamesText}
              onChange={(e) => setNewNamesText(e.target.value)}
            />
            {newNamesDedup.length > 0 && (
              <div className="mt-2 text-[11px] text-slate-500">
                {newNamesDedup.length} new work category(s) will be created
                {duplicateCount > 0 && (
                  <span className="ml-1 text-amber-600">
                    · {duplicateCount} duplicate ignored
                  </span>
                )}
              </div>
            )}
          </div>

          {selected.length > 0 && (
            <div className="text-[11px] text-slate-500">
              {selected.length} existing selected · {newNamesDedup.length} new
            </div>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() =>
              onAdd({ existingIds: selected, newNames: newNamesDedup })
            }
          >
            Add{" "}
            {selected.length + newNamesDedup.length || ""}
          </Button>
        </footer>
      </div>
    </div>
  );
}
