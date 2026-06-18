import { useState } from "react";
import { useApp } from "../store.jsx";
import { Card, Button, Input, Pill, EmptyHint, PageHeader } from "./ui.jsx";
import { UNIT_TYPE_SUGGESTIONS } from "../data.js";

export function Sites() {
  const {
    sites, addSite, updateSite, removeSite,
    addUnit, removeUnit, addSiteAccess, removeSiteAccess,
  } = useApp();
  const [draft, setDraft] = useState({ name: "", address: "" });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sites"
        description="CRUD for sites, their units (flats + shared parts like corridors and staircases), and who has access. Each unit gets its own progress row at stage 1."
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
              onUpdate={(patch) => updateSite(s.id, patch)}
              onDelete={() => removeSite(s.id)}
              onAddUnit={(payload) => addUnit(s.id, payload)}
              onRemoveUnit={(unitId) => removeUnit(s.id, unitId)}
              onAddAccess={(p) => addSiteAccess(s.id, p)}
              onRemoveAccess={(p) => removeSiteAccess(s.id, p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SiteRow({
  site, onUpdate, onDelete,
  onAddUnit, onRemoveUnit,
  onAddAccess, onRemoveAccess,
}) {
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({ name: site.name, address: site.address });
  const [unitName, setUnitName] = useState("");
  const [unitType, setUnitType] = useState("Flat");
  const [accessName, setAccessName] = useState("");

  // Group units by type so the operator can see at a glance which floors
  // / corridors / staircases exist without having to read each pill.
  const grouped = site.units.reduce((acc, u) => {
    const key = u.type || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(u);
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
        {/* Units (flats, corridors, staircases, …) */}
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
          <div className="grid gap-2 sm:grid-cols-[1fr,180px,auto]">
            <Input
              placeholder="Unit name e.g. A301 / Corridor 1"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onAddUnit({ name: unitName, type: unitType });
                  setUnitName("");
                }
              }}
            />
            <Input
              list={`unit-types-${site.id}`}
              placeholder="Type e.g. Flat"
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)}
            />
            <datalist id={`unit-types-${site.id}`}>
              {UNIT_TYPE_SUGGESTIONS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <Button
              onClick={() => {
                onAddUnit({ name: unitName, type: unitType });
                setUnitName("");
              }}
              disabled={!unitName.trim()}
            >
              Add
            </Button>
          </div>
          {site.units.length === 0 ? (
            <p className="mt-3 text-xs text-slate-400">No units yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {groupKeys.map((type) => (
                <div key={type}>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {type} ({grouped[type].length})
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {grouped[type].map((u) => (
                      <li
                        key={u.id}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
                      >
                        <span className="font-medium text-ink">{u.name}</span>
                        <button
                          className="text-slate-400 hover:text-rose-600"
                          onClick={() => onRemoveUnit(u.id)}
                          title="Remove"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
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
    </Card>
  );
}
