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
  "https://api.superblock.chat/customeranalyticsdashaboard";

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
    try {
      const response = await fetch(`/api/invoices?customerId=${encoded}`, {
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
      console.warn("Local invoices fetch failed (database offline), using fallback:", err);
    }
    return [];
  }

  // Production Strategy 1: Path-based on customeranalyticsdashaboard/invoices
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
    console.warn("Direct fetch from customeranalyticsdashaboard/invoices failed, attempting action param fallback:", err);
  }

  // Production Strategy 2: Action parameter on customeranalyticsdashaboard?action=invoices
  try {
    const actionUrl = `${PRODUCTION_DASHBOARD_BASE}?action=invoices&customerId=${encoded}`;
    const response = await fetch(actionUrl, { method: "GET", headers });
    if (response.ok) {
      const data = (await response.json().catch(() => null)) as InvoicesResponse | null;
      if (data?.success && Array.isArray(data.invoices)) {
        return data.invoices;
      }
    }
  } catch (err) {
    console.warn("Fetch from customeranalyticsdashaboard?action=invoices failed, attempting customeranalytics fallback:", err);
  }

  // Production Strategy 3: Fallback to customeranalytics?action=invoices
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

  // Production Strategy 1: Path-based on customeranalyticsdashaboard/subscriptions
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
    console.warn("Direct fetch from customeranalyticsdashaboard/subscriptions failed, attempting action param fallback:", err);
  }

  // Production Strategy 2: Action parameter on customeranalyticsdashaboard?action=subscriptions
  try {
    const actionUrl = `${PRODUCTION_DASHBOARD_BASE}?action=subscriptions&customerId=${encoded}`;
    const response = await fetch(actionUrl, { method: "GET", headers });
    if (response.ok) {
      const data = (await response.json().catch(() => null)) as SubscriptionsResponse | null;
      if (data?.success && Array.isArray(data.subscriptions)) {
        return data.subscriptions;
      }
    }
  } catch (err) {
    console.warn("Fetch from customeranalyticsdashaboard?action=subscriptions failed, attempting customeranalytics fallback:", err);
  }

  // Production Strategy 3: Fallback to customeranalytics?action=subscriptions
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

  // Production Strategy 1: Path-based on customeranalyticsdashaboard/products
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
    console.warn("Direct fetch from customeranalyticsdashaboard/products failed, attempting action param fallback:", err);
  }

  // Production Strategy 2: Action parameter on customeranalyticsdashaboard?action=products
  try {
    const actionUrl = `${PRODUCTION_DASHBOARD_BASE}?action=products`;
    const response = await fetch(actionUrl, { method: "GET", headers });
    if (response.ok) {
      const data = (await response.json().catch(() => null)) as ProductsResponse | null;
      if (data?.success && Array.isArray(data.products)) {
        return data.products;
      }
    }
  } catch (err) {
    console.warn("Fetch from customeranalyticsdashaboard?action=products failed, attempting customeranalytics fallback:", err);
  }

  // Production Strategy 3: Fallback to customeranalytics?action=products
  const customerApiUrl = `${PRODUCTION_CUSTOMER_BASE}?action=products`;
  const response = await fetch(customerApiUrl, { method: "GET", headers });
  const data = (await response.json().catch(() => null)) as ProductsResponse | null;

  if (!response.ok || !data?.success) {
    throw new Error(data?.error || `Failed to fetch products (status ${response.status})`);
  }

  return Array.isArray(data.products) ? data.products : [];
}

export async function createCustomerInvoice(input: {
  customerId: string;
  invoiceNumber?: string;
  amount: number;
  currency?: string;
  status?: string;
  issueDate?: string;
  dueDate?: string;
  description?: string;
}): Promise<InvoiceRecord> {
  if (!input.customerId) {
    throw new Error("Customer ID is required");
  }

  const headers = await authHeaders();
  const payload = {
    action: "create_invoice",
    ...input,
  };

  if (isLocalhost()) {
    const response = await fetch("/api/invoices", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success || !data.invoice) {
      throw new Error(data?.error || `Failed to create invoice (status ${response.status})`);
    }
    return data.invoice;
  }

  // Production Strategy 1: Path-based
  try {
    const response = await fetch(`${PRODUCTION_DASHBOARD_BASE}/invoices`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data?.success && data.invoice) {
      return data.invoice;
    }
  } catch (err) {
    console.warn("POST to customeranalyticsdashaboard/invoices failed:", err);
  }

  // Production Strategy 2: Action param
  const response = await fetch(`${PRODUCTION_DASHBOARD_BASE}?action=create_invoice`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success || !data.invoice) {
    throw new Error(data?.error || `Failed to create invoice (status ${response.status})`);
  }
  return data.invoice;
}

