import { fetchAuthSession } from "aws-amplify/auth";

export interface MetaCredentials {
  appId?: string | null;
  businessAccountId?: string | null;
  businessPhoneNumberId?: string | null;
  businessPortfolioId?: string | null;
  whatsappEndpoint?: string | null;
  hasToken: boolean;
  graphApiToken?: string | null;
}

export interface SuperblockCredentials {
  username: string;
  email: string;
  role?: string | null;
  plan?: string | null;
  loginUrl: string;
}

export interface FacebookCredentials {
  pageId?: string | null;
  pageName?: string | null;
  endpoint?: string | null;
  hasToken: boolean;
  accessToken?: string | null;
}

export interface InstagramCredentials {
  username?: string | null;
  endpoint?: string | null;
  hasToken: boolean;
  accessToken?: string | null;
}

export interface ShopifyCredentials {
  apiUrl?: string | null;
  hasToken: boolean;
  adminAccessToken?: string | null;
}

export interface CustomerCredentialsData {
  customerId: string;
  customerName: string;
  username: string;
  email: string;
  role?: string | null;
  plan?: string | null;
  status: "Configured" | "Partial" | "Unconfigured";
  updatedAt?: string | null;
  meta: MetaCredentials;
  superblock: SuperblockCredentials;
  channels: {
    facebook?: FacebookCredentials | null;
    instagram?: InstagramCredentials | null;
    shopify?: ShopifyCredentials | null;
  };
}

interface CredentialsResponse {
  success: boolean;
  customerId: string;
  credentials: CustomerCredentialsData | null;
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
    console.warn("Could not retrieve Cognito auth session for credentials:", error);
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

/**
 * Retrieves real operational customer credentials (Meta WhatsApp, Superblock, Social & E-commerce).
 */
export async function getCustomerCredentials(
  customerId: string
): Promise<CustomerCredentialsData | null> {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  const headers = await authHeaders();

  if (isLocalhost()) {
    const response = await fetch(
      `/api/credentials?customerId=${encodeURIComponent(customerId)}`,
      { method: "GET", headers }
    );
    const data = (await response.json().catch(() => null)) as CredentialsResponse | null;
    if (!response.ok || !data?.success) {
      throw new Error(data?.error || `Failed to fetch credentials (status ${response.status})`);
    }
    return data.credentials;
  }

  // Production Strategy 1: Path-based on customeranalyticsdashaboard/credentials
  try {
    const dashboardUrl = `${PRODUCTION_DASHBOARD_BASE}/credentials?customerId=${encodeURIComponent(customerId)}`;
    const response = await fetch(dashboardUrl, { method: "GET", headers });
    if (response.ok) {
      const data = (await response.json().catch(() => null)) as CredentialsResponse | null;
      if (data?.success && data.credentials) {
        return data.credentials;
      }
    }
  } catch (err) {
    console.warn("Direct fetch from customeranalyticsdashaboard/credentials failed, attempting action param fallback:", err);
  }

  // Production Strategy 2: Action param on customeranalyticsdashaboard?action=credentials
  try {
    const actionUrl = `${PRODUCTION_DASHBOARD_BASE}?action=credentials&customerId=${encodeURIComponent(customerId)}`;
    const response = await fetch(actionUrl, { method: "GET", headers });
    if (response.ok) {
      const data = (await response.json().catch(() => null)) as CredentialsResponse | null;
      if (data?.success && data.credentials) {
        return data.credentials;
      }
    }
  } catch (err) {
    console.warn("Fetch from customeranalyticsdashaboard?action=credentials failed:", err);
  }

  throw new Error("Unable to retrieve customer credentials from live service");
}
