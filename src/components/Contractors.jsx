import { useMemo, useState } from "react";
import { useApp } from "../store.jsx";
import { Card, Button, Input, Pill, EmptyHint, PageHeader } from "./ui.jsx";

export function Contractors() {
  const { contractors, categories, addContractor, removeContractor } = useApp();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [tradeIds, setTradeIds] = useState([]);

  // Trades live per-category now — pre-compute a flat lookup so we can
  // resolve a tradeId back to its display name + owning category.
  const tradeIndex = useMemo(() => {
    const m = new Map();
    categories.forEach((cat) =>
      cat.trades.forEach((t) =>
        m.set(t.id, { trade: t, category: cat }),
      ),
    );
    return m;
  }, [categories]);

  const toggleTrade = (id) => {
    setTradeIds((curr) =>
      curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id],
    );
  };

  const canSave = name.trim().length > 0 && tradeIds.length > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contractors"
        description="Create a contractor and tag them with the work categories they perform — one tick per category they work in. The handover dropdown then filters by the active tag's required work categories."
      />

      <Card title="Add contractor">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">
              Person name
            </label>
            <Input
              placeholder="e.g. Jamie Patel"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">
              Company (optional)
            </label>
            <Input
              placeholder="e.g. Patel Plumbing Ltd"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-2 text-[11px] font-medium text-slate-500">
            Work categories performed (grouped by unit category)
          </div>
          {categories.length === 0 ? (
            <EmptyHint>
              No categories yet — add one in Configuration.
            </EmptyHint>
          ) : (
            <div className="space-y-3">
              {categories.map((cat) => (
                <div key={cat.id}>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {cat.name}
                  </div>
                  {cat.trades.length === 0 ? (
                    <p className="text-[11px] text-slate-400">No work categories in this category.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {cat.trades.map((t) => {
                        const on = tradeIds.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            onClick={() => toggleTrade(t.id)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                              on
                                ? "border-brand-500 bg-brand-50 text-brand-700"
                                : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"
                            }`}
                          >
                            {on ? "✓ " : ""}
                            {t.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            onClick={() => {
              addContractor({ name, company, tradeIds });
              setName("");
              setCompany("");
              setTradeIds([]);
            }}
            disabled={!canSave}
          >
            Create contractor
          </Button>
        </div>
      </Card>

      <Card title={`Contractor list (${contractors.length})`}>
        {contractors.length === 0 ? (
          <EmptyHint>No contractors yet.</EmptyHint>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr className="border-b border-slate-100">
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Company</th>
                  <th className="px-2 py-2">Work categories · category</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {contractors.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-2 py-2 font-medium text-ink">{c.name}</td>
                    <td className="px-2 py-2 text-slate-600">{c.company || "—"}</td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        {c.tradeIds.length === 0 ? (
                          <Pill tone="rose">no work category</Pill>
                        ) : (
                          c.tradeIds.map((id) => {
                            const entry = tradeIndex.get(id);
                            return (
                              <Pill key={id} tone="blue">
                                {entry?.trade.name ?? "—"}
                                <span className="ml-1 text-[10px] text-brand-500/70">
                                  · {entry?.category.name ?? "?"}
                                </span>
                              </Pill>
                            );
                          })
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => removeContractor(c.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
