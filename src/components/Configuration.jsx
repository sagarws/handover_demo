import { useEffect, useState } from "react";
import { useApp } from "../store.jsx";
import { Card, Button, Input, EmptyHint, PageHeader, Select } from "./ui.jsx";

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
        description="Each unit category (Flat, Corridor, Staircase, …) keeps its own work categories, its own ordered tags, and its own work category↔tag relations. Switch tabs to configure each one independently."
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

function CategoryEditor({ category }) {
  return (
    <div className="grid gap-5 md:grid-cols-4">
      <div className="md:col-span-1">
        <TradesCard category={category} />
      </div>
      <div className="md:col-span-3">
        <TagBundleBuilder category={category} />
      </div>
    </div>
  );
}

function TradesCard({ category }) {
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


function TagBundleBuilder({ category }) {
  const {
    addStage, renameStage, removeStage, moveStage,
    addStageTrade, removeStageTrade,
  } = useApp();
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [addCategoryForTagId, setAddCategoryForTagId] = useState(null);

  const tradeName = (id) =>
    category.trades.find((t) => t.id === id)?.name ?? "—";

  const submitNewTag = () => {
    const name = newTagName.trim();
    if (!name) return;
    addStage(category.id, name);
    setNewTagName("");
    setAddingTag(false);
  };

  return (
    <Card
      title={`Tags · ${category.name}`}
      right={
        <span className="text-[11px] text-slate-400">
          Top → bottom drives matrix order
        </span>
      }
    >
      <div className="space-y-3">
        {category.stages.length === 0 ? (
          <EmptyHint>No tags yet — add one below.</EmptyHint>
        ) : (
          category.stages.map((s, i) => {
            const linkedIds = category.stageTradeMap[s.id] ?? [];
            const isEditing = editingId === s.id;
            return (
              <div
                key={s.id}
                className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="cursor-grab text-slate-400 select-none"
                    title="Drag handle"
                  >
                    ⋮⋮
                  </span>
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

                <div className="mt-3 space-y-1.5">
                  {linkedIds.length === 0 ? (
                    <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-400">
                      No work categories linked yet — add one below.
                    </div>
                  ) : (
                    linkedIds.map((tid) => (
                      <div
                        key={tid}
                        className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <span
                          className="cursor-grab text-slate-300 select-none"
                          title="Drag handle"
                        >
                          ⋮⋮
                        </span>
                        <span className="h-2 w-2 rounded-full bg-brand-500" />
                        <span className="flex-1 text-ink">
                          {tradeName(tid)}
                        </span>
                        <button
                          onClick={() =>
                            removeStageTrade(category.id, s.id, tid)
                          }
                          className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-rose-600"
                          title="Remove from this tag"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setAddCategoryForTagId(s.id)}
                  >
                    + Add work category
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (confirm(`Delete tag "${s.name}"?`)) {
                        removeStage(category.id, s.id);
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            );
          })
        )}

        {addingTag ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-dashed border-brand-300 bg-brand-50/40 p-3">
            <Input
              autoFocus
              className="h-9 w-56"
              placeholder="Tag name e.g. Snagging"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitNewTag();
                else if (e.key === "Escape") {
                  setAddingTag(false);
                  setNewTagName("");
                }
              }}
            />
            <Button onClick={submitNewTag} disabled={!newTagName.trim()}>
              Add tag
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setAddingTag(false);
                setNewTagName("");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setAddingTag(true)}>
            + Add tag
          </Button>
        )}
      </div>

      {addCategoryForTagId && (
        <AddWorkCategoryModal
          category={category}
          tagId={addCategoryForTagId}
          onClose={() => setAddCategoryForTagId(null)}
          onAdd={(ids) => {
            ids.forEach((tid) =>
              addStageTrade(category.id, addCategoryForTagId, tid),
            );
            setAddCategoryForTagId(null);
          }}
        />
      )}
    </Card>
  );
}

function AddWorkCategoryModal({ category, tagId, onClose, onAdd }) {
  const tag = category.stages.find((s) => s.id === tagId);
  const linked = new Set(category.stageTradeMap[tagId] ?? []);
  const available = category.trades.filter((t) => !linked.has(t.id));
  const [selected, setSelected] = useState([]);

  const toggle = (id) =>
    setSelected((curr) =>
      curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id],
    );

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 px-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl"
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
        <div className="px-5 py-4">
          <label className="mb-2 block text-[11px] font-medium text-slate-500">
            Work categories ({available.length} available)
          </label>
          {category.trades.length === 0 ? (
            <EmptyHint>
              No work categories in this category yet — add some on the Work
              categories card first.
            </EmptyHint>
          ) : available.length === 0 ? (
            <EmptyHint>
              All work categories are already linked to this tag.
            </EmptyHint>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2">
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
          {selected.length > 0 && (
            <div className="mt-2 text-[11px] text-slate-500">
              {selected.length} selected
            </div>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={selected.length === 0}
            onClick={() => onAdd(selected)}
          >
            Add {selected.length || ""}
          </Button>
        </footer>
      </div>
    </div>
  );
}
