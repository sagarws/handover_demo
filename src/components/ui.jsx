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
