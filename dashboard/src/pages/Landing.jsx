import { useNavigate } from "react-router-dom";
import {
  Grid3X3,
  UtensilsCrossed,
  Wifi,
  BarChart2,
  BarChart3,
  Gift,
  Package,
  Mail,
  Check,
  X,
  ArrowRight,
  LayoutDashboard,
  ReceiptText,
  LayoutGrid,
  AlignLeft,
  ShoppingCart,
  Truck,
  Trash2,
  ClipboardList,
  Cloud,
  Sparkles,
  FileText,
} from "lucide-react";

const DEMO_EMAIL = "krishensazawal@cooklyt.in";
const MAILTO_HREF = `mailto:${DEMO_EMAIL}?subject=${encodeURIComponent("CookLyt POS – Demo Request")}&body=${encodeURIComponent("Hi,\n\nI'm interested in a live demo of CookLyt POS for my restaurant.\n\nName:\nRestaurant name:\nNumber of locations:\nBest time to reach me:\n\nThanks,")}`;

const FEATURES = [
  { Icon: Grid3X3,       title: "Tables & floor",       body: "Your floor, always in sync. No confusion about what's open, what's occupied, or what's been ordered." },
  { Icon: UtensilsCrossed, title: "Menu & kitchen",     body: "Make a change — it's live everywhere before you look up." },
  { Icon: Wifi,          title: "Real-time sync",        body: "Orders don't wait for a connection. When signal drops, CookLyt queues and catches up silently." },
  { Icon: Gift,          title: "Loyalty & coupons",     body: "Give regulars a reason to return. Give first-timers a reason to come back." },
  { Icon: BarChart2,     title: "Reports & shifts",      body: "Close the day knowing exactly where every rupee went." },
  { Icon: Package,       title: "Inventory & costing",   body: "Know your margins before service, not after." },
];

const WASTE_FEATURES = [
  {
    Icon: Trash2,
    title: "Waste tracking that speaks in rupees",
    body: "Log every waste event by ingredient, shift, and reason — which dish, which prep stage, which shift, and exactly how much it cost you.",
    soon: false,
  },
  {
    Icon: ClipboardList,
    title: "Stop ordering by habit",
    body: "See real-time stock levels before you place a single order. CookLyt surfaces what you already have so you stop over-purchasing the same items week after week.",
    soon: false,
  },
  {
    Icon: BarChart3,
    title: "Recipe-linked cost impact",
    body: "Every ingredient is tied to your recipes and purchase prices. The waste dashboard shows kilograms and rupees together — so the cost of every discard is impossible to ignore.",
    soon: false,
  },
  {
    Icon: Cloud,
    title: "Waste root-cause analysis",
    body: "Rain on Thursday? Your pasta waste spikes 180%. CookLyt correlates waste with weather, day of week, and shift to surface the patterns costing you money — and what to prep less of.",
    soon: true,
  },
  {
    Icon: Sparkles,
    title: "AI-powered demand forecasting",
    body: "Predict tomorrow's covers, auto-calculate ingredient needs from your recipe BOMs, and generate a smart reorder list — before you over-buy. Works from just 7 days of data.",
    soon: true,
  },
  {
    Icon: FileText,
    title: "Invoice scanner + live margin alerts",
    body: "Photograph a supplier invoice. CookLyt extracts every line item and instantly recalculates food-cost % across affected recipes — alerting you the moment a dish crosses your margin threshold.",
    soon: true,
  },
];

const STATS = [
  { num: "11.9M", unit: "t",       desc: "Food wasted annually by India's food-service sector — restaurants, hotels, caterers, canteens.",                                  src: "UNEP Food Waste Index Report, 2021", accent: false },
  { num: "₹1.52", unit: "L cr",    desc: "India's total annual economic loss from food waste — 3.7% of the agriculture sector's gross value added.",                       src: "NABCONS / Ministry of Food Processing Industries, 2022", accent: false },
  { num: "1 in 3", unit: "",       desc: "Food items in India are wasted or spoilt before being eaten — a direct result of overstocking and poor inventory turnover.",     src: "FSSAI, Govt. of India", accent: false },
  { num: "6–15",  unit: "%",       desc: "Of fruits & vegetables stocked by food businesses spoil due to short shelf life, overstocking, and poor rotation.",             src: "NABCONS Post-Harvest Loss Study, 2022 (ICAR-CIPHET baseline)", accent: false },
  { num: "28",    unit: "%",       desc: "Of all global food waste originates from the food-service sector — restaurants, cafés, canteens. More than retail.",             src: "UNEP Food Waste Index Report, 2024", accent: false },
  { num: "₹5.69", unit: "L cr",    desc: "India's food-services industry size in FY24 — growing at 8.1% CAGR. The waste problem is scaling with it.",                     src: "NRAI India Food Services Report, 2024", accent: true },
];

const CMP_ROWS = [
  { cap: "Waste logging by ingredient & shift",  generic: "Not available",      cooklyt: "Full breakdown",        soon: false },
  { cap: "Waste cost in rupees (not just kg)",   generic: "Not available",      cooklyt: "Recipe-linked",         soon: false },
  { cap: "Inventory check before ordering",      generic: "Manual only",        cooklyt: "Real-time stock view",  soon: false },
  { cap: "Weather-correlated waste analysis",    generic: "Not available",      cooklyt: "AI-driven",             soon: true  },
  { cap: "AI demand forecasting",               generic: "Not available",      cooklyt: "Zero-shot",             soon: true  },
  { cap: "Live margin alerts on price change",   generic: "Not available",      cooklyt: "Invoice-triggered",     soon: true  },
  { cap: "Billing, floor & kitchen management",  generic: "Standard",           cooklyt: "Full POS suite",        soon: false, genericHas: true },
];

const STATUS_DOT  = { preparing: "var(--warn)", ready: "var(--info)", received: "var(--mute-2)", served: "var(--ok)" };
const ELAPSED_STY = { warn: { color: "var(--warn)", fontWeight: 600 }, bad: { color: "var(--bad)", fontWeight: 600 }, mute: { color: "var(--mute)" } };
const ROWS = [
  { key: "T03",  label: "T03",  status: "preparing", elapsed: "4m",       elStyle: "mute", amount: "₹1,040" },
  { key: "T06",  label: "T06",  status: "ready",     elapsed: "12m",      elStyle: "warn", amount: "₹2,260" },
  { key: "#042", label: null,   status: "received",  elapsed: "just now", elStyle: "mute", amount: "₹590",  icon: "cart",     sub: "Maya K. · #042" },
  { key: "T14",  label: "T14",  status: "served",    elapsed: "22m",      elStyle: "bad",  amount: "₹710" },
  { key: "dlv",  label: null,   status: "preparing", elapsed: "8m",       elStyle: "mute", amount: "₹490",  icon: "delivery", sub: "#DLV-7741", last: true },
];

function DevicePreview() {
  const COL = "11px repeat(5, 1fr) 11px";
  const rowBase = { display: "grid", gridTemplateColumns: COL, gap: 6, padding: "7px 0", borderBottom: "1px solid var(--line)", fontSize: 12, alignItems: "center" };
  return (
    <div style={{ position: "relative" }}>
      <div style={{ border: "1px solid var(--line-2)", background: "var(--paper)", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 0 rgba(255,255,255,.6) inset, 0 24px 64px -28px rgba(10,10,10,.18)" }}>
        <div style={{ height: 36, borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8, padding: "0 14px" }}>
          <div style={{ display: "flex", gap: 5 }}>
            {[0,1,2].map(i => <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--line-2)", display: "inline-block" }} />)}
          </div>
          <span style={{ fontFamily: '"Geist Mono", monospace', fontSize: 11, color: "var(--mute)", marginLeft: 8 }}>cooklyt.in · Orders</span>
          <span style={{ marginLeft: "auto", fontFamily: '"Geist Mono", monospace', fontSize: 10, color: "var(--mute)", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ok)", display: "inline-block" }} />
            Live · 3 in kitchen
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "44px 1fr", minHeight: 380 }}>
          <div style={{ borderRight: "1px solid var(--line)", padding: "10px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
            {[{ Icon: LayoutDashboard, active: false }, { Icon: ReceiptText, active: true }, { Icon: LayoutGrid, active: false }, { Icon: AlignLeft, active: false }, { Icon: BarChart2, active: false }].map(({ Icon, active }, i) => (
              <span key={i} style={{ width: 32, height: 32, borderRadius: 6, display: "grid", placeItems: "center", background: active ? "var(--paper-2)" : "transparent", color: active ? "var(--ink)" : "var(--mute)" }}><Icon size={14} /></span>
            ))}
          </div>
          <div style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-.01em" }}>Orders</h3>
              <span style={{ fontSize: 11, color: "var(--mute)" }}>3 in kitchen · 7 total today</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: COL, gap: 6, paddingBottom: 6, borderBottom: "1px solid var(--line)", marginBottom: 6, fontFamily: '"Geist Mono", monospace', fontSize: 10, color: "var(--mute)", textTransform: "uppercase", letterSpacing: ".08em" }}>
              <span /><span>Order</span><span>Status</span><span>Elapsed</span><span style={{ textAlign: "right" }}>Total</span><span />
            </div>
            {ROWS.map(row => (
              <div key={row.key} style={{ ...rowBase, borderBottom: row.last ? 0 : "1px solid var(--line)" }}>
                <span />
                <span style={{ fontFamily: '"Geist Mono", monospace', fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  {row.icon === "cart"     && <ShoppingCart size={12} style={{ color: "var(--mute)" }} />}
                  {row.icon === "delivery" && <Truck        size={12} style={{ color: "var(--mute)" }} />}
                  {row.sub ? <span style={{ fontSize: 11.5, fontWeight: 400, fontFamily: "inherit" }}>{row.sub}</span> : row.label}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ink-2)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_DOT[row.status], flexShrink: 0 }} />
                  {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                </span>
                <span style={{ fontFamily: '"Geist Mono", monospace', fontSize: 11, ...ELAPSED_STY[row.elStyle] }}>{row.elapsed}</span>
                <span style={{ fontFamily: '"Geist Mono", monospace', fontSize: 12, textAlign: "right" }}>{row.amount}</span>
                <span />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", right: -16, bottom: -16, padding: "12px 14px", background: "var(--ink)", color: "var(--accent-on)", borderRadius: 8, boxShadow: "0 14px 30px -10px rgba(10,10,10,.4)", minWidth: 180 }}>
        <div style={{ fontFamily: '"Geist Mono", monospace', fontSize: 10, letterSpacing: ".12em", opacity: 0.55, textTransform: "uppercase" }}>Kitchen notified</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Paneer Tikka × 1</div>
        <div style={{ fontFamily: '"Geist Mono", monospace', fontSize: 10.5, color: "rgba(250,250,248,.5)", marginTop: 4 }}>T03 · 2s ago</div>
      </div>
    </div>
  );
}

const LOGO_SVG = (w, h) => (
  <svg width={w} height={h} viewBox="0 0 200 200" fill="none" aria-hidden="true">
    <path d="M 154.194 25.409 A 92.2 92.2 0 1 0 154.194 174.591" fill="none" stroke="#0d0c0b" strokeWidth="15.6" strokeLinecap="round" />
    <circle cx="100" cy="100" r="10.8" fill="#b06a3b" />
  </svg>
);
const WORDMARK_SVG = (w, h) => (
  <svg width={w} height={h} viewBox="0 0 360 64" role="img" aria-label="CookLyt">
    <title>CookLyt</title>
    <text x="0" y="49" fill="#0d0c0b" style={{ fontFamily: "'Marcellus', serif", fontSize: 56, letterSpacing: "10.08px" }}>COOKLY</text>
    <circle cx="294.2" cy="29.43" r="5.03" fill="#b06a3b" />
    <text x="309.33" y="49" fill="#0d0c0b" style={{ fontFamily: "'Marcellus', serif", fontSize: 56, letterSpacing: "10.08px" }}>T</text>
  </svg>
);

const SEC = { fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--mute)", fontFamily: '"Geist Mono", monospace' };
const SEC_H2 = { fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-.025em", lineHeight: 1.05, margin: "8px 0 12px", fontWeight: 600 };
const SEC_P  = { color: "var(--mute)", margin: 0, fontSize: 15, lineHeight: 1.55, maxWidth: 520 };

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem("pos_user") || "null"); } catch { return null; }
}

export default function Landing() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const nlBase = {
    height: 32, padding: "0 12px", borderRadius: 6, fontSize: 13, color: "var(--mute)",
    display: "inline-flex", alignItems: "center", transition: "background .08s, color .08s",
    textDecoration: "none", border: 0, cursor: "pointer", background: "transparent",
    fontFamily: "inherit", whiteSpace: "nowrap",
  };
  const nlHover = (e) => { e.currentTarget.style.background = "var(--hover)"; e.currentTarget.style.color = "var(--ink)"; };
  const nlLeave = (e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--mute)"; };

  return (
    <div style={{ background: "var(--paper)", color: "var(--ink)", minHeight: "100vh" }}>

      {/* ── Nav ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(250,250,248,.78)", backdropFilter: "blur(14px) saturate(140%)", WebkitBackdropFilter: "blur(14px) saturate(140%)", borderBottom: "1px solid var(--line)" }}>
        <div className="nav-inner" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px", height: 56, display: "flex", alignItems: "center", gap: 18 }}>
          <a href="#top" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--ink)", flexShrink: 0 }}>
            {LOGO_SVG(20, 20)}
            {WORDMARK_SVG(100, 18)}
            <span style={{ display: "inline-block", width: 1, height: 13, background: "var(--line-2)", margin: "0 2px" }} />
            <span style={{ color: "var(--mute)", fontWeight: 400, fontSize: 12 }}>by Krilok</span>
          </a>
          <nav style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            {[{ href: "#problem", label: "The problem" }, { href: "#waste", label: "Waste intelligence" }, { href: "#features", label: "Features" }, { href: "#how", label: "Access" }].map(({ href, label }) => (
              <a key={href} href={href} className="nav-text-link" style={nlBase} onMouseEnter={nlHover} onMouseLeave={nlLeave}>{label}</a>
            ))}
            <button onClick={() => navigate(user ? "/overview" : "/login")} className="nav-text-link" style={nlBase} onMouseEnter={nlHover} onMouseLeave={nlLeave}>{user ? "Dashboard" : "Sign in"}</button>
            <a href="#cta" style={{ ...nlBase, background: "var(--ink)", color: "var(--accent-on)", padding: "0 14px", height: 34, gap: 6 }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--ink-2)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--ink)"; }}>
              <Mail size={13} /><span className="nav-demo-label">Request a demo</span>
            </a>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section id="top" className="hero-section">
        <div className="lp-container" style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 64, alignItems: "center" }} className="hero-grid">
            <div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 26, padding: "0 12px", border: "1px solid var(--line-2)", borderRadius: 999, fontSize: 11.5, color: "var(--ink-2)" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ink)", display: "inline-block" }} />
                <span className="mono" style={{ letterSpacing: ".06em" }}>CookLyt · 01</span>
                <span>A product by Krilok</span>
              </span>
              <h1 style={{ fontSize: "clamp(40px, 7.5vw, 88px)", lineHeight: 0.98, letterSpacing: "-.035em", fontWeight: 600, margin: "16px 0 24px" }}>
                The POS your<br />restaurant{" "}
                <em style={{ fontStyle: "italic", fontWeight: 500, color: "var(--ink-2)", backgroundImage: "linear-gradient(transparent 78%, rgba(10,10,10,.16) 78%, rgba(10,10,10,.16) 88%, transparent 88%)" }}>actually</em>
                <br />deserves.
              </h1>
              <p style={{ fontSize: 17, lineHeight: 1.55, color: "var(--ink-2)", maxWidth: 480, margin: "0 0 28px" }}>
                One quiet system that runs every part of service — and watches every rupee of waste — so your team can focus on the food.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <a href={MAILTO_HREF} style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 42, padding: "0 18px", borderRadius: 6, fontSize: 13.5, fontWeight: 500, background: "var(--ink)", color: "var(--accent-on)", textDecoration: "none", transition: "background .08s", whiteSpace: "nowrap" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--ink-2)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--ink)"; }}>
                  <Mail size={14} />Request a demo
                </a>
                <a href="#problem" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 42, padding: "0 18px", borderRadius: 6, fontSize: 13.5, fontWeight: 500, border: "1px solid var(--line-2)", color: "var(--ink)", background: "transparent", textDecoration: "none", transition: "background .08s", whiteSpace: "nowrap" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--hover)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                  See the waste it catches<ArrowRight size={14} />
                </a>
              </div>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 28 }}>
                {["No credit card", "Full-access demo", "Ready in 24 hrs"].map(t => (
                  <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--mute)", fontSize: 12.5 }}>
                    <Check size={13} style={{ opacity: 0.7 }} />{t}
                  </span>
                ))}
              </div>
            </div>
            <div className="hero-preview" style={{ paddingBottom: 32, paddingRight: 32 }}>
              <DevicePreview />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }} className="stats-grid">
          {[{ value: "< 3s", label: "Order to kitchen" }, { value: "100%", label: "Real-time sync, offline-tolerant" }, { value: "24 h", label: "From email to working demo" }].map(({ value, label }, i) => (
            <div key={label} style={{ padding: "36px 28px", borderRight: i < 2 ? "1px solid var(--line)" : 0 }}>
              <div className="mono" style={{ fontSize: 38, fontWeight: 500, letterSpacing: "-.02em", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: "var(--mute)", textTransform: "uppercase", letterSpacing: ".08em", marginTop: 10 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── The Problem ── */}
      <section id="problem" style={{ padding: "80px 0", borderTop: "1px solid var(--line)" }}>
        <div className="lp-container" style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 56, alignItems: "start" }} className="problem-grid">
            <div>
              <span style={SEC}>02 — The problem</span>
              <h2 style={{ fontSize: "clamp(26px, 3.4vw, 40px)", letterSpacing: "-.025em", lineHeight: 1.08, fontWeight: 600, margin: "10px 0 18px" }}>
                Your kitchen is bleeding ₹3–6 lakh a year. You just can't see it yet.
              </h2>
              <p style={{ color: "var(--ink-2)", fontSize: 15.5, lineHeight: 1.7, marginBottom: 16, maxWidth: 520 }}>
                Most Indian kitchens reorder the same quantities every morning — same call, same numbers — without checking what's already lying unused in the fridge. Vegetables spoil. Half-used packets get forgotten. Items expire quietly.
              </p>
              <p style={{ color: "var(--ink-2)", fontSize: 15.5, lineHeight: 1.7, marginBottom: 4, maxWidth: 520 }}>
                Cafés running at <strong style={{ color: "var(--ink)" }}>40–45% food cost</strong> quietly discard <strong style={{ color: "var(--ink)" }}>6–12% of every purchase</strong>. On ₹50 lakh annual revenue, that's up to <strong style={{ color: "var(--ink)" }}>₹6 lakh in the bin</strong> — plate by plate, shelf by shelf.
              </p>
              <span style={{ display: "block", fontFamily: '"Geist Mono", monospace', fontSize: 11, color: "var(--mute-2)", marginTop: 4, lineHeight: 1.5 }}>Source: India food cost benchmarking, Feedo.in (2024)</span>
              <p style={{ color: "var(--ink-2)", fontSize: 15.5, lineHeight: 1.7, marginTop: 18, maxWidth: 520 }}>
                The problem isn't that owners don't care. It's that they've never had a system that makes waste <strong style={{ color: "var(--ink)" }}>visible</strong> — in real time, in rupees, per shift.
              </p>
            </div>
            <div style={{ border: "1px solid var(--line-2)", borderRadius: 12, background: "var(--paper)", overflow: "hidden" }}>
              <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--line)", fontFamily: '"Geist Mono", monospace', fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--mute)" }}>
                What over-ordering costs you
              </div>
              {[
                { label: "Fruits & vegetables spoiled",     val: "6–15%",     style: { color: "var(--bad)", fontWeight: 600 } },
                { label: "Perishables lost in transit",     val: "~30%",      style: { color: "var(--warn)", fontWeight: 600 } },
                { label: "FSSAI: food spoilt before eaten", val: "1 in 3",    style: { color: "var(--bad)", fontWeight: 600 } },
                { label: "Restaurants' purchase waste rate",val: "6–12%",     style: { color: "var(--warn)", fontWeight: 600 } },
                { label: "With CookLyt's waste controls",   val: "↓ Sharply", style: { color: "var(--ok)",  fontWeight: 600 } },
              ].map(({ label, val, style }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "15px 22px", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ fontSize: 14, color: "var(--ink-2)" }}>{label}</span>
                  <span className="mono" style={{ fontSize: 16, whiteSpace: "nowrap", ...style }}>{val}</span>
                </div>
              ))}
              <div style={{ padding: "16px 22px" }}>
                <span style={{ display: "block", fontFamily: '"Geist Mono", monospace', fontSize: 11, color: "var(--mute-2)", lineHeight: 1.5 }}>
                  Sources: NABCONS / MoFPI Post-Harvest Loss Study 2022; Solwearth 2024; FSSAI, Govt. of India; Feedo.in 2024.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The Numbers ── */}
      <section id="numbers" style={{ borderTop: "1px solid var(--line)", background: "var(--paper-2)", padding: "80px 0" }}>
        <div className="lp-container" style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ marginBottom: 48, maxWidth: 680 }}>
            <span style={SEC}>03 — The numbers</span>
            <h2 style={SEC_H2}>India's food-waste crisis starts in the back of a restaurant.</h2>
            <p style={SEC_P}>Every figure below is from a government body, UN agency, or peer-reviewed source.</p>
          </div>
        </div>
        <div style={{ maxWidth: 1180, margin: "0 auto", borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }} className="stat-cells">
            {STATS.map(({ num, unit, desc, src, accent }, i) => (
              <div key={i} style={{ padding: "30px 28px", borderRight: (i + 1) % 3 !== 0 ? "1px solid var(--line)" : 0, borderBottom: "1px solid var(--line)", display: "flex", flexDirection: "column" }}>
                <div className="mono" style={{ fontSize: 40, fontWeight: 500, letterSpacing: "-.02em", lineHeight: 1, color: accent ? "var(--copper)" : "var(--ink)" }}>
                  {num}{unit && <span style={{ fontSize: 16, letterSpacing: 0, color: "var(--mute)", marginLeft: 4 }}>{unit}</span>}
                </div>
                <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55, marginTop: 14, flex: 1 }}>{desc}</div>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--mute-2)", borderTop: "1px solid var(--line)", paddingTop: 12, marginTop: 16, lineHeight: 1.5 }}>{src}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quote ── */}
      <div style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "72px 0", background: "var(--paper)" }}>
        <div className="lp-container" style={{ maxWidth: 860, margin: "0 auto" }}>
          <blockquote style={{ fontSize: "clamp(24px, 3.6vw, 40px)", lineHeight: 1.25, letterSpacing: "-.02em", fontWeight: 600, color: "var(--ink)" }}>
            Most POS systems tell you what you sold.{" "}
            <span style={{ color: "var(--mute-2)" }}>CookLyt tells you</span>{" "}
            <em style={{ fontStyle: "italic", fontWeight: 500 }}>what you shouldn't have bought.</em>
          </blockquote>
          <div className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--mute)", marginTop: 24 }}>The CookLyt difference</div>
        </div>
      </div>

      {/* ── Waste Intelligence ── */}
      <section id="waste" style={{ borderTop: "1px solid var(--line)", padding: "80px 0" }}>
        <div className="lp-container" style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ marginBottom: 48, maxWidth: 680 }}>
            <span style={SEC}>04 — Waste intelligence</span>
            <h2 style={SEC_H2}>Every tool built around one goal:<br />less waste, more margin.</h2>
            <p style={SEC_P}>Most systems treat waste as a month-end report. CookLyt treats it as a live number you can act on mid-shift.</p>
          </div>
        </div>
        <div style={{ maxWidth: 1180, margin: "0 auto", borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }} className="features-grid">
            {WASTE_FEATURES.map(({ Icon, title, body, soon }, i) => (
              <div key={title} style={{ padding: "28px 28px 32px", borderRight: (i + 1) % 3 !== 0 ? "1px solid var(--line)" : 0, borderBottom: "1px solid var(--line)", minHeight: 180 }}>
                <span style={{ display: "inline-grid", placeItems: "center", width: 28, height: 28, color: "var(--ink)", marginBottom: 14 }}><Icon size={22} strokeWidth={1.4} /></span>
                <h4 style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.005em", margin: "0 0 6px" }}>{title}</h4>
                <p style={{ color: "var(--mute)", margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>{body}</p>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 16, fontFamily: '"Geist Mono", monospace', fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", padding: "4px 9px", borderRadius: 999, border: "1px solid var(--line-2)", color: soon ? "var(--mute)" : "var(--ink-2)" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: soon ? "var(--warn)" : "var(--ok)" }} />
                  {soon ? "Coming soon" : "Live now"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product Features ── */}
      <section id="features" style={{ borderTop: "1px solid var(--line)", background: "var(--paper-2)", padding: "80px 0" }}>
        <div className="lp-container" style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ marginBottom: 48, maxWidth: 680 }}>
            <span style={SEC}>05 — The product</span>
            <h2 style={SEC_H2}>Everything included.<br />Nothing extra.</h2>
            <p style={SEC_P}>Every demo is the full product. No feature limits, no upgrade prompts, no per-station pricing surprise.</p>
          </div>
        </div>
        <div style={{ maxWidth: 1180, margin: "0 auto", borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }} className="features-grid">
            {FEATURES.map(({ Icon, title, body }, i) => (
              <div key={title} style={{ padding: "28px 28px 32px", borderRight: (i + 1) % 3 !== 0 ? "1px solid var(--line)" : 0, borderBottom: "1px solid var(--line)", minHeight: 180 }}>
                <span style={{ display: "inline-grid", placeItems: "center", width: 28, height: 28, color: "var(--ink)", marginBottom: 14 }}><Icon size={22} strokeWidth={1.4} /></span>
                <h4 style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.005em", margin: "0 0 6px" }}>{title}</h4>
                <p style={{ color: "var(--mute)", margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section id="compare" style={{ borderTop: "1px solid var(--line)", padding: "80px 0" }}>
        <div className="lp-container" style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ marginBottom: 48, maxWidth: 680 }}>
            <span style={SEC}>06 — How we compare</span>
            <h2 style={SEC_H2}>Waste control isn't an add-on here.<br />It's the entire point.</h2>
          </div>
          <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }} className="cmp-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
              <thead>
                <tr>
                  {["Capability", "Generic POS", "CookLyt"].map((h, i) => (
                    <th key={h} style={{ textAlign: "left", padding: "16px 22px", fontFamily: '"Geist Mono", monospace', fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: i === 2 ? "var(--copper)" : "var(--mute)", background: "var(--paper-2)", borderBottom: "1px solid var(--line)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CMP_ROWS.map(({ cap, generic, cooklyt, soon, genericHas }) => (
                  <tr key={cap}>
                    <td style={{ padding: "15px 22px", fontSize: 14, borderBottom: "1px solid var(--line)", color: "var(--ink)", fontWeight: 500, verticalAlign: "middle" }}>{cap}</td>
                    <td style={{ padding: "15px 22px", fontSize: 14, borderBottom: "1px solid var(--line)", color: genericHas ? "var(--ink)" : "var(--mute-2)", verticalAlign: "middle" }}>
                      {genericHas
                        ? <><span style={{ display: "inline-flex", verticalAlign: "-2px", marginRight: 8, color: "var(--mute-2)" }}><Check size={14} /></span>{generic}</>
                        : <><span style={{ display: "inline-flex", verticalAlign: "-2px", marginRight: 8, color: "var(--mute-2)" }}><X size={14} /></span>{generic}</>
                      }
                    </td>
                    <td style={{ padding: "15px 22px", fontSize: 14, borderBottom: "1px solid var(--line)", color: "var(--ink)", background: "rgba(176,106,59,0.06)", verticalAlign: "middle" }}>
                      <span style={{ display: "inline-flex", verticalAlign: "-2px", marginRight: 8, color: "var(--copper)" }}><Check size={14} /></span>
                      {cooklyt}
                      {soon && <span className="mono" style={{ fontSize: 10, color: "var(--mute)", marginLeft: 6 }}>soon</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      </section>

      {/* ── Mission ── */}
      <section id="mission" style={{ borderTop: "1px solid var(--line)", background: "var(--paper-2)", padding: "80px 0" }}>
        <div className="lp-container" style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ maxWidth: 760 }}>
            <span style={SEC}>07 — Why we built CookLyt</span>
            <h2 style={{ ...SEC_H2, fontSize: "clamp(28px, 4vw, 46px)" }}>
              India wastes food that could feed 377 million people.<br />Most of it starts in a restaurant fridge.
            </h2>
            <p style={{ fontSize: 16, color: "var(--ink-2)", lineHeight: 1.75, marginBottom: 18 }}>
              India's food-service sector generates <strong style={{ color: "var(--ink)" }}>11.9 million tonnes of food waste every year</strong>. And most of it doesn't happen at the dinner table — it happens in the back of a restaurant, on an overloaded shelf, in a fridge nobody checked before placing the morning order.
            </p>
            <span style={{ display: "block", fontFamily: '"Geist Mono", monospace', fontSize: 11, color: "var(--mute-2)", marginBottom: 24, lineHeight: 1.5 }}>Source: UNEP Food Waste Index Report 2021 — unep.org</span>
            <div style={{ margin: "0 0 24px", padding: "22px 26px", background: "var(--paper)", border: "1px solid var(--line)", borderLeft: "3px solid var(--copper)", borderRadius: "0 10px 10px 0" }}>
              <p style={{ fontSize: 15, color: "var(--ink-2)", margin: 0, lineHeight: 1.7 }}>
                While urban restaurants discard excess inventory from overstocking, <strong style={{ color: "var(--ink)" }}>over 20 crore Indians go hungry daily</strong>. India wastes enough food annually — valued at <strong style={{ color: "var(--ink)" }}>₹1.52 lakh crore</strong> — to represent 3.7% of the entire agriculture sector's output.
              </p>
              <span style={{ display: "block", fontFamily: '"Geist Mono", monospace', fontSize: 11, color: "var(--mute-2)", marginTop: 10, lineHeight: 1.5 }}>Sources: NABCONS / MoFPI 2022 (economic loss); UNEP 2024 (hunger figure)</span>
            </div>
            <p style={{ fontSize: 16, color: "var(--ink-2)", lineHeight: 1.75 }}>
              We built CookLyt because the problem isn't that restaurant owners don't care. It's that they've never had a system that makes waste <strong style={{ color: "var(--ink)" }}>visible, measurable, and preventable</strong> — in real time, in rupees, per shift. That's exactly what we built.
            </p>
          </div>
        </div>
      </section>

      {/* ── Onboarding ── */}
      <section id="how" className="lp-section" style={{ borderTop: "1px solid var(--line)" }}>
        <div className="lp-container" style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ marginBottom: 48, maxWidth: 680 }}>
            <span style={SEC}>08 — Onboarding</span>
            <h2 style={SEC_H2}>How to get access.</h2>
            <p style={SEC_P}>CookLyt is invite-only. Every demo is a real working environment, seeded with a real menu and a real day's worth of orders. No slideshow.</p>
          </div>
        </div>
        <div style={{ maxWidth: 1180, margin: "0 auto", borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }} className="process-grid">
            {[
              { n: "01", title: "Send an email",          body: "Tell us your restaurant name and a couple of details. We'll take it from there.", cta: true },
              { n: "02", title: "We provision your demo", body: "Our team spins up a live instance — your menu, your tables, a believable order history.", cta: false },
              { n: "03", title: "Log in & explore",       body: "Place orders, fire the kitchen, pull reports, log waste — exactly as it works in production.", cta: false },
            ].map(({ n, title, body, cta }, i) => (
              <div key={n} style={{ padding: "32px 28px 36px", borderRight: i < 2 ? "1px solid var(--line)" : 0, borderBottom: "1px solid var(--line)" }}>
                <div className="mono" style={{ fontSize: 11, color: "var(--mute)", letterSpacing: ".14em" }}>{n}</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-.01em", margin: "14px 0 8px" }}>{title}</h3>
                <p style={{ color: "var(--mute)", margin: 0, fontSize: 14, lineHeight: 1.55 }}>{body}</p>
                {cta && (
                  <a href={MAILTO_HREF} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14, fontSize: 13, color: "var(--ink)", borderBottom: "1px solid var(--line-2)", paddingBottom: 1, textDecoration: "none", transition: "border-color .08s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ink)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line-2)"; }}>
                    Open email <ArrowRight size={12} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section id="cta" className="cta-section" style={{ textAlign: "center", background: "var(--paper-2)", borderTop: "1px solid var(--line)" }}>
        <div className="lp-container" style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 36 }}>
            {LOGO_SVG(44, 44)}
            {WORDMARK_SVG(136, 24)}
          </div>
          <span style={SEC}>09 — Get in touch</span>
          <h2 style={{ fontSize: "clamp(32px, 5.5vw, 64px)", letterSpacing: "-.03em", lineHeight: 1.05, margin: "8px 0 16px", fontWeight: 600 }}>
            Find out how much your<br />kitchen is wasting.
          </h2>
          <p style={{ color: "var(--mute)", fontSize: 15, maxWidth: 480, margin: "0 auto 32px" }}>
            No sales call. No slideshow. Just a working demo of your restaurant running on CookLyt — and a clear view of the waste you're currently invisible to.
          </p>
          <a href={MAILTO_HREF} className="cta-email" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 22px", background: "var(--ink)", color: "var(--accent-on)", fontFamily: '"Geist Mono", monospace', fontSize: 14, borderRadius: 8, textDecoration: "none", transition: "transform .12s ease, background .12s ease", wordBreak: "break-all" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--ink-2)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--ink)"; e.currentTarget.style.transform = "none"; }}>
            <Mail size={16} style={{ flexShrink: 0 }} />{DEMO_EMAIL}
          </a>
          <p style={{ display: "block", marginTop: 18, color: "var(--mute-2)", fontSize: 12 }}>We reply within a few hours.</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: "36px 0", borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--mute)" }}>
        <div className="lp-container footer-inner" style={{ maxWidth: 1180, margin: "0 auto", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {LOGO_SVG(16, 16)}
            <span style={{ fontWeight: 400, color: "var(--ink-2)", fontFamily: "'Marcellus', serif", letterSpacing: ".04em" }}>CookLyt</span>
            <span style={{ color: "var(--mute)" }}>by Krilok</span>
          </span>
          <span className="mono" style={{ color: "var(--mute)" }}>© {new Date().getFullYear()} Krilok. All rights reserved.</span>
          <button onClick={() => navigate(user ? "/overview" : "/login")} style={{ marginLeft: "auto", color: "var(--mute)", background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12, whiteSpace: "nowrap" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--ink)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--mute)"; }}>
            {user ? "Go to dashboard →" : "Client sign in →"}
          </button>
        </div>
      </footer>

      <style>{`
        .lp-container { padding-left: 28px; padding-right: 28px; }
        .hero-section  { padding: 80px 0 110px; }
        .lp-section    { padding: 80px 0; }
        .cta-section   { padding: 120px 0; }

        @media (max-width: 980px) {
          .hero-grid    { grid-template-columns: 1fr !important; gap: 48px !important; }
          .problem-grid { grid-template-columns: 1fr !important; gap: 36px !important; }
          .process-grid { grid-template-columns: 1fr !important; }
          .process-grid > div { border-right: 0 !important; }
        }
        @media (max-width: 860px) {
          .features-grid  { grid-template-columns: repeat(2, 1fr) !important; }
          .features-grid > div:nth-child(odd)  { border-right: 1px solid var(--line) !important; }
          .features-grid > div:nth-child(even) { border-right: 0 !important; }
          .stat-cells { grid-template-columns: repeat(2, 1fr) !important; }
          .stat-cells > div:nth-child(odd)  { border-right: 1px solid var(--line) !important; }
          .stat-cells > div:nth-child(even) { border-right: 0 !important; }
        }
        @media (max-width: 700px) {
          .stats-grid { grid-template-columns: 1fr !important; }
          .stats-grid > div { border-right: 0 !important; border-bottom: 1px solid var(--line) !important; }
          .stats-grid > div:last-child { border-bottom: 0 !important; }
        }
        @media (max-width: 620px) {
          .nav-text-link  { display: none !important; }
          .nav-demo-label { display: none !important; }
          .nav-inner      { padding: 0 18px !important; }
        }
        @media (max-width: 600px) {
          .hero-preview { display: none !important; }
          .footer-inner { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
          .footer-inner button { margin-left: 0 !important; }
        }
        @media (max-width: 520px) {
          .features-grid { grid-template-columns: 1fr !important; }
          .features-grid > div { border-right: 0 !important; }
          .stat-cells { grid-template-columns: 1fr !important; }
          .stat-cells > div { border-right: 0 !important; }
        }
        @media (max-width: 480px) {
          .lp-container { padding-left: 18px !important; padding-right: 18px !important; }
          .hero-section { padding: 40px 0 52px !important; }
          .lp-section   { padding: 48px 0 !important; }
          .cta-section  { padding: 60px 0 !important; }
          .cta-email    { font-size: 12px !important; padding: 14px 16px !important; }
        }
        @media (max-width: 768px) {
          .hero-section { padding: 52px 0 68px !important; }
          .lp-section   { padding: 60px 0 !important; }
          .cta-section  { padding: 80px 0 !important; }
        }
      `}</style>
    </div>
  );
}
