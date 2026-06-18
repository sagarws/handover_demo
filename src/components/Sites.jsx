import { useState } from "react";
import { useApp } from "../store.jsx";
import { Card, Button, Input, Pill, EmptyHint, PageHeader } from "./ui.jsx";

export function Sites() {
  const {
    sites, addSite, updateSite, removeSite,
    addFlat, removeFlat, addSiteAccess, removeSiteAccess,
  } = useApp();
  const [draft, setDraft] = useState({ name: "", address: "" });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sites"
        description="CRUD for sites, flats, and who has access. Adding a flat seeds it into the progress matrix at stage 1."
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
              onAddFlat={(name) => addFlat(s.id, name)}
              onRemoveFlat={(flatId) => removeFlat(s.id, flatId)}
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
  onAddFlat, onRemoveFlat,
  onAddAccess, onRemoveAccess,
}) {
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({ name: site.name, address: site.address });
  const [flatName, setFlatName] = useState("");
  const [accessName, setAccessName] = useState("");

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
        {/* Flats */}
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Flats ({site.flats.length})
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Flat name e.g. A301"
              value={flatName}
              onChange={(e) => setFlatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onAddFlat(flatName);
                  setFlatName("");
                }
              }}
            />
            <Button
              onClick={() => {
                onAddFlat(flatName);
                setFlatName("");
              }}
              disabled={!flatName.trim()}
            >
              Add
            </Button>
          </div>
          {site.flats.length === 0 ? (
            <p className="mt-3 text-xs text-slate-400">No flats yet.</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {site.flats.map((f) => (
                <li
                  key={f.id}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
                >
                  <span className="font-medium text-ink">{f.name}</span>
                  <button
                    className="text-slate-400 hover:text-rose-600"
                    onClick={() => onRemoveFlat(f.id)}
                    title="Remove"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
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
