import { useState, useEffect } from 'react';
import { Check, Globe, Clock, AlertCircle, Percent, Package } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useTimezone } from '../context/TimezoneContext';
import { useSettings, useUpdateSetting } from '../hooks/useSettings';

export default function Settings() {
  const { code, currency, setCurrency, currencies, format } = useCurrency();
  const { iana, setTimezone, timezones } = useTimezone();
  const updateSetting = useUpdateSetting();
  const { data: settings } = useSettings();

  const [search,    setSearch]   = useState('');
  const [tzSearch,  setTzSearch] = useState('');
  const [saveError, setSaveError] = useState('');

  const [taxRate,       setTaxRate]       = useState('');
  const [serviceCharge, setServiceCharge] = useState('');
  const [packagingFee,  setPackagingFee]  = useState('');
  const [bizSaving,     setBizSaving]     = useState(false);
  const [bizError,      setBizError]      = useState('');
  const [bizSaved,      setBizSaved]      = useState(false);

  useEffect(() => {
    if (!settings) return;
    if (settings.tax_rate       !== undefined) setTaxRate(settings.tax_rate);
    if (settings.service_charge !== undefined) setServiceCharge(settings.service_charge);
    if (settings.packaging_fee  !== undefined) {
      const display = parseFloat(settings.packaging_fee || '0') * currency.rate;
      setPackagingFee(display ? display.toFixed(currency.decimals ?? 2) : '');
    }
  }, [settings]);

  async function handleBizSave() {
    setBizError('');
    setBizSaved(false);
    setBizSaving(true);
    try {
      await updateSetting.mutateAsync({ key: 'tax_rate',       value: taxRate       || '0' });
      await updateSetting.mutateAsync({ key: 'service_charge', value: serviceCharge || '0' });
      const pkgBase = (parseFloat(packagingFee || '0') / currency.rate).toFixed(4);
      await updateSetting.mutateAsync({ key: 'packaging_fee', value: pkgBase });
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
        <div
          className="flex items-center gap-2 rounded-[6px] px-4 py-3"
          style={{ fontSize: 12, color: 'var(--bad)', background: 'rgba(179,55,43,.06)', border: '1px solid rgba(179,55,43,.15)' }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          {saveError}
        </div>
      )}

      {/* Currency */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <Globe size={14} style={{ color: 'var(--mute)' }} />
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Display Currency</h2>
        </div>
        <p style={{ fontSize: 12, color: 'var(--mute)' }}>
          All monetary values across the dashboard are stored in USD and converted for
          display using the rates below. Select the currency your restaurant operates in.
        </p>
      </div>

      <div
        className="flex items-center gap-3 rounded-[8px] px-5 py-4"
        style={{ background: 'var(--paper-2)', border: '1px solid var(--line-2)' }}
      >
        <span className="mono num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>
          {currencies[code]?.symbol}
        </span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
            {currencies[code]?.name} ({code})
          </p>
          <p className="mono num" style={{ fontSize: 11.5, color: 'var(--mute)' }}>
            {format(1)} · {format(100)} · {format(1000)}
          </p>
        </div>
        {updateSetting.isPending && (
          <span className="ml-auto" style={{ fontSize: 11.5, color: 'var(--mute)' }}>Saving…</span>
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
              className="flex flex-col gap-1 p-4 text-left transition-all disabled:opacity-60"
              style={{
                borderRadius: 8,
                border: selected ? '1.5px solid var(--ink)' : '1px solid var(--line-2)',
                background: selected ? 'var(--paper-2)' : 'var(--paper)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="mono num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                  {c.symbol}
                </span>
                {selected && <Check size={13} style={{ color: 'var(--ok)', flexShrink: 0 }} />}
              </div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{c.code}</p>
              <p style={{ fontSize: 11, color: 'var(--mute)', lineHeight: 1.3 }}>{c.name}</p>
              <p className="mono num" style={{ fontSize: 10, color: 'var(--line-2)' }}>1 USD = {c.rate} {c.code}</p>
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 11, color: 'var(--mute)' }}>
        Rates are approximate. To update them, edit{' '}
        <code
          className="rounded px-1 py-0.5"
          style={{ fontSize: 11, background: 'var(--hover)', color: 'var(--ink)' }}
        >
          shared/settings-options.json
        </code>.
      </p>

      {/* Timezone */}
      <div className="pt-2" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="mb-1 flex items-center gap-2">
          <Clock size={14} style={{ color: 'var(--mute)' }} />
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Timezone</h2>
        </div>
        <p style={{ fontSize: 12, color: 'var(--mute)' }}>
          Reports and hourly charts use this timezone for date grouping and hour extraction.
        </p>
      </div>

      <div
        className="flex items-center gap-3 rounded-[8px] px-5 py-4"
        style={{ background: 'var(--paper-2)', border: '1px solid var(--line-2)' }}
      >
        <Clock size={18} style={{ flexShrink: 0, color: 'var(--mute)' }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
            {timezones.find((t) => t.iana === iana)?.label ?? iana}
          </p>
          <p style={{ fontSize: 11.5, color: 'var(--mute)' }}>
            {iana} · {timezones.find((t) => t.iana === iana)?.offset}
          </p>
        </div>
        {updateSetting.isPending && (
          <span className="ml-auto" style={{ fontSize: 11.5, color: 'var(--mute)' }}>Saving…</span>
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
                className="flex items-center justify-between px-4 py-3 text-left transition-all disabled:opacity-60"
                style={{
                  borderRadius: 8,
                  border: selected ? '1.5px solid var(--ink)' : '1px solid var(--line-2)',
                  background: selected ? 'var(--paper-2)' : 'var(--paper)',
                }}
              >
                <div className="min-w-0">
                  <p className="truncate" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{t.label}</p>
                  <p className="truncate" style={{ fontSize: 11, color: 'var(--mute)' }}>{t.iana}</p>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-1.5">
                  <span className="mono" style={{ fontSize: 11, fontWeight: 500, color: selected ? 'var(--ink)' : 'var(--mute)' }}>
                    {t.offset}
                  </span>
                  {selected && <Check size={12} style={{ color: 'var(--ok)' }} />}
                </div>
              </button>
            );
          })}
      </div>

      {/* Business Settings */}
      <div className="pt-2" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="mb-1 flex items-center gap-2">
          <Percent size={14} style={{ color: 'var(--mute)' }} />
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Business Settings</h2>
        </div>
        <p style={{ fontSize: 12, color: 'var(--mute)' }}>
          Applied automatically when collecting payment. Set to 0 to disable.
        </p>
      </div>

      {bizError && (
        <div
          className="flex items-center gap-2 rounded-[6px] px-4 py-3"
          style={{ fontSize: 12, color: 'var(--bad)', background: 'rgba(179,55,43,.06)', border: '1px solid rgba(179,55,43,.15)' }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          {bizError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: 20, background: 'var(--paper)' }}>
          <label className="mb-1 block" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)' }}>Tax Rate (%)</label>
          <p style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 12 }}>e.g. 8 for GST, 5 for VAT</p>
          <div className="flex items-center gap-2">
            <input type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="input w-28" placeholder="0" />
            <span style={{ fontSize: 13, color: 'var(--mute)' }}>%</span>
          </div>
        </div>

        <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: 20, background: 'var(--paper)' }}>
          <label className="mb-1 block" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)' }}>Service Charge (%)</label>
          <p style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 12 }}>e.g. 10 for a standard service charge</p>
          <div className="flex items-center gap-2">
            <input type="number" min="0" max="100" step="0.01" value={serviceCharge} onChange={(e) => setServiceCharge(e.target.value)} className="input w-28" placeholder="0" />
            <span style={{ fontSize: 13, color: 'var(--mute)' }}>%</span>
          </div>
        </div>

        <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: 20, background: 'var(--paper)' }}>
          <div className="mb-1 flex items-center gap-1.5">
            <Package size={12} style={{ color: 'var(--mute)' }} />
            <label className="block" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)' }}>Packaging Fee</label>
          </div>
          <p style={{ fontSize: 11, color: 'var(--mute)', marginBottom: 12 }}>
            Flat amount added to takeaway &amp; delivery orders.
          </p>
          <div className="flex items-center gap-2">
            <input type="number" min="0" step="0.01" value={packagingFee} onChange={(e) => setPackagingFee(e.target.value)} className="input w-28" placeholder="0" />
            <span style={{ fontSize: 13, color: 'var(--mute)' }}>{currencies[code]?.symbol ?? '$'}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleBizSave} disabled={bizSaving} className="btn-primary disabled:opacity-50">
          {bizSaving ? 'Saving…' : 'Save Business Settings'}
        </button>
        {bizSaved && (
          <span className="flex items-center gap-1" style={{ fontSize: 12, color: 'var(--ok)' }}>
            <Check size={13} /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
