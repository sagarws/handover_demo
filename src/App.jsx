import { useState } from "react";
import { ProgressMatrix } from "./components/ProgressMatrix.jsx";
import { Sites } from "./components/Sites.jsx";
import { Contractors } from "./components/Contractors.jsx";
import { StepManagement } from "./components/StepManagement.jsx";
import { SetupTag } from "./components/SetupTag.jsx";
import { Handover } from "./components/Handover.jsx";

const TABS = [
  { id: "matrix", label: "Progress Matrix", hint: "Flat × tag progression" },
  { id: "handover", label: "Handover", hint: "The demo flow" },
  { id: "sites", label: "Sites", hint: "Sites, flats, access" },
  { id: "contractors", label: "Contractors", hint: "By work category" },
  { id: "step-management", label: "Step Management", hint: "Tags ↔ steps" },
  { id: "setup-tag", label: "Setup tag", hint: "Tags ↔ work categories" },
];

export default function App() {
  const [tab, setTab] = useState("handover");

  return (
    <div className="flex min-h-full">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">
            SyteFlow
          </div>
          <div className="text-sm font-semibold text-ink">Handover Prototype</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full rounded-md px-3 py-2 text-left transition ${
                tab === t.id
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="text-sm font-medium">{t.label}</div>
              <div className="text-[11px] text-slate-400">{t.hint}</div>
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">
          State held in memory · refresh to reset
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="md:hidden border-b border-slate-200 bg-white px-4 py-3">
          <select
            value={tab}
            onChange={(e) => setTab(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"
          >
            {TABS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {tab === "matrix" && <ProgressMatrix />}
          {tab === "handover" && <Handover />}
          {tab === "sites" && <Sites />}
          {tab === "contractors" && <Contractors />}
          {tab === "step-management" && <StepManagement />}
          {tab === "setup-tag" && <SetupTag />}
        </div>
      </main>
    </div>
  );
}
