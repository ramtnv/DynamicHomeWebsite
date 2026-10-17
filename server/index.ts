import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, promises as fs } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { db } from "./db.js";
import { type SiteConfig } from "./defaults.js";

declare global {
  namespace Express {
    interface Request {
      adminId?: number;
      sessionHash?: string;
      csrfToken?: string;
    }
  }
}

const app = express();
const port = Number(process.env.PORT ?? 3001);
const isProduction = process.env.NODE_ENV === "production";
const sessionLifetime = 8 * 60 * 60 * 1000;
const uploadDirectory = resolve(process.env.UPLOAD_DIRECTORY ?? "data/uploads");
mkdirSync(uploadDirectory, { recursive: true });

app.disable("x-powered-by");
if (isProduction) app.set("trust proxy", 1);
app.use((request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (isProduction) {
    response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    response.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  }
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use("/api", (_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/uploads", express.static(uploadDirectory, { maxAge: isProduction ? "7d" : 0 }));

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const contactAttempts = new Map<string, { count: number; resetAt: number }>();
function limitByIp(
  store: Map<string, { count: number; resetAt: number }>,
  maximum: number,
  windowMs: number,
) {
  return (request: Request, response: Response, next: NextFunction) => {
    const key = request.ip ?? request.socket.remoteAddress ?? "unknown";
    const now = Date.now();
    let entry = store.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > maximum) {
      response.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }
    next();
  };
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
function cookieValue(request: Request, name: string): string | undefined {
  return request.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
function requireAdmin(request: Request, response: Response, next: NextFunction) {
  const token = cookieValue(request, "atelier_session");
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    response.status(401).json({ error: "Please sign in to continue." });
    return;
  }
  const session = db.prepare(`
    SELECT admin_id AS adminId, csrf_token AS csrfToken, expires_at AS expiresAt
    FROM sessions WHERE token_hash = ?
  `).get(hashToken(token)) as
    | { adminId: number; csrfToken: string; expiresAt: number }
    | undefined;
  if (!session || session.expiresAt <= Date.now()) {
    if (session) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
    response.clearCookie("atelier_session", { httpOnly: true, sameSite: "lax", secure: isProduction, path: "/" });
    response.status(401).json({ error: "Your session has expired. Please sign in again." });
    return;
  }
  request.adminId = session.adminId;
  request.sessionHash = hashToken(token);
  request.csrfToken = session.csrfToken;
  next();
}
function requireCsrf(request: Request, response: Response, next: NextFunction) {
  const supplied = request.get("x-csrf-token");
  const expected = request.csrfToken;
  if (!supplied || !expected) {
    response.status(403).json({ error: "Request verification failed. Refresh and try again." });
    return;
  }
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    response.status(403).json({ error: "Request verification failed. Refresh and try again." });
    return;
  }
  next();
}
const protectChanges = [requireAdmin, requireCsrf];
function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}
function productView(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    description: row.description,
    image: row.image,
    gallery: parseJson<string[]>(String(row.gallery_json)),
    price: row.price,
    discountPrice: row.discount_price,
    category: row.category,
    sku: row.sku,
    active: Boolean(row.active),
    published: Boolean(row.published),
    ctaLabel: row.cta_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
const mediaUrlSchema = z.string().max(2048).refine(
  (value) => value === "" || value.startsWith("/uploads/") || /^https:\/\//i.test(value),
  "Use an HTTPS image URL or upload an image.",
);
const linkSchema = z.string().max(400).refine(
  (value) => value === "" || /^\/(?!\/)/.test(value) || /^https?:\/\//i.test(value),
  "Use a safe website link.",
);
const productSchema = z.object({
  name: z.string().trim().min(2).max(100),
  shortDescription: z.string().trim().min(2).max(240),
  description: z.string().trim().min(2).max(5000),
  image: mediaUrlSchema,
  gallery: z.array(mediaUrlSchema).max(8),
  price: z.number().finite().min(0).max(1_000_000),
  discountPrice: z.number().finite().min(0).max(1_000_000).nullable(),
  category: z.string().trim().min(1).max(60),
  sku: z.string().trim().max(80),
  active: z.boolean(),
  published: z.boolean(),
  ctaLabel: z.string().trim().max(60),
});
const emailSchema = z.email();
const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  subject: z.string().trim().min(2).max(160),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(300).optional(),
});
const configSchema = z.object({
  site: z.object({
    companyName: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(320),
    logo: mediaUrlSchema,
    favicon: mediaUrlSchema,
    footer: z.string().max(300),
  }),
  theme: z.object({
    themeName: z.string().max(60),
    primary: z.string().regex(/^#[\da-f]{6}$/i),
    secondary: z.string().regex(/^#[\da-f]{6}$/i),
    accent: z.string().regex(/^#[\da-f]{6}$/i),
    page: z.string().regex(/^#[\da-f]{6}$/i),
    surface: z.string().regex(/^#[\da-f]{6}$/i),
    heading: z.string().regex(/^#[\da-f]{6}$/i),
    body: z.string().regex(/^#[\da-f]{6}$/i),
    muted: z.string().regex(/^#[\da-f]{6}$/i),
    link: z.string().regex(/^#[\da-f]{6}$/i),
    linkHover: z.string().regex(/^#[\da-f]{6}$/i),
    button: z.string().regex(/^#[\da-f]{6}$/i),
    buttonText: z.string().regex(/^#[\da-f]{6}$/i),
    buttonHover: z.string().regex(/^#[\da-f]{6}$/i),
    border: z.string().regex(/^#[\da-f]{6}$/i),
    header: z.string().regex(/^#[\da-f]{6}$/i),
    navigation: z.string().regex(/^#[\da-f]{6}$/i),
    footer: z.string().regex(/^#[\da-f]{6}$/i),
    footerText: z.string().regex(/^#[\da-f]{6}$/i),
    font: z.enum(["Inter", "DM Sans", "Manrope", "Lato", "Open Sans", "Source Sans 3", "Roboto", "Georgia", "Arial", "system-ui"]),
    headingFont: z.enum(["Playfair Display", "Lora", "Merriweather", "Georgia", "Inter", "DM Sans", "Manrope"]),
    typographyScale: z.number().min(0.9).max(1.6),
    radius: z.number().int().min(0).max(32),
    contentWidth: z.number().int().min(800).max(1800),
    cardShadow: z.enum(["none", "soft", "lifted"]),
    sectionSpacing: z.number().int().min(40).max(180),
  }),
  home: z.object({
    eyebrow: z.string().max(140),
    heading: z.string().min(1).max(200),
    subheading: z.string().max(200),
    description: z.string().max(1000),
    heroImage: mediaUrlSchema,
    heroBackground: z.string().regex(/^#[\da-f]{6}$/i),
    primaryLabel: z.string().max(60),
    primaryLink: linkSchema,
    secondaryLabel: z.string().max(60),
    secondaryLink: linkSchema,
    banner: z.string().max(300),
    sections: z.array(z.object({
      id: z.string().min(1).max(80),
      title: z.string().max(200),
      body: z.string().max(1000),
      image: mediaUrlSchema,
      enabled: z.boolean(),
      order: z.number().int().min(0).max(100),
    })).max(20),
  }),
  about: z.object({
    heading: z.string().max(200),
    introduction: z.string().max(2000),
    history: z.string().max(4000),
    mission: z.string().max(2000),
    vision: z.string().max(2000),
    values: z.string().max(2000),
    image: mediaUrlSchema,
    sections: z.array(z.object({
      id: z.string().min(1).max(80),
      title: z.string().max(200),
      body: z.string().max(1000),
      image: mediaUrlSchema,
      enabled: z.boolean(),
      order: z.number().int().min(0).max(100),
    })).max(20),
    team: z.array(z.object({
      id: z.string().min(1).max(80),
      name: z.string().max(100),
      role: z.string().max(120),
      bio: z.string().max(500),
      image: mediaUrlSchema,
      enabled: z.boolean(),
    })).max(50),
  }),
  contact: z.object({
    heading: z.string().max(200),
    introduction: z.string().max(1000),
    email: emailSchema,
    phone: z.string().max(80),
    address: z.string().max(500),
    hours: z.string().max(300),
    instagram: z.string().max(400).refine((value) => value === "" || /^https?:\/\//i.test(value), "Social links must use HTTPS or HTTP."),
    facebook: z.string().max(400).refine((value) => value === "" || /^https?:\/\//i.test(value), "Social links must use HTTPS or HTTP."),
    successMessage: z.string().max(300),
    formLabels: z.object({
      name: z.string().trim().min(1).max(60),
      email: z.string().trim().min(1).max(60),
      subject: z.string().trim().min(1).max(60),
      message: z.string().trim().min(1).max(60),
      submit: z.string().trim().min(1).max(60),
    }),
  }),
});
type ProductInput = z.infer<typeof productSchema>;

app.get("/api/site", (_request, response) => {
  const row = db.prepare("SELECT published_json FROM site_config WHERE id = 1").get() as {
    published_json: string;
  };
  response.json(parseJson<SiteConfig>(row.published_json));
});
app.get("/api/products", (request, response) => {
  const category = typeof request.query.category === "string" ? request.query.category : undefined;
  const search = typeof request.query.search === "string" ? `%${request.query.search.trim()}%` : undefined;
  const sort = typeof request.query.sort === "string" ? request.query.sort : "featured";
  const orderBy = sort === "price-low" ? "price ASC" : sort === "price-high" ? "price DESC" : "sort_order ASC, created_at DESC, id DESC";
  const conditions = ["published = 1", "active = 1"];
  const values: (string | number)[] = [];
  if (category) {
    conditions.push("category = ?");
    values.push(category);
  }
  if (search) {
    conditions.push("(name LIKE ? OR short_description LIKE ? OR category LIKE ?)");
    values.push(search, search, search);
  }
  const rows = db.prepare(
    `SELECT * FROM products WHERE ${conditions.join(" AND ")} ORDER BY ${orderBy}`,
  ).all(...values) as Record<string, unknown>[];
  response.json(rows.map(productView));
});
app.get("/api/products/:slug", (request, response) => {
  const row = db.prepare(
    "SELECT * FROM products WHERE slug = ? AND published = 1 AND active = 1",
  ).get(request.params.slug) as Record<string, unknown> | undefined;
  if (!row) {
    response.status(404).json({ error: "Product not found." });
    return;
  }
  response.json(productView(row));
});
app.post("/api/contact", limitByIp(contactAttempts, 8, 60 * 60 * 1000), (request, response) => {
  const parsed = contactSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Please check your details." });
    return;
  }
  if (parsed.data.website) {
    response.status(200).json({ message: "Your message has been received." });
    return;
  }
  db.prepare(
    "INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)",
  ).run(parsed.data.name, parsed.data.email, parsed.data.subject, parsed.data.message);
  const row = db.prepare("SELECT published_json FROM site_config WHERE id = 1").get() as { published_json: string };
  const config = parseJson<SiteConfig>(row.published_json);
  response.status(201).json({ message: config.contact.successMessage });
});


app.post("/api/orders", (request, response) => {
  const orderItemSchema = z.object({
    productId: z.number(),
    name: z.string().trim().min(1).max(200),
    price: z.number().finite().min(0),
    image: z.string(),
    quantity: z.number(),
  });
  const orderSchema = z.object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(5).max(80),
    address: z.string().trim().min(5).max(500),
    paymentMethod: z.enum(["Cash", "UPI (GPay / Other apps)", "Card"]),
    items: z.array(orderItemSchema).min(1),
    total: z.number().finite().min(0),
  });
  const parsed = orderSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues[0]?.message ?? "The order is invalid." });
    return;
  }
  const { name, phone, address, paymentMethod, items, total } = parsed.data;
  let orderId = `ATL-${Date.now()}-${randomBytes(2).toString("hex")}`;
  while (db.prepare("SELECT 1 FROM orders WHERE order_id = ?").get(orderId)) {
    orderId += randomBytes(2).toString("hex");
  }
  const serialNumber = randomBytes(4).toString("hex").toUpperCase();
  const result = db.prepare(
    "INSERT INTO orders (order_id, serial_number, customer_name, customer_phone, customer_address, items_json, total, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(orderId, serialNumber, name, phone, address, JSON.stringify(items), total, paymentMethod);
  response.status(201).json({ id: result.lastInsertRowid, orderId, serialNumber });
});

app.post("/api/auth/login", limitByIp(loginAttempts, 8, 15 * 60 * 1000), async (request, response) => {
  const parsed = z.object({ email: emailSchema, password: z.string().min(1).max(200) }).safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Enter a valid email and password." });
    return;
  }
  const admin = db.prepare("SELECT id, password_hash FROM admins WHERE email = ? COLLATE NOCASE").get(
    parsed.data.email,
  ) as { id: number; password_hash: string } | undefined;
  if (!admin || !(await bcrypt.compare(parsed.data.password, admin.password_hash))) {
    response.status(401).json({ error: "Email or password is incorrect." });
    return;
  }
  const token = randomBytes(32).toString("hex");
  const csrfToken = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + sessionLifetime;
  db.prepare("INSERT INTO sessions (token_hash, admin_id, csrf_token, expires_at) VALUES (?, ?, ?, ?)").run(
    hashToken(token),
    admin.id,
    csrfToken,
    expiresAt,
  );
  response.cookie("atelier_session", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: sessionLifetime,
  });
  response.json({ authenticated: true, csrfToken });
});
app.get("/api/auth/session", (request, response) => {
  const token = cookieValue(request, "atelier_session");
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    response.json({ authenticated: false });
    return;
  }
  const tokenHash = hashToken(token);
  const session = db.prepare("SELECT csrf_token AS csrfToken, expires_at AS expiresAt FROM sessions WHERE token_hash = ?").get(
    tokenHash,
  ) as { csrfToken: string; expiresAt: number } | undefined;
  if (!session || session.expiresAt <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
    response.clearCookie("atelier_session", { httpOnly: true, sameSite: "lax", secure: isProduction, path: "/" });
    response.json({ authenticated: false });
    return;
  }
  response.json({ authenticated: true, csrfToken: session.csrfToken });
});
app.post("/api/auth/logout", requireAdmin, requireCsrf, (request, response) => {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(request.sessionHash);
  response.clearCookie("atelier_session", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  });
  response.json({ authenticated: false });
});
app.get("/api/admin/config", requireAdmin, (request, response) => {
  const row = db.prepare("SELECT draft_json, published_json FROM site_config WHERE id = 1").get() as {
    draft_json: string;
    published_json: string;
  };
  response.json({
    draft: parseJson<SiteConfig>(row.draft_json),
    published: parseJson<SiteConfig>(row.published_json),
    csrfToken: request.csrfToken,
  });
});
app.put("/api/admin/config", protectChanges, (request: Request, response: Response) => {
  const parsed = configSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues[0]?.message ?? "The settings are invalid." });
    return;
  }
  const color = (hex: string) => {
    const channels = hex.slice(1).match(/.{2}/g)!.map((part) => parseInt(part, 16) / 255);
    const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
  };
  const contrast = (first: string, second: string) => {
    const values = [color(first), color(second)].sort((a, b) => b - a);
    return (values[0]! + 0.05) / (values[1]! + 0.05);
  };
  const rgb = (hex: string) => hex.slice(1).match(/.{2}/g)!.map((part) => parseInt(part, 16));
  const hexColor = (channels: number[]) =>
    `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  function suggestAccessibleColor(adjustable: string, fixed: string) {
    const original = rgb(adjustable);
    const candidates = ["#000000", "#FFFFFF"].flatMap((endpoint) => {
      if (contrast(endpoint, fixed) < 4.55) return [];
      const target = rgb(endpoint);
      let low = 0;
      let high = 1;
      for (let iteration = 0; iteration < 24; iteration += 1) {
        const middle = (low + high) / 2;
        const sample = hexColor(original.map((channel, index) =>
          channel + (target[index]! - channel) * middle,
        ));
        if (contrast(sample, fixed) >= 4.55) high = middle;
        else low = middle;
      }
      const suggested = hexColor(original.map((channel, index) =>
        channel + (target[index]! - channel) * high,
      ));
      return [{
        color: suggested,
        ratio: contrast(suggested, fixed),
        distance: rgb(suggested).reduce((total, channel, index) =>
          total + (channel - original[index]!) ** 2, 0,
        ),
      }];
    });
    return candidates.sort((first, second) => first.distance - second.distance)[0];
  }
  const theme = parsed.data.theme;
  const paletteLocation = "Theme & Appearance > Your color palette";
  const paletteColor = (label: string, value: string) => ({ label, value, location: paletteLocation });
  const homepageColor = (label: string, value: string) => ({
    label,
    value,
    location: "Homepage > Hero background color",
  });
  const contrastPairs = [
    { foreground: paletteColor("Body text", theme.body), background: paletteColor("Page background", theme.page) },
    { foreground: paletteColor("Body text", theme.body), background: paletteColor("Card background", theme.surface) },
    { foreground: paletteColor("Heading text", theme.heading), background: paletteColor("Page background", theme.page) },
    { foreground: paletteColor("Heading text", theme.heading), background: paletteColor("Card background", theme.surface) },
    { foreground: paletteColor("Muted text", theme.muted), background: paletteColor("Page background", theme.page) },
    { foreground: paletteColor("Muted text", theme.muted), background: paletteColor("Card background", theme.surface) },
    { foreground: paletteColor("Link text", theme.link), background: paletteColor("Page background", theme.page) },
    { foreground: paletteColor("Link text", theme.link), background: paletteColor("Card background", theme.surface) },
    { foreground: paletteColor("Link hover text", theme.linkHover), background: paletteColor("Page background", theme.page) },
    { foreground: paletteColor("Link hover text", theme.linkHover), background: paletteColor("Card background", theme.surface) },
    { foreground: paletteColor("Body text", theme.body), background: homepageColor("Hero background", parsed.data.home.heroBackground) },
    { foreground: paletteColor("Heading text", theme.heading), background: homepageColor("Hero background", parsed.data.home.heroBackground) },
    { foreground: paletteColor("Muted text", theme.muted), background: homepageColor("Hero background", parsed.data.home.heroBackground) },
    { foreground: paletteColor("Heading text", theme.heading), background: paletteColor("Header background", theme.header) },
    { foreground: paletteColor("Navigation text", theme.navigation), background: paletteColor("Header background", theme.header) },
    { foreground: paletteColor("Footer text", theme.footerText), background: paletteColor("Footer background", theme.footer) },
    { foreground: paletteColor("Button text", theme.buttonText), background: paletteColor("Button background", theme.button) },
    { foreground: paletteColor("Button text", theme.buttonText), background: paletteColor("Button hover background", theme.buttonHover) },
  ];
  const failingPair = contrastPairs.find(({ foreground, background }) =>
    contrast(foreground.value, background.value) < 4.5,
  );
  if (failingPair) {
    const ratio = contrast(failingPair.foreground.value, failingPair.background.value);
    const foregroundColor = `${failingPair.foreground.label} (#${failingPair.foreground.value.slice(1).toUpperCase()})`;
    const backgroundColor = `${failingPair.background.label} (#${failingPair.background.value.slice(1).toUpperCase()})`;
    const action = failingPair.foreground.location === failingPair.background.location
      ? `Change either ${foregroundColor} or ${backgroundColor} in ${failingPair.foreground.location}.`
      : `Change ${foregroundColor} in ${failingPair.foreground.location} or ${backgroundColor} in ${failingPair.background.location}.`;
    const foregroundSuggestion = suggestAccessibleColor(
      failingPair.foreground.value,
      failingPair.background.value,
    );
    const backgroundSuggestion = suggestAccessibleColor(
      failingPair.background.value,
      failingPair.foreground.value,
    );
    const suggestion = [
      foregroundSuggestion && {
        field: failingPair.foreground,
        color: foregroundSuggestion.color,
        ratio: foregroundSuggestion.ratio,
        distance: foregroundSuggestion.distance,
        unchanged: failingPair.background,
      },
      backgroundSuggestion && {
        field: failingPair.background,
        color: backgroundSuggestion.color,
        ratio: backgroundSuggestion.ratio,
        distance: backgroundSuggestion.distance,
        unchanged: failingPair.foreground,
      },
    ].filter((candidate) => candidate !== undefined)
      .sort((first, second) => first.distance - second.distance)[0];
    const suggestedFix = suggestion
      ? ` Example fix: change ${suggestion.field.label} to ${suggestion.color} in ${suggestion.field.location} (contrast ${suggestion.ratio.toFixed(2)}:1), keeping ${suggestion.unchanged.label} ${suggestion.unchanged.value.toUpperCase()} unchanged.`
      : "";
    response.status(400).json({
      error: `${failingPair.foreground.label} and ${failingPair.background.label} need a contrast ratio of at least 4.5:1 (currently ${ratio.toFixed(2)}:1). ${action}${suggestedFix}`,
    });
    return;
  }
  db.prepare("UPDATE site_config SET draft_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1").run(
    JSON.stringify(parsed.data),
  );
  response.json({ saved: true });
});
app.post("/api/admin/publish", protectChanges, (_request: Request, response: Response) => {
  db.prepare(`
    UPDATE site_config
    SET published_json = draft_json, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run();
  response.json({ published: true });
});
app.get("/api/admin/products", requireAdmin, (_request, response) => {
  const rows = db.prepare("SELECT * FROM products ORDER BY sort_order ASC, created_at DESC, id DESC").all() as Record<string, unknown>[];
  response.json(rows.map(productView));
});
app.put("/api/admin/products/order", protectChanges, (request: Request, response: Response) => {
  const parsed = z.object({ ids: z.array(z.number().int().positive()).max(1000) }).safeParse(request.body);
  if (!parsed.success || new Set(parsed.data.ids).size !== parsed.data.ids.length) {
    response.status(400).json({ error: "The product order is invalid." });
    return;
  }
  const current = db.prepare("SELECT id FROM products ORDER BY sort_order ASC, created_at DESC, id DESC").all() as { id: number }[];
  if (parsed.data.ids.length !== current.length || !current.every((item) => parsed.data.ids.includes(item.id))) {
    response.status(400).json({ error: "The product list changed. Refresh and try again." });
    return;
  }
  const updateOrder = db.prepare("UPDATE products SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
  db.transaction((ids: number[]) => ids.forEach((id, order) => updateOrder.run(order, id)))(parsed.data.ids);
  response.json({ saved: true });
});
app.post("/api/admin/products", protectChanges, (request: Request, response: Response) => {
  const parsed = productSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues[0]?.message ?? "The product is invalid." });
    return;
  }
  const product = parsed.data;
  if (product.discountPrice !== null && product.discountPrice >= product.price) {
    response.status(400).json({ error: "Discount price must be lower than the regular price." });
    return;
  }
  const slugBase = product.name.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-");
  const slug = `${slugBase}-${randomBytes(3).toString("hex")}`;
  const result = db.prepare(`
    INSERT INTO products
      (name, slug, short_description, description, image, gallery_json, price, discount_price, category, sku, active, published, cta_label)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    product.name, slug, product.shortDescription, product.description, product.image,
    JSON.stringify(product.gallery), product.price, product.discountPrice, product.category,
    product.sku, Number(product.active), Number(product.published), product.ctaLabel,
  );
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(result.lastInsertRowid) as Record<string, unknown>;
  response.status(201).json(productView(row));
});
app.put("/api/admin/products/:id", protectChanges, (request: Request, response: Response) => {
  const id = Number(request.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    response.status(400).json({ error: "Invalid product identifier." });
    return;
  }
  const parsed = productSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues[0]?.message ?? "The product is invalid." });
    return;
  }
  const product = parsed.data;
  if (product.discountPrice !== null && product.discountPrice >= product.price) {
    response.status(400).json({ error: "Discount price must be lower than the regular price." });
    return;
  }
  const result = db.prepare(`
    UPDATE products SET name = ?, short_description = ?, description = ?, image = ?, gallery_json = ?,
      price = ?, discount_price = ?, category = ?, sku = ?, active = ?, published = ?, cta_label = ?,
      updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(
    product.name, product.shortDescription, product.description, product.image, JSON.stringify(product.gallery),
    product.price, product.discountPrice, product.category, product.sku, Number(product.active),
    Number(product.published), product.ctaLabel, id,
  );
  if (result.changes === 0) {
    response.status(404).json({ error: "Product not found." });
    return;
  }
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as Record<string, unknown>;
  response.json(productView(row));
});
app.delete("/api/admin/products/:id", protectChanges, (request: Request, response: Response) => {
  const id = Number(request.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    response.status(400).json({ error: "Invalid product identifier." });
    return;
  }
  const result = db.prepare("DELETE FROM products WHERE id = ?").run(id);
  if (result.changes === 0) {
    response.status(404).json({ error: "Product not found." });
    return;
  }
  response.status(204).end();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
    if (!allowed.has(file.mimetype)) {
      callback(new Error("Upload a JPEG, PNG, WebP, or AVIF image."));
      return;
    }
    callback(null, true);
  },
});
app.post("/api/admin/upload", requireAdmin, requireCsrf, upload.single("image"), async (request, response, next) => {
  const file = request.file;
  if (!file) {
    response.status(400).json({ error: "Choose an image to upload." });
    return;
  }
  const signatures: { mime: string; extension: string; valid: (buffer: Buffer) => boolean }[] = [
    { mime: "image/jpeg", extension: ".jpg", valid: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
    { mime: "image/png", extension: ".png", valid: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
    { mime: "image/webp", extension: ".webp", valid: (buffer) => buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" },
    { mime: "image/avif", extension: ".avif", valid: (buffer) => buffer.toString("ascii", 4, 12).startsWith("ftyp") && /avif|avis/.test(buffer.toString("ascii", 8, 16)) },
  ];
  const signature = signatures.find((item) => item.mime === file.mimetype && item.valid(file.buffer));
  if (!signature) {
    response.status(400).json({ error: "The uploaded file does not match a supported image format." });
    return;
  }
  const filename = `${randomBytes(16).toString("hex")}${signature.extension}`;
  try {
    await fs.writeFile(resolve(uploadDirectory, filename), file.buffer, { flag: "wx" });
    response.status(201).json({ url: `/uploads/${filename}` });
  } catch (error) {
    next(error);
  }
});

app.use("/api", (_request, response) => response.status(404).json({ error: "API endpoint not found." }));
if (isProduction) {
  const root = resolve(fileURLToPath(new URL("../dist", import.meta.url)));
  app.use(express.static(root));
  app.get("*splat", (_request, response) => response.sendFile(resolve(root, "index.html")));
}
app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    response.status(400).json({ error: "The request body contains invalid JSON." });
    return;
  }
  if (error instanceof multer.MulterError) {
    response.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
      error: error.code === "LIMIT_FILE_SIZE" ? "Images must be 5 MB or smaller." : "The image upload could not be processed.",
    });
    return;
  }
  if (error instanceof Error && error.message === "Upload a JPEG, PNG, WebP, or AVIF image.") {
    response.status(400).json({ error: error.message });
    return;
  }
  console.error("Unhandled request error:", error);
  response.status(500).json({ error: "Something went wrong. Please try again." });
});

app.listen(port, () => console.info(`Atelier & Co. server listening on http://localhost:${port}`));
