export default function PresetSelector({ presets, onSelectPreset }) {
  return (
    <div>
      <span className="text-xs font-medium text-slate-400 block mb-2">
        Quick Conversion Examples & Presets
      </span>
      <div className="flex flex-wrap gap-2">
        {presets.map(p => (
          <button
            key={p.label}
            type="button"
            onClick={() => onSelectPreset(p)}
            className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-accent-500/50 hover:text-accent-400 hover:bg-slate-900 transition"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
