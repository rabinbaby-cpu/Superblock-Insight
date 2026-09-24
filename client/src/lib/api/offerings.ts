import { fetchAuthSession } from "aws-amplify/auth";

export interface CustomerOfferingRecord {
  id: string;
  customer_id: string;
  product_id: string | null;
  offering_name: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  name?: string;
  description?: string;
  quantity?: string;
  pricing?: string;
  owner?: string;
  notes?: string;
}

export interface ProductRecord {
  id: string;
  client_id: string;
  client_user_id: string;
  name: string | null;
  description: string | null;
  category: string | null;
  hsn: string | null;
  price: number | null;
  active: boolean | null;
  created_at: string | null;
}

interface OfferingsResponse {
  success: boolean;
  count: number;
  customerId: string;
  offerings: CustomerOfferingRecord[];
  error?: string;
}

const PRODUCTION_DASHBOARD_BASE =
  "https://api.superblock.chat/customeranalyticsdashaboard";

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    const session = await fetchAuthSession();
    const token = session?.tokens?.accessToken?.toString() || "";

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn("Could not retrieve Cognito auth session for offerings:", error);
  }

  return headers;
}

function isLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    Boolean(import.meta.env.DEV) ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    host.startsWith("172.")
  );
}

export async function getCustomerOfferings(
  customerId: string
): Promise<CustomerOfferingRecord[]> {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  const headers = await authHeaders();

  if (isLocalhost()) {
    const response = await fetch(
      `/api/customer-offerings?customerId=${encodeURIComponent(customerId)}`,
      { method: "GET", headers }
    );
    const data = (await response.json().catch(() => null)) as OfferingsResponse | null;
    if (!response.ok || !data?.success) {
      throw new Error(data?.error || `Failed to fetch customer offerings (status ${response.status})`);
    }
    return Array.isArray(data.offerings) ? data.offerings : [];
  }

  // Production Strategy 1: Path-based
  try {
    const dashboardUrl = `${PRODUCTION_DASHBOARD_BASE}/customer-offerings?customerId=${encodeURIComponent(customerId)}`;
    const response = await fetch(dashboardUrl, { method: "GET", headers });
    if (response.ok) {
      const data = (await response.json().catch(() => null)) as OfferingsResponse | null;
      if (data?.success && Array.isArray(data.offerings)) {
        return data.offerings;
      }
    }
  } catch (err) {
    console.warn("Direct fetch from customer-offerings failed, attempting action param fallback:", err);
  }

  // Production Strategy 2: Action param
  try {
    const actionUrl = `${PRODUCTION_DASHBOARD_BASE}?action=customer_offerings&customerId=${encodeURIComponent(customerId)}`;
    const response = await fetch(actionUrl, { method: "GET", headers });
    if (response.ok) {
      const data = (await response.json().catch(() => null)) as OfferingsResponse | null;
      if (data?.success && Array.isArray(data.offerings)) {
        return data.offerings;
      }
    }
  } catch (err) {
    console.warn("Fetch from customeranalyticsdashaboard?action=customer_offerings failed:", err);
  }

  return [];
}

export async function createCustomerOffering(input: {
  customerId: string;
  offeringName: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<CustomerOfferingRecord> {
  const headers = await authHeaders();

  const url = isLocalhost()
    ? "/api/customer-offerings"
    : `${PRODUCTION_DASHBOARD_BASE}/customer-offerings`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      customerId: input.customerId,
      offeringName: input.offeringName,
      status: input.status || "Active",
      startDate: input.startDate || new Date().toISOString(),
      endDate: input.endDate || null,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    throw new Error(data?.error || `Failed to create offering (status ${response.status})`);
  }

  return data.offering;
}
