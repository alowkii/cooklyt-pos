import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Mail, ChevronDown, Menu, X } from "lucide-react";
import { LOGO_SVG, WORDMARK_SVG, MAILTO_HREF, getStoredUser, PageFooter } from "./shared";

// Primary links shown directly in the nav
const PRIMARY_LINKS = [
  { href: "/waste",    label: "Waste intelligence" },
  { href: "/features", label: "Features" },
  { href: "/access",   label: "Get access" },
];

// Secondary links tucked under "Learn more"
const SECONDARY_LINKS = [
  { href: "/problem",  label: "The problem" },
  { href: "/compare",  label: "How we compare" },
  { href: "/mission",  label: "Our mission" },
];

function DropdownMenu({ label, links, nlBase, nlHover, nlLeave }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="nav-text-link"
        style={{ ...nlBase, gap: 3 }}
        onClick={() => setOpen(o => !o)}
        onMouseEnter={nlHover}
        onMouseLeave={nlLeave}
      >
        {label}
        <ChevronDown size={12} style={{ transition: "transform .15s", transform: open ? "rotate(180deg)" : "rotate(0deg)", opacity: 0.6 }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
          background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,.08)", padding: "4px", minWidth: 170, zIndex: 50,
        }}>
          {links.map(({ href, label }) => (
            <a
              key={href} href={href}
              style={{ ...nlBase, display: "flex", width: "100%", borderRadius: 5, padding: "0 10px", boxSizing: "border-box" }}
              onMouseEnter={nlHover} onMouseLeave={nlLeave}
              onClick={() => setOpen(false)}
            >
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LandingLayout({ children }) {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile panel if the viewport grows past the breakpoint
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 621px)");
    const handler = (e) => { if (e.matches) setMobileOpen(false); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // No scrolling behind the open mobile menu
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const nlBase = {
    height: 32, padding: "0 12px", borderRadius: 6, fontSize: 13, color: "var(--mute)",
    display: "inline-flex", alignItems: "center", transition: "background .08s, color .08s",
    textDecoration: "none", border: 0, cursor: "pointer", background: "transparent",
    fontFamily: "inherit", whiteSpace: "nowrap",
  };
  const nlHover = (e) => { e.currentTarget.style.background = "var(--hover)"; e.currentTarget.style.color = "var(--ink)"; };
  const nlLeave = (e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--mute)"; };

  const mobileLink = {
    display: "flex", alignItems: "center", width: "100%", boxSizing: "border-box",
    height: 46, padding: "0 18px", fontSize: 14.5, color: "var(--ink)",
    textDecoration: "none", border: 0, background: "transparent",
    borderBottom: "1px solid var(--line)", fontFamily: "inherit", cursor: "pointer",
    textAlign: "left",
  };

  return (
    <div style={{ background: "var(--paper)", color: "var(--ink)", minHeight: "100vh" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(250,250,248,.78)", backdropFilter: "blur(14px) saturate(140%)", WebkitBackdropFilter: "blur(14px) saturate(140%)", borderBottom: "1px solid var(--line)" }}>
        <div className="nav-inner" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px", height: 56, display: "flex", alignItems: "center", gap: 18 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--ink)", flexShrink: 0 }}>
            {LOGO_SVG(20, 20)}
            {WORDMARK_SVG(100, 18)}
            <span className="nav-byline" style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
              <span style={{ display: "inline-block", width: 1, height: 13, background: "var(--line-2)" }} />
              <span style={{ color: "var(--mute)", fontWeight: 400, fontSize: 12 }}>by Krilok</span>
            </span>
          </a>
          <nav style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            {PRIMARY_LINKS.map(({ href, label }) => (
              <a key={href} href={href} className="nav-text-link" style={nlBase} onMouseEnter={nlHover} onMouseLeave={nlLeave}>{label}</a>
            ))}
            <DropdownMenu label="Learn more" links={SECONDARY_LINKS} nlBase={nlBase} nlHover={nlHover} nlLeave={nlLeave} />
            <button onClick={() => navigate(user ? "/overview" : "/login")} className="nav-text-link" style={nlBase} onMouseEnter={nlHover} onMouseLeave={nlLeave}>
              {user ? "Dashboard" : "Sign in"}
            </button>
            <a href={MAILTO_HREF}
              style={{ ...nlBase, background: "var(--ink)", color: "var(--accent-on)", padding: "0 14px", height: 34, gap: 6 }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--ink-2)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--ink)"; }}
            >
              <Mail size={13} /><span className="nav-demo-label">Request a demo</span>
            </a>
            <button
              className="nav-mobile-btn"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(o => !o)}
              style={{
                display: "none", alignItems: "center", justifyContent: "center",
                width: 36, height: 36, borderRadius: 6, border: 0,
                background: "transparent", color: "var(--ink)", cursor: "pointer",
              }}
            >
              {mobileOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </nav>
        </div>

        {/* Mobile menu — full-width panel under the sticky header */}
        {mobileOpen && (
          <div
            style={{
              position: "fixed", top: 56, left: 0, right: 0, bottom: 0, zIndex: 45,
              background: "var(--paper)", overflowY: "auto",
              borderTop: "1px solid var(--line)",
            }}
          >
            {[...PRIMARY_LINKS, ...SECONDARY_LINKS].map(({ href, label }) => (
              <a key={href} href={href} style={mobileLink} onClick={() => setMobileOpen(false)}>{label}</a>
            ))}
            <button
              style={mobileLink}
              onClick={() => { setMobileOpen(false); navigate(user ? "/overview" : "/login"); }}
            >
              {user ? "Dashboard" : "Sign in"}
            </button>
            <div style={{ padding: 18 }}>
              <a
                href={MAILTO_HREF}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  height: 44, borderRadius: 8, fontSize: 14, fontWeight: 500,
                  background: "var(--ink)", color: "var(--accent-on)", textDecoration: "none",
                }}
              >
                <Mail size={15} /> Request a demo
              </a>
            </div>
          </div>
        )}
      </header>

      <main>{children}</main>

      <PageFooter />

      <style>{`
        .lp-container { padding-left: 28px; padding-right: 28px; }
        .footer-inner { max-width: 1180px; margin: 0 auto; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }

        @media (max-width: 620px) {
          .nav-text-link  { display: none !important; }
          .nav-demo-label { display: none !important; }
          .nav-inner      { padding: 0 18px !important; }
          .nav-mobile-btn { display: inline-flex !important; }
        }
        @media (max-width: 400px) {
          .nav-byline { display: none !important; }
        }
        @media (max-width: 480px) {
          .lp-container { padding-left: 18px !important; padding-right: 18px !important; }
        }
        @media (max-width: 600px) {
          .footer-inner { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
          .footer-inner button { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
