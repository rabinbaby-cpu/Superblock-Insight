import { subscriptions as seedSubscriptions } from "@/data/mockData";

export interface SubscriptionItem {
  id: string;
  customer: string;
  customerId: string;
  plan: string;
  status: string;
  startDate: string;
  renewalDate: string;
  cycle: string;
  mrr: number;
  amount: number;
  payment: string;
  autoRenewal: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const STORAGE_KEY = "sb_subscriptions_list";

function getSeedSubscriptions(): SubscriptionItem[] {
  return seedSubscriptions.map((s, idx) => ({
    id: `sub-seed-${idx + 1}`,
    customer: s.customer,
    customerId: s.customerId,
    plan: s.plan,
    status: s.status,
    startDate: s.startDate,
    renewalDate: s.renewalDate,
    cycle: s.cycle,
    mrr: s.mrr,
    amount: s.amount,
    payment: s.payment,
    autoRenewal: s.autoRenewal,
    createdAt: new Date().toISOString(),
  }));
}

function loadLocalSubscriptions(): SubscriptionItem[] {
  if (typeof window === "undefined") return getSeedSubscriptions();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getSeedSubscriptions();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getSeedSubscriptions();
  } catch (err) {
    console.warn("Could not read subscriptions from localStorage:", err);
    return getSeedSubscriptions();
  }
}

function saveLocalSubscriptions(items: SubscriptionItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn("Could not save subscriptions to localStorage:", err);
  }
}

export async function getSubscriptions(customerId?: string): Promise<SubscriptionItem[]> {
  try {
    const url = customerId ? `/api/subscriptions?customerId=${encodeURIComponent(customerId)}` : "/api/subscriptions";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data?.subscriptions) && data.subscriptions.length > 0) {
        const mappedFromDb: SubscriptionItem[] = data.subscriptions.map((s: any) => ({
          id: s.id || `sub-${Date.now()}`,
          customer: s.customer_name || s.customer || "SuperBlock Customer",
          customerId: s.customer_id || customerId || "CUS-DEFAULT",
          plan: s.plan_name || s.plan || "Growth",
          status: s.status || "Active",
          startDate: s.start_date || new Date().toISOString().split("T")[0],
          renewalDate: s.end_date || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
          cycle: s.billing_interval || s.cycle || "Monthly",
          mrr: Number(s.amount) || 0,
          amount: (Number(s.amount) || 0) * 12,
          payment: s.status === "active" ? "Paid" : "Pending",
          autoRenewal: true,
          createdAt: s.created_at || new Date().toISOString(),
        }));

        const local = loadLocalSubscriptions();
        const customCreated = local.filter((l) => !mappedFromDb.some((d) => d.id === l.id));
        const merged = [...mappedFromDb, ...customCreated];
        saveLocalSubscriptions(merged);
        return customerId ? merged.filter((m) => m.customerId === customerId) : merged;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch subscriptions from backend, falling back to local storage:", err);
  }

  const local = loadLocalSubscriptions();
  return customerId ? local.filter((m) => m.customerId === customerId) : local;
}

export async function createSubscription(input: Partial<SubscriptionItem>): Promise<SubscriptionItem> {
  const newSub: SubscriptionItem = {
    id: input.id || `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    customer: input.customer?.trim() || "New Customer",
    customerId: input.customerId?.trim() || `CUS-${Math.floor(10000 + Math.random() * 90000)}`,
    plan: input.plan || "Growth",
    status: input.status || "Active",
    startDate: input.startDate || new Date().toISOString().split("T")[0],
    renewalDate: input.renewalDate || new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
    cycle: input.cycle || "Monthly",
    mrr: input.mrr ?? 2500,
    amount: input.amount ?? ((input.mrr ?? 2500) * 12),
    payment: input.payment || "Paid",
    autoRenewal: input.autoRenewal ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: newSub.id,
        customerId: newSub.customerId,
        customer: newSub.customer,
        plan: newSub.plan,
        status: newSub.status,
        startDate: newSub.startDate,
        endDate: newSub.renewalDate,
        amount: newSub.mrr,
        billingInterval: newSub.cycle,
      }),
    });
  } catch (err) {
    console.warn("Backend POST /api/subscriptions failed, persisting to local storage:", err);
  }

  const existing = loadLocalSubscriptions();
  const updated = [newSub, ...existing.filter((s) => s.id !== newSub.id)];
  saveLocalSubscriptions(updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("subscriptions-updated", { detail: newSub }));
  }

  return newSub;
}

export async function updateSubscription(id: string, updates: Partial<SubscriptionItem>): Promise<SubscriptionItem> {
  const existing = loadLocalSubscriptions();
  const target = existing.find((s) => s.id === id);
  if (!target) {
    throw new Error(`Subscription with ID ${id} not found`);
  }

  const updatedSub: SubscriptionItem = {
    ...target,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  try {
    await fetch(`/api/subscriptions/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedSub),
    });
  } catch (err) {
    console.warn("Backend PUT /api/subscriptions failed, persisting to local storage:", err);
  }

  const updatedList = existing.map((s) => (s.id === id ? updatedSub : s));
  saveLocalSubscriptions(updatedList);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("subscriptions-updated", { detail: updatedSub }));
  }

  return updatedSub;
}

export async function deleteSubscription(id: string): Promise<boolean> {
  try {
    await fetch(`/api/subscriptions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.warn("Backend DELETE /api/subscriptions failed, removing from local storage:", err);
  }

  const existing = loadLocalSubscriptions();
  const updatedList = existing.filter((s) => s.id !== id);
  saveLocalSubscriptions(updatedList);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("subscriptions-updated", { detail: { id } }));
  }

  return true;
}
