import { useState } from 'react';
import { X } from 'lucide-react';

export default function CustomizationPicker({ item, format, onConfirm, onCancel }) {
  const groups = item.customization_groups || [];

  const [selections, setSelections] = useState(() => {
    const init = {};
    for (const g of groups) {
      if (g.required && g.options.length > 0) {
        init[g.name] = g.type === 'multi' ? [g.options[0].label] : g.options[0].label;
      }
    }
    return init;
  });

  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  function toggleOption(group, optLabel) {
    setSelections((prev) => {
      if (group.type === 'single') {
        return { ...prev, [group.name]: optLabel };
      }
      const current = prev[group.name] || [];
      return {
        ...prev,
        [group.name]: current.includes(optLabel)
          ? current.filter((l) => l !== optLabel)
          : [...current, optLabel],
      };
    });
  }

  function isSelected(group, optLabel) {
    const sel = selections[group.name];
    if (!sel) return false;
    return group.type === 'multi' ? sel.includes(optLabel) : sel === optLabel;
  }

  // Extra price from selected options (in base currency)
  const priceAdd = groups.reduce((total, g) => {
    const sel = selections[g.name];
    if (!sel) return total;
    const labels = Array.isArray(sel) ? sel : [sel];
    return total + g.options
      .filter((o) => labels.includes(o.label))
      .reduce((s, o) => s + (o.priceAdd || 0), 0);
  }, 0);

  function handleConfirm() {
    for (const g of groups) {
      if (g.required) {
        const sel = selections[g.name];
        if (!sel || (Array.isArray(sel) && sel.length === 0)) {
          setError(`"${g.name}" is required`);
          return;
        }
      }
    }
    onConfirm({ customizations: selections, notes: note, priceAdd });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="w-full max-w-sm rounded-t-2xl bg-white shadow-xl sm:rounded-xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="font-semibold text-slate-800">{item.name}</p>
            <p className="text-xs text-slate-400">{format(item.price + priceAdd)}</p>
          </div>
          <button onClick={onCancel}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Groups */}
        <div className="max-h-[60vh] overflow-y-auto px-4 py-4 space-y-5">
          {groups.map((group) => (
            <div key={group.name}>
              <div className="mb-2 flex items-baseline gap-1.5">
                <p className="text-sm font-semibold text-slate-700">{group.name}</p>
                <span className="text-xs text-slate-400">
                  {group.type === 'multi' ? '(pick any)' : '(pick one)'}
                  {group.required && <span className="ml-1 text-red-400">*</span>}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.options.map((opt) => {
                  const sel = isSelected(group, opt.label);
                  return (
                    <button key={opt.label} type="button"
                      onClick={() => toggleOption(group, opt.label)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                        sel
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}>
                      {opt.label}
                      {opt.priceAdd > 0 && (
                        <span className="ml-1 text-xs font-normal opacity-70">+{format(opt.priceAdd)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Notes */}
          <div>
            <p className="mb-1.5 text-sm font-semibold text-slate-700">Notes <span className="font-normal text-slate-400">(optional)</span></p>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Any special requests…"
              className="input w-full text-sm" />
          </div>
        </div>

        {error && (
          <p className="px-4 pb-1 text-xs text-red-500">{error}</p>
        )}

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 py-3 flex gap-2">
          <button onClick={onCancel} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button onClick={handleConfirm} className="btn-primary flex-1 text-sm">
            Add to order{priceAdd > 0 ? ` (+${format(priceAdd)})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
