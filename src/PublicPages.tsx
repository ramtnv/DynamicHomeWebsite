import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, CheckCircle2, Instagram, Leaf, MapPin, PackageCheck, Phone, ShoppingCart, Sparkles, User } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "./api";
import { useCart } from "./CartContext";
import type { Product, SiteConfig } from "./types";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="eyebrow"><span className="eyebrow-dot" />{children}</span>;
}

function formatPrice(price: number) {
  return "₹" + price.toFixed(2);
}

function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  return (
    <article className="product-card">
      <Link to={`/products/${product.slug}`} className="product-image-wrap" aria-label={`View ${product.name}`}>
        <img src={product.image || "https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=900&q=80"} alt={product.name} loading="lazy" />
        {product.discountPrice !== null && <span className="product-badge">A little less</span>}
        <span className="product-card-arrow" aria-hidden="true"><ArrowUpRight size={17} /></span>
      </Link>
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
        <button onClick={(event) => { event.stopPropagation(); addItem(product); }} className="button">Add to cart</button>
      </div>
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
      <div className="detail-copy"><Link to="/products" className="back-link">← All pieces</Link><Eyebrow>{product.category}{product.sku && ` · ${product.sku}`}</Eyebrow><h1>{product.name}</h1><p className="detail-short">{product.shortDescription}</p><div className="detail-price">{product.discountPrice !== null && <span className="price-was">{formatPrice(product.price)}</span>}<strong>{formatPrice(product.discountPrice ?? product.price)}</strong></div><p>{product.description}</p><a href={`mailto:${config.contact.email}?subject=${encodeURIComponent(`Question about ${product.name}`)}`} className="button">{product.ctaLabel || "Ask us about this piece"}<ArrowUpRight size={16} /></a><button onClick={() => { addItem(product); navigate("/cart"); }} className="button">Add to cart</button><div className="detail-promise"><Leaf size={17} />Thoughtfully sourced, ready for everyday.</div></div>
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
      <h2>Your cart</h2>
      <div className="cart-items">
        {items.map((item) => (
          <article key={item.productId} className="cart-item">
            <img src={item.image} alt={item.name} />
            <div className="cart-item-info">
              <h3>{item.name}</h3>
              <span className="cart-item-price">{formatPrice(item.price)}</span>
            </div>
            <div className="cart-item-controls">
              <button onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))} className="qty-btn">−</button>
              <span>{item.quantity}</span>
              <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="qty-btn">+</button>
              <button onClick={() => removeItem(item.productId)} className="remove-btn">Remove</button>
            </div>
          </article>
        ))}
      </div>
      <div className="cart-summary">
        <div className="summary-row"><span>Total</span><span>{formatPrice(total)}</span></div>
        <button className="button" onClick={() => navigate("/checkout")}>Checkout</button>
        <button className="text-link" onClick={clearCart}>Clear cart</button>
      </div>
    </section>
  );
}

export function CheckoutPage() {
  const { items, total } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", address: "", email: "" });
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
      const result = await api.order({ customerName: form.name, customerPhone: form.phone, customerAddress: form.address, items, total });
      navigate(`/order-confirmed/${result.orderId}`);
    } catch (reason) {
      setState("error");
      setError(reason instanceof Error ? reason.message : "Your order couldn't be placed. Please try again.");
    }
  }

  return (
    <section className="checkout-page section-shell">
      <h2>Checkout</h2>
      <form className="checkout-form" onSubmit={placeOrder}>
        <div className="form-row">
          <label><User size={16} /> Name<input required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Jane Smith" /></label>
          <label><Phone size={16} /> Phone<input required type="tel" maxLength={50} autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+91 98765 43210" /></label>
        </div>
        <label><MapPin size={16} /> Address<input required minLength={5} maxLength={500} autoComplete="shipping street-address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="123, Main Street" /></label>
        <div className="checkout-total">Total: {formatPrice(total)} ({items.reduce((sum, item) => sum + item.quantity, 0)} items)</div>
        <button className="button" disabled={state === "placing"}>{state === "placing" ? "Placing order…" : "Place order"}</button>
        {state !== "idle" && <p className={`form-feedback ${state}`} role={state === "error" ? "alert" : "status"}>{error || "Placing order…"}</p>}
      </form>
    </section>
  );
}

export function OrderConfirmationPage() {
  const { id } = useParams();
  return (
    <section className="order-confirmation section-shell">
      <CheckCircle2 size={48} />
      <h2>Order placed</h2>
      <p>Thank you for your order. Your order number is {id}.</p>
      <Link to="/products" className="button">Continue shopping<ArrowRight size={16} /></Link>
    </section>
  );
}


