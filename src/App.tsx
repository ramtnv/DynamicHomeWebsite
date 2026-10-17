import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Menu, ShoppingCart, X } from "lucide-react";
import { api } from "./api";
import { CartProvider } from "./CartContext";
import {
  AboutPage,
  CartPage,
  CheckoutPage,
  ContactPage,
  HomePage,
  OrderConfirmationPage,
  ProductDetailPage,
  ProductsPage,
} from "./PublicPages";
import { AdminLogin, AdminPage } from "./Admin";
import type { SiteConfig } from "./types";

export function applyTheme(config: SiteConfig) {
  const root = document.documentElement;
  const { theme } = config;
  const variables: Record<string, string> = {
    "--brand": theme.primary,
    "--brand-soft": theme.secondary,
    "--accent": theme.accent,
    "--page": theme.page,
    "--surface": theme.surface,
    "--heading": theme.heading,
    "--body": theme.body,
    "--muted": theme.muted,
    "--link": theme.link,
    "--link-hover": theme.linkHover,
    "--button": theme.button,
    "--button-text": theme.buttonText,
    "--button-hover": theme.buttonHover,
    "--border": theme.border,
    "--header": theme.header,
    "--navigation": theme.navigation,
    "--footer": theme.footer,
    "--footer-text": theme.footerText,
    "--font": theme.font,
    "--heading-font": theme.headingFont,
    "--type-scale": String(theme.typographyScale),
    "--radius": `${theme.radius}px`,
    "--content-width": `${theme.contentWidth}px`,
    "--section-spacing": `${theme.sectionSpacing}px`,
    "--card-shadow": theme.cardShadow === "none" ? "none" : theme.cardShadow === "lifted"
      ? "0 18px 38px rgba(29, 43, 34, .13)"
      : "0 8px 24px rgba(29, 43, 34, .08)",
  };
  for (const [key, value] of Object.entries(variables)) root.style.setProperty(key, value);
  document.title = config.site.title;
  const description = document.querySelector('meta[name="description"]');
  description?.setAttribute("content", config.site.description);
  let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (config.site.favicon) {
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }
    favicon.href = config.site.favicon;
  }
}

export function useSiteConfig() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    api.site().then((result) => {
      if (!alive) return;
      applyTheme(result);
      setConfig(result);
    }).catch((reason: unknown) => {
      if (alive) setError(reason instanceof Error ? reason.message : "Unable to load the website.");
    });
    return () => { alive = false; };
  }, []);
  return { config, error };
}

function LoadingState({ error }: { error: string }) {
  return (
    <main className="loading-screen" role={error ? "alert" : "status"}>
      <span className="loading-mark">a.</span>
      <p>{error || "Preparing something thoughtful…"}</p>
      {error && <button className="button button-outline" onClick={() => window.location.reload()}>Try again</button>}
    </main>
  );
}

function SiteLayout({ config }: { config: SiteConfig }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => applyTheme(config), [config]);
  useEffect(() => setMenuOpen(false), [location.pathname]);
  return (
    <div className="public-site-shell">
      <header className="site-header">
        <div className={`header-inner ${menuOpen ? "menu-open" : ""}`}>
          <Link to="/" className="wordmark">
            {config.site.logo ? <img src={config.site.logo} alt="" /> : <span className="wordmark-symbol">a.</span>}
            <span>{config.site.companyName}</span>
          </Link>
          <button className="mobile-nav-toggle" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
          <nav className="desktop-nav" id="main-navigation" aria-label="Main navigation">
            {[
              ["/", "Home"],
              ["/products", "Products"],
              ["/about", "About us"],
              ["/contact", "Contact us"],
            ].map(([href, label]) => (
              <Link key={href} to={href} className={location.pathname === href ? "active" : ""} onClick={() => setMenuOpen(false)}>{label}</Link>
            ))}
          </nav>
          <Link to="/products" className="header-link">Shop the collection <span aria-hidden="true">↗</span></Link>
          <Link to="/cart" className="header-link"><ShoppingCart size={16} /> Cart <span>0</span></Link>
        </div>
      </header>
      <main><Routes>
        <Route path="/" element={<HomePage config={config} />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage config={config} />} />
        <Route path="/about" element={<AboutPage config={config} />} />
        <Route path="/contact" element={<ContactPage config={config} />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-confirmed/:id" element={<OrderConfirmationPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes></main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <Link to="/" className="footer-brand">{config.site.companyName}</Link>
            <p>{config.site.footer}</p>
          </div>
          <div className="footer-links">
            <Link to="/products">Shop</Link><Link to="/about">Our story</Link><Link to="/contact">Get in touch</Link>
            <a href={config.contact.instagram} target="_blank" rel="noreferrer">Instagram ↗</a>
          </div>
          <span className="copyright">© {new Date().getFullYear()} {config.site.companyName}</span>
        </div>
      </footer>
    </div>
  );
}

function NotFound() {
  return <section className="not-found"><span className="eyebrow">Lost in the details</span><h1>That page isn't here.</h1><Link to="/" className="button">Back to home</Link></section>;
}

function AdminRoutes() {
  const location = useLocation();
  const { config, error } = useSiteConfig();
  if (!config) return <LoadingState error={error} />;
  if (location.pathname === "/admin/login") return <AdminLogin />;
  return <AdminPage />;
}

export default function App() {
  const location = useLocation();
  if (location.pathname.startsWith("/admin")) {
    return <Routes><Route path="/admin/*" element={<AdminRoutes />} /><Route path="*" element={<Navigate to="/admin" replace />} /></Routes>;
  }
  const { config, error } = useSiteConfig();
  if (!config) return <LoadingState error={error} />;
  return (
    <CartProvider>
      <SiteLayout config={config} />
    </CartProvider>
  );
}
