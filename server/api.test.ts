import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { themes, type SiteConfig } from "./defaults.js";

const email = "admin@atelier-test.invalid";
const password = "Test-only-strong-password-2026";
let directory = "";
let port = 0;
let child: ChildProcess | undefined;
let output = "";
let baseUrl = "";

function contrastRatio(first: string, second: string): number {
  const luminance = (hex: string) => {
    const channels = hex.slice(1).match(/.{2}/g)!.map((part) => parseInt(part, 16) / 255);
    const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
  };
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter! + 0.05) / (darker! + 0.05);
}

async function availablePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const selectedPort = address.port;
  await new Promise<void>((resolveClose, reject) => {
    server.close((error) => error ? reject(error) : resolveClose());
  });
  return selectedPort;
}

async function startServer(): Promise<void> {
  child = spawn(process.execPath, ["--import", "tsx", fileURLToPath(new URL("./index.ts", import.meta.url))], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "test",
      ADMIN_EMAIL: email,
      ADMIN_PASSWORD: password,
      DATABASE_PATH: resolve(directory, "site.sqlite"),
      UPLOAD_DIRECTORY: resolve(directory, "uploads"),
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (data: Buffer) => { output += data.toString(); });
  child.stderr?.on("data", (data: Buffer) => { output += data.toString(); });
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Test server exited early.\n${output}`);
    try {
      const response = await fetch(`${baseUrl}/api/site`);
      if (response.ok) return;
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 150));
      continue;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  throw new Error(`Test server did not become ready.\n${output}`);
}

async function stopServer(): Promise<void> {
  if (!child || child.exitCode !== null) return;
  const current = child;
  await new Promise<void>((resolveClose) => {
    current.once("exit", () => resolveClose());
    current.kill();
  });
  child = undefined;
}

before(async () => {
  directory = await mkdtemp(resolve(tmpdir(), "atelier-site-test-"));
  port = await availablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  await startServer();
});

after(async () => {
  await stopServer();
  if (directory) await rm(directory, { recursive: true, force: true });
});

test("admin security, draft publishing, products, contact form, and database persistence", async () => {
  const unauthenticated = await fetch(`${baseUrl}/api/admin/products`);
  assert.equal(unauthenticated.status, 401);

  const invalidContact = await fetch(`${baseUrl}/api/contact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "x", email: "invalid", subject: "x", message: "short" }),
  });
  assert.equal(invalidContact.status, 400);

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.status, 200);
  const session = await login.json() as { csrfToken: string };
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  const adminHeaders = {
    "content-type": "application/json",
    cookie,
    "x-csrf-token": session.csrfToken,
  };

  const noCsrf = await fetch(`${baseUrl}/api/admin/publish`, {
    method: "POST",
    headers: { cookie },
  });
  assert.equal(noCsrf.status, 403);

  const configResponse = await fetch(`${baseUrl}/api/admin/config`, { headers: { cookie } });
  const config = await configResponse.json() as { draft: SiteConfig };
  assert.equal(configResponse.status, 200);
  const draft = structuredClone(config.draft);
  draft.site.companyName = "Published Test Studio";

  const unreadableTheme = structuredClone(draft);
  unreadableTheme.theme.muted = "#ffffff";
  const badTheme = await fetch(`${baseUrl}/api/admin/config`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify(unreadableTheme),
  });
  assert.equal(badTheme.status, 400);
  const badThemeResult = await badTheme.json() as { error: string };
  assert.match(badThemeResult.error, /Muted text and Page background need a contrast ratio of at least 4\.5:1/);
  assert.match(badThemeResult.error, /Muted text \(#FFFFFF\) or Page background \(#F5F4EF\) in Theme & Appearance > Your color palette/);

  const unreadableCardText = structuredClone(draft);
  unreadableCardText.theme.body = "#FFFFFF";
  unreadableCardText.theme.page = "#000000";
  unreadableCardText.theme.surface = "#15B095";
  const badCardContrast = await fetch(`${baseUrl}/api/admin/config`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify(unreadableCardText),
  });
  assert.equal(badCardContrast.status, 400);
  const badCardContrastResult = await badCardContrast.json() as { error: string };
  assert.match(badCardContrastResult.error, /Body text and Card background need a contrast ratio of at least 4\.5:1 \(currently 2\.74:1\)/);
  assert.match(badCardContrastResult.error, /Body text \(#FFFFFF\) or Card background \(#15B095\) in Theme & Appearance > Your color palette/);
  const cardColorSuggestion = badCardContrastResult.error.match(
    /Example fix: change Card background to (#[A-F0-9]{6}) in Theme & Appearance > Your color palette \(contrast ([\d.]+):1\), keeping Body text #FFFFFF unchanged\./,
  );
  assert.ok(cardColorSuggestion, "The contrast warning should suggest an actionable color change.");
  assert.ok(contrastRatio("#FFFFFF", cardColorSuggestion[1]!) >= 4.5);
  assert.equal(Number(cardColorSuggestion[2]), Number(contrastRatio("#FFFFFF", cardColorSuggestion[1]!).toFixed(2)));

  const unsafeLink = structuredClone(draft);
  unsafeLink.home.primaryLink = "javascript:alert(1)";
  const unsafeLinkResponse = await fetch(`${baseUrl}/api/admin/config`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify(unsafeLink),
  });
  assert.equal(unsafeLinkResponse.status, 400);
  for (const [themeName, preset] of Object.entries(themes)) {
    const themeResponse = await fetch(`${baseUrl}/api/admin/config`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({
        ...draft,
        theme: { ...draft.theme, ...preset, themeName },
        home: { ...draft.home, heroBackground: preset.page ?? draft.home.heroBackground },
      }),
    });
    assert.equal(themeResponse.status, 200, `${themeName} should meet contrast requirements`);
  }

  const invalidTypography = structuredClone(draft);
  invalidTypography.theme.typographyScale = 1.7;
  const invalidTypographyResponse = await fetch(`${baseUrl}/api/admin/config`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify(invalidTypography),
  });
  assert.equal(invalidTypographyResponse.status, 400);

  draft.theme.font = "Source Sans 3";
  draft.theme.headingFont = "Lora";
  draft.theme.typographyScale = 1.5;
  draft.theme.contentWidth = 1800;
  const saveDraft = await fetch(`${baseUrl}/api/admin/config`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify(draft),
  });
  assert.equal(saveDraft.status, 200);
  let publicConfig = await (await fetch(`${baseUrl}/api/site`)).json() as {
    site: { companyName: string };
    theme: { font: string; headingFont: string; typographyScale: number; contentWidth: number };
  };
  assert.notEqual(publicConfig.site.companyName, draft.site.companyName);

  const publish = await fetch(`${baseUrl}/api/admin/publish`, { method: "POST", headers: adminHeaders });
  assert.equal(publish.status, 200);
  publicConfig = await (await fetch(`${baseUrl}/api/site`)).json() as typeof publicConfig;
  assert.equal(publicConfig.site.companyName, draft.site.companyName);
  assert.equal(publicConfig.theme.font, "Source Sans 3");
  assert.equal(publicConfig.theme.headingFont, "Lora");
  assert.equal(publicConfig.theme.typographyScale, 1.5);
  assert.equal(publicConfig.theme.contentWidth, 1800);

  const product = {
    name: "Test ceramic cup",
    shortDescription: "A test product for the collection.",
    description: "Created by the automated API test.",
    image: "",
    gallery: [],
    price: 22,
    discountPrice: null,
    category: "Test",
    sku: "TEST-CUP",
    active: true,
    published: true,
    ctaLabel: "Ask a question",
  };
  const createProduct = await fetch(`${baseUrl}/api/admin/products`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify(product),
  });
  assert.equal(createProduct.status, 201);
  const created = await createProduct.json() as { id: number };
  let publicProducts = await (await fetch(`${baseUrl}/api/products`)).json() as { id: number }[];
  assert.ok(publicProducts.some((item) => item.id === created.id));

  const adminProducts = await (await fetch(`${baseUrl}/api/admin/products`, { headers: { cookie } })).json() as { id: number }[];
  const reorder = await fetch(`${baseUrl}/api/admin/products/order`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify({ ids: adminProducts.map((item) => item.id).reverse() }),
  });
  assert.equal(reorder.status, 200);

  const contact = await fetch(`${baseUrl}/api/contact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Test visitor",
      email: "visitor@example.invalid",
      subject: "A question",
      message: "Please tell me more about your products.",
      website: "",
    }),
  });
  assert.equal(contact.status, 201);

  await stopServer();
  await startServer();
  publicConfig = await (await fetch(`${baseUrl}/api/site`)).json() as typeof publicConfig;
  assert.equal(publicConfig.site.companyName, "Published Test Studio");
  const resumedSession = await fetch(`${baseUrl}/api/auth/session`, { headers: { cookie } });
  assert.equal(resumedSession.status, 200);
  assert.equal((await resumedSession.json() as { authenticated: boolean }).authenticated, true);

  const updatedProduct = await fetch(`${baseUrl}/api/admin/products/${created.id}`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify({ ...product, published: false }),
  });
  assert.equal(updatedProduct.status, 200);
  publicProducts = await (await fetch(`${baseUrl}/api/products`)).json() as { id: number }[];
  assert.ok(!publicProducts.some((item) => item.id === created.id));
  const deleteProduct = await fetch(`${baseUrl}/api/admin/products/${created.id}`, {
    method: "DELETE",
    headers: adminHeaders,
  });
  assert.equal(deleteProduct.status, 204);

  const logout = await fetch(`${baseUrl}/api/auth/logout`, { method: "POST", headers: adminHeaders });
  assert.equal(logout.status, 200);
  const revokedSession = await fetch(`${baseUrl}/api/auth/session`, { headers: { cookie } });
  assert.equal((await revokedSession.json() as { authenticated: boolean }).authenticated, false);
});
