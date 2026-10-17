import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, CheckCircle2, Download, Eye, Instagram, Leaf, MapPin, Minus, PackageCheck, Phone, Plus, ShoppingCart, Sparkles, User, X } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "./api";
import { useCart } from "./CartContext";
import type { CartItem, PaymentMethod, Product, SiteConfig } from "./types";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="eyebrow"><span className="eyebrow-dot" />{children}</span>;
}

function formatPrice(price: number) {
  return "₹" + price.toFixed(2);
}

type OrderReceipt = {
  orderId: string;
  serialNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: PaymentMethod;
  items: CartItem[];
  total: number;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function createOrderPdf(receipt: OrderReceipt): Blob {
  const ascii = (value: string) => value
    .replace(/₹/g, "INR ")
    .replace(/[^\x20-\x7e]/g, "?");
  const wrap = (value: string, limit: number) => {
    const words = ascii(value).split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      if (line && `${line} ${word}`.length > limit) {
        lines.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    if (line) lines.push(line);
    return lines;
  };
  const lines = [
    "ORDER SUMMARY",
    `Order number: ${receipt.orderId}`,
    `Reference: ${receipt.serialNumber}`,
    `Customer: ${receipt.customerName}`,
    `Phone: ${receipt.customerPhone}`,
    ...wrap(`Address: ${receipt.customerAddress}`, 86),
    `Payment method: ${receipt.paymentMethod} (record only - no payment processed)`,
    "",
    "ITEM                                      QTY       UNIT PRICE       AMOUNT",
    ...receipt.items.flatMap((item) => {
      const label = `${item.name}  |  ${item.quantity}  |  ${ascii(formatPrice(item.price))}  |  ${ascii(formatPrice(item.price * item.quantity))}`;
      return wrap(label, 86);
    }),
    "",
    `TOTAL: ${ascii(formatPrice(receipt.total))}`,
    "",
    "Thank you for your order.",
  ];
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += 48) pages.push(lines.slice(index, index + 48));
  const objects: string[] = [];
  const fontId = 3 + pages.length * 2;
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  pages.forEach((pageLines, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    const text = pageLines.map((line, lineIndex) => {
      const y = 790 - lineIndex * 15;
      const escaped = line.replace(/[\\()]/g, "\\$&");
      return `BT /F1 10 Tf 48 ${y} Td (${escaped}) Tj ET`;
    }).join("\n");
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${text.length} >>\nstream\n${text}\nendstream`;
  });
  objects[fontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  let document = "%PDF-1.4\n";
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = document.length;
    document += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = document.length;
  document += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) {
    document += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  document += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([document], { type: "application/pdf" });
}

function downloadOrderPdf(receipt: OrderReceipt) {
  const url = URL.createObjectURL(createOrderPdf(receipt));
  const link = document.createElement("a");
  link.href = url;
  link.download = `order-${receipt.orderId}.pdf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ProductCard({ product }: { product: Product }) {
  const { items, addItem, updateQuantity } = useCart();
  const navigate = useNavigate();
  const [previewOpen, setPreviewOpen] = useState(false);
  const quantity = items.find((item) => item.productId === product.id)?.quantity ?? 0;
  const image = product.image || "https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=900&q=80";

  useEffect(() => {
    if (!previewOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [previewOpen]);

  return (
    <article className="product-card">
      <button type="button" className="product-image-wrap" aria-label={`Preview ${product.name}`} onClick={() => setPreviewOpen(true)}>
        <img src={image} alt={product.name} loading="lazy" />
        {product.discountPrice !== null && <span className="product-badge">A little less</span>}
        <span className="product-card-arrow" aria-hidden="true"><Eye size={17} /></span>
      </button>
      <div className="product-info">
        <span className="product-category">{product.category}</span>
        <div className="product-title-line">
          <Link to={`/products/${product.slug}`}><h3>{product.name}</h3></Link>
          <div className="product-price">
            {product.discountPrice !== null && <span className="price-was">{formatPrice(product.price)}</span>}
            <span>{formatPrice(product.discountPrice ?? product.price)}</span>
          </div>
        </div>
        <p>{product.shortDescription}</p>
        <div className="product-quantity" aria-label={`Quantity of ${product.name} in cart`}>
          <button type="button" aria-label={`Remove one ${product.name}`} disabled={quantity === 0} onClick={() => updateQuantity(product.id, quantity - 1)}><Minus size={14} /></button>
          <span>{quantity}</span>
          <button type="button" aria-label={`Add one ${product.name}`} onClick={() => addItem(product)}><Plus size={14} /></button>
          <button type="button" className="product-order-button" onClick={() => { if (!quantity) addItem(product); navigate("/checkout"); }}>Order now</button>
        </div>
      </div>
      {previewOpen && (
        <div className="image-preview-backdrop" role="presentation" onClick={() => setPreviewOpen(false)}>
          <section className="image-preview-dialog" role="dialog" aria-modal="true" aria-label={`${product.name} image preview`} onClick={(event) => event.stopPropagation()}>
            <header><div><span className="eyebrow">{product.category}</span><h2>{product.name}</h2></div><button type="button" className="dialog-close" aria-label="Close image preview" onClick={() => setPreviewOpen(false)}><X size={18} /></button></header>
            <iframe
              title={`Large image of ${product.name}`}
              srcDoc={`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{width:100%;height:100%;margin:0;background:#f5f4ef}body{display:grid;place-items:center}img{width:100%;height:100%;object-fit:contain}</style></head><body><img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}"></body></html>`}
            />
          </section>
        </div>
      )}
    </article>
  );
}

function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <div className="empty-state"><span className="empty-icon"><Sparkles size={21} /></span><h3>Nothing here just yet</h3><p>Try a different search or come back soon for something new.</p></div>;
  }
  return <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>;
}

export function HomePage({ config }: { config: SiteConfig }) {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    api.products().then(setProducts).catch(() => setProducts([]));
  }, []);
  const sections = [...config.home.sections].filter((section) => section.enabled).sort((a, b) => a.order - b.order);
  return (
    <>
      {config.home.banner && <div className="announcement"><span>{config.home.banner}</span><ArrowRight size={14} /></div>}
      <section className="hero" style={{ backgroundColor: config.home.heroBackground }}>
        <div className="hero-copy">
          <Eyebrow>{config.home.eyebrow}</Eyebrow>
          <h1>{config.home.heading.split("\n").map((line, index) => <span key={`${line}-${index}`}>{line}{index < config.home.heading.split("\n").length - 1 && <br />}</span>)}</h1>
          <p className="hero-subheading">{config.home.subheading}</p>
          <p className="hero-description">{config.home.description}</p>
          <div className="hero-actions">
            {config.home.primaryLabel && <Link to={config.home.primaryLink || "/products"} className="button">{config.home.primaryLabel}<ArrowUpRight size={16} /></Link>}
            {config.home.secondaryLabel && <Link to={config.home.secondaryLink || "/about"} className="text-link">{config.home.secondaryLabel}<ArrowRight size={15} /></Link>}
          </div>
          <div className="hero-note"><span className="note-stars">✳</span><span>Small batches, big heart.<br />Always made with intention.</span></div>
        </div>
        <div className="hero-image">
          <img src={config.home.heroImage} alt="A calm, warmly lit living space with thoughtful details" fetchPriority="high" />
          <div className="hero-image-caption"><span>Living, a little more intentionally</span><span>01 / 04</span></div>
          <div className="hero-image-stamp"><Leaf size={16} /><span>Thoughtfully<br />made</span></div>
        </div>
        <div className="hero-index" aria-hidden="true">01 <span /> 04</div>
      </section>
      <section className="home-intro section-shell">
        <span className="intro-mark">✳</span>
        <p>Not more things.<br /><em>Better things.</em></p>
        <span className="intro-aside">Objects for everyday rituals,<br />made to feel like they belong.</span>
      </section>
      {sections.map((section, index) => section.id === "featured" ? (
        <section className="featured-section section-shell" key={section.id}>
          <div className="section-heading-row">
            <div><Eyebrow>Little things, thoughtfully made</Eyebrow><h2>{section.title}</h2><p>{section.body}</p></div>
            <Link to="/products" className="text-link">View everything <ArrowRight size={15} /></Link>
          </div>
          <ProductGrid products={products.slice(0, 4)} />
        </section>
      ) : (
        <section className={`story-band section-shell ${index % 2 ? "story-reverse" : ""}`} key={section.id}>
          {section.image && <div className="story-image"><img src={section.image} alt={section.title} loading="lazy" /></div>}
          <div className="story-copy"><Eyebrow>A slower kind of good</Eyebrow><h2>{section.title}</h2><p>{section.body}</p><Link to="/about" className="text-link">A little about us <ArrowUpRight size={16} /></Link></div>
          <span className="story-spark" aria-hidden="true">✳</span>
        </section>
      ))}
      <section className="promise-strip">
        <div><Leaf size={19} /><span>Thoughtfully sourced</span></div>
        <div><PackageCheck size={19} /><span>Made to last</span></div>
        <div><Sparkles size={19} /><span>Little details, considered</span></div>
      </section>
      <section className="closing-cta section-shell">
        <span className="eyebrow">Find your everyday favorite</span>
        <h2>A few good things<br /><em>go a long way.</em></h2>
        <Link to="/products" className="button">Shop the collection<ArrowUpRight size={16} /></Link>
        <span className="closing-flower">✳</span>
      </section>
    </>
  );
}

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All pieces");
  const [sort, setSort] = useState("featured");
  useEffect(() => {
    api.products().then(setProducts).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Products couldn't be loaded.")).finally(() => setLoading(false));
  }, []);
  const categories = useMemo(() => ["All pieces", ...new Set(products.map((product) => product.category))], [products]);
  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = products.filter((product) =>
      (category === "All pieces" || product.category === category) &&
      (!query || `${product.name} ${product.shortDescription} ${product.category}`.toLowerCase().includes(query)),
    );
    if (sort === "price-low") return filtered.sort((a, b) => (a.discountPrice ?? a.price) - (b.discountPrice ?? b.price));
    if (sort === "price-high") return filtered.sort((a, b) => (b.discountPrice ?? b.price) - (a.discountPrice ?? a.price));
    return filtered;
  }, [products, search, category, sort]);
  return (
    <div className="collection-page section-shell">
      <div className="page-intro"><Eyebrow>Useful things, lovely details</Eyebrow><h1>Good things for<br /><em>everyday living.</em></h1><p>Considered pieces for the moments that make a home feel like yours.</p></div>
      <div className="collection-toolbar">
        <div className="category-tabs" aria-label="Product categories">
          {categories.map((item) => <button key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        <div className="product-controls">
          <label className="search-control"><span className="sr-only">Search products</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find something…" /></label>
          <label className="sort-control"><span className="sr-only">Sort products</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label>
        </div>
      </div>
      <p className="result-count">{loading ? "Finding the good things…" : `${visibleProducts.length} considered ${visibleProducts.length === 1 ? "piece" : "pieces"}`}</p>
      {error ? <div className="inline-error" role="alert">{error}<button onClick={() => window.location.reload()}>Try again</button></div> : loading ? <div className="product-grid product-skeletons" aria-label="Loading products">{[1, 2, 3, 4].map((item) => <div className="skeleton" key={item} />)}</div> : <ProductGrid products={visibleProducts} />}
    </div>
  );
}

export function ProductDetailPage({ config }: { config: SiteConfig }) {
  const { slug = "" } = useParams();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setProduct(null);
    api.product(slug).then(setProduct).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "This product could not be found."));
  }, [slug]);
  if (error) return <section className="not-found"><Eyebrow>Out of the collection</Eyebrow><h1>We couldn't find that piece.</h1><Link to="/products" className="button">Back to the collection</Link></section>;
  if (!product) return <div className="detail-loading" role="status">Finding your piece…</div>;
  return (
    <section className="product-detail section-shell">
      <div className="detail-image"><img src={product.image} alt={product.name} />{product.gallery.map((image) => <img key={image} src={image} alt={`${product.name} detail`} loading="lazy" />)}</div>
      <div className="detail-copy"><Link to="/products" className="back-link">← All pieces</Link><Eyebrow>{product.category}{product.sku && ` · ${product.sku}`}</Eyebrow><h1>{product.name}</h1><p className="detail-short">{product.shortDescription}</p><div className="detail-price">{product.discountPrice !== null && <span className="price-was">{formatPrice(product.price)}</span>}<strong>{formatPrice(product.discountPrice ?? product.price)}</strong></div><p>{product.description}</p><div className="detail-actions"><a href={`mailto:${config.contact.email}?subject=${encodeURIComponent(`Question about ${product.name}`)}`} className="button button-light">{product.ctaLabel || "Ask us about this piece"}<ArrowUpRight size={16} /></a><button onClick={() => { addItem(product); navigate("/cart"); }} className="button">Add to cart</button><button onClick={() => { addItem(product); navigate("/checkout"); }} className="button button-outline">Order now</button></div><div className="detail-promise"><Leaf size={17} />Thoughtfully sourced, ready for everyday.</div></div>
    </section>
  );
}

export function AboutPage({ config }: { config: SiteConfig }) {
  const { about } = config;
  const sections = [...about.sections].filter((section) => section.enabled).sort((a, b) => a.order - b.order);
  return (
    <div className="about-page">
      <section className="about-hero section-shell"><Eyebrow>A little about us</Eyebrow><h1>{about.heading}</h1><p>{about.introduction}</p><span className="about-asterisk">✳</span></section>
      <div className="about-image section-shell"><img src={about.image} alt="Warm, considered interior details in a home" /></div>
      <section className="about-story section-shell"><div><Eyebrow>Where it all began</Eyebrow><h2>A simpler kind<br />of <em>good.</em></h2></div><p>{about.history}</p></section>
      <section className="values-grid section-shell">
        <article><span className="value-icon">01</span><h3>Our mission</h3><p>{about.mission}</p></article>
        <article><span className="value-icon">02</span><h3>Our vision</h3><p>{about.vision}</p></article>
        <article><span className="value-icon">03</span><h3>What we believe</h3><p>{about.values.split("\n").filter(Boolean).join(" · ")}</p></article>
      </section>
      {about.team.some((member) => member.enabled) && <section className="team-section section-shell"><div className="team-heading"><Eyebrow>The people behind it</Eyebrow><h2>Good work takes<br /><em>good people.</em></h2></div><div className="team-grid">{about.team.filter((member) => member.enabled).map((member) => <article className="team-card" key={member.id}>{member.image && <img src={member.image} alt={member.name} loading="lazy" />}<h3>{member.name}</h3><span>{member.role}</span><p>{member.bio}</p></article>)}</div></section>}
      {sections.map((section) => <section className="about-custom-section section-shell" key={section.id}>{section.image && <img src={section.image} alt={section.title} />}<div><Eyebrow>Made with care</Eyebrow><h2>{section.title}</h2><p>{section.body}</p></div></section>)}
      <section className="about-end"><span>Good things take good people.</span><Link to="/contact" className="text-link">Come say hello <ArrowRight size={16} /></Link></section>
    </div>
  );
}

export function ContactPage({ config }: { config: SiteConfig }) {
  const labels = config.contact.formLabels;
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", website: "" });
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setError("");
    try {
      const result = await api.contact(form);
      setError(result.message);
      setState("success");
      setForm({ name: "", email: "", subject: "", message: "", website: "" });
    } catch (reason) {
      setState("error");
      setError(reason instanceof Error ? reason.message : "Your message couldn't be sent. Please try again.");
    }
  }
  return (
    <div className="contact-page section-shell">
      <div className="contact-heading"><Eyebrow>Good conversations start here</Eyebrow><h1>{config.contact.heading}</h1><p>{config.contact.introduction}</p><div className="contact-flower">✳</div></div>
      <div className="contact-layout">
        <form className="contact-form" onSubmit={submit}>
          <div className="form-row"><label>{labels.name}<input required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Jane Smith" /></label><label>{labels.email}<input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="jane@example.com" /></label></div>
          <label>{labels.subject}<input required minLength={2} maxLength={160} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="A question about an order…" /></label>
          <label>{labels.message}<textarea required minLength={10} maxLength={5000} rows={5} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Tell us a little more…" /></label>
          <label className="honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></label>
          <div className="contact-submit"><button className="button" disabled={state === "sending"}>{state === "sending" ? "Sending…" : labels.submit}<ArrowUpRight size={16} /></button><span>We usually reply within one business day.</span></div>
          {state !== "idle" && <p className={`form-feedback ${state}`} role={state === "error" ? "alert" : "status"}>{error}</p>}
        </form>
        <aside className="contact-card">
          <span className="contact-card-title">A few helpful details</span>
          <div className="contact-detail"><span>Email</span><a href={`mailto:${config.contact.email}`}>{config.contact.email}</a></div>
          <div className="contact-detail"><span>Phone</span><a href={`tel:${config.contact.phone.replace(/[^\d+]/g, "")}`}>{config.contact.phone}</a></div>
          <div className="contact-detail"><span>Come by</span><p>{config.contact.address}</p></div>
          <div className="contact-detail"><span>We're around</span><p>{config.contact.hours}</p></div>
          <div className="social-links"><a href={config.contact.instagram} target="_blank" rel="noreferrer"><Instagram size={16} /> Instagram <ArrowUpRight size={14} /></a><a href={config.contact.facebook} target="_blank" rel="noreferrer">Facebook <ArrowUpRight size={14} /></a></div>
        </aside>
      </div>
      <div className="contact-signoff"><span>Made with care, for the everyday.</span><span>✳</span></div>
    </div>
  );
}

export function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, total } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <section className="empty-cart section-shell">
        <ShoppingCart size={40} />
        <h2>Your cart is empty</h2>
        <p>Looks like you haven't added anything yet.</p>
        <Link to="/products" className="button">Start shopping<ArrowRight size={16} /></Link>
      </section>
    );
  }

  return (
    <section className="cart-page section-shell">
      <div className="cart-heading"><div><Eyebrow>Your considered picks</Eyebrow><h1>Your cart</h1></div><Link to="/products" className="text-link">Keep browsing <ArrowRight size={15} /></Link></div>
      <div className="cart-layout">
      <div className="cart-items">
        {items.map((item) => (
          <article key={item.productId} className="cart-item">
            <img src={item.image} alt={item.name} />
            <div className="cart-item-info">
              <h3>{item.name}</h3>
              <span className="cart-item-price">{formatPrice(item.price)}</span>
            </div>
            <div className="cart-item-controls">
              <button aria-label={`Remove one ${item.name}`} onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="qty-btn"><Minus size={15} /></button>
              <span>{item.quantity}</span>
              <button aria-label={`Add one ${item.name}`} onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="qty-btn"><Plus size={15} /></button>
              <button onClick={() => removeItem(item.productId)} className="remove-btn">Remove</button>
            </div>
          </article>
        ))}
      </div>
      <div className="cart-summary">
        <span className="eyebrow">A good choice</span><h2>Order summary</h2>
        <div className="summary-row"><span>{items.reduce((sum, item) => sum + item.quantity, 0)} items</span><span>{formatPrice(total)}</span></div>
        <div className="summary-row summary-total"><strong>Total</strong><strong>{formatPrice(total)}</strong></div>
        <p>Choose your preferred payment method during checkout. No payment is taken online.</p>
        <button className="button" onClick={() => navigate("/checkout")}>Checkout <ArrowRight size={16} /></button>
        <button className="text-link cart-clear" onClick={clearCart}>Clear cart</button>
      </div>
      </div>
    </section>
  );
}

export function CheckoutPage() {
  const { items, total } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [state, setState] = useState<"idle" | "placing" | "error">("idle");
  const [error, setError] = useState("");

  if (items.length === 0) {
    return (
      <section className="empty-cart section-shell">
        <ShoppingCart size={40} />
        <h2>Your cart is empty</h2>
        <Link to="/products" className="button">Start shopping<ArrowRight size={16} /></Link>
      </section>
    );
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("placing");
    setError("");
    try {
      const result = await api.order({
        customerName: form.name,
        customerPhone: form.phone,
        customerAddress: form.address,
        paymentMethod,
        items,
        total,
      });
      const receipt: OrderReceipt = {
        orderId: result.orderId,
        serialNumber: result.serialNumber,
        customerName: form.name,
        customerPhone: form.phone,
        customerAddress: form.address,
        paymentMethod,
        items,
        total,
      };
      let storageUnavailable = false;
      try {
        sessionStorage.setItem(`atelier_order_${result.orderId}`, JSON.stringify(receipt));
      } catch {
        storageUnavailable = true;
      }
      navigate(`/order-confirmed/${result.orderId}`, { state: { receipt, storageUnavailable } });
    } catch (reason) {
      setState("error");
      setError(reason instanceof Error ? reason.message : "Your order couldn't be placed. Please try again.");
    }
  }

  return (
    <section className="checkout-page section-shell">
      <div className="checkout-heading"><Eyebrow>Almost yours</Eyebrow><h1>Complete your order</h1><p>A few details, then we’ll prepare your order list.</p></div>
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={placeOrder}>
          <h2>Your details</h2>
          <div className="form-row">
            <label><span><User size={16} /> Name</span><input required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Jane Smith" /></label>
            <label><span><Phone size={16} /> Phone</span><input required type="tel" maxLength={50} autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+91 98765 43210" /></label>
          </div>
          <label><span><MapPin size={16} /> Delivery address</span><input required minLength={5} maxLength={500} autoComplete="shipping street-address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="123, Main Street" /></label>
          <label className="payment-method-field"><span>Payment method (for identification only)</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}><option value="Cash">Cash</option><option value="UPI (GPay / Other apps)">UPI (GPay / Other apps)</option><option value="Card">Card</option></select></label>
          <p className="payment-note">There is no online payment integration. Your selection is recorded with the order only.</p>
          {state !== "idle" && <p className={`form-feedback ${state}`} role={state === "error" ? "alert" : "status"}>{error || "Placing order…"}</p>}
          <button className="button checkout-submit" disabled={state === "placing"}>{state === "placing" ? "Preparing order…" : "Place order"}<ArrowRight size={16} /></button>
        </form>
        <aside className="checkout-summary">
          <span className="eyebrow">Your list</span><h2>Order summary</h2>
          <div className="checkout-items">{items.map((item) => <div className="checkout-item" key={item.productId}><img src={item.image} alt="" /><div><strong>{item.name}</strong><span>Qty {item.quantity} · {formatPrice(item.price)} each</span></div><b>{formatPrice(item.price * item.quantity)}</b></div>)}</div>
          <div className="summary-row summary-total"><strong>Total</strong><strong>{formatPrice(total)}</strong></div>
          <p>Your order list and payment preference will be available as a PDF once placed.</p>
        </aside>
      </div>
    </section>
  );
}

export function OrderConfirmationPage() {
  const { id } = useParams();
  const location = useLocation();
  const state = location.state as { receipt?: OrderReceipt; storageUnavailable?: boolean } | null;
  const [storedReceipt] = useState<OrderReceipt | null>(() => {
    if (!id) return null;
    try {
      const raw = sessionStorage.getItem(`atelier_order_${id}`);
      return raw ? JSON.parse(raw) as OrderReceipt : null;
    } catch {
      return null;
    }
  });
  const receipt = state?.receipt ?? storedReceipt;
  return (
    <section className="order-confirmation section-shell">
      <div className="confirmation-mark"><CheckCircle2 size={32} /></div>
      <Eyebrow>Thank you, {receipt?.customerName || "your order is in"}</Eyebrow>
      <h1>Order placed.</h1>
      <p>Your order number is <strong>{id}</strong>. Your list is ready below.</p>
      {receipt ? (
        <div className="confirmation-order">
          <div className="confirmation-meta"><span>Payment preference</span><strong>{receipt.paymentMethod}</strong><small>No payment has been processed.</small></div>
          <div className="confirmation-items">{receipt.items.map((item) => <div key={item.productId}><span>{item.name} <small>× {item.quantity}</small></span><strong>{formatPrice(item.price * item.quantity)}</strong></div>)}</div>
          <div className="summary-row summary-total"><strong>Total</strong><strong>{formatPrice(receipt.total)}</strong></div>
          <button type="button" className="button" onClick={() => downloadOrderPdf(receipt)}><Download size={16} /> Download order PDF</button>
          {state?.storageUnavailable && <p className="pdf-storage-warning" role="status">This browser could not save your order summary for later. Download the PDF now to keep a copy.</p>}
        </div>
      ) : (
        <p className="confirmation-unavailable">The order summary is not available in this browser session. If you have already downloaded your PDF, you can continue shopping.</p>
      )}
      <Link to="/products" className="text-link confirmation-continue">Continue shopping<ArrowRight size={16} /></Link>
    </section>
  );
}
