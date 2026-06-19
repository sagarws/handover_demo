import { useState } from "react";
import { useApp } from "../store.jsx";
import {
  Card, Button, Input, Pill, EmptyHint, PageHeader, Combobox,
} from "./ui.jsx";
import { CategoryEditor } from "./Configuration.jsx";

export function Sites() {
  const {
    sites, categories, addSite, updateSite, removeSite,
    addUnit, removeUnit, addSiteAccess, removeSiteAccess, addCategory,
  } = useApp();
  const [draft, setDraft] = useState({ name: "", address: "" });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sites"
        description="CRUD for sites and their units. A unit is just a name + category — its tag list comes from the category (set up in Configuration), so flats, corridors and staircases each follow their own progression automatically."
      />

      <Card title="Add site">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder="Site name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Input
            placeholder="Address (optional)"
            value={draft.address}
            onChange={(e) => setDraft({ ...draft, address: e.target.value })}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            disabled={!draft.name.trim()}
            onClick={() => {
              addSite(draft);
              setDraft({ name: "", address: "" });
            }}
          >
            Create site
          </Button>
        </div>
      </Card>

      {sites.length === 0 ? (
        <EmptyHint>No sites yet.</EmptyHint>
      ) : (
        <div className="space-y-4">
          {sites.map((s) => (
            <SiteRow
              key={s.id}
              site={s}
              categories={categories}
              onUpdate={(patch) => updateSite(s.id, patch)}
              onDelete={() => removeSite(s.id)}
              onAddUnit={(payload) => addUnit(s.id, payload)}
              onRemoveUnit={(unitId) => removeUnit(s.id, unitId)}
              onAddAccess={(p) => addSiteAccess(s.id, p)}
              onRemoveAccess={(p) => removeSiteAccess(s.id, p)}
              onAddCategory={(name) => addCategory({ name })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SiteRow({
  site, categories, onUpdate, onDelete,
  onAddUnit, onRemoveUnit,
  onAddAccess, onRemoveAccess, onAddCategory,
}) {
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({ name: site.name, address: site.address });
  const [unitName, setUnitName] = useState("");
  const [unitCategoryId, setUnitCategoryId] = useState(categories[0]?.id ?? "");
  const [accessName, setAccessName] = useState("");
  const [configCategoryId, setConfigCategoryId] = useState(null);
  const configCategory = configCategoryId
    ? categories.find((c) => c.id === configCategoryId)
    : null;

  // Group units by category so the list mirrors how the matrix renders.
  const categoryOf = (id) => categories.find((c) => c.id === id);
  const grouped = site.units.reduce((acc, u) => {
    const k = categoryOf(u.categoryId)?.name || "Unknown";
    (acc[k] ||= []).push(u);
    return acc;
  }, {});
  const groupKeys = Object.keys(grouped);

  return (
    <Card
      title={
        editing ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              className="h-8"
              value={edit.name}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            />
            <Input
              className="h-8"
              value={edit.address}
              onChange={(e) => setEdit({ ...edit, address: e.target.value })}
            />
          </div>
        ) : (
          <span>
            {site.name}
            {site.address && (
              <span className="ml-2 text-[11px] font-normal text-slate-400">
                {site.address}
              </span>
            )}
          </span>
        )
      }
      right={
        editing ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                onUpdate({ name: edit.name.trim() || site.name, address: edit.address });
                setEditing(false);
              }}
            >
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button size="sm" variant="danger" onClick={onDelete}>
              Delete site
            </Button>
          </div>
        )
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        {/* Units */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Units ({site.units.length})
            </span>
            {groupKeys.length > 0 && (
              <span className="text-[11px] text-slate-400">
                {groupKeys
                  .map((k) => `${grouped[k].length} ${k.toLowerCase()}`)
                  .join(" · ")}
              </span>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr,200px,auto]">
            <Input
              placeholder="Unit name e.g. A301 / Corridor 1"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onAddUnit({ name: unitName, categoryId: unitCategoryId });
                  setUnitName("");
                }
              }}
            />
            <Combobox
              value={unitCategoryId}
              onChange={setUnitCategoryId}
              options={categories.map((c) => ({
                value: c.id,
                label: c.name,
                hint: `${c.stages.length} tags`,
              }))}
              onAdd={(name) => {
                const id = onAddCategory(name);
                if (id) setUnitCategoryId(id);
                return id;
              }}
              placeholder="Pick / type category…"
              emptyLabel="No categories yet"
              addLabel="Add category"
            />
            <Button
              onClick={() => {
                onAddUnit({ name: unitName, categoryId: unitCategoryId });
                setUnitName("");
              }}
              disabled={!unitName.trim() || !unitCategoryId}
            >
              Add unit
            </Button>
          </div>

          {site.units.length === 0 ? (
            <p className="mt-3 text-xs text-slate-400">No units yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {groupKeys.map((type) => {
                const cat = categories.find((c) => c.name === type);
                return (
                  <div key={type}>
                    <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      <span>{type} ({grouped[type].length})</span>
                      {cat && (
                        <Pill tone="slate">
                          {cat.stages.length} tags · {cat.trades.length} work categories
                        </Pill>
                      )}
                      {cat && (
                        <button
                          onClick={() => setConfigCategoryId(cat.id)}
                          title={`Configure ${cat.name} tags & work categories`}
                          className="ml-auto rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                          >
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <ul className="space-y-1.5">
                      {grouped[type].map((u) => (
                        <li
                          key={u.id}
                          className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs"
                        >
                          <span className="font-medium text-ink">{u.name}</span>
                          <button
                            className="ml-auto rounded-md p-1 text-slate-400 hover:bg-white hover:text-rose-600"
                            onClick={() => onRemoveUnit(u.id)}
                            title="Remove unit"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Access */}
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Site access ({site.access.length})
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Person / role e.g. Tom Patel (Site Manager)"
              value={accessName}
              onChange={(e) => setAccessName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onAddAccess(accessName);
                  setAccessName("");
                }
              }}
            />
            <Button
              onClick={() => {
                onAddAccess(accessName);
                setAccessName("");
              }}
              disabled={!accessName.trim()}
            >
              Grant
            </Button>
          </div>
          {site.access.length === 0 ? (
            <p className="mt-3 text-xs text-slate-400">No one has access yet.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {site.access.map((p) => (
                <li
                  key={p}
                  className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs"
                >
                  <Pill tone="blue">access</Pill>
                  <span className="flex-1 text-slate-700">{p}</span>
                  <button
                    className="text-slate-400 hover:text-rose-600"
                    onClick={() => onRemoveAccess(p)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {configCategory && (
        <CategoryConfigModal
          category={configCategory}
          onClose={() => setConfigCategoryId(null)}
        />
      )}
    </Card>
  );
}

function CategoryConfigModal({ category, onClose }) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4"
      onMouseDown={onClose}
    >
      <div
        className="my-8 w-full max-w-5xl rounded-xl border border-slate-200 bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">
              Configure · {category.name}
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Work categories, tags, and their relations for this unit category.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </header>
        <div className="px-5 py-4">
          <CategoryEditor category={category} />
        </div>
        <footer className="flex justify-end border-t border-slate-100 px-5 py-3">
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </footer>
      </div>
    </div>
  );
}
