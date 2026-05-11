import { useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed, Wifi, BarChart2, Users,
  Grid3X3, ShieldCheck, Mail, CheckCircle2, ArrowRight,
} from 'lucide-react';

const DEMO_EMAIL  = 'krishensazawal@cooklyt.in';
const MAILTO_HREF = `mailto:${DEMO_EMAIL}?subject=${encodeURIComponent('Cooklyt POS – Demo Request')}&body=${encodeURIComponent('Hi,\n\nI\'m interested in a live demo of Cooklyt POS for my restaurant.\n\nName:\nRestaurant name:\nNumber of locations:\nBest time to reach me:\n\nThanks,')}`;

// ── POS Preview card ─────────────────────────────────────────────────────────
const TABLES = [
  { id: 'T1', label: '3/4',  state: 'occupied' },
  { id: 'T2', label: 'Open', state: 'open'     },
  { id: 'T3', label: '2/2',  state: 'full'     },
  { id: 'T4', label: 'Bill', state: 'bill'     },
  { id: 'T5', label: 'Open', state: 'open'     },
  { id: 'T6', label: '4/6',  state: 'occupied' },
];

const TABLE_STYLE = {
  open:     'bg-emerald-50 border-emerald-200 text-emerald-700',
  occupied: 'bg-amber-50   border-amber-200   text-amber-700',
  full:     'bg-red-50     border-red-200     text-red-600',
  bill:     'bg-violet-50  border-violet-200  text-violet-700',
};

function POSPreview() {
  return (
    // pb-8 pr-8 so the absolutely-positioned chip is never clipped
    <div className="relative mx-auto w-full max-w-sm pb-8 pr-8 select-none">
      <div className="rounded-2xl border border-white/10 bg-white shadow-2xl shadow-black/30 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div>
            <p className="text-xs font-semibold text-slate-700">Table Overview</p>
            <p className="mt-0.5 text-[10px] text-slate-400">Dinner service · 6 tables</p>
          </div>
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
        </div>

        {/* Table grid */}
        <div className="grid grid-cols-3 gap-3 p-5">
          {TABLES.map((t) => (
            <div key={t.id}
              className={`rounded-xl border p-3 text-center ${TABLE_STYLE[t.state]}`}
            >
              <p className="text-xs font-bold text-slate-700">{t.id}</p>
              <p className={`mt-0.5 text-[10px] font-semibold ${TABLE_STYLE[t.state].split(' ')[2]}`}>
                {t.label}
              </p>
            </div>
          ))}
        </div>

        {/* Live orders */}
        <div className="border-t border-slate-100 px-5 py-3.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Live orders
          </p>
          <div className="space-y-1.5">
            {[
              { table: 'T1', item: 'Butter Chicken × 2', time: 'Just now'  },
              { table: 'T6', item: 'Garlic Naan × 4',    time: '3 min ago' },
            ].map((o) => (
              <div key={o.item} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 rounded-md bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600">
                    {o.table}
                  </span>
                  <span className="truncate text-[11px] text-slate-600">{o.item}</span>
                </div>
                <span className="ml-2 shrink-0 text-[9px] text-slate-400">{o.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating chip — positioned inside the padded wrapper so it's never clipped */}
      <div className="absolute bottom-0 right-0 rounded-xl bg-indigo-600 px-4 py-2.5 shadow-xl shadow-indigo-900/40">
        <p className="text-[11px] font-semibold text-white">Kitchen notified</p>
        <p className="text-[10px] text-indigo-200">T3 · Paneer Tikka × 1</p>
      </div>
    </div>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────
const FEATURES = [
  { Icon: Grid3X3,         title: 'Table Management',    body: 'Visual floor plan with live seat counts. Open, transfer, and close tables in a tap.' },
  { Icon: UtensilsCrossed, title: 'Menu Builder',        body: 'Organise items by category, set prices, and mark dishes unavailable instantly.' },
  { Icon: Wifi,            title: 'Live Kitchen Sync',   body: "Orders reach the kitchen the moment they're placed — no tickets, no delays." },
  { Icon: BarChart2,       title: 'Reports & Analytics', body: 'End-of-day revenue, top sellers, and payment breakdowns in one clean view.' },
  { Icon: Users,           title: 'Multi-Role Access',   body: 'Separate logins for admins, floor staff, and kitchen crew with scoped permissions.' },
  { Icon: ShieldCheck,     title: 'Operator Console',    body: 'Super-admin panel to manage restaurants, users, settings, and full audit logs.' },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-slate-800 antialiased">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <span className="text-base font-bold tracking-tight text-white">Krilok</span>
            <span className="hidden h-4 w-px bg-white/20 sm:block" />
            <span className="hidden text-sm font-medium text-white/40 sm:block">Cooklyt POS</span>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => navigate('/login')}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white transition-colors sm:px-4 sm:py-2 sm:text-sm"
            >
              Sign in
            </button>
            <a
              href={MAILTO_HREF}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400 transition-colors sm:px-4 sm:py-2 sm:text-sm"
            >
              <Mail size={12} className="sm:hidden" />
              <Mail size={13} className="hidden sm:block" />
              <span className="hidden xs:inline">Request Demo</span>
              <span className="xs:hidden">Demo</span>
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-slate-950 pb-20 pt-14 sm:pb-24 sm:pt-20">
        {/* Subtle grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Radial glow */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">

            {/* Left — copy */}
            <div className="flex-1 text-center lg:text-left">
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
                A product by Krilok
              </span>
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
                The POS your restaurant{' '}
                <span className="text-indigo-400">actually deserves.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-slate-400 lg:mx-0 lg:max-w-sm">
                Cooklyt brings your tables, menu, kitchen, and reports into one fast,
                real-time system — built for restaurants that can't afford downtime.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <a
                  href={MAILTO_HREF}
                  className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/50 hover:bg-indigo-400 transition-colors"
                >
                  <Mail size={15} /> Request a Demo
                </a>
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-6 py-3.5 text-sm font-medium text-white/60 hover:border-white/20 hover:text-white/80 transition-colors"
                >
                  Have access? Sign in <ArrowRight size={14} />
                </button>
              </div>

              {/* Trust pills */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 lg:justify-start">
                {['No credit card', 'Full access demo', 'Ready in 24 hrs'].map((t) => (
                  <span key={t} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <CheckCircle2 size={12} className="shrink-0 text-indigo-500" /> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — product preview */}
            <div className="w-full max-w-sm flex-shrink-0 lg:max-w-[380px]">
              <POSPreview />
            </div>

          </div>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50 py-8 sm:py-10">
        <div className="mx-auto grid max-w-4xl grid-cols-3 divide-x divide-slate-200 px-4 text-center sm:px-6">
          {[
            { value: '< 3s',   label: 'Order to kitchen' },
            { value: '100%',   label: 'Real-time sync'   },
            { value: '24 hrs', label: 'Demo ready'       },
          ].map(({ value, label }) => (
            <div key={label} className="px-3 py-2 sm:px-6">
              <p className="text-xl font-bold text-slate-900 sm:text-2xl">{value}</p>
              <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How to get access ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 text-center sm:mb-12">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">How to get access</h2>
          <p className="mt-2 text-sm text-slate-400">
            Cooklyt is invite-only — every demo is a real, working environment.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          {[
            {
              step: '1',
              title: 'Send an email',
              body: `Write to us with your restaurant name and a few details — we'll take it from there.`,
              cta: (
                <a href={MAILTO_HREF} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                  Open email <ArrowRight size={11} />
                </a>
              ),
            },
            {
              step: '2',
              title: 'We prepare your demo',
              body: 'Our team provisions a live instance seeded with a real menu, tables, and order history.',
              cta: null,
            },
            {
              step: '3',
              title: 'Log in and explore',
              body: 'Place orders, view kitchen updates, pull reports — exactly as it works in production.',
              cta: null,
            },
          ].map(({ step, title, body, cta }, i) => (
            <div key={step} className="relative flex gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-col sm:gap-0">
              {/* Connector arrow between steps on mobile */}
              {i < 2 && (
                <div className="absolute -bottom-3 left-8 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white sm:hidden">
                  <ArrowRight size={10} className="rotate-90 text-slate-400" />
                </div>
              )}
              <div className="mb-0 shrink-0 sm:mb-4">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {step}
                </div>
              </div>
              <div>
                <h3 className="mb-1.5 text-sm font-semibold text-slate-800">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{body}</p>
                {cta}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 text-center sm:mb-12">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Everything included</h2>
            <p className="mt-2 text-sm text-slate-400">Every demo is the full product — no feature limits.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ Icon, title, body }) => (
              <div
                key={title}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md sm:p-6"
              >
                <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 transition-colors group-hover:bg-indigo-100">
                  <Icon size={17} className="text-indigo-600" />
                </div>
                <h3 className="mb-1.5 text-sm font-semibold text-slate-800">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-slate-950 py-16 sm:py-20">
        <div className="pointer-events-none absolute -bottom-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="relative mx-auto max-w-xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            See Cooklyt live in your browser.
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-slate-400 sm:text-base">
            No sales call. No slideshow. Just a working demo of your restaurant running on Cooklyt.
          </p>
          <a
            href={MAILTO_HREF}
            className="mt-8 inline-flex items-center gap-2.5 rounded-xl bg-indigo-500 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-indigo-900/40 hover:bg-indigo-400 transition-colors sm:px-8 sm:py-4 sm:text-base"
          >
            <Mail size={16} />
            <span className="break-all">{DEMO_EMAIL}</span>
          </a>
          <p className="mt-4 text-xs text-slate-600">We'll reply within a few hours.</p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 sm:py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-slate-600 sm:flex-row sm:px-6">
          <span className="font-medium text-slate-400">
            Cooklyt <span className="text-slate-600">by</span> Krilok
          </span>
          <span>© {new Date().getFullYear()} Krilok. All rights reserved.</span>
          <button
            onClick={() => navigate('/login')}
            className="text-slate-600 hover:text-slate-400 transition-colors"
          >
            Client sign in →
          </button>
        </div>
      </footer>

    </div>
  );
}
