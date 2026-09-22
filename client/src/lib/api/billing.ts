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

const PRODUCTION_DASHBOARD_BASE =
  "https://api.superblock.chat/customeranalyticsdashboard";

function isLocalhost(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  );
}

/**
 * Returns request headers with the Cognito ACCESS token in Authorization: Bearer <token>.
 */
async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    const session = await fetchAuthSession();
    // Strictly send the Cognito ACCESS TOKEN
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
 * Fetches invoices for a customer from customeranalyticsdashboard/invoices.
 */
export async function getCustomerInvoices(
  customerId: string
): Promise<InvoiceRecord[]> {
  if (!customerId) return [];

  const encoded = encodeURIComponent(customerId);
  const url = isLocalhost()
    ? `/api/invoices?customerId=${encoded}`
    : `${PRODUCTION_DASHBOARD_BASE}/invoices?customerId=${encoded}`;

  const response = await fetch(url, {
    method: "GET",
    headers: await authHeaders(),
  });

  const data = (await response.json().catch(() => null)) as InvoicesResponse | null;

  if (!response.ok || !data?.success) {
    throw new Error(
      data?.error || `Failed to fetch invoices (status ${response.status})`
    );
  }

  return Array.isArray(data.invoices) ? data.invoices : [];
}

/**
 * Fetches subscriptions for a customer from customeranalyticsdashboard/subscriptions.
 */
export async function getCustomerSubscriptions(
  customerId: string
): Promise<SubscriptionRecord[]> {
  if (!customerId) return [];

  const encoded = encodeURIComponent(customerId);
  const url = isLocalhost()
    ? `/api/subscriptions?customerId=${encoded}`
    : `${PRODUCTION_DASHBOARD_BASE}/subscriptions?customerId=${encoded}`;

  const response = await fetch(url, {
    method: "GET",
    headers: await authHeaders(),
  });

  const data = (await response.json().catch(() => null)) as SubscriptionsResponse | null;

  if (!response.ok || !data?.success) {
    throw new Error(
      data?.error || `Failed to fetch subscriptions (status ${response.status})`
    );
  }

  return Array.isArray(data.subscriptions) ? data.subscriptions : [];
}

/**
 * Fetches billing products catalog from customeranalyticsdashboard/products.
 */
export async function getBillingProducts(): Promise<ProductRecord[]> {
  const url = isLocalhost()
    ? "/api/products"
    : `${PRODUCTION_DASHBOARD_BASE}/products`;

  const response = await fetch(url, {
    method: "GET",
    headers: await authHeaders(),
  });

  const data = (await response.json().catch(() => null)) as ProductsResponse | null;

  if (!response.ok || !data?.success) {
    throw new Error(
      data?.error || `Failed to fetch products (status ${response.status})`
    );
  }

  return Array.isArray(data.products) ? data.products : [];
}
