import { plans as seedPlans } from "@/data/mockData";

export interface PlanItem {
  id: string;
  name: string;
  product: string;
  monthly: number;
  annual: number;
  limit: string;
  features: number;
  status: "Active" | "Private" | "Archived" | "Draft";
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

const STORAGE_KEY = "sb_plans_catalog";

function getSeedPlans(): PlanItem[] {
  return seedPlans.map((p, idx) => ({
    id: `plan-seed-${idx + 1}`,
    name: p.name,
    product: p.product,
    monthly: p.monthly,
    annual: p.annual,
    limit: p.limit,
    features: p.features,
    status: (p.status as PlanItem["status"]) || "Active",
    createdAt: new Date().toISOString(),
  }));
}

function loadLocalPlans(): PlanItem[] {
  if (typeof window === "undefined") return getSeedPlans();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getSeedPlans();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getSeedPlans();
  } catch (err) {
    console.warn("Could not read plans from localStorage:", err);
    return getSeedPlans();
  }
}

function saveLocalPlans(items: PlanItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn("Could not save plans to localStorage:", err);
  }
}

export async function getPlans(): Promise<PlanItem[]> {
  try {
    const res = await fetch("/api/plans");
    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data?.plans) && data.plans.length > 0) {
        const mappedFromDb: PlanItem[] = data.plans.map((p: any) => ({
          id: p.id || `plan-${Date.now()}`,
          name: p.name || "Unnamed Plan",
          product: p.product || p.product_name || "Omnichannel Suite",
          monthly: typeof p.monthly === "number" ? p.monthly : Number(p.amount) || 0,
          annual: typeof p.annual === "number" ? p.annual : Math.round((Number(p.amount) || 0) * 10),
          limit: p.limit || "Unlimited broadcasts",
          features: typeof p.features === "number" ? p.features : 10,
          status: p.status || "Active",
          createdAt: p.created_at || new Date().toISOString(),
        }));

        const local = loadLocalPlans();
        const customCreated = local.filter((l) => !mappedFromDb.some((d) => d.id === l.id || d.name === l.name));
        const merged = [...mappedFromDb, ...customCreated];
        saveLocalPlans(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch plans from backend, falling back to local storage:", err);
  }

  return loadLocalPlans();
}

export async function createPlan(input: Partial<PlanItem>): Promise<PlanItem> {
  const newPlan: PlanItem = {
    id: input.id || `plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name?.trim() || "New Plan",
    product: input.product?.trim() || "Omnichannel Suite",
    monthly: input.monthly ?? 0,
    annual: input.annual ?? (input.monthly ? Math.round(input.monthly * 10.2) : 0),
    limit: input.limit?.trim() || "Standard limits",
    features: input.features ?? 8,
    status: input.status || "Active",
    description: input.description?.trim() || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPlan),
    });
  } catch (err) {
    console.warn("Backend POST /api/plans failed (DB offline), persisting to local storage:", err);
  }

  const existing = loadLocalPlans();
  const updated = [newPlan, ...existing.filter((p) => p.id !== newPlan.id)];
  saveLocalPlans(updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("plans-updated", { detail: newPlan }));
  }

  return newPlan;
}

export async function updatePlan(id: string, updates: Partial<PlanItem>): Promise<PlanItem> {
  const existing = loadLocalPlans();
  const target = existing.find((p) => p.id === id);
  if (!target) {
    throw new Error(`Plan with ID ${id} not found`);
  }

  const updatedPlan: PlanItem = {
    ...target,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  try {
    await fetch(`/api/plans/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedPlan),
    });
  } catch (err) {
    console.warn("Backend PUT /api/plans failed, persisting to local storage:", err);
  }

  const updatedList = existing.map((p) => (p.id === id ? updatedPlan : p));
  saveLocalPlans(updatedList);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("plans-updated", { detail: updatedPlan }));
  }

  return updatedPlan;
}

export async function deletePlan(id: string): Promise<boolean> {
  try {
    await fetch(`/api/plans/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.warn("Backend DELETE /api/plans failed, removing from local storage:", err);
  }

  const existing = loadLocalPlans();
  const updatedList = existing.filter((p) => p.id !== id);
  saveLocalPlans(updatedList);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("plans-updated", { detail: { id } }));
  }

  return true;
}
