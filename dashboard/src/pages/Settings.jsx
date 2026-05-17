import { useState, useEffect, useRef } from 'react';
import { Check, Globe, Clock, AlertCircle, Percent, Package, UserCheck, ChevronDown, Search, Zap, RefreshCw } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useTimezone } from '../context/TimezoneContext';
import { useSettings, useUpdateSetting } from '../hooks/useSettings';

/* ── Searchable dropdown ────────────────────────────────────── */

function SearchSelect({ triggerContent, items, onSelect, dropdownWidth = 320, disabled }) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const rootRef  = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) { setQuery(''); return; }
    setTimeout(() => inputRef.current?.focus(), 0);
    function onDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const filtered = items.filter((item) => item.matches(query.toLowerCase()));

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center transition-colors"
        style={{
          height: 34, padding: '0 10px 0 12px', borderRadius: 8, gap: 8,
          border: open ? '1.5px solid var(--ink)' : '1px solid var(--line-2)',
          background: open ? 'var(--paper-2)' : 'var(--paper)',
          cursor: 'pointer', minWidth: 0,
        }}
      >
        {triggerContent}
        <ChevronDown size={13} style={{
          color: 'var(--mute)', flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s',
        }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0,
          width: dropdownWidth, zIndex: 100, borderRadius: 10,
          border: '1px solid var(--line-2)', background: 'var(--paper)',
          boxShadow: '0 8px 24px rgba(0,0,0,.10), 0 2px 6px rgba(0,0,0,.06)',
          overflow: 'hidden',
        }}>
          <div className="flex items-center gap-2 px-3" style={{ height: 38, borderBottom: '1px solid var(--line)' }}>
            <Search size={12} style={{ color: 'var(--mute)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              style={{ flex: 1, border: 0, outline: 'none', background: 'transparent', fontSize: 12, color: 'var(--ink)' }}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')}
                style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--mute)', lineHeight: 1 }}>
                ×
              </button>
            )}
          </div>
          <div style={{ maxHeight: 264, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--mute)' }}>No results</div>
            ) : filtered.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => { onSelect(item.key); setOpen(false); }}
                className="flex w-full items-center gap-3 text-left"
                style={{
                  padding: '7px 12px', border: 0, cursor: 'pointer',
                  borderBottom: '1px solid var(--line)',
                  background: item.selected ? 'var(--paper-2)' : 'transparent',
                }}
                onMouseEnter={(e) => { if (!item.selected) e.currentTarget.style.background = 'var(--hover)'; }}
                onMouseLeave={(e) => { if (!item.selected) e.currentTarget.style.background = 'transparent'; }}
              >
                {item.render()}
                {item.selected && <Check size={12} style={{ color: 'var(--ok)', flexShrink: 0, marginLeft: 'auto' }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Toggle switch ──────────────────────────────────────────── */

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        flexShrink: 0, width: 40, height: 22, borderRadius: 11,
        border: 0, cursor: 'pointer',
        background: checked ? 'var(--ok)' : 'var(--line-2)',
        position: 'relative', transition: 'background .15s',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transition: 'left .15s',
      }} />
    </button>
  );
}

/* ── Section header ─────────────────────────────────────────── */

function SectionHead({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-3" style={{ borderTop: '1px solid var(--line)', paddingTop: 18 }}>
      <Icon size={13} style={{ color: 'var(--mute)', flexShrink: 0 }} />
      <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{title}</h2>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────── */

export default function Settings() {
  const { code, currency, setCurrency, currencies, format } = useCurrency();
  const { iana, setTimezone, timezones } = useTimezone();
  const updateSetting = useUpdateSetting();
  const { data: settings } = useSettings();

  const [fxRate,    setFxRate]    = useState(null);   // rate for current currency vs USD
  const [fxDate,    setFxDate]    = useState(null);   // date string from Frankfurter
  const [fxLoading, setFxLoading] = useState(false);
  const [fxError,   setFxError]   = useState(false);

  const [saveError,       setSaveError]       = useState('');
  const [taxRate,         setTaxRate]         = useState('');
  const [serviceCharge,   setServiceCharge]   = useState('');
  const [packagingFee,    setPackagingFee]     = useState('');
  const [staffAssignment, setStaffAssignment] = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [saveErr,         setSaveErr]         = useState('');
  const [saved,           setSaved]           = useState(false);
  const [dirty,           setDirty]           = useState(false);

  const [autosave, setAutosave] = useState(
    () => localStorage.getItem('pos_autosave') === 'true',
  );

  const debounceRef = useRef(null);
  const saveRef     = useRef(null);

  /* Load from server */
  useEffect(() => {
    if (!settings) return;
    if (settings.tax_rate       !== undefined) setTaxRate(settings.tax_rate);
    if (settings.service_charge !== undefined) setServiceCharge(settings.service_charge);
    if (settings.packaging_fee  !== undefined) {
      const display = parseFloat(settings.packaging_fee || '0');
      setPackagingFee(display ? display.toFixed(currency.decimals ?? 2) : '');
    }
    if (settings.staff_assignment_enabled !== undefined) {
      setStaffAssignment(settings.staff_assignment_enabled === 'true');
    }
    // mark clean after load so autosave doesn't fire on mount
    setTimeout(() => setDirty(false), 0);
  }, [settings]);

  /* Exchange rate — fetches from Frankfurter, cached per currency per day */
  async function fetchRate(currencyCode) {
    if (currencyCode === 'USD') { setFxRate(1); setFxDate(new Date().toISOString().slice(0, 10)); return; }
    const cacheKey = `pos_fx_${currencyCode}`;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && cached.date === new Date().toISOString().slice(0, 10)) {
        setFxRate(cached.rate); setFxDate(cached.date); return;
      }
    } catch { /* bad cache */ }
    setFxLoading(true); setFxError(false);
    try {
      const res  = await fetch(`/frankfurter/latest?from=USD&to=${currencyCode}`);
      const json = await res.json();
      const rate = json.rates?.[currencyCode];
      if (!rate) throw new Error('no rate');
      const date = json.date;
      localStorage.setItem(cacheKey, JSON.stringify({ rate, date }));
      setFxRate(rate); setFxDate(date);
    } catch {
      setFxError(true);
    } finally {
      setFxLoading(false);
    }
  }

  useEffect(() => { fetchRate(code); }, [code]);

  /* Save function — keep ref current so debounced calls always use latest state */
  async function doSave() {
    setSaveErr(''); setSaved(false); setSaving(true);
    try {
      await updateSetting.mutateAsync({ key: 'tax_rate',       value: taxRate       || '0' });
      await updateSetting.mutateAsync({ key: 'service_charge', value: serviceCharge || '0' });
      await updateSetting.mutateAsync({ key: 'packaging_fee',  value: parseFloat(packagingFee || '0').toFixed(4) });
      await updateSetting.mutateAsync({ key: 'staff_assignment_enabled', value: String(staffAssignment) });
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveErr('Failed to save.');
    } finally {
      setSaving(false);
    }
  }
  saveRef.current = doSave;

  /* Autosave debounce — fires 900 ms after last change when autosave is on */
  useEffect(() => {
    if (!autosave || !dirty) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveRef.current?.(), 900);
    return () => clearTimeout(debounceRef.current);
  }, [taxRate, serviceCharge, packagingFee, staffAssignment, autosave, dirty]);

  function markDirty() { setDirty(true); }

  function toggleAutosave() {
    const next = !autosave;
    setAutosave(next);
    localStorage.setItem('pos_autosave', String(next));
  }

  /* Currency / timezone — always save immediately on selection */
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

  /* Dropdown item builders */
  const currencyItems = Object.values(currencies).map((c) => ({
    key:      c.code,
    selected: c.code === code,
    matches:  (q) => !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    render:   () => (
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="mono num shrink-0" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', width: 20, textAlign: 'center' }}>
          {c.symbol}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', flexShrink: 0 }}>{c.code}</span>
        <span className="truncate" style={{ fontSize: 11.5, color: 'var(--mute)' }}>{c.name}</span>
      </div>
    ),
  }));

  const tzItems = timezones.map((t) => ({
    key:      t.iana,
    selected: t.iana === iana,
    matches:  (q) => !q || t.label.toLowerCase().includes(q) || t.iana.toLowerCase().includes(q) || t.offset.toLowerCase().includes(q),
    render:   () => (
      <div className="flex items-center justify-between w-full min-w-0 gap-3">
        <div className="min-w-0">
          <p className="truncate" style={{ fontSize: 12, fontWeight: t.iana === iana ? 600 : 400, color: 'var(--ink)' }}>{t.label}</p>
          <p className="truncate" style={{ fontSize: 10.5, color: 'var(--mute)' }}>{t.iana}</p>
        </div>
        <span className="mono shrink-0" style={{ fontSize: 10.5, color: 'var(--mute)' }}>{t.offset}</span>
      </div>
    ),
  }));

  const selectedCurrency = currencies[code];
  const selectedTz       = timezones.find((t) => t.iana === iana);

  return (
    <div style={{ maxWidth: 560 }}>

      {saveError && (
        <div className="flex items-center gap-2 rounded-[6px] px-3 py-2 mb-5"
          style={{ fontSize: 12, color: 'var(--bad)', background: 'rgba(179,55,43,.06)', border: '1px solid rgba(179,55,43,.15)' }}>
          <AlertCircle size={13} style={{ flexShrink: 0 }} />
          {saveError}
        </div>
      )}

      {/* ── Currency ────────────────────────────────────────── */}
      <SectionHead icon={Globe} title="Display Currency" />
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <SearchSelect
          triggerContent={
            <span className="flex items-center gap-2" style={{ fontSize: 13 }}>
              <span className="mono num font-bold" style={{ color: 'var(--ink)' }}>{selectedCurrency?.symbol}</span>
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{code}</span>
              <span style={{ color: 'var(--mute)' }}>—</span>
              <span style={{ color: 'var(--mute)' }}>{selectedCurrency?.name}</span>
            </span>
          }
          items={currencyItems}
          onSelect={handleCurrencyChange}
          dropdownWidth={300}
          disabled={updateSetting.isPending}
        />
      </div>

      {/* Exchange rate strip */}
      <div className="flex items-center gap-2 mb-5" style={{ fontSize: 12 }}>
        {fxLoading ? (
          <span style={{ color: 'var(--mute)' }}>Fetching rate…</span>
        ) : fxError ? (
          <span style={{ color: 'var(--bad)' }}>Could not fetch exchange rate</span>
        ) : fxRate != null && code !== 'USD' ? (<>
          <span style={{ color: 'var(--mute)' }}>
            <span style={{ color: 'var(--ink)', fontWeight: 600 }}>1 USD</span>
            {' = '}
            <span className="mono num" style={{ color: 'var(--ink)', fontWeight: 600 }}>
              {fxRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {code}
            </span>
          </span>
          {fxDate && (
            <span style={{ color: 'var(--mute-2)', fontSize: 11 }}>as of {fxDate}</span>
          )}
          <button
            type="button"
            title="Refresh rate"
            onClick={() => { localStorage.removeItem(`pos_fx_${code}`); fetchRate(code); }}
            style={{ background: 'none', border: 0, padding: 2, cursor: 'pointer', color: 'var(--mute)', lineHeight: 1 }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--mute)'}
          >
            <RefreshCw size={11} />
          </button>
        </>) : null}
      </div>

      {/* ── Timezone ────────────────────────────────────────── */}
      <SectionHead icon={Clock} title="Timezone" />
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <SearchSelect
          triggerContent={
            <span className="flex items-center gap-2" style={{ fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{selectedTz?.label ?? iana}</span>
              <span className="mono" style={{ fontSize: 11.5, color: 'var(--mute)' }}>{selectedTz?.offset}</span>
            </span>
          }
          items={tzItems}
          onSelect={handleTimezoneChange}
          dropdownWidth={360}
          disabled={updateSetting.isPending}
        />
      </div>

      {/* ── Business Settings ───────────────────────────────── */}
      <SectionHead icon={Percent} title="Business Settings" />

      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--mute)', marginBottom: 4 }}>Tax Rate</label>
          <div className="flex items-center gap-1.5">
            <input type="number" min="0" max="100" step="0.01" value={taxRate}
              onChange={(e) => { setTaxRate(e.target.value); markDirty(); }}
              className="input mono" style={{ width: 80 }} placeholder="0" />
            <span style={{ fontSize: 12, color: 'var(--mute)' }}>%</span>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--mute)', marginBottom: 4 }}>Service Charge</label>
          <div className="flex items-center gap-1.5">
            <input type="number" min="0" max="100" step="0.01" value={serviceCharge}
              onChange={(e) => { setServiceCharge(e.target.value); markDirty(); }}
              className="input mono" style={{ width: 80 }} placeholder="0" />
            <span style={{ fontSize: 12, color: 'var(--mute)' }}>%</span>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--mute)', marginBottom: 4 }}>
            <span className="inline-flex items-center gap-1"><Package size={10} />Packaging Fee</span>
          </label>
          <div className="flex items-center gap-1.5">
            <input type="number" min="0" step="0.01" value={packagingFee}
              onChange={(e) => { setPackagingFee(e.target.value); markDirty(); }}
              className="input mono" style={{ width: 80 }} placeholder="0" />
            <span style={{ fontSize: 12, color: 'var(--mute)' }}>{currencies[code]?.symbol ?? '$'}</span>
          </div>
        </div>
      </div>

      {/* ── Staff Assignment ────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 18, marginBottom: 24 }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <UserCheck size={13} style={{ color: 'var(--mute)', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Staff Assignment</p>
              <p style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 2 }}>
                Customers can enter a 4-digit staff PIN when ordering. Manage PINs in Users.
              </p>
            </div>
          </div>
          <Toggle
            checked={staffAssignment}
            onChange={(v) => { setStaffAssignment(v); markDirty(); }}
          />
        </div>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────── */}
      <div
        className="flex items-center justify-between gap-4 flex-wrap"
        style={{
          borderTop: '1px solid var(--line)',
          paddingTop: 16,
        }}
      >
        {/* Autosave toggle */}
        <button
          type="button"
          onClick={toggleAutosave}
          className="flex items-center gap-2 rounded-[6px] px-3 py-1.5 transition-colors"
          style={{
            fontSize: 12, fontWeight: 500,
            border: '1px solid var(--line-2)',
            background: autosave ? 'var(--paper-2)' : 'transparent',
            color: autosave ? 'var(--ink)' : 'var(--mute)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { if (!autosave) { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--ink)'; } }}
          onMouseLeave={(e) => { if (!autosave) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mute)'; } }}
        >
          <Zap size={12} style={{ color: autosave ? 'var(--ok)' : 'var(--mute-2)' }} />
          Autosave
          <span style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: autosave ? 'var(--ok)' : 'var(--mute-2)',
          }} />
        </button>

        {/* Status + Save button */}
        <div className="flex items-center gap-3">
          {saveErr && (
            <span className="flex items-center gap-1" style={{ fontSize: 12, color: 'var(--bad)' }}>
              <AlertCircle size={12} /> {saveErr}
            </span>
          )}
          {saving && (
            <span style={{ fontSize: 12, color: 'var(--mute)' }}>Saving…</span>
          )}
          {saved && !saving && (
            <span className="flex items-center gap-1" style={{ fontSize: 12, color: 'var(--ok)' }}>
              <Check size={12} /> Saved
            </span>
          )}
          {autosave && dirty && !saving && !saved && (
            <span style={{ fontSize: 11.5, color: 'var(--mute-2)' }}>Pending…</span>
          )}
          {!autosave && (
            <button
              onClick={() => saveRef.current?.()}
              disabled={saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
