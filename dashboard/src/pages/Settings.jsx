import { useState, useEffect } from 'react';
import { Check, Globe, Clock, AlertCircle, Percent } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useTimezone } from '../context/TimezoneContext';
import { useSettings, useUpdateSetting } from '../hooks/useSettings';

export default function Settings() {
  const { code, setCurrency, currencies, format } = useCurrency();
  const { iana, setTimezone, timezones } = useTimezone();
  const updateSetting = useUpdateSetting();
  const { data: settings } = useSettings();

  const [search,    setSearch]   = useState('');
  const [tzSearch,  setTzSearch] = useState('');
  const [saveError, setSaveError] = useState('');

  // Business settings local state
  const [taxRate,        setTaxRate]        = useState('');
  const [serviceCharge,  setServiceCharge]  = useState('');
  const [bizSaving,      setBizSaving]      = useState(false);
  const [bizError,       setBizError]       = useState('');
  const [bizSaved,       setBizSaved]       = useState(false);

  // Sync business fields when settings load from DB
  useEffect(() => {
    if (!settings) return;
    if (settings.tax_rate       !== undefined) setTaxRate(settings.tax_rate);
    if (settings.service_charge !== undefined) setServiceCharge(settings.service_charge);
  }, [settings]);

  async function handleBizSave() {
    setBizError('');
    setBizSaved(false);
    setBizSaving(true);
    try {
      await updateSetting.mutateAsync({ key: 'tax_rate',       value: taxRate       || '0' });
      await updateSetting.mutateAsync({ key: 'service_charge', value: serviceCharge || '0' });
      setBizSaved(true);
      setTimeout(() => setBizSaved(false), 2500);
    } catch {
      setBizError('Failed to save business settings.');
    } finally {
      setBizSaving(false);
    }
  }

  async function handleCurrencyChange(newCode) {
    setSaveError('');
    setCurrency(newCode);
    try {
      await updateSetting.mutateAsync({ key: 'currency', value: newCode });
    } catch {
      setSaveError('Failed to save currency — change is local only.');
    }
  }

  async function handleTimezoneChange(newIana) {
    setSaveError('');
    setTimezone(newIana);
    try {
      await updateSetting.mutateAsync({ key: 'timezone', value: newIana });
    } catch {
      setSaveError('Failed to save timezone — change is local only.');
    }
  }

  const list = Object.values(currencies).filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-3xl space-y-6">

      {saveError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle size={15} className="shrink-0" />
          {saveError}
        </div>
      )}

      {/* ── Currency ── */}
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
        {updateSetting.isPending && (
          <span className="ml-auto text-xs text-slate-400">Saving…</span>
        )}
      </div>

      <input
        type="search"
        placeholder="Search currency…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input w-full sm:w-64"
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((c) => {
          const selected = code === c.code;
          return (
            <button
              key={c.code}
              onClick={() => handleCurrencyChange(c.code)}
              disabled={updateSetting.isPending}
              className={`flex flex-col gap-1 rounded-xl border-2 p-4 text-left transition-all disabled:opacity-60
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
        Rates are approximate. To update them, edit{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-400">
          shared/settings-options.json
        </code>.
      </p>

      {/* ── Timezone ── */}
      <div className="border-t border-slate-100 pt-6">
        <div className="mb-1 flex items-center gap-2">
          <Clock size={16} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Timezone</h2>
        </div>
        <p className="text-xs text-slate-400">
          Reports and hourly charts use this timezone for date grouping and hour extraction.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-indigo-50 px-5 py-4">
        <Clock size={20} className="shrink-0 text-indigo-500" />
        <div>
          <p className="text-sm font-semibold text-indigo-800">
            {timezones.find((t) => t.iana === iana)?.label ?? iana}
          </p>
          <p className="text-xs text-indigo-500">
            {iana} · {timezones.find((t) => t.iana === iana)?.offset}
          </p>
        </div>
        {updateSetting.isPending && (
          <span className="ml-auto text-xs text-slate-400">Saving…</span>
        )}
      </div>

      <input
        type="search"
        placeholder="Search timezone…"
        value={tzSearch}
        onChange={(e) => setTzSearch(e.target.value)}
        className="input w-full sm:w-64"
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {timezones
          .filter((t) => {
            const q = tzSearch.toLowerCase();
            return !q || t.label.toLowerCase().includes(q) || t.iana.toLowerCase().includes(q) || t.offset.toLowerCase().includes(q);
          })
          .map((t) => {
            const selected = iana === t.iana;
            return (
              <button
                key={t.iana}
                onClick={() => handleTimezoneChange(t.iana)}
                disabled={updateSetting.isPending}
                className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all disabled:opacity-60
                  ${selected
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
              >
                <div className="min-w-0">
                  <p className={`truncate text-xs font-semibold ${selected ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {t.label}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">{t.iana}</p>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-1.5">
                  <span className={`text-[11px] font-medium ${selected ? 'text-indigo-500' : 'text-slate-400'}`}>
                    {t.offset}
                  </span>
                  {selected && <Check size={13} className="text-indigo-600" />}
                </div>
              </button>
            );
          })}
      </div>

      {/* ── Business ── */}
      <div className="border-t border-slate-100 pt-6">
        <div className="mb-1 flex items-center gap-2">
          <Percent size={16} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Business Settings</h2>
        </div>
        <p className="text-xs text-slate-400">
          Applied automatically when collecting payment. Set to 0 to disable.
        </p>
      </div>

      {bizError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle size={15} className="shrink-0" />
          {bizError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border-2 border-slate-200 bg-white p-5">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Tax Rate (%)</label>
          <p className="mb-3 text-[11px] text-slate-400">
            e.g. 8 for GST, 5 for VAT
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="input w-28"
              placeholder="0"
            />
            <span className="text-sm text-slate-400">%</span>
          </div>
        </div>

        <div className="rounded-xl border-2 border-slate-200 bg-white p-5">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Service Charge (%)</label>
          <p className="mb-3 text-[11px] text-slate-400">
            e.g. 10 for a standard service charge
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={serviceCharge}
              onChange={(e) => setServiceCharge(e.target.value)}
              className="input w-28"
              placeholder="0"
            />
            <span className="text-sm text-slate-400">%</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleBizSave}
          disabled={bizSaving}
          className="btn-primary disabled:opacity-50"
        >
          {bizSaving ? 'Saving…' : 'Save Business Settings'}
        </button>
        {bizSaved && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <Check size={13} /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
