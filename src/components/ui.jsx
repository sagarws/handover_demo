export function Card({ title, right, children, className = "" }) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {(title || right) && (
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          {title && (
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
          )}
          {right}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = {
    sm: "h-7 px-2.5 text-xs",
    md: "h-9 px-3.5 text-sm",
  };
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    secondary: "bg-slate-100 text-ink hover:bg-slate-200",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    danger: "bg-red-50 text-red-700 hover:bg-red-100",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
  };
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      className={`h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", children, ...props }) {
  return (
    <select
      className={`h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Pill({ children, tone = "slate", className = "" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-brand-100 text-brand-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function EmptyHint({ children }) {
  return (
    <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
      {children}
    </div>
  );
}

export function PageHeader({ title, description }) {
  return (
    <div className="mb-5">
      <h1 className="font-semibold text-xl text-ink">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      )}
    </div>
  );
}

// Searchable combobox: a text input that filters a list of options as the
// user types. If `onAdd` is provided and the typed text doesn't match an
// existing option, an inline "+ Add new …" row appears.
//
// Options shape: [{ value, label, group? }]. When `group` is set, options
// are rendered under group headings (used by the Handover unit picker, where
// units of different categories sit under their own headings).
import { useEffect, useRef, useState } from "react";

export function Combobox({
  value,
  onChange,
  options,
  onAdd,
  placeholder = "Search…",
  emptyLabel = "No matches",
  addLabel = "Add",
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  // Show the current selection in the input when the picker isn't open;
  // editable query takes over the moment the user starts typing.
  const selected = options.find((o) => o.value === value);
  const display = open ? query : selected?.label ?? "";

  // Filter case-insensitively; preserve the original group order.
  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q))
    : options;
  const exact = options.find((o) => o.label.toLowerCase() === q);
  const canAdd = !!onAdd && q.length > 0 && !exact;

  // Outside-click closes the menu.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const pick = (val) => {
    const opt = options.find((o) => o.value === val);
    if (opt?.disabled) return;
    onChange(val);
    setOpen(false);
    setQuery("");
  };

  const addNow = () => {
    if (!canAdd) return;
    const created = onAdd(query.trim());
    if (created) {
      onChange(created);
      setOpen(false);
      setQuery("");
    }
  };

  // Group rendering helper.
  const groups = filtered.reduce((acc, o) => {
    const k = o.group || "";
    (acc[k] ||= []).push(o);
    return acc;
  }, {});

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        disabled={disabled}
        value={display}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setOpen(true);
          setQuery(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const firstEnabled = filtered.find((o) => !o.disabled);
            if (firstEnabled) pick(firstEnabled.value);
            else if (canAdd) addNow();
          } else if (e.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
        }}
        className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50"
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {Object.keys(groups).length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">
              {emptyLabel}
            </div>
          ) : (
            Object.entries(groups).map(([group, items]) => (
              <div key={group || "_"}>
                {group && (
                  <div className="border-b border-slate-100 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {group}
                  </div>
                )}
                {items.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => pick(o.value)}
                    disabled={o.disabled}
                    title={o.disabled ? o.disabledReason ?? "" : ""}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm ${
                      o.disabled
                        ? "cursor-not-allowed bg-slate-50 text-slate-400"
                        : "hover:bg-brand-50"
                    } ${
                      !o.disabled && o.value === value
                        ? "bg-brand-50/60 text-brand-700"
                        : ""
                    }`}
                  >
                    <span>{o.label}</span>
                    {o.hint && (
                      <span
                        className={`text-[11px] ${
                          o.disabled ? "text-amber-600" : "text-slate-400"
                        }`}
                      >
                        {o.hint}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
          {canAdd && (
            <button
              onClick={addNow}
              className="flex w-full items-center gap-2 border-t border-slate-100 bg-emerald-50/40 px-3 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50"
            >
              <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-emerald-200">
                +
              </span>
              {addLabel} “{query.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
