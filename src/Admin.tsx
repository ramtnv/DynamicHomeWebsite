import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties, type FormEvent, type ReactNode } from "react";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronDown, Eye, FileImage, Globe2,
  ImagePlus, LayoutDashboard, LogOut, Package, Palette, Plus, Save, Settings2, ShieldCheck,
  Trash2, UploadCloud, X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api, setCsrfToken } from "./api";
import { applyTheme } from "./App";
import type { ContentSection, Product, SiteConfig, Theme } from "./types";

type AdminSection = "overview" | "general" | "theme" | "home" | "about" | "contact" | "products";
const navItems: { id: AdminSection; label: string; icon: typeof LayoutDashboard; group: string }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "Workspace" },
  { id: "general", label: "General settings", icon: Settings2, group: "Website" },
  { id: "theme", label: "Theme & appearance", icon: Palette, group: "Website" },
  { id: "home", label: "Homepage", icon: Globe2, group: "Pages" },
  { id: "about", label: "About us", icon: FileImage, group: "Pages" },
  { id: "contact", label: "Contact", icon: ShieldCheck, group: "Pages" },
  { id: "products", label: "Products", icon: Package, group: "Commerce" },
];
const themePresets: Record<string, Partial<Theme>> = {
  Light: { primary: "#2d5c50", secondary: "#d7e2d9", accent: "#d77955", page: "#f5f4ef", surface: "#ffffff", heading: "#202823", body: "#515b54", muted: "#626b64", link: "#2d5c50", linkHover: "#1d4037", button: "#2d5c50", buttonText: "#ffffff", buttonHover: "#1d4037", border: "#e3e5df", header: "#f5f4ef", navigation: "#626b64", footer: "#202823", footerText: "#d2d8d3" },
  Dark: { primary: "#a4c6b1", secondary: "#34443a", accent: "#ef9b79", page: "#171c19", surface: "#222925", heading: "#f1f3ef", body: "#d1d8d2", muted: "#a5b0a8", link: "#b7d8c3", linkHover: "#d2ead9", button: "#a4c6b1", buttonText: "#142018", buttonHover: "#c1ddc9", border: "#354139", header: "#171c19", navigation: "#d1d8d2", footer: "#111512", footerText: "#d1d8d2" },
  "Modern Blue": { primary: "#315b87", secondary: "#dce8f2", accent: "#d17b58", page: "#f5f4ef", surface: "#ffffff", heading: "#202823", body: "#515b54", muted: "#626b64", link: "#315b87", linkHover: "#25486d", button: "#315b87", buttonText: "#ffffff", buttonHover: "#25486d", border: "#e3e5df", header: "#f5f4ef", navigation: "#626b64", footer: "#202823", footerText: "#d2d8d3" },
  "Nature Green": { primary: "#48654b", secondary: "#e0e8d8", accent: "#bd7650", page: "#f5f4ef", surface: "#ffffff", heading: "#202823", body: "#515b54", muted: "#626b64", link: "#48654b", linkHover: "#354b38", button: "#48654b", buttonText: "#ffffff", buttonHover: "#354b38", border: "#e3e5df", header: "#f5f4ef", navigation: "#626b64", footer: "#202823", footerText: "#d2d8d3" },
  "Minimal Neutral": { primary: "#343434", secondary: "#e9e7e2", accent: "#ab795b", page: "#f7f6f3", surface: "#ffffff", heading: "#202823", body: "#515b54", muted: "#626b64", link: "#343434", linkHover: "#191919", button: "#343434", buttonText: "#ffffff", buttonHover: "#191919", border: "#e3e5df", header: "#f7f6f3", navigation: "#626b64", footer: "#202823", footerText: "#d2d8d3" },
  "Warm Terracotta": { primary: "#864531", secondary: "#f1dfd8", accent: "#b86849", page: "#f5f4ef", surface: "#ffffff", heading: "#202823", body: "#515b54", muted: "#626b64", link: "#864531", linkHover: "#663221", button: "#864531", buttonText: "#ffffff", buttonHover: "#663221", border: "#e3e5df", header: "#f5f4ef", navigation: "#626b64", footer: "#202823", footerText: "#d2d8d3" },
  "Coastal Blue": { primary: "#245b78", secondary: "#dcebf1", accent: "#c8794c", page: "#f5f4ef", surface: "#ffffff", heading: "#202823", body: "#515b54", muted: "#626b64", link: "#245b78", linkHover: "#18435b", button: "#245b78", buttonText: "#ffffff", buttonHover: "#18435b", border: "#e3e5df", header: "#f5f4ef", navigation: "#626b64", footer: "#202823", footerText: "#d2d8d3" },
  "Soft Rose": { primary: "#843c54", secondary: "#f1dfe5", accent: "#b56c57", page: "#f5f4ef", surface: "#ffffff", heading: "#202823", body: "#515b54", muted: "#626b64", link: "#843c54", linkHover: "#64283d", button: "#843c54", buttonText: "#ffffff", buttonHover: "#64283d", border: "#e3e5df", header: "#f5f4ef", navigation: "#626b64", footer: "#202823", footerText: "#d2d8d3" },
  "Lavender Mist": { primary: "#594779", secondary: "#e8e2f2", accent: "#aa756a", page: "#f5f4ef", surface: "#ffffff", heading: "#202823", body: "#515b54", muted: "#626b64", link: "#594779", linkHover: "#40325b", button: "#594779", buttonText: "#ffffff", buttonHover: "#40325b", border: "#e3e5df", header: "#f5f4ef", navigation: "#626b64", footer: "#202823", footerText: "#d2d8d3" },
  "Golden Hour": { primary: "#73500b", secondary: "#f3e7c8", accent: "#bd7137", page: "#f5f4ef", surface: "#ffffff", heading: "#202823", body: "#515b54", muted: "#626b64", link: "#73500b", linkHover: "#553b08", button: "#73500b", buttonText: "#ffffff", buttonHover: "#553b08", border: "#e3e5df", header: "#f5f4ef", navigation: "#626b64", footer: "#202823", footerText: "#d2d8d3" },
};

function Field({ label, value, onChange, type = "text", placeholder, hint, required, min, max, maxLength, step }: {
  label: string; value: string | number; onChange: (value: string) => void; type?: string;
  placeholder?: string; hint?: string; required?: boolean; min?: number; max?: number; maxLength?: number; step?: string;
}) {
  const id = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return <label className="admin-field" htmlFor={id}><span>{label}</span><input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} min={min} max={max} maxLength={maxLength} step={step} />{hint && <small>{hint}</small>}</label>;
}

function TextArea({ label, value, onChange, rows = 4, hint }: {
  label: string; value: string; onChange: (value: string) => void; rows?: number; hint?: string;
}) {
  const id = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return <label className="admin-field" htmlFor={id}><span>{label}</span><textarea id={id} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />{hint && <small>{hint}</small>}</label>;
}

function ImageField({ label, value, onChange, onUpload }: {
  label: string; value: string; onChange: (value: string) => void; onUpload: (file: File) => Promise<string>;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  async function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose an image under 5 MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
      setError("Use JPEG, PNG, WebP, or AVIF.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      onChange(await onUpload(file));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }
  return <div className="admin-image-field"><div className="image-preview">{value ? <img src={value} alt={`${label} preview`} /> : <ImagePlus size={22} />}</div><div className="image-field-control"><span className="field-label">{label}</span><input aria-label={`${label} URL`} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Paste an image URL…" /><label className="upload-button"><UploadCloud size={15} />{uploading ? "Uploading…" : "Upload image"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={pickFile} disabled={uploading} /></label>{error && <small className="field-error" role="alert">{error}</small>}<small>JPG, PNG, WebP or AVIF · up to 5 MB</small></div></div>;
}

function Panel({ title, description, children, className = "" }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return <section className={`admin-panel ${className}`}><div className="panel-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div></div>{children}</section>;
}

export function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    api.session().then((session) => {
      if (session.authenticated) {
        setCsrfToken(session.csrfToken);
        navigate("/admin", { replace: true });
        return;
      }
      setChecked(true);
    }).catch(() => setChecked(true));
  }, [navigate]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await api.login(email, password);
      setCsrfToken(result.csrfToken);
      navigate("/admin", { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }
  if (!checked) return <div className="admin-auth-loading" role="status">Checking your session…</div>;
  return (
    <main className="admin-login">
      <Link to="/" className="login-wordmark"><span className="wordmark-symbol">a.</span>Atelier & Co.</Link>
      <div className="login-card"><span className="login-icon"><ShieldCheck size={21} /></span><span className="eyebrow">Private workspace</span><h1>Welcome back.</h1><p>Sign in to manage your website.</p>
        <form onSubmit={submit}><Field label="Email address" type="email" value={email} onChange={setEmail} required /><Field label="Password" type="password" value={password} onChange={setPassword} required /><button className="button login-submit" disabled={loading}>{loading ? "Signing in…" : "Sign in to dashboard"}<ArrowRight size={16} /></button>{error && <p className="admin-error" role="alert">{error}</p>}</form>
      </div>
      <Link to="/" className="login-back"><ArrowLeft size={14} /> Return to the website</Link>
    </main>
  );
}

export function AdminPage() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [published, setPublished] = useState<SiteConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [section, setSection] = useState<AdminSection>("overview");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  useEffect(() => {
    let alive = true;
    api.session().then((session) => {
      if (!session.authenticated) throw new Error("Sign in required.");
      setCsrfToken(session.csrfToken);
      return Promise.all([api.adminConfig(), api.adminProducts()]);
    }).then(([result, items]) => {
      if (!alive) return;
      setCsrfToken(result.csrfToken);
      setConfig(result.draft);
      setPublished(result.published);
      setProducts(items);
      setAuthorized(true);
    }).catch(() => {
      if (alive) navigate("/admin/login", { replace: true });
    }).finally(() => {
      if (alive) setChecking(false);
    });
    return () => { alive = false; };
  }, [navigate]);
  useEffect(() => {
    if (!config) return;
    applyTheme(config);
  }, [config]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  async function onLogout() {
    try {
      await api.logout();
      setCsrfToken("");
      navigate("/admin/login", { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign out failed.");
    }
  }
  function updateConfig(update: (current: SiteConfig) => SiteConfig) {
    setConfig((current) => current ? update(current) : current);
  }
  async function upload(file: File) {
    return (await api.upload(file)).url;
  }
  async function saveDraft() {
    if (!config) return;
    setSaving(true);
    setError("");
    try {
      await api.saveConfig(config);
      setToast("Draft saved. Your published website is unchanged.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your changes could not be saved.");
    } finally {
      setSaving(false);
    }
  }
  async function publish() {
    if (!config) return;
    setSaving(true);
    setError("");
    try {
      await api.saveConfig(config);
      await api.publish();
      setPublished(structuredClone(config));
      setToast("Published. Your website is now up to date.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your changes could not be published.");
    } finally {
      setSaving(false);
    }
  }
  async function reloadProducts() {
    setProducts(await api.adminProducts());
  }
  if (checking || !config || !published || !authorized) {
    return <div className="admin-auth-loading" role="status">Opening your workspace…</div>;
  }
  const current = navItems.find((item) => item.id === section)!;
  const grouped = [...new Set(navItems.map((item) => item.group))];
  return (
    <div className="admin-shell">
      {mobileNav && <button className="admin-nav-backdrop" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside className={`admin-sidebar ${mobileNav ? "nav-open" : ""}`}>
        <Link to="/" className="admin-brand"><span className="wordmark-symbol">a.</span><span>{config.site.companyName}<small>SUPER ADMIN</small></span></Link>
        <nav className="admin-nav" aria-label="Admin navigation">
          {grouped.map((group) => <div className="admin-nav-group" key={group}><span>{group}</span>{navItems.filter((item) => item.group === group).map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => { setSection(item.id); setMobileNav(false); }}><Icon size={17} /><span>{item.label}</span>{item.id === "products" && <small>{products.length}</small>}</button>;
          })}</div>)}
        </nav>
        <div className="sidebar-bottom"><div className="admin-secure"><span><ShieldCheck size={15} /></span><div><strong>Secure workspace</strong><small>Only you can make changes</small></div></div><button className="logout-button" onClick={onLogout}><LogOut size={16} /> Sign out</button></div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar"><button className="mobile-menu-toggle" onClick={() => setMobileNav(true)} aria-label="Open navigation"><span /><span /><span /></button><div className="breadcrumb">Workspace <span>/</span> <strong>{current.label}</strong></div><div className="topbar-actions"><span className="site-live"><i />Website live</span><a href="/" target="_blank" rel="noreferrer" className="view-site"><Eye size={15} /> View site</a></div></header>
        <main className="admin-content">
          <div className="admin-title-row"><div><span className="eyebrow">Your little corner of the internet</span><h1>{current.label}</h1><p>{section === "overview" ? "A clear view of your website and the good things inside." : section === "products" ? "Keep your collection looking lovely and up to date." : `Make this part of ${config.site.companyName} feel just right.`}</p></div><div className="admin-title-actions"><button className="button button-light" onClick={() => setPreview(true)}><Eye size={16} /> Preview</button><button className="button" onClick={saveDraft} disabled={saving}><Save size={16} />{saving ? "Saving…" : "Save draft"}</button></div></div>
          <div className="draft-banner"><span><span className="draft-indicator" />You are editing a draft. Changes go live only when published.</span><button onClick={publish} disabled={saving}><Check size={15} />{saving ? "Publishing…" : "Publish changes"}</button></div>
          {error && <div className="admin-error admin-error-banner" role="alert">{error}<button aria-label="Dismiss error" onClick={() => setError("")}><X size={16} /></button></div>}
          {section === "overview" && <Overview config={config} products={products} published={published} onNavigate={setSection} />}
          {section === "general" && <GeneralSettings config={config} update={updateConfig} upload={upload} />}
          {section === "theme" && <ThemeSettings config={config} update={updateConfig} onSave={saveDraft} />}
          {section === "home" && <HomeSettings config={config} update={updateConfig} upload={upload} />}
          {section === "about" && <AboutSettings config={config} update={updateConfig} upload={upload} />}
          {section === "contact" && <ContactSettings config={config} update={updateConfig} />}
          {section === "products" && <ProductManager products={products} onReload={reloadProducts} setError={setError} setToast={setToast} />}
          <footer className="admin-footer">Thoughtfully made with <span>✳</span> · {config.site.companyName} admin</footer>
        </main>
      </div>
      {preview && <Preview config={config} published={published} close={() => setPreview(false)} />}
      {toast && <div className="toast-message" role="status"><Check size={17} />{toast}</div>}
    </div>
  );
}

function Overview({ config, products, published, onNavigate }: {
  config: SiteConfig; products: Product[]; published: SiteConfig; onNavigate: (section: AdminSection) => void;
}) {
  const liveCount = products.filter((product) => product.active && product.published).length;
  const changed = JSON.stringify(config) !== JSON.stringify(published);
  return <div className="overview-layout"><div className="overview-main"><Panel title="A little snapshot" description="The good things happening across your website."><div className="stats-grid"><div className="stat-card"><span className="stat-icon"><Package size={18} /></span><strong>{products.length}</strong><span>Total products</span></div><div className="stat-card"><span className="stat-icon"><Globe2 size={18} /></span><strong>{liveCount}</strong><span>Visible on your site</span></div><div className="stat-card"><span className="stat-icon"><Palette size={18} /></span><strong>{config.theme.themeName || "Custom"}</strong><span>Current draft theme</span></div></div></Panel>
  <Panel title="Quick edits" description="Jump straight to the things you may want to update."><div className="quick-edit-list">{[{ key: "general" as const, label: "Branding & site details", desc: "Company name, logo, and SEO details", icon: Settings2 }, { key: "theme" as const, label: "Colors & visual style", desc: "Brand colors, buttons, and typography", icon: Palette }, { key: "home" as const, label: "Homepage story", desc: "Hero message and homepage sections", icon: Globe2 }, { key: "products" as const, label: "Your collection", desc: "Add, edit, and publish products", icon: Package }].map((item) => { const Icon = item.icon; return <button key={item.key} onClick={() => onNavigate(item.key)}><span className="quick-icon"><Icon size={18} /></span><span><strong>{item.label}</strong><small>{item.desc}</small></span><ArrowRight size={17} /></button>; })}</div></Panel></div>
  <aside className="overview-aside"><Panel title="Your website" description="A little look at the published site."><div className="site-preview-card"><div className="site-preview-visual" style={{ background: config.theme.page }}><span className="mini-brand" style={{ color: config.theme.primary }}>{config.site.logo ? <img src={config.site.logo} alt="" /> : "a."} {config.site.companyName}</span><div className="mini-hero"><span style={{ background: config.theme.primary }} /><span style={{ background: config.theme.heading }} /><span style={{ background: config.theme.muted }} /><span style={{ background: config.theme.button, borderRadius: `${config.theme.radius}px` }} /></div></div><div className="site-preview-details"><strong>{config.site.title}</strong><span>{changed ? "Draft changes waiting to publish" : "Your latest changes are live"}</span></div></div></Panel><Panel title="A gentle reminder"><div className="gentle-reminder"><span>✳</span><p>Small updates keep things feeling fresh. Your drafts are safely saved until you choose to publish.</p><button onClick={() => onNavigate("home")}>Tend to your homepage <ArrowRight size={14} /></button></div></Panel></aside></div>;
}

function GeneralSettings({ config, update, upload }: { config: SiteConfig; update: (fn: (value: SiteConfig) => SiteConfig) => void; upload: (file: File) => Promise<string> }) {
  return <div className="admin-grid"><div><Panel title="Your brand" description="The name and little details people see across your site."><div className="admin-form-grid"><Field label="Company name" value={config.site.companyName} onChange={(value) => update((current) => ({ ...current, site: { ...current.site, companyName: value } }))} required /><Field label="Website title" value={config.site.title} onChange={(value) => update((current) => ({ ...current, site: { ...current.site, title: value } }))} required /><TextArea label="Website description" value={config.site.description} onChange={(value) => update((current) => ({ ...current, site: { ...current.site, description: value } }))} rows={3} hint="A short summary for search results." /></div><ImageField label="Company logo" value={config.site.logo} onChange={(value) => update((current) => ({ ...current, site: { ...current.site, logo: value } }))} onUpload={upload} /><ImageField label="Favicon" value={config.site.favicon} onChange={(value) => update((current) => ({ ...current, site: { ...current.site, favicon: value } }))} onUpload={upload} /></Panel><Panel title="Footer" description="A final note at the bottom of every page."><TextArea label="Footer text" value={config.site.footer} onChange={(value) => update((current) => ({ ...current, site: { ...current.site, footer: value } }))} rows={2} /></Panel></div><aside><Panel title="Branding checklist"><div className="checklist">{[["Company name", Boolean(config.site.companyName)], ["Logo added", Boolean(config.site.logo)], ["Search description", Boolean(config.site.description)], ["Footer note", Boolean(config.site.footer)]].map(([label, ready]) => <div key={String(label)}><span className={ready ? "check-ready" : ""}>{ready ? <Check size={13} /> : <span />}</span>{label}<small>{ready ? "Looking good" : "Not added yet"}</small></div>)}</div></Panel></aside></div>;
}

function relativeLuminance(hex: string) {
  const channels = hex.slice(1).match(/.{2}/g)!.map((part) => parseInt(part, 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

function contrastRatio(first: string, second: string) {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (lighter! + 0.05) / (darker! + 0.05);
}

function suggestContrastColor(background: string) {
  const black = contrastRatio("#000000", background);
  const white = contrastRatio("#FFFFFF", background);
  return black >= white ? { color: "#000000", ratio: black } : { color: "#FFFFFF", ratio: white };
}

function ThemeSettings({ config, update, onSave }: { config: SiteConfig; update: (fn: (value: SiteConfig) => SiteConfig) => void; onSave: () => Promise<void> }) {
  function setTheme(values: Partial<Theme>) {
    update((current) => ({ ...current, theme: { ...current.theme, ...values } }));
  }
  function setPreset(name: string) {
    const preset = themePresets[name];
    if (preset) {
      update((current) => ({
        ...current,
        theme: { ...current.theme, ...preset, themeName: name },
        home: { ...current.home, heroBackground: String(preset.page ?? current.home.heroBackground) },
      }));
    }
  }
  const colors: [keyof Theme, string][] = [
    ["primary", "Primary brand"], ["secondary", "Soft brand"], ["accent", "Accent"], ["page", "Page background"],
    ["surface", "Card background"], ["heading", "Heading text"], ["body", "Body text"], ["muted", "Muted text"],
    ["link", "Link"], ["linkHover", "Link hover"], ["button", "Button background"], ["buttonText", "Button text"],
    ["buttonHover", "Button hover"], ["border", "Border"], ["header", "Header"], ["navigation", "Navigation"],
    ["footer", "Footer"], ["footerText", "Footer text"],
  ];
  return (
    <div className="admin-grid theme-admin-grid">
      <div>
        <Panel title="Start with a feeling" description="Pick a palette, then make it your own.">
          <div className="theme-presets">
            {Object.keys(themePresets).map((name) => (
              <button key={name} className={config.theme.themeName === name ? "selected" : ""} onClick={() => setPreset(name)}>
                <span className="preset-swatches">
                  {[themePresets[name].primary, themePresets[name].secondary, themePresets[name].accent].map((color) => (
                    <i key={color} style={{ background: color }} />
                  ))}
                </span>
                <strong>{name}</strong>
                {config.theme.themeName === name && <Check size={15} />}
              </button>
            ))}
          </div>
          <div className="custom-theme-name">
            <Field label="Custom theme name" value={config.theme.themeName || ""} onChange={(value) => setTheme({ themeName: value })} placeholder="My custom palette" />
            <button className="button button-light" onClick={() => void onSave()}><Save size={15} />Save custom theme</button>
          </div>
        </Panel>
        <Panel title="Your color palette" description="Every color is used consistently across your whole website.">
          <div className="color-token-grid">
             {colors.map(([key, label]) => {
               const value = String(config.theme[key]);
               const suggestion = suggestContrastColor(value);
               return (
                 <label className="color-control" key={key}>
                   <span className="color-chip" style={{ backgroundColor: value }}>
                     <input aria-label={`${label} color`} type="color" value={value} onChange={(event) => setTheme({ [key]: event.target.value })} />
                   </span>
                   <span>{label}<small>{value.toUpperCase()}</small></span>
                   <a
                     className="color-suggestion"
                     href="#"
                     onClick={(event) => { event.preventDefault(); setTheme({ [key]: suggestion.color }); }}
                     title={`Best contrasting color for text on this background (contrast ${suggestion.ratio.toFixed(2)}:1). Click to apply.`}
                   >
                     {suggestion.color.toUpperCase()}
                   </a>
                 </label>
               );
             })}

          </div>
        </Panel>
        <Panel title="Type & shape" description="Choose comfortable, readable typography for every screen.">
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>Body font</span>
              <select value={config.theme.font} onChange={(event) => setTheme({ font: event.target.value })}>
                {["Inter", "DM Sans", "Manrope", "Lato", "Open Sans", "Source Sans 3", "Roboto", "Georgia", "Arial", "system-ui"].map((font) => <option key={font}>{font}</option>)}
              </select>
            </label>
            <label className="admin-field">
              <span>Heading font</span>
              <select value={config.theme.headingFont} onChange={(event) => setTheme({ headingFont: event.target.value })}>
                {["Playfair Display", "Lora", "Merriweather", "Georgia", "Inter", "DM Sans", "Manrope"].map((font) => <option key={font}>{font}</option>)}
              </select>
            </label>
            <label className="admin-field">
              <span>Button & card shape</span>
              <select value={config.theme.radius} onChange={(event) => setTheme({ radius: Number(event.target.value) })}>
                <option value={0}>Square</option><option value={8}>Soft corners</option><option value={12}>Rounded</option><option value={24}>Very rounded</option><option value={32}>Pill-like</option>
              </select>
            </label>
            <label className="admin-field">
              <span>Card shadow</span>
              <select value={config.theme.cardShadow} onChange={(event) => setTheme({ cardShadow: event.target.value as Theme["cardShadow"] })}>
                <option value="none">No shadow</option><option value="soft">Soft</option><option value="lifted">Lifted</option>
              </select>
            </label>
            <label className="admin-field">
              <span>Text size</span>
              <select value={config.theme.typographyScale} onChange={(event) => setTheme({ typographyScale: Number(event.target.value) })}>
                <option value={1}>Standard · 16px</option>
                <option value={1.1}>Comfortable · 18px</option>
                <option value={1.2}>Large · 19px</option>
                <option value={1.3}>Extra large · 21px</option>
                <option value={1.4}>Very large · 22px</option>
                <option value={1.5}>Maximum · 24px</option>
              </select>
              <small>Small labels stay at least 12px for readability.</small>
            </label>
            <label className="admin-field slider-field">
              <span>Content width <strong>{config.theme.contentWidth}px</strong></span>
              <input type="range" min="960" max="1800" step="20" value={config.theme.contentWidth} onChange={(event) => setTheme({ contentWidth: Number(event.target.value) })} />
            </label>
            <label className="admin-field slider-field">
              <span>Section spacing <strong>{config.theme.sectionSpacing}px</strong></span>
              <input type="range" min="40" max="180" step="4" value={config.theme.sectionSpacing} onChange={(event) => setTheme({ sectionSpacing: Number(event.target.value) })} />
            </label>
          </div>
        </Panel>
      </div>
      <aside>
        <Panel title="Live preview" description="Your draft style, right here.">
          <div className="theme-preview" style={{ background: config.theme.page, color: config.theme.body, fontFamily: config.theme.font, fontSize: `${16 * config.theme.typographyScale}px` }}>
            <div className="theme-preview-head" style={{ background: config.theme.header, borderColor: config.theme.border }}>
              <strong style={{ color: config.theme.heading }}>A considered living</strong>
              <span style={{ color: config.theme.navigation }}>HOME&nbsp;&nbsp; PRODUCTS&nbsp;&nbsp; ABOUT</span>
            </div>
            <div className="theme-preview-body">
              <small style={{ color: config.theme.primary }}>MADE FOR THE EVERYDAY</small>
              <h3 style={{ color: config.theme.heading, fontFamily: config.theme.headingFont }}>Make room for<br />what matters.</h3>
              <p style={{ color: config.theme.muted }}>A few good things go a long way.</p>
              <button style={{ background: config.theme.button, color: config.theme.buttonText, borderRadius: `${config.theme.radius}px` }}>Explore the collection</button>
              <div className="preview-card" style={{ background: config.theme.surface, borderColor: config.theme.border, borderRadius: `${config.theme.radius}px` }}>
                <span style={{ background: config.theme.secondary }} />
                <div><b style={{ color: config.theme.heading }}>Thoughtfully made</b><small>Considered pieces for everyday rituals.</small></div>
              </div>
            </div>
          </div>
          <p className="contrast-note"><Check size={15} />Your changes are checked against WCAG AA contrast before saving.</p>
        </Panel>
      </aside>
    </div>
  );
}

function SectionEditor({ sections, onChange, upload }: { sections: ContentSection[]; onChange: (sections: ContentSection[]) => void; upload: (file: File) => Promise<string> }) {
  const ordered = [...sections].sort((a, b) => a.order - b.order);
  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((item, order) => ({ ...item, order })));
  }
  function update(id: string, changes: Partial<ContentSection>) {
    onChange(ordered.map((item) => item.id === id ? { ...item, ...changes } : item));
  }
  function add() {
    onChange([...ordered, { id: `section-${Date.now()}`, title: "A new little section", body: "", image: "", enabled: true, order: ordered.length }]);
  }
  return <div className="section-editor">{ordered.map((item, index) => <article className={`section-editor-card ${!item.enabled ? "section-disabled" : ""}`} key={item.id}><div className="section-editor-top"><span className="section-order">0{index + 1}</span><span className="section-enabled">{item.enabled ? "Visible" : "Hidden"}</span><div className="section-actions"><button title="Move up" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={15} /></button><button title="Move down" disabled={index === ordered.length - 1} onClick={() => move(index, 1)}><ArrowDown size={15} /></button><button title={item.enabled ? "Hide section" : "Show section"} onClick={() => update(item.id, { enabled: !item.enabled })}><Eye size={15} /></button><button title="Remove section" className="remove-section" onClick={() => onChange(ordered.filter((section) => section.id !== item.id).map((section, order) => ({ ...section, order })))}><Trash2 size={15} /></button></div></div><div className="admin-form-grid"><Field label="Section heading" value={item.title} onChange={(value) => update(item.id, { title: value })} /><TextArea label="Section text" value={item.body} onChange={(value) => update(item.id, { body: value })} rows={3} /></div><ImageField label="Section image (optional)" value={item.image} onChange={(value) => update(item.id, { image: value })} onUpload={upload} /></article>)}<button className="add-section-button" onClick={add}><Plus size={16} />Add a content section</button></div>;
}

function HomeSettings({ config, update, upload }: { config: SiteConfig; update: (fn: (value: SiteConfig) => SiteConfig) => void; upload: (file: File) => Promise<string> }) {
  return <div className="admin-grid"><div><Panel title="The first hello" description="Your homepage hero sets the tone. Keep it just right."><div className="admin-form-grid"><Field label="Small intro line" value={config.home.eyebrow} onChange={(value) => update((current) => ({ ...current, home: { ...current.home, eyebrow: value } }))} /><TextArea label="Main heading" value={config.home.heading} onChange={(value) => update((current) => ({ ...current, home: { ...current.home, heading: value } }))} rows={3} hint="Use a new line to split the heading into two lines." /><Field label="Subheading" value={config.home.subheading} onChange={(value) => update((current) => ({ ...current, home: { ...current.home, subheading: value } }))} /><TextArea label="Description" value={config.home.description} onChange={(value) => update((current) => ({ ...current, home: { ...current.home, description: value } }))} rows={3} /></div><ImageField label="Hero image" value={config.home.heroImage} onChange={(value) => update((current) => ({ ...current, home: { ...current.home, heroImage: value } }))} onUpload={upload} /><Field label="Hero background color" type="color" value={config.home.heroBackground} onChange={(value) => update((current) => ({ ...current, home: { ...current.home, heroBackground: value } }))} /><div className="admin-form-grid"><Field label="Primary button label" value={config.home.primaryLabel} onChange={(value) => update((current) => ({ ...current, home: { ...current.home, primaryLabel: value } }))} /><Field label="Primary button link" value={config.home.primaryLink} onChange={(value) => update((current) => ({ ...current, home: { ...current.home, primaryLink: value } }))} /><Field label="Secondary button label" value={config.home.secondaryLabel} onChange={(value) => update((current) => ({ ...current, home: { ...current.home, secondaryLabel: value } }))} /><Field label="Secondary button link" value={config.home.secondaryLink} onChange={(value) => update((current) => ({ ...current, home: { ...current.home, secondaryLink: value } }))} /></div><Field label="Announcement banner" value={config.home.banner} onChange={(value) => update((current) => ({ ...current, home: { ...current.home, banner: value } }))} /></Panel><Panel title="Homepage sections" description="Choose what appears, and arrange the story in your own order."><SectionEditor sections={config.home.sections} onChange={(sections) => update((current) => ({ ...current, home: { ...current.home, sections } }))} upload={upload} /></Panel></div><aside><Panel title="Your homepage, in a glance"><div className="page-glance"><div className="glance-image" style={{ backgroundImage: `url("${config.home.heroImage}")` }} /><span className="eyebrow">{config.home.eyebrow}</span><strong>{config.home.heading}</strong><p>{config.home.description}</p><span className="glance-cta">{config.home.primaryLabel || "Your primary button"} <ArrowRight size={13} /></span></div></Panel><Panel title="A little tip"><p className="panel-note">A clear headline and a warm, welcoming image make it easy for visitors to know they've found the right place.</p></Panel></aside></div>;
}

function AboutSettings({ config, update, upload }: { config: SiteConfig; update: (fn: (value: SiteConfig) => SiteConfig) => void; upload: (file: File) => Promise<string> }) {
  return <div className="admin-grid"><div>
    <Panel title="Your story" description="Help people get to know the people and purpose behind the work.">
      <div className="admin-form-grid">
        <Field label="Page heading" value={config.about.heading} onChange={(value) => update((current) => ({ ...current, about: { ...current.about, heading: value } }))} />
        <TextArea label="Introduction" value={config.about.introduction} onChange={(value) => update((current) => ({ ...current, about: { ...current.about, introduction: value } }))} rows={3} />
        <TextArea label="Your history" value={config.about.history} onChange={(value) => update((current) => ({ ...current, about: { ...current.about, history: value } }))} rows={5} />
      </div>
      <ImageField label="About page image" value={config.about.image} onChange={(value) => update((current) => ({ ...current, about: { ...current.about, image: value } }))} onUpload={upload} />
    </Panel>
    <Panel title="What you believe" description="Share the values that shape everything you do.">
      <div className="admin-form-grid">
        <TextArea label="Mission" value={config.about.mission} onChange={(value) => update((current) => ({ ...current, about: { ...current.about, mission: value } }))} rows={3} />
        <TextArea label="Vision" value={config.about.vision} onChange={(value) => update((current) => ({ ...current, about: { ...current.about, vision: value } }))} rows={3} />
        <TextArea label="Values" value={config.about.values} onChange={(value) => update((current) => ({ ...current, about: { ...current.about, values: value } }))} rows={4} hint="Put each value on a new line." />
      </div>
    </Panel>
    <Panel title="Meet the team" description="Add optional profiles for the people behind the work.">
      <TeamEditor team={config.about.team} onChange={(team) => update((current) => ({ ...current, about: { ...current.about, team } }))} upload={upload} />
    </Panel>
    <Panel title="More of your story" description="Add, remove, show, hide, or reorder optional content sections.">
      <SectionEditor sections={config.about.sections} onChange={(sections) => update((current) => ({ ...current, about: { ...current.about, sections } }))} upload={upload} />
    </Panel>
  </div><aside><Panel title="About page check-in"><div className="checklist">{[["A clear introduction", Boolean(config.about.introduction)], ["Your history", Boolean(config.about.history)], ["A mission to believe in", Boolean(config.about.mission)], ["A welcoming image", Boolean(config.about.image)]].map(([label, ready]) => <div key={String(label)}><span className={ready ? "check-ready" : ""}>{ready ? <Check size={13} /> : <span />}</span>{label}<small>{ready ? "Looking good" : "Not added yet"}</small></div>)}</div></Panel></aside></div>;
}

function TeamEditor({ team, onChange, upload }: {
  team: SiteConfig["about"]["team"];
  onChange: (team: SiteConfig["about"]["team"]) => void;
  upload: (file: File) => Promise<string>;
}) {
  return <div className="team-editor">{team.map((member) => <article className="team-editor-card" key={member.id}>
    <div className="team-editor-head"><strong>{member.name || "New team member"}</strong><button className="delete-button" onClick={() => onChange(team.filter((item) => item.id !== member.id))} aria-label={`Remove ${member.name || "team member"}`}><Trash2 size={15} /></button></div>
    <div className="admin-form-grid">
      <Field label="Name" value={member.name} onChange={(value) => onChange(team.map((item) => item.id === member.id ? { ...item, name: value } : item))} required />
      <Field label="Role" value={member.role} onChange={(value) => onChange(team.map((item) => item.id === member.id ? { ...item, role: value } : item))} />
      <TextArea label="Short bio" value={member.bio} onChange={(value) => onChange(team.map((item) => item.id === member.id ? { ...item, bio: value } : item))} rows={2} />
    </div>
    <ImageField label="Profile image" value={member.image} onChange={(value) => onChange(team.map((item) => item.id === member.id ? { ...item, image: value } : item))} onUpload={upload} />
    <label className="team-visibility"><input type="checkbox" checked={member.enabled} onChange={(event) => onChange(team.map((item) => item.id === member.id ? { ...item, enabled: event.target.checked } : item))} /> Show on the About page</label>
  </article>)}<button className="add-section-button" onClick={() => onChange([...team, { id: `team-${Date.now()}`, name: "", role: "", bio: "", image: "", enabled: true }])}><Plus size={16} />Add a team member</button></div>;
}

function ContactSettings({ config, update }: { config: SiteConfig; update: (fn: (value: SiteConfig) => SiteConfig) => void }) {
  function set(key: keyof SiteConfig["contact"], value: string) {
    update((current) => ({ ...current, contact: { ...current.contact, [key]: value } }));
  }
  return <div className="admin-grid"><div><Panel title="A warm welcome" description="Make it easy for people to find the right way to say hello."><div className="admin-form-grid"><Field label="Contact page heading" value={config.contact.heading} onChange={(value) => set("heading", value)} /><TextArea label="Introduction" value={config.contact.introduction} onChange={(value) => set("introduction", value)} rows={3} /><Field label="Email address" type="email" value={config.contact.email} onChange={(value) => set("email", value)} required /><Field label="Phone number" type="tel" value={config.contact.phone} onChange={(value) => set("phone", value)} /><TextArea label="Business address" value={config.contact.address} onChange={(value) => set("address", value)} rows={3} /><Field label="Business hours" value={config.contact.hours} onChange={(value) => set("hours", value)} /></div></Panel><Panel title="Around the internet" description="Links to your social spaces."><div className="admin-form-grid"><Field label="Instagram URL" type="url" value={config.contact.instagram} onChange={(value) => set("instagram", value)} placeholder="https://instagram.com/yourbrand" /><Field label="Facebook URL" type="url" value={config.contact.facebook} onChange={(value) => set("facebook", value)} placeholder="https://facebook.com/yourbrand" /></div></Panel><Panel title="Contact form"><div className="admin-form-grid"><Field label="Name field label" value={config.contact.formLabels.name} onChange={(value) => update((current) => ({ ...current, contact: { ...current.contact, formLabels: { ...current.contact.formLabels, name: value } } }))} /><Field label="Email field label" value={config.contact.formLabels.email} onChange={(value) => update((current) => ({ ...current, contact: { ...current.contact, formLabels: { ...current.contact.formLabels, email: value } } }))} /><Field label="Subject field label" value={config.contact.formLabels.subject} onChange={(value) => update((current) => ({ ...current, contact: { ...current.contact, formLabels: { ...current.contact.formLabels, subject: value } } }))} /><Field label="Message field label" value={config.contact.formLabels.message} onChange={(value) => update((current) => ({ ...current, contact: { ...current.contact, formLabels: { ...current.contact.formLabels, message: value } } }))} /><Field label="Submit button label" value={config.contact.formLabels.submit} onChange={(value) => update((current) => ({ ...current, contact: { ...current.contact, formLabels: { ...current.contact.formLabels, submit: value } } }))} /><Field label="Success message" value={config.contact.successMessage} onChange={(value) => set("successMessage", value)} /></div></Panel></div><aside><Panel title="Contact details preview"><div className="contact-preview"><span>EMAIL</span><strong>{config.contact.email || "Your email address"}</strong><span>PHONE</span><strong>{config.contact.phone || "Your phone number"}</strong><span>VISIT</span><strong>{config.contact.address || "Your business address"}</strong><span>HOURS</span><strong>{config.contact.hours || "When you're around"}</strong></div></Panel><Panel title="Messages stay private"><p className="panel-note">Contact form messages are safely stored in your site's database. Connect a backend email provider if you want notifications in your inbox.</p></Panel></aside></div>;
}

const emptyProduct: Omit<Product, "id" | "slug" | "createdAt" | "updatedAt"> = {
  name: "", shortDescription: "", description: "", image: "", gallery: [],
  price: 0, discountPrice: null, category: "", sku: "", active: true,
  published: true, ctaLabel: "",
};

function ProductManager({ products, onReload, setError, setToast }: {
  products: Product[]; onReload: () => Promise<void>; setError: (message: string) => void; setToast: (message: string) => void;
}) {
  const [editing, setEditing] = useState<Product | null | "new">(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const categories = useMemo(() => ["All", ...new Set(products.map((item) => item.category))], [products]);
  const filtered = useMemo(() => products.filter((item) =>
    (filter === "All" || item.category === filter) &&
    `${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(search.trim().toLowerCase()),
  ), [products, filter, search]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const displayed = filtered.slice((page - 1) * pageSize, page * pageSize);
  async function remove(product: Product) {
    if (!window.confirm(`Delete “${product.name}”? This cannot be undone.`)) return;
    try {
      await api.deleteProduct(product.id);
      await onReload();
      setToast(`${product.name} was removed.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The product could not be removed.");
    }
  }
  async function move(product: Product, direction: -1 | 1) {
    const from = products.findIndex((item) => item.id === product.id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= products.length) return;
    const reordered = [...products];
    [reordered[from], reordered[to]] = [reordered[to]!, reordered[from]!];
    try {
      await api.reorderProducts(reordered.map((item) => item.id));
      await onReload();
      setToast("Product order updated.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The product order could not be saved.");
    }
  }
  return <div className="admin-products"><div className="product-manager-toolbar"><div><label className="admin-search"><span className="sr-only">Search products</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by name, code, or category…" /></label><label className="admin-filter"><span className="sr-only">Filter by category</span><select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}>{categories.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label></div><button className="button" onClick={() => setEditing("new")}><Plus size={16} />Add a product</button></div>
  <p className="result-count">{filtered.length} {filtered.length === 1 ? "product" : "products"} in your collection</p>
  {displayed.length === 0 ? <div className="admin-empty"><span className="empty-icon"><Package size={21} /></span><h3>{search || filter !== "All" ? "No matches found" : "Your collection is ready for something good."}</h3><p>{search || filter !== "All" ? "Try another search or category." : "Add a product and it will appear right here."}</p>{!products.length && <button className="button" onClick={() => setEditing("new")}><Plus size={15} />Add your first product</button>}</div> : <div className="admin-product-list">{displayed.map((product) => { const index = products.findIndex((item) => item.id === product.id); return <article className="admin-product-row" key={product.id}><div className="admin-product-thumb">{product.image ? <img src={product.image} alt="" /> : <ImagePlus size={20} />}</div><div className="admin-product-info"><strong>{product.name}</strong><span>{product.category}{product.sku && ` · ${product.sku}`}</span><small>{product.shortDescription}</small></div><div className="admin-product-price">{product.discountPrice !== null && <small>${product.price.toFixed(2)}</small>}<strong>${(product.discountPrice ?? product.price).toFixed(2)}</strong></div><span className={`product-status ${product.active && product.published ? "status-published" : "status-draft"}`}><i />{product.published && product.active ? "Published" : product.active ? "Draft" : "Hidden"}</span><div className="admin-product-actions"><button title="Move up" aria-label={`Move ${product.name} up`} disabled={index === 0} onClick={() => void move(product, -1)}><ArrowUp size={14} /></button><button title="Move down" aria-label={`Move ${product.name} down`} disabled={index === products.length - 1} onClick={() => void move(product, 1)}><ArrowDown size={14} /></button><button className="edit-button" onClick={() => setEditing(product)}>Edit</button><button className="delete-button" onClick={() => void remove(product)} aria-label={`Delete ${product.name}`}><Trash2 size={15} /></button></div></article>; })}</div>}
  {pageCount > 1 && <div className="admin-pagination"><span>Page {page} of {pageCount}</span><div><button disabled={page === 1} onClick={() => setPage((current) => current - 1)} aria-label="Previous page">←</button><button disabled={page === pageCount} onClick={() => setPage((current) => current + 1)} aria-label="Next page">→</button></div></div>}
  {editing !== null && <ProductDialog initial={editing === "new" ? null : editing} close={() => setEditing(null)} upload={async (file) => (await api.upload(file)).url} onSave={async (product) => { await api.saveProduct(product, editing === "new" ? undefined : editing.id); await onReload(); setEditing(null); setToast(editing === "new" ? "Your new product has been added." : "Product changes saved."); }} setError={setError} />}
  </div>;
}

function ProductDialog({ initial, close, upload, onSave, setError }: {
  initial: Product | null; close: () => void; upload: (file: File) => Promise<string>;
  onSave: (product: Omit<Product, "id" | "slug" | "createdAt" | "updatedAt">) => Promise<void>;
  setError: (message: string) => void;
}) {
  const [form, setForm] = useState(initial ? {
    name: initial.name, shortDescription: initial.shortDescription, description: initial.description,
    image: initial.image, gallery: initial.gallery, price: initial.price, discountPrice: initial.discountPrice,
    category: initial.category, sku: initial.sku, active: initial.active, published: initial.published,
    ctaLabel: initial.ctaLabel,
  } : { ...emptyProduct });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [close]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSave(form);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The product could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section className="product-dialog" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title"><header><div><span className="eyebrow">{initial ? "A little edit" : "Something new"}</span><h2 id="product-dialog-title">{initial ? "Edit product" : "Add a product"}</h2></div><button className="dialog-close" onClick={close} aria-label="Close"><X size={20} /></button></header><form onSubmit={submit}><div className="dialog-body"><div className="admin-form-grid"><Field label="Product name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required maxLength={100} /><Field label="Category" value={form.category} onChange={(value) => setForm({ ...form, category: value })} required maxLength={60} /><Field label="Short description" value={form.shortDescription} onChange={(value) => setForm({ ...form, shortDescription: value })} required maxLength={240} /><Field label="Product code / SKU" value={form.sku} onChange={(value) => setForm({ ...form, sku: value })} maxLength={80} /><Field label="Price" type="number" min={0} step="0.01" value={form.price} onChange={(value) => setForm({ ...form, price: Number(value) })} required /><Field label="Discount price (optional)" type="number" min={0} step="0.01" value={form.discountPrice ?? ""} onChange={(value) => setForm({ ...form, discountPrice: value === "" ? null : Number(value) })} /><TextArea label="Full description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} rows={5} /><Field label="Product button label" value={form.ctaLabel} onChange={(value) => setForm({ ...form, ctaLabel: value })} maxLength={60} /></div><ImageField label="Main product image" value={form.image} onChange={(value) => setForm({ ...form, image: value })} onUpload={upload} /><label className="toggle-row"><span><strong>Published</strong><small>Visible to everyone on your website</small></span><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} /><i /></label><label className="toggle-row"><span><strong>Active</strong><small>Keep this product available in your collection</small></span><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /><i /></label></div><footer><button type="button" className="button button-light" onClick={close}>Cancel</button><button className="button" disabled={busy}>{busy ? "Saving…" : initial ? "Save product" : "Add product"}<Check size={15} /></button></footer></form></section></div>;
}

function Preview({ config, published, close }: { config: SiteConfig; published: SiteConfig; close: () => void }) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [close]);
  return <div className="dialog-backdrop preview-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="preview-title"><header><div><span className="eyebrow">Preview · not published yet</span><h2 id="preview-title">Your website, as it could be.</h2></div><button className="dialog-close" onClick={close} aria-label="Close preview"><X size={20} /></button></header><div className="preview-diff">{JSON.stringify(config) === JSON.stringify(published) ? "You're looking at your published version." : "This preview shows your saved and unsaved draft changes."}</div><div className="preview-site-frame" style={{ background: config.theme.page, color: config.theme.body, fontFamily: config.theme.font, ["--preview-brand" as string]: config.theme.primary, ["--preview-surface" as string]: config.theme.surface, ["--preview-heading" as string]: config.theme.heading, ["--preview-radius" as string]: `${config.theme.radius}px` } as CSSProperties}><div className="preview-site-nav"><strong style={{ color: config.theme.heading }}>{config.site.logo && <img src={config.site.logo} alt="" />}{config.site.companyName}</strong><span>HOME&nbsp;&nbsp;&nbsp;&nbsp; PRODUCTS&nbsp;&nbsp;&nbsp;&nbsp; ABOUT US&nbsp;&nbsp;&nbsp;&nbsp; CONTACT</span></div><div className="preview-site-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(20,25,22,.66), rgba(20,25,22,.06)), url("${config.home.heroImage}")` }}><span>{config.home.eyebrow}</span><h3>{config.home.heading}</h3><p>{config.home.description}</p><button style={{ background: config.theme.button, color: config.theme.buttonText, borderRadius: `${config.theme.radius}px` }}>{config.home.primaryLabel}</button></div><div className="preview-site-content"><span>MADE FOR THE EVERYDAY</span><h3>{config.home.sections.find((item) => item.enabled)?.title}</h3><p>{config.home.sections.find((item) => item.enabled)?.body}</p><div className="preview-site-card" style={{ background: config.theme.surface, borderRadius: `${config.theme.radius}px` }}><b>{config.site.companyName}</b><span>{config.site.footer}</span></div></div></div></section></div>;
}
