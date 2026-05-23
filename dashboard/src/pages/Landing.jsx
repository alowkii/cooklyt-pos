import { useNavigate } from "react-router-dom";
import {
  Grid3X3,
  UtensilsCrossed,
  Wifi,
  BarChart2,
  Gift,
  Package,
  Mail,
  Check,
  ArrowRight,
  LayoutDashboard,
  ReceiptText,
  LayoutGrid,
  AlignLeft,
  ShoppingCart,
  Truck,
} from "lucide-react";

const DEMO_EMAIL = "krishensazawal@cooklyt.in";
const MAILTO_HREF = `mailto:${DEMO_EMAIL}?subject=${encodeURIComponent("CookLyt POS – Demo Request")}&body=${encodeURIComponent("Hi,\n\nI'm interested in a live demo of CookLyt POS for my restaurant.\n\nName:\nRestaurant name:\nNumber of locations:\nBest time to reach me:\n\nThanks,")}`;

const FEATURES = [
  {
    Icon: Grid3X3,
    title: "Tables & floor",
    body: "Your floor, always in sync. No confusion about what's open, what's occupied, or what's been ordered.",
  },
  {
    Icon: UtensilsCrossed,
    title: "Menu & kitchen",
    body: "Make a change — it's live everywhere before you look up.",
  },
  {
    Icon: Wifi,
    title: "Real-time sync",
    body: "Orders don't wait for a connection. When signal drops, CookLyt queues and catches up silently.",
  },
  {
    Icon: Gift,
    title: "Loyalty & coupons",
    body: "Give regulars a reason to return. Give first-timers a reason to come back.",
  },
  {
    Icon: BarChart2,
    title: "Reports & shifts",
    body: "Close the day knowing exactly where every rupee went.",
  },
  {
    Icon: Package,
    title: "Inventory & costing",
    body: "Know your margins before service, not after.",
  },
];

const STATUS_DOT = {
  preparing: "var(--warn)",
  ready: "var(--info)",
  received: "var(--mute-2)",
  served: "var(--ok)",
};

const ELAPSED_STYLE = {
  warn: { color: "var(--warn)", fontWeight: 600 },
  bad: { color: "var(--bad)", fontWeight: 600 },
  mute: { color: "var(--mute)" },
};

const ROWS = [
  {
    key: "T03",
    label: "T03",
    status: "preparing",
    elapsed: "4m",
    elStyle: "mute",
    amount: "$104.00",
  },
  {
    key: "T06",
    label: "T06",
    status: "ready",
    elapsed: "12m",
    elStyle: "warn",
    amount: "$226.00",
  },
  {
    key: "#042",
    label: null,
    status: "received",
    elapsed: "just now",
    elStyle: "mute",
    amount: "$59.00",
    icon: "cart",
    sub: "Maya K. · #042",
  },
  {
    key: "T14",
    label: "T14",
    status: "served",
    elapsed: "22m",
    elStyle: "bad",
    amount: "$71.00",
  },
  {
    key: "dlv",
    label: null,
    status: "preparing",
    elapsed: "8m",
    elStyle: "mute",
    amount: "$49.00",
    icon: "delivery",
    sub: "#DLV-7741",
    last: true,
  },
];

function DevicePreview() {
  const COL = "11px repeat(5, 1fr) 11px";
  const rowBase = {
    display: "grid",
    gridTemplateColumns: COL,
    gap: 6,
    padding: "7px 0",
    borderBottom: "1px solid var(--line)",
    fontSize: 12,
    alignItems: "center",
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Browser chrome */}
      <div
        style={{
          border: "1px solid var(--line-2)",
          background: "var(--paper)",
          borderRadius: 10,
          overflow: "hidden",
          boxShadow:
            "0 1px 0 rgba(255,255,255,.6) inset, 0 24px 64px -28px rgba(10,10,10,.18)",
        }}
      >
        {/* Title bar */}
        <div
          style={{
            height: 36,
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 14px",
          }}
        >
          <div style={{ display: "flex", gap: 5 }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--line-2)",
                  display: "inline-block",
                }}
              />
            ))}
          </div>
          <span
            style={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: 11,
              color: "var(--mute)",
              marginLeft: 8,
            }}
          >
            cooklyt.in · Orders
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontFamily: '"Geist Mono", monospace',
              fontSize: 10,
              color: "var(--mute)",
              display: "flex",
              alignItems: "center",
              gap: 5,
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "var(--ok)",
                display: "inline-block",
              }}
            />
            Live · 3 in kitchen
          </span>
        </div>

        {/* Body: rail + main */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "44px 1fr",
            minHeight: 380,
          }}
        >
          {/* Sidebar rail */}
          <div
            style={{
              borderRight: "1px solid var(--line)",
              padding: "10px 6px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {[
              { Icon: LayoutDashboard, active: false },
              { Icon: ReceiptText, active: true },
              { Icon: LayoutGrid, active: false },
              { Icon: AlignLeft, active: false },
              { Icon: BarChart2, active: false },
            ].map(({ Icon, active }, i) => (
              <span
                key={i}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  display: "grid",
                  placeItems: "center",
                  background: active ? "var(--paper-2)" : "transparent",
                  color: active ? "var(--ink)" : "var(--mute)",
                }}
              >
                <Icon size={14} />
              </span>
            ))}
          </div>

          {/* Main content */}
          <div style={{ padding: "14px 16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: "-.01em",
                }}
              >
                Orders
              </h3>
              <span style={{ fontSize: 11, color: "var(--mute)" }}>
                3 in kitchen · 7 total today
              </span>
            </div>

            {/* Column headers */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: COL,
                gap: 6,
                paddingBottom: 6,
                borderBottom: "1px solid var(--line)",
                marginBottom: 6,
                fontFamily: '"Geist Mono", monospace',
                fontSize: 10,
                color: "var(--mute)",
                textTransform: "uppercase",
                letterSpacing: ".08em",
              }}
            >
              <span />
              <span>Order</span>
              <span>Status</span>
              <span>Elapsed</span>
              <span style={{ textAlign: "right" }}>Total</span>
              <span />
            </div>

            {/* Rows */}
            {ROWS.map((row) => (
              <div
                key={row.key}
                style={{
                  ...rowBase,
                  borderBottom: row.last ? 0 : "1px solid var(--line)",
                }}
              >
                <span />
                <span
                  style={{
                    fontFamily: '"Geist Mono", monospace',
                    fontWeight: 600,
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {row.icon === "cart" && (
                    <ShoppingCart size={12} style={{ color: "var(--mute)" }} />
                  )}
                  {row.icon === "delivery" && (
                    <Truck size={12} style={{ color: "var(--mute)" }} />
                  )}
                  {row.sub ? (
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 400,
                        fontFamily: "inherit",
                      }}
                    >
                      {row.sub}
                    </span>
                  ) : (
                    row.label
                  )}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11.5,
                    color: "var(--ink-2)",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: STATUS_DOT[row.status],
                      flexShrink: 0,
                    }}
                  />
                  {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                </span>
                <span
                  style={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: 11,
                    ...ELAPSED_STYLE[row.elStyle],
                  }}
                >
                  {row.elapsed}
                </span>
                <span
                  style={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: 12,
                    textAlign: "right",
                  }}
                >
                  {row.amount}
                </span>
                <span />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating notification */}
      <div
        style={{
          position: "absolute",
          right: -16,
          bottom: -16,
          padding: "12px 14px",
          background: "var(--ink)",
          color: "var(--accent-on)",
          borderRadius: 8,
          boxShadow: "0 14px 30px -10px rgba(10,10,10,.4)",
          minWidth: 180,
        }}
      >
        <div
          style={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 10,
            letterSpacing: ".12em",
            opacity: 0.55,
            textTransform: "uppercase",
          }}
        >
          Kitchen notified
        </div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Paneer Tikka × 1</div>
        <div
          style={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 10.5,
            color: "rgba(250,250,248,.5)",
            marginTop: 4,
          }}
        >
          T03 · 2s ago
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  const navLinkBase = {
    height: 32,
    padding: "0 12px",
    borderRadius: 6,
    fontSize: 13,
    color: "var(--mute)",
    display: "inline-flex",
    alignItems: "center",
    transition: "background .08s, color .08s",
    textDecoration: "none",
    border: 0,
    cursor: "pointer",
    background: "transparent",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  };

  return (
    <div
      style={{
        background: "var(--paper)",
        color: "var(--ink)",
        minHeight: "100vh",
      }}
    >
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(250,250,248,.78)",
          backdropFilter: "blur(14px) saturate(140%)",
          WebkitBackdropFilter: "blur(14px) saturate(140%)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div
          className="nav-inner"
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "0 28px",
            height: 56,
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          {/* Brand */}
          <a
            href=""
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "var(--ink)",
              flexShrink: 0,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 200 200"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M 154.194 25.409 A 92.2 92.2 0 1 0 154.194 174.591"
                fill="none"
                stroke="#0d0c0b"
                strokeWidth="15.6"
                strokeLinecap="round"
              />
              <circle cx="100" cy="100" r="10.8" fill="#b06a3b" />
            </svg>
            <svg
              width="100"
              height="18"
              viewBox="0 0 360 64"
              role="img"
              aria-label="CookLyt"
            >
              <text
                x="0"
                y="49"
                fill="#0d0c0b"
                style={{
                  fontFamily: "'Marcellus', serif",
                  fontSize: 56,
                  letterSpacing: "10.08px",
                }}
              >
                COOKLY
              </text>
              <circle cx="294.2" cy="29.43" r="5.03" fill="#b06a3b" />
              <text
                x="309.33"
                y="49"
                fill="#0d0c0b"
                style={{
                  fontFamily: "'Marcellus', serif",
                  fontSize: 56,
                  letterSpacing: "10.08px",
                }}
              >
                T
              </text>
            </svg>
            <span
              style={{
                display: "inline-block",
                width: 1,
                height: 13,
                background: "var(--line-2)",
                margin: "0 2px",
              }}
            />
            <span
              style={{ color: "var(--mute)", fontWeight: 400, fontSize: 12 }}
            >
              by Krilok
            </span>
          </a>

          <nav
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <a
              href="#how"
              className="nav-text-link"
              style={navLinkBase}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover)";
                e.currentTarget.style.color = "var(--ink)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--mute)";
              }}
            >
              How it works
            </a>
            <a
              href="#features"
              className="nav-text-link"
              style={navLinkBase}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover)";
                e.currentTarget.style.color = "var(--ink)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--mute)";
              }}
            >
              Features
            </a>
            <button
              onClick={() => navigate("/login")}
              className="nav-text-link"
              style={navLinkBase}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover)";
                e.currentTarget.style.color = "var(--ink)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--mute)";
              }}
            >
              Sign in
            </button>
            <a
              href="#cta"
              style={{
                ...navLinkBase,
                background: "var(--ink)",
                color: "var(--accent-on)",
                padding: "0 14px",
                height: 34,
                gap: 6,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--ink-2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--ink)";
              }}
            >
              <Mail size={13} />
              <span className="nav-demo-label">Request a demo</span>
            </a>
          </nav>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section id="top" className="hero-section">
        <div
          className="lp-container"
          style={{ maxWidth: 1180, margin: "0 auto" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.05fr 1fr",
              gap: 64,
              alignItems: "center",
            }}
            className="hero-grid"
          >
            {/* Left — copy */}
            <div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  height: 26,
                  padding: "0 12px",
                  border: "1px solid var(--line-2)",
                  borderRadius: 999,
                  fontSize: 11.5,
                  color: "var(--ink-2)",
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "var(--ink)",
                    display: "inline-block",
                  }}
                />
                <span className="mono" style={{ letterSpacing: ".06em" }}>
                  CookLyt · 01
                </span>
                <span>A product by Krilok</span>
              </span>

              <h1
                style={{
                  fontSize: "clamp(40px, 7.5vw, 88px)",
                  lineHeight: 0.98,
                  letterSpacing: "-.035em",
                  fontWeight: 600,
                  margin: "16px 0 24px",
                }}
              >
                The POS your
                <br />
                restaurant{" "}
                <em
                  style={{
                    fontStyle: "italic",
                    fontWeight: 500,
                    color: "var(--ink-2)",
                    backgroundImage:
                      "linear-gradient(transparent 78%, rgba(10,10,10,.16) 78%, rgba(10,10,10,.16) 88%, transparent 88%)",
                  }}
                >
                  actually
                </em>
                <br />
                deserves.
              </h1>

              <p
                style={{
                  fontSize: 17,
                  lineHeight: 1.55,
                  color: "var(--ink-2)",
                  maxWidth: 480,
                  margin: "0 0 28px",
                }}
              >
                One quiet system that handles every part of service — so your
                team can focus on the food.
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <a
                  href={MAILTO_HREF}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    height: 42,
                    padding: "0 18px",
                    borderRadius: 6,
                    fontSize: 13.5,
                    fontWeight: 500,
                    background: "var(--ink)",
                    color: "var(--accent-on)",
                    textDecoration: "none",
                    transition: "background .08s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--ink-2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--ink)";
                  }}
                >
                  <Mail size={14} />
                  Request a demo
                </a>
                <button
                  onClick={() => navigate("/login")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    height: 42,
                    padding: "0 18px",
                    borderRadius: 6,
                    fontSize: 13.5,
                    fontWeight: 500,
                    border: "1px solid var(--line-2)",
                    color: "var(--ink)",
                    background: "transparent",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "background .08s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  Have access? Sign in
                  <ArrowRight size={14} />
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 18,
                  flexWrap: "wrap",
                  marginTop: 28,
                }}
              >
                {["No credit card", "Full-access demo", "Ready in 24 hrs"].map(
                  (t) => (
                    <span
                      key={t}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        color: "var(--mute)",
                        fontSize: 12.5,
                      }}
                    >
                      <Check size={13} style={{ opacity: 0.7 }} />
                      {t}
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* Right — device preview */}
            <div
              className="hero-preview"
              style={{ paddingBottom: 32, paddingRight: 32 }}
            >
              <DevicePreview />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
          background: "var(--paper)",
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
          }}
          className="stats-grid"
        >
          {[
            { value: "< 3s", label: "Order to kitchen" },
            { value: "100%", label: "Real-time sync, offline-tolerant" },
            { value: "24 h", label: "From email to working demo" },
          ].map(({ value, label }, i) => (
            <div
              key={label}
              style={{
                padding: "36px 28px",
                borderRight: i < 2 ? "1px solid var(--line)" : 0,
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 38,
                  fontWeight: 500,
                  letterSpacing: "-.02em",
                  lineHeight: 1,
                }}
              >
                {value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--mute)",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  marginTop: 10,
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How to get access ────────────────────────────────────────────── */}
      <section
        id="how"
        className="lp-section"
        style={{ borderTop: "1px solid var(--line)" }}
      >
        <div
          className="lp-container"
          style={{ maxWidth: 1180, margin: "0 auto" }}
        >
          <div style={{ marginBottom: 48, maxWidth: 680 }}>
            <span
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: "var(--mute)",
              }}
            >
              02 — Onboarding
            </span>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                letterSpacing: "-.025em",
                lineHeight: 1.05,
                margin: "8px 0 12px",
                fontWeight: 600,
              }}
            >
              How to get access.
            </h2>
            <p
              style={{
                color: "var(--mute)",
                margin: 0,
                fontSize: 15,
                lineHeight: 1.55,
                maxWidth: 520,
              }}
            >
              CookLyt is invite-only. Every demo is a real working environment,
              seeded with a real menu and a real day's worth of orders. No
              slideshow.
            </p>
          </div>
        </div>

        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            borderTop: "1px solid var(--line)",
          }}
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}
            className="process-grid"
          >
            {[
              {
                n: "01",
                title: "Send an email",
                body: "Tell us your restaurant name and a couple of details. We'll take it from there.",
                cta: true,
              },
              {
                n: "02",
                title: "We provision your demo",
                body: "Our team spins up a live instance — your menu, your tables, a believable order history.",
                cta: false,
              },
              {
                n: "03",
                title: "Log in & explore",
                body: "Place orders, fire the kitchen, pull reports — exactly as it works in production.",
                cta: false,
              },
            ].map(({ n, title, body, cta }, i) => (
              <div
                key={n}
                style={{
                  padding: "32px 28px 36px",
                  borderRight: i < 2 ? "1px solid var(--line)" : 0,
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--mute)",
                    letterSpacing: ".14em",
                  }}
                >
                  {n}
                </div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    letterSpacing: "-.01em",
                    margin: "14px 0 8px",
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    color: "var(--mute)",
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.55,
                  }}
                >
                  {body}
                </p>
                {cta && (
                  <a
                    href={MAILTO_HREF}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 14,
                      fontSize: 13,
                      color: "var(--ink)",
                      borderBottom: "1px solid var(--line-2)",
                      paddingBottom: 1,
                      textDecoration: "none",
                      transition: "border-color .08s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--ink)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--line-2)";
                    }}
                  >
                    Open email <ArrowRight size={12} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section
        id="features"
        className="lp-section"
        style={{
          borderTop: "1px solid var(--line)",
          background: "var(--paper-2)",
        }}
      >
        <div
          className="lp-container"
          style={{ maxWidth: 1180, margin: "0 auto" }}
        >
          <div style={{ marginBottom: 48, maxWidth: 680 }}>
            <span
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: "var(--mute)",
              }}
            >
              03 — The product
            </span>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                letterSpacing: "-.025em",
                lineHeight: 1.05,
                margin: "8px 0 12px",
                fontWeight: 600,
              }}
            >
              Everything included.
              <br />
              Nothing extra.
            </h2>
            <p
              style={{
                color: "var(--mute)",
                margin: 0,
                fontSize: 15,
                lineHeight: 1.55,
                maxWidth: 520,
              }}
            >
              Every demo is the full product. No feature limits, no upgrade
              prompts, no per-station pricing surprise.
            </p>
          </div>
        </div>

        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            borderTop: "1px solid var(--line)",
          }}
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}
            className="features-grid"
          >
            {FEATURES.map(({ Icon, title, body }, i) => (
              <div
                key={title}
                style={{
                  padding: "28px 28px 32px",
                  borderRight: (i + 1) % 3 !== 0 ? "1px solid var(--line)" : 0,
                  borderBottom: "1px solid var(--line)",
                  minHeight: 180,
                }}
              >
                <span
                  style={{
                    display: "inline-grid",
                    placeItems: "center",
                    width: 28,
                    height: 28,
                    color: "var(--ink)",
                    marginBottom: 14,
                  }}
                >
                  <Icon size={22} strokeWidth={1.4} />
                </span>
                <h4
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    letterSpacing: "-.005em",
                    margin: "0 0 6px",
                  }}
                >
                  {title}
                </h4>
                <p
                  style={{
                    color: "var(--mute)",
                    margin: 0,
                    fontSize: 13.5,
                    lineHeight: 1.55,
                  }}
                >
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section
        id="cta"
        className="cta-section"
        style={{
          textAlign: "center",
          background: "var(--paper-2)",
          borderTop: "1px solid var(--line)",
        }}
      >
        <div
          className="lp-container"
          style={{ maxWidth: 1180, margin: "0 auto" }}
        >
          {/* Brand lockup */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              marginBottom: 36,
            }}
          >
            <svg
              width="44"
              height="44"
              viewBox="0 0 200 200"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M 154.194 25.409 A 92.2 92.2 0 1 0 154.194 174.591"
                fill="none"
                stroke="#0d0c0b"
                strokeWidth="15.6"
                strokeLinecap="round"
              />
              <circle cx="100" cy="100" r="10.8" fill="#b06a3b" />
            </svg>
            <svg
              width="136"
              height="24"
              viewBox="0 0 360 64"
              role="img"
              aria-label="CookLyt"
            >
              <text
                x="0"
                y="49"
                fill="#0d0c0b"
                style={{
                  fontFamily: "'Marcellus', serif",
                  fontSize: 56,
                  letterSpacing: "10.08px",
                }}
              >
                COOKLY
              </text>
              <circle cx="294.2" cy="29.43" r="5.03" fill="#b06a3b" />
              <text
                x="309.33"
                y="49"
                fill="#0d0c0b"
                style={{
                  fontFamily: "'Marcellus', serif",
                  fontSize: 56,
                  letterSpacing: "10.08px",
                }}
              >
                T
              </text>
            </svg>
          </div>
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "var(--mute)",
            }}
          >
            04 — Get in touch
          </span>
          <h2
            style={{
              fontSize: "clamp(32px, 5.5vw, 64px)",
              letterSpacing: "-.03em",
              lineHeight: 1.05,
              margin: "8px 0 16px",
              fontWeight: 600,
            }}
          >
            See CookLyt live,
            <br />
            in your browser.
          </h2>
          <p
            style={{
              color: "var(--mute)",
              fontSize: 15,
              maxWidth: 480,
              margin: "0 auto 32px",
            }}
          >
            No sales call. No slideshow. Just a working demo of your restaurant
            running on CookLyt.
          </p>

          <a
            href={MAILTO_HREF}
            className="cta-email"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "16px 22px",
              background: "var(--ink)",
              color: "var(--accent-on)",
              fontFamily: '"Geist Mono", monospace',
              fontSize: 14,
              borderRadius: 8,
              textDecoration: "none",
              transition: "transform .12s ease, background .12s ease",
              wordBreak: "break-all",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--ink-2)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--ink)";
              e.currentTarget.style.transform = "none";
            }}
          >
            <Mail size={16} style={{ flexShrink: 0 }} />
            {DEMO_EMAIL}
          </a>

          <p
            style={{
              display: "block",
              marginTop: 18,
              color: "var(--mute-2)",
              fontSize: 12,
            }}
          >
            We reply within a few hours.
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        style={{
          padding: "36px 0",
          borderTop: "1px solid var(--line)",
          fontSize: 12,
          color: "var(--mute)",
        }}
      >
        <div
          className="lp-container footer-inner"
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 200 200"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M 154.194 25.409 A 92.2 92.2 0 1 0 154.194 174.591"
                fill="none"
                stroke="#0d0c0b"
                strokeWidth="15.6"
                strokeLinecap="round"
              />
              <circle cx="100" cy="100" r="10.8" fill="#b06a3b" />
            </svg>
            <span
              style={{
                fontWeight: 400,
                color: "var(--ink-2)",
                fontFamily: "'Marcellus', serif",
                letterSpacing: ".04em",
              }}
            >
              CookLyt
            </span>
            <span style={{ color: "var(--mute)" }}>by Krilok</span>
          </span>
          <span className="mono num" style={{ color: "var(--mute)" }}>
            © {new Date().getFullYear()} Krilok. All rights reserved.
          </span>
          <button
            onClick={() => navigate("/login")}
            style={{
              marginLeft: "auto",
              color: "var(--mute)",
              background: "transparent",
              border: 0,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 12,
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--ink)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--mute)";
            }}
          >
            Client sign in →
          </button>
        </div>
      </footer>

      <style>{`
        /* ── Container padding ─────────────────────────── */
        .lp-container { padding-left: 28px; padding-right: 28px; }

        /* ── Hero section ──────────────────────────────── */
        .hero-section { padding: 80px 0 110px; }

        /* ── Generic interior sections ─────────────────── */
        .lp-section { padding: 80px 0; }

        /* ── CTA ───────────────────────────────────────── */
        .cta-section { padding: 120px 0; }

        /* ── Hero grid → 1 col at 980px ────────────────── */
        @media (max-width: 980px) {
          .hero-grid    { grid-template-columns: 1fr !important; gap: 48px !important; }
          .process-grid { grid-template-columns: 1fr !important; }
          .process-grid > div { border-right: 0 !important; }
        }

        /* ── Hide device preview on phones ─────────────── */
        @media (max-width: 600px) {
          .hero-preview { display: none !important; }
        }

        /* ── Hide text nav links on small screens ───────── */
        @media (max-width: 620px) {
          .nav-text-link  { display: none !important; }
          .nav-demo-label { display: none !important; }
          .nav-inner      { padding: 0 18px !important; }
        }

        /* ── Tighten hero on tablet ─────────────────────── */
        @media (max-width: 768px) {
          .hero-section { padding: 52px 0 68px !important; }
          .lp-section   { padding: 60px 0 !important; }
          .cta-section  { padding: 80px 0 !important; }
        }

        /* ── Mobile overrides ───────────────────────────── */
        @media (max-width: 480px) {
          .lp-container  { padding-left: 18px !important; padding-right: 18px !important; }
          .hero-section  { padding: 40px 0 52px !important; }
          .lp-section    { padding: 48px 0 !important; }
          .cta-section   { padding: 60px 0 !important; }
          .cta-email     { font-size: 12px !important; padding: 14px 16px !important; }
        }

        /* ── Stats strip → 1 col ────────────────────────── */
        @media (max-width: 700px) {
          .stats-grid { grid-template-columns: 1fr !important; }
          .stats-grid > div { border-right: 0 !important; border-bottom: 1px solid var(--line) !important; }
          .stats-grid > div:last-child { border-bottom: 0 !important; }
        }

        /* ── Features → 2 col ──────────────────────────── */
        @media (max-width: 860px) {
          .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .features-grid > div:nth-child(odd)  { border-right: 1px solid var(--line) !important; }
          .features-grid > div:nth-child(even) { border-right: 0 !important; }
        }

        /* ── Features → 1 col ──────────────────────────── */
        @media (max-width: 520px) {
          .features-grid { grid-template-columns: 1fr !important; }
          .features-grid > div { border-right: 0 !important; }
        }

        /* ── Footer stack on mobile ─────────────────────── */
        @media (max-width: 600px) {
          .footer-inner { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
          .footer-inner button { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
