import { useState } from 'react';
import { Check, Globe } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

export default function Settings() {
  const { code, setCurrency, currencies, format } = useCurrency();
  const [search, setSearch] = useState('');

  const list = Object.values(currencies).filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-3xl space-y-6">
      {/* ── Header ── */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <Globe size={16} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Display Currency</h2>
        </div>
        <p className="text-xs text-slate-400">
          All monetary values across the dashboard are stored in USD and converted for
          display using the rates below. Select the currency your restaurant operates in.
        </p>
      </div>

      {/* ── Active preview ── */}
      <div className="flex items-center gap-3 rounded-xl bg-indigo-50 px-5 py-4">
        <div className="text-2xl font-bold text-indigo-700">
          {currencies[code]?.symbol}
        </div>
        <div>
          <p className="text-sm font-semibold text-indigo-800">
            {currencies[code]?.name} ({code})
          </p>
          <p className="text-xs text-indigo-500">
            Example: {format(1)} · {format(100)} · {format(1000)}
          </p>
        </div>
      </div>

      {/* ── Search ── */}
      <input
        type="search"
        placeholder="Search currency…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input w-64"
      />

      {/* ── Grid ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((c) => {
          const selected = code === c.code;
          return (
            <button
              key={c.code}
              onClick={() => setCurrency(c.code)}
              className={`flex flex-col gap-1 rounded-xl border-2 p-4 text-left transition-all
                ${selected
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xl font-bold leading-none ${selected ? 'text-indigo-700' : 'text-slate-700'}`}>
                  {c.symbol}
                </span>
                {selected && <Check size={14} className="shrink-0 text-indigo-600" />}
              </div>
              <p className={`text-xs font-semibold ${selected ? 'text-indigo-700' : 'text-slate-700'}`}>
                {c.code}
              </p>
              <p className="text-[11px] leading-tight text-slate-400">{c.name}</p>
              <p className="text-[10px] text-slate-300">1 USD = {c.rate} {c.code}</p>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-300">
        Rates are approximate and hardcoded. To update them, edit{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-400">
          src/data/currencies.json
        </code>.
      </p>
    </div>
  );
}
