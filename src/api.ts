import type { Product, SiteConfig, CartItem } from "./types";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

let csrfToken = "";
export function setCsrfToken(token: string) {
  csrfToken = token;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  protectedRequest = false,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (protectedRequest && csrfToken) headers.set("X-CSRF-Token", csrfToken);
  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({ error: "The request could not be completed." }))) as {
      error?: string;
    };
    throw new ApiError(body.error ?? "The request could not be completed.", response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  site: () => request<SiteConfig>("/api/site"),
  products: (params?: { search?: string; category?: string; sort?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.category) query.set("category", params.category);
    if (params?.sort) query.set("sort", params.sort);
    return request<Product[]>(`/api/products${query.size ? `?${query}` : ""}`);
  },
  product: (slug: string) => request<Product>(`/api/products/${encodeURIComponent(slug)}`),
  contact: (form: { name: string; email: string; subject: string; message: string; website: string }) =>
    request<{ message: string }>("/api/contact", { method: "POST", body: JSON.stringify(form) }),
  order: (order: { customerName: string; customerPhone: string; customerAddress: string; items: CartItem[]; total: number }) =>
    request<{ id: number; orderId: string; serialNumber: string }>("/api/orders", { method: "POST", body: JSON.stringify(order) }),
  login: (email: string, password: string) =>
    request<{ authenticated: boolean; csrfToken: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  session: () => request<{ authenticated: true; csrfToken: string } | { authenticated: false }>("/api/auth/session"),
  logout: () => request<{ authenticated: boolean }>("/api/auth/logout", { method: "POST" }, true),
  adminConfig: () =>
    request<{ draft: SiteConfig; published: SiteConfig; csrfToken: string }>("/api/admin/config"),
  saveConfig: (config: SiteConfig) =>
    request<{ saved: boolean }>("/api/admin/config", { method: "PUT", body: JSON.stringify(config) }, true),
  publish: () =>
    request<{ published: boolean }>("/api/admin/publish", { method: "POST" }, true),
  adminProducts: () => request<Product[]>("/api/admin/products"),
  reorderProducts: (ids: number[]) =>
    request<{ saved: boolean }>("/api/admin/products/order", { method: "PUT", body: JSON.stringify({ ids }) }, true),
  saveProduct: (product: Omit<Product, "id" | "slug" | "createdAt" | "updatedAt">, id?: number) =>
    request<Product>(id ? `/api/admin/products/${id}` : "/api/admin/products", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(product),
    }, true),
  deleteProduct: (id: number) =>
    request<void>(`/api/admin/products/${id}`, { method: "DELETE" }, true),
  upload: async (file: File) => {
    const data = new FormData();
    data.append("image", file);
    return request<{ url: string }>("/api/admin/upload", { method: "POST", body: data }, true);
  },
}