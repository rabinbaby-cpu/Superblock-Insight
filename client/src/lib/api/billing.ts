import { fetchAuthSession } from "aws-amplify/auth";

export interface InvoiceRecord {
  id: string;
  customer_id: string;
  invoice_number: string;
  status: string;
  amount: number;
  currency: string;
  issue_date: string;
  due_date: string;
  paid_date: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRecord {
  id: string;
  customer_id: string;
  plan_id?: string;
  plan_name?: string;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
  mrr?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductRecord {
  id: string;
  name: string;
  category?: string;
  description?: string;
  is_active?: boolean;
}

interface InvoicesResponse {
  success: boolean;
  count: number;
  customerId: string;
  invoices: InvoiceRecord[];
  error?: string;
}

interface SubscriptionsResponse {
  success: boolean;
  count: number;
  customerId: string;
  subscriptions: SubscriptionRecord[];
  error?: string;
}

interface ProductsResponse {
  success: boolean;
  count: number;
  products: ProductRecord[];
  error?: string;
}

const PRODUCTION_CUSTOMER_BASE =
  "https://api.superblock.chat/customeranalytics";

const PRODUCTION_DASHBOARD_BASE =
  "https://api.superblock.chat/customeranalyticsdashboard";

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

/**
 * Returns request headers with the Cognito access token, strictly using the Access Token.
 */
async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    const session = await fetchAuthSession();
    // Strictly use Cognito Access Token for dashboard API
    const token = session?.tokens?.accessToken?.toString() || "";
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn("Could not retrieve Cognito auth session for billing:", error);
  }

  return headers;
}

/**
 * Fetches invoices for a customer from customeranalytics?action=invoices or dashboard.
 */
export async function getCustomerInvoices(
  customerId: string
): Promise<InvoiceRecord[]> {
  if (!customerId) return [];

  const headers = await authHeaders();
  const encoded = encodeURIComponent(customerId);

  if (isLocalhost()) {
    const response = await fetch(`/api/invoices?customerId=${encoded}`, {
      method: "GET",
      headers,
    });
    const data = (await response.json().catch(() => null)) as InvoicesResponse | null;
    if (!response.ok || !data?.success) {
      throw new Error(data?.error || `Failed to fetch invoices (status ${response.status})`);
    }
    return Array.isArray(data.invoices) ? data.invoices : [];
  }

  // Production: Primary target is official customeranalyticsdashboard/invoices
  try {
    const dashboardUrl = `${PRODUCTION_DASHBOARD_BASE}/invoices?customerId=${encoded}`;
    const response = await fetch(dashboardUrl, {
      method: "GET",
      headers,
    });
    if (response.ok) {
      const data = (await response.json().catch(() => null)) as InvoicesResponse | null;
      if (data?.success && Array.isArray(data.invoices)) {
        return data.invoices;
      }
    }
  } catch (err) {
    console.warn("Direct fetch from customeranalyticsdashboard/invoices failed, attempting fallback:", err);
  }

  // Fallback to customeranalytics?action=invoices
  const customerApiUrl = `${PRODUCTION_CUSTOMER_BASE}?action=invoices&customerId=${encoded}`;
  const response = await fetch(customerApiUrl, { method: "GET", headers });
  const data = (await response.json().catch(() => null)) as InvoicesResponse | null;

  if (!response.ok || !data?.success) {
    throw new Error(data?.error || `Failed to fetch invoices (status ${response.status})`);
  }

  return Array.isArray(data.invoices) ? data.invoices : [];
}

/**
 * Fetches subscriptions for a customer from customeranalyticsdashboard or customeranalytics.
 */
export async function getCustomerSubscriptions(
  customerId: string
): Promise<SubscriptionRecord[]> {
  if (!customerId) return [];

  const headers = await authHeaders();
  const encoded = encodeURIComponent(customerId);

  if (isLocalhost()) {
    const response = await fetch(`/api/subscriptions?customerId=${encoded}`, {
      method: "GET",
      headers,
    });
    const data = (await response.json().catch(() => null)) as SubscriptionsResponse | null;
    if (!response.ok || !data?.success) {
      throw new Error(data?.error || `Failed to fetch subscriptions (status ${response.status})`);
    }
    return Array.isArray(data.subscriptions) ? data.subscriptions : [];
  }

  // Production: Primary target is official customeranalyticsdashboard/subscriptions
  try {
    const dashboardUrl = `${PRODUCTION_DASHBOARD_BASE}/subscriptions?customerId=${encoded}`;
    const response = await fetch(dashboardUrl, {
      method: "GET",
      headers,
    });
    if (response.ok) {
      const data = (await response.json().catch(() => null)) as SubscriptionsResponse | null;
      if (data?.success && Array.isArray(data.subscriptions)) {
        return data.subscriptions;
      }
    }
  } catch (err) {
    console.warn("Direct fetch from customeranalyticsdashboard/subscriptions failed, attempting fallback:", err);
  }

  // Fallback to customeranalytics?action=subscriptions
  const customerApiUrl = `${PRODUCTION_CUSTOMER_BASE}?action=subscriptions&customerId=${encoded}`;
  const response = await fetch(customerApiUrl, { method: "GET", headers });
  const data = (await response.json().catch(() => null)) as SubscriptionsResponse | null;

  if (!response.ok || !data?.success) {
    throw new Error(data?.error || `Failed to fetch subscriptions (status ${response.status})`);
  }

  return Array.isArray(data.subscriptions) ? data.subscriptions : [];
}

/**
 * Fetches billing products catalog.
 */
export async function getBillingProducts(): Promise<ProductRecord[]> {
  const headers = await authHeaders();

  if (isLocalhost()) {
    const response = await fetch("/api/products", {
      method: "GET",
      headers,
    });
    const data = (await response.json().catch(() => null)) as ProductsResponse | null;
    if (!response.ok || !data?.success) {
      throw new Error(data?.error || `Failed to fetch products (status ${response.status})`);
    }
    return Array.isArray(data.products) ? data.products : [];
  }

  // Production: Primary target is official customeranalyticsdashboard/products
  try {
    const dashboardUrl = `${PRODUCTION_DASHBOARD_BASE}/products`;
    const response = await fetch(dashboardUrl, {
      method: "GET",
      headers,
    });
    if (response.ok) {
      const data = (await response.json().catch(() => null)) as ProductsResponse | null;
      if (data?.success && Array.isArray(data.products)) {
        return data.products;
      }
    }
  } catch (err) {
    console.warn("Direct fetch from customeranalyticsdashboard/products failed, attempting fallback:", err);
  }

  // Fallback to customeranalytics?action=products
  const customerApiUrl = `${PRODUCTION_CUSTOMER_BASE}?action=products`;
  const response = await fetch(customerApiUrl, { method: "GET", headers });
  const data = (await response.json().catch(() => null)) as ProductsResponse | null;

  if (!response.ok || !data?.success) {
    throw new Error(data?.error || `Failed to fetch products (status ${response.status})`);
  }

  return Array.isArray(data.products) ? data.products : [];
}
