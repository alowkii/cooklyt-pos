import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  LayoutDashboard, ReceiptText, LayoutGrid, AlignLeft, BarChart2,
  ShoppingCart, Truck, Check, Mail, ArrowRight,
  Trash2, Grid3X3, BarChart3, Package, ChevronDown, MessageCircle,
} from "lucide-react";

const SECONDARY_NAV = [
  { href: "/problem",  label: "The problem" },
  { href: "/compare",  label: "How we compare" },
  { href: "/mission",  label: "Our mission" },
];

const PRIMARY_NAV = [
  { href: "/waste",    label: "Waste intelligence" },
  { href: "/features", label: "Features" },
  { href: "/access",   label: "Get access" },
];

function NavDropdown({ nlBase, nlHover, nlLeave }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="nav-text-link" style={{ ...nlBase, gap: 3 }} onClick={() => setOpen(o => !o)} onMouseEnter={nlHover} onMouseLeave={nlLeave}>
        Learn more
        <ChevronDown size={12} style={{ transition: "transform .15s", transform: open ? "rotate(180deg)" : "rotate(0deg)", opacity: 0.6 }} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,.08)", padding: "4px", minWidth: 170, zIndex: 50 }}>
          {SECONDARY_NAV.map(({ href, label }) => (
            <a key={href} href={href} style={{ ...nlBase, display: "flex", width: "100%", borderRadius: 5, padding: "0 10px", boxSizing: "border-box" }} onMouseEnter={nlHover} onMouseLeave={nlLeave} onClick={() => setOpen(false)}>{label}</a>
          ))}
        </div>
      )}
    </div>
  );
}
import { DEMO_EMAIL, MAILTO_HREF, WHATSAPP_HREF, LOGO_SVG, WORDMARK_SVG } from "../shared";


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


const SECTION_CARDS = [
  { href: "/problem",  Icon: Trash2,    label: "The problem",        sub: "Why kitchens bleed ₹3–6L a year" },
  { href: "/waste",    Icon: BarChart3,  label: "Waste intelligence", sub: "Tools that surface waste mid-shift" },
  { href: "/features", Icon: Grid3X3,   label: "Features",           sub: "The full POS suite, nothing extra" },
  { href: "/compare",  Icon: Check,     label: "How we compare",     sub: "CookLyt vs generic POS" },
  { href: "/mission",  Icon: Package,   label: "Our mission",        sub: "Why we built this" },
  { href: "/access",   Icon: Mail,      label: "Get access",         sub: "Working demo in 24 hours" },
];

export default function Landing() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("pos_user") || "null");

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
      <Helmet>
        <title>CookLyt — Restaurant POS built for waste-aware margins</title>
        <meta name="description" content="A POS for Indian restaurants that tracks every part of service — orders, tables, KDS — and shows you exactly what you're wasting, in rupees." />
        <meta property="og:title" content="CookLyt — Restaurant POS built for waste-aware margins" />
        <meta property="og:description" content="One quiet system that runs every part of service and watches every rupee of waste." />
        <meta property="og:image" content="https://cooklyt.in/og/landing.png" />
      </Helmet>

      {/* ── Nav ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(250,250,248,.78)", backdropFilter: "blur(14px) saturate(140%)", WebkitBackdropFilter: "blur(14px) saturate(140%)", borderBottom: "1px solid var(--line)" }}>
        <div className="nav-inner" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px", height: 56, display: "flex", alignItems: "center", gap: 18 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--ink)", flexShrink: 0 }}>
            {LOGO_SVG(20, 20)}
            {WORDMARK_SVG(100, 18)}
            <span style={{ display: "inline-block", width: 1, height: 13, background: "var(--line-2)", margin: "0 2px" }} />
            <span style={{ color: "var(--mute)", fontWeight: 400, fontSize: 12 }}>by Krilok</span>
          </a>
          <nav style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            {PRIMARY_NAV.map(({ href, label }) => (
              <a key={href} href={href} className="nav-text-link" style={nlBase} onMouseEnter={nlHover} onMouseLeave={nlLeave}>{label}</a>
            ))}
            <NavDropdown nlBase={nlBase} nlHover={nlHover} nlLeave={nlLeave} />
            <button onClick={() => navigate(user ? "/overview" : "/login")} className="nav-text-link" style={nlBase} onMouseEnter={nlHover} onMouseLeave={nlLeave}>{user ? "Dashboard" : "Sign in"}</button>
            <a href="/access" style={{ ...nlBase, background: "var(--ink)", color: "var(--accent-on)", padding: "0 14px", height: 34, gap: 6 }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--ink-2)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--ink)"; }}>
              <Mail size={13} /><span className="nav-demo-label">Request a demo</span>
            </a>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="hero-section">
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
                <a href="/problem" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 42, padding: "0 18px", borderRadius: 6, fontSize: 13.5, fontWeight: 500, border: "1px solid var(--line-2)", color: "var(--ink)", background: "transparent", textDecoration: "none", transition: "background .08s", whiteSpace: "nowrap" }}
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

      {/* ── Section nav cards ── */}
      <section style={{ borderTop: "1px solid var(--line)", padding: "64px 0" }}>
        <div className="lp-container" style={{ maxWidth: 1180, margin: "0 auto", marginBottom: 36 }}>
          <span style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--mute)", fontFamily: '"Geist Mono", monospace' }}>
            Explore CookLyt
          </span>
        </div>
        <div style={{ maxWidth: 1180, margin: "0 auto", borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }} className="section-cards">
            {SECTION_CARDS.map(({ href, Icon, label, sub }, i) => (
              <a
                key={href}
                href={href}
                style={{
                  display: "block",
                  padding: "28px 28px 32px",
                  borderRight: (i + 1) % 3 !== 0 ? "1px solid var(--line)" : 0,
                  borderBottom: "1px solid var(--line)",
                  textDecoration: "none",
                  color: "var(--ink)",
                  transition: "background .08s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--paper-2)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ display: "inline-grid", placeItems: "center", width: 26, height: 26, color: "var(--ink)", marginBottom: 12 }}>
                  <Icon size={20} strokeWidth={1.4} />
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.005em", margin: 0 }}>{label}</h3>
                  <ArrowRight size={13} style={{ color: "var(--mute)", flexShrink: 0 }} />
                </div>
                <p style={{ color: "var(--mute)", margin: 0, fontSize: 13, lineHeight: 1.5 }}>{sub}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ textAlign: "center", background: "var(--paper-2)", borderTop: "1px solid var(--line)", padding: "120px 0" }}>
        <div className="lp-container" style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 36 }}>
            {LOGO_SVG(44, 44)}
            {WORDMARK_SVG(136, 24)}
          </div>
          <h2 style={{ fontSize: "clamp(32px, 5.5vw, 64px)", letterSpacing: "-.03em", lineHeight: 1.05, margin: "8px 0 16px", fontWeight: 600 }}>
            Find out how much your<br />kitchen is wasting.
          </h2>
          <p style={{ color: "var(--mute)", fontSize: 15, maxWidth: 480, margin: "0 auto 32px" }}>
            No sales call. No slideshow. Just a working demo of your restaurant running on CookLyt.
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
      <footer style={{ background: "var(--paper-2)", borderTop: "1px solid var(--line)", paddingTop: 56, paddingBottom: 32 }}>
        <div className="lp-container" style={{ maxWidth: 1180, margin: "0 auto" }}>
          {/* Top: brand + columns */}
          <div style={{ display: "flex", gap: 48, flexWrap: "wrap", marginBottom: 48 }}>
            {/* Brand block */}
            <div style={{ flex: "1 1 220px", minWidth: 200, maxWidth: 280 }}>
              <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 9, textDecoration: "none", marginBottom: 14 }}>
                {LOGO_SVG(22, 22)}
                <span style={{ fontFamily: "'Marcellus', serif", fontSize: 17, letterSpacing: ".04em", color: "var(--ink)" }}>CookLyt</span>
              </a>
              <p style={{ fontSize: 13, color: "var(--mute)", lineHeight: 1.6, margin: "0 0 20px" }}>
                AI-native POS &amp; demand intelligence for India's specialty cafés and QSRs.
              </p>
              <a href={WHATSAPP_HREF} target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 34, padding: "0 14px", borderRadius: 6, fontSize: 12.5, fontWeight: 500, background: "var(--ink)", color: "var(--accent-on)", textDecoration: "none", transition: "background .08s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--ink-2)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--ink)"; }}
              >
                <MessageCircle size={12} />
                Request a demo
              </a>
            </div>

            <div style={{ flex: "1 1 0" }} />

            {/* Product */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 130 }}>
              <span style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mute-2)", fontFamily: '"Geist Mono", monospace', marginBottom: 8 }}>Product</span>
              {[{ href: "/features", label: "Features" }, { href: "/waste", label: "Waste intelligence" }, { href: "/compare", label: "How we compare" }, { href: "/access", label: "Get access" }].map(({ href, label }) => (
                <a key={href} href={href} style={{ fontSize: 13, color: "var(--mute)", textDecoration: "none", padding: "5px 0", lineHeight: 1, transition: "color .1s" }}
                  onMouseEnter={e => { e.currentTarget.style.color = "var(--ink)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "var(--mute)"; }}>{label}</a>
              ))}
            </div>

            {/* Company */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 130 }}>
              <span style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mute-2)", fontFamily: '"Geist Mono", monospace', marginBottom: 8 }}>Company</span>
              {[{ href: "/problem", label: "The problem" }, { href: "/mission", label: "Our mission" }, { href: MAILTO_HREF, label: "Contact us" }].map(({ href, label }) => (
                <a key={label} href={href} style={{ fontSize: 13, color: "var(--mute)", textDecoration: "none", padding: "5px 0", lineHeight: 1, transition: "color .1s" }}
                  onMouseEnter={e => { e.currentTarget.style.color = "var(--ink)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "var(--mute)"; }}>{label}</a>
              ))}
            </div>

            {/* Account */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 130 }}>
              <span style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mute-2)", fontFamily: '"Geist Mono", monospace', marginBottom: 8 }}>Account</span>
              <button onClick={() => navigate(user ? "/overview" : "/login")}
                style={{ fontSize: 13, color: "var(--mute)", background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", padding: "5px 0", textAlign: "left", lineHeight: 1, transition: "color .1s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--ink)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--mute)"; }}>
                {user ? "Dashboard" : "Sign in"}
              </button>
              {!user && (
                <a href="/access" style={{ fontSize: 13, color: "var(--mute)", textDecoration: "none", padding: "5px 0", lineHeight: 1, transition: "color .1s" }}
                  onMouseEnter={e => { e.currentTarget.style.color = "var(--ink)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "var(--mute)"; }}>Request access</a>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 11.5, color: "var(--mute-2)", fontFamily: '"Geist Mono", monospace' }}>
              © {new Date().getFullYear()} Krilok Pvt. Ltd. · Bengaluru, India
            </span>

          </div>
        </div>
      </footer>

      <style>{`
        .lp-container { padding-left: 28px; padding-right: 28px; }
        .hero-section  { padding: 80px 0 110px; }

        @media (max-width: 980px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
        }
        @media (max-width: 860px) {
          .section-cards { grid-template-columns: repeat(2, 1fr) !important; }
          .section-cards > a:nth-child(odd)  { border-right: 1px solid var(--line) !important; }
          .section-cards > a:nth-child(even) { border-right: 0 !important; }
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
          .section-cards { grid-template-columns: 1fr !important; }
          .section-cards > a { border-right: 0 !important; }
        }
        @media (max-width: 480px) {
          .lp-container { padding-left: 18px !important; padding-right: 18px !important; }
          .hero-section { padding: 40px 0 52px !important; }
          .cta-email    { font-size: 12px !important; padding: 14px 16px !important; }
        }
        @media (max-width: 768px) {
          .hero-section { padding: 52px 0 68px !important; }
        }
      `}</style>
    </div>
  );
}
