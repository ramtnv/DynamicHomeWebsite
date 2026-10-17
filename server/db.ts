import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defaultConfig, type SiteConfig } from "./defaults.js";

const databasePath = resolve(process.env.DATABASE_PATH ?? "data/site.sqlite");
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS site_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    draft_json TEXT NOT NULL,
    published_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    short_description TEXT NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL DEFAULT '',
    gallery_json TEXT NOT NULL DEFAULT '[]',
    price REAL NOT NULL CHECK (price >= 0),
    discount_price REAL CHECK (discount_price IS NULL OR (discount_price >= 0 AND discount_price < price)),
    category TEXT NOT NULL,
    sku TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    published INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    cta_label TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS products_public_idx ON products (published, active, category);
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    csrf_token TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions (expires_at);
  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL UNIQUE,
    serial_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    items_json TEXT NOT NULL,
    total REAL NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);
`);
const orderColumns = db.prepare("PRAGMA table_info(orders)").all() as { name: string }[];
if (!orderColumns.some((column) => column.name === "payment_method")) {
  db.exec("ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'Cash'");
}
const productColumns = db.prepare("PRAGMA table_info(products)").all() as { name: string }[];
if (!productColumns.some((column) => column.name === "sort_order")) {
  db.exec("ALTER TABLE products ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0");
  const existingProducts = db.prepare("SELECT id FROM products ORDER BY created_at DESC, id DESC").all() as { id: number }[];
  const assignOrder = db.prepare("UPDATE products SET sort_order = ? WHERE id = ?");
  existingProducts.forEach((product, index) => assignOrder.run(index, product.id));
}

const existingConfig = db.prepare("SELECT id FROM site_config WHERE id = 1").get();
if (!existingConfig) {
  const json = JSON.stringify(defaultConfig);
  db.prepare(
    "INSERT INTO site_config (id, draft_json, published_json) VALUES (1, ?, ?)",
  ).run(json, json);
} else {
  function mergeDefaults(defaultValue: unknown, storedValue: unknown): unknown {
    if (Array.isArray(defaultValue)) return Array.isArray(storedValue) ? storedValue : defaultValue;
    if (
      defaultValue !== null &&
      typeof defaultValue === "object" &&
      storedValue !== null &&
      typeof storedValue === "object" &&
      !Array.isArray(storedValue)
    ) {
      const stored = storedValue as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(defaultValue).map(([key, value]) => [
          key,
          mergeDefaults(value, stored[key]),
        ]),
      );
    }
    return storedValue === undefined ? defaultValue : storedValue;
  }
  const savedConfigs = db.prepare("SELECT draft_json, published_json FROM site_config WHERE id = 1").get() as {
    draft_json: string;
    published_json: string;
  };
  function migrateConfig(json: string): SiteConfig {
    const config = mergeDefaults(defaultConfig, JSON.parse(json) as unknown) as SiteConfig;
    if (config.theme.typographyScale === 1) config.theme.typographyScale = defaultConfig.theme.typographyScale;
    if (config.theme.contentWidth === 1240) config.theme.contentWidth = defaultConfig.theme.contentWidth;
    if (["#788078", "#69736b"].includes(config.theme.muted.toLowerCase())) config.theme.muted = "#626b64";
    if (config.theme.navigation.toLowerCase() === "#67746a") config.theme.navigation = "#626b64";
    return config;
  }
  const draft = migrateConfig(savedConfigs.draft_json);
  const published = migrateConfig(savedConfigs.published_json);
  if (
    JSON.stringify(draft) !== savedConfigs.draft_json ||
    JSON.stringify(published) !== savedConfigs.published_json
  ) {
    db.prepare("UPDATE site_config SET draft_json = ?, published_json = ? WHERE id = 1").run(
      JSON.stringify(draft),
      JSON.stringify(published),
    );
  }
}

const adminCount = (db.prepare("SELECT COUNT(*) AS count FROM admins").get() as {
  count: number;
}).count;
if (adminCount === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  if (process.env.ADMIN_PASSWORD.length < 12) {
    throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
  }
  db.prepare("INSERT INTO admins (email, password_hash) VALUES (?, ?)").run(
    process.env.ADMIN_EMAIL.trim().toLowerCase(),
    bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12),
  );
  console.info(`Initial Super Admin created for ${process.env.ADMIN_EMAIL}.`);
} else if (adminCount === 0) {
  console.warn("No Super Admin exists. Set ADMIN_EMAIL and ADMIN_PASSWORD to initialize access.");
}

const seedCount = (db.prepare("SELECT COUNT(*) AS count FROM products").get() as {
  count: number;
}).count;
if (seedCount === 0) {
  const seedProduct = db.prepare(`
    INSERT INTO products
      (name, slug, short_description, description, image, price, category, sku, active, published, cta_label)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
  `);
  const initialProducts = [
    {
      name: "Everyday Ceramic Vase",
      slug: "everyday-ceramic-vase",
      short: "A softly sculpted home for your favorite stems.",
      description: "Hand-finished stoneware with a quietly organic shape. Each piece is made in small batches and finished by hand.",
      image: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=900&q=80",
      price: 48,
      category: "Home",
      sku: "AC-HM-001",
    },
    {
      name: "Linen Table Set",
      slug: "linen-table-set",
      short: "Washed European linen for long, easy dinners.",
      description: "A set of four naturally textured napkins in relaxed, breathable linen. Beautiful straight from the wash.",
      image: "https://images.unsplash.com/photo-1603199506016-b9a594b593c0?auto=format&fit=crop&w=900&q=80",
      price: 64,
      category: "Textiles",
      sku: "AC-TX-004",
    },
    {
      name: "Oak Catchall Tray",
      slug: "oak-catchall-tray",
      short: "A little landing place for everyday essentials.",
      description: "Responsibly sourced solid oak, shaped and smoothed in a family-run workshop. Made for keys, keepsakes, and all the little things.",
      image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=80",
      price: 38,
      category: "Home",
      sku: "AC-HM-011",
    },
    {
      name: "Quiet Morning Candle",
      slug: "quiet-morning-candle",
      short: "Warm cedar and soft citrus, poured by hand.",
      description: "A clean-burning soy wax candle with notes of cedarwood, bergamot, and dried fig. Poured in a reusable glass vessel.",
      image: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=80",
      price: 32,
      category: "Wellbeing",
      sku: "AC-WB-002",
    },
  ];
  const insertMany = db.transaction(() => {
    for (const product of initialProducts) {
      seedProduct.run(
        product.name,
        product.slug,
        product.short,
        product.description,
        product.image,
        product.price,
        product.category,
        product.sku,
        "Discover the details",
      );
    }
  });
  insertMany();
}
