import { products as seedProducts } from "@/data/mockData";

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  model: string;
  status: "Active" | "Beta" | "Archived" | "Draft";
  plans: number;
  customers: number;
  description?: string;
  price?: number;
  createdAt?: string;
  updatedAt?: string;
}

const STORAGE_KEY = "sb_products_catalog";

function getSeedProducts(): ProductItem[] {
  return seedProducts.map((p, idx) => ({
    id: `prod-seed-${idx + 1}`,
    name: p.name,
    category: p.category,
    model: p.model,
    status: (p.status as ProductItem["status"]) || "Active",
    plans: p.plans,
    customers: p.customers,
    description: `${p.category} capabilities billed through a ${p.model.toLowerCase()} model.`,
    price: 0,
    createdAt: new Date().toISOString(),
  }));
}

function loadLocalProducts(): ProductItem[] {
  if (typeof window === "undefined") return getSeedProducts();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getSeedProducts();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getSeedProducts();
  } catch (err) {
    console.warn("Could not read products from localStorage:", err);
    return getSeedProducts();
  }
}

function saveLocalProducts(items: ProductItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn("Could not save products to localStorage:", err);
  }
}

export async function getProducts(): Promise<ProductItem[]> {
  try {
    const res = await fetch("/api/products");
    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data?.products) && data.products.length > 0) {
        const mappedFromDb: ProductItem[] = data.products.map((p: any) => ({
          id: p.id || `prod-${Date.now()}`,
          name: p.name || "Unnamed Product",
          category: p.category || "General",
          model: p.billing || "Usage based",
          status: p.active === false ? "Archived" : "Active",
          plans: typeof p.plans === "number" ? p.plans : 1,
          customers: typeof p.customers === "number" ? p.customers : 0,
          description: p.description || "",
          price: typeof p.price === "number" ? p.price : 0,
          createdAt: p.created_at || new Date().toISOString(),
        }));

        // Merge with any local user-created additions
        const local = loadLocalProducts();
        const customCreated = local.filter((l) => !mappedFromDb.some((d) => d.id === l.id || d.name === l.name));
        const merged = [...mappedFromDb, ...customCreated];
        saveLocalProducts(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch products from backend, falling back to local storage:", err);
  }

  return loadLocalProducts();
}

export async function createProduct(input: Partial<ProductItem>): Promise<ProductItem> {
  const newProduct: ProductItem = {
    id: input.id || `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name?.trim() || "New Product",
    category: input.category?.trim() || "General",
    model: input.model?.trim() || "Usage based",
    status: input.status || "Active",
    plans: input.plans ?? 1,
    customers: input.customers ?? 0,
    description: input.description?.trim() || `${input.category || "General"} capabilities.`,
    price: input.price ?? 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Attempt backend persistence
  try {
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: newProduct.id,
        name: newProduct.name,
        category: newProduct.category,
        billing: newProduct.model,
        active: newProduct.status !== "Archived",
        description: newProduct.description,
        price: newProduct.price,
      }),
    });
  } catch (err) {
    console.warn("Backend POST /api/products failed (DB offline), persisting to local storage:", err);
  }

  const existing = loadLocalProducts();
  const updated = [newProduct, ...existing.filter((p) => p.id !== newProduct.id)];
  saveLocalProducts(updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("products-updated", { detail: newProduct }));
  }

  return newProduct;
}

export async function updateProduct(id: string, updates: Partial<ProductItem>): Promise<ProductItem> {
  const existing = loadLocalProducts();
  const target = existing.find((p) => p.id === id);
  if (!target) {
    throw new Error(`Product with ID ${id} not found`);
  }

  const updatedProduct: ProductItem = {
    ...target,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  try {
    await fetch(`/api/products/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedProduct),
    });
  } catch (err) {
    console.warn("Backend PUT /api/products failed, persisting to local storage:", err);
  }

  const updatedList = existing.map((p) => (p.id === id ? updatedProduct : p));
  saveLocalProducts(updatedList);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("products-updated", { detail: updatedProduct }));
  }

  return updatedProduct;
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    await fetch(`/api/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.warn("Backend DELETE /api/products failed, removing from local storage:", err);
  }

  const existing = loadLocalProducts();
  const updatedList = existing.filter((p) => p.id !== id);
  saveLocalProducts(updatedList);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("products-updated", { detail: { id } }));
  }

  return true;
}
