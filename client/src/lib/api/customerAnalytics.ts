import { useState, useEffect, useCallback } from "react";
import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth";
import type { Customer } from "@/data/mockData";

export interface ApiCustomerRecord {
  user_id: string;
  business_account_id?: string | null;
  business_name?: string | null;
  business_phone_number_id?: string | null;
  business_portfolio_id?: string | null;
  created_at?: string | null;
  email?: string | null;
  user_email?: string | null;
  user_name?: string | null;
}

export interface CustomerAnalyticsApiResponse {
  success: boolean;
  count: number;
  users: ApiCustomerRecord[];
}

let cachedResponse: CustomerAnalyticsApiResponse | null = null;
let inFlightPromise: Promise<CustomerAnalyticsApiResponse> | null = null;

/**
 * Formats an ISO or timestamp date string into "12 Mar 2025" style.
 */
function formatActivatedDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Extracts a 2-character initials string from a business name or username.
 */
function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "—";
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Maps an API user record to the application's Customer shape.
 * Only real fields provided by the API are populated.
 * Unavailable fields are mapped strictly to "—" or 0 without inventing fake data.
 */
export function mapApiUserToCustomer(user: ApiCustomerRecord): Customer {
  const companyName = user.business_name?.trim() || user.user_name?.trim() || user.user_id;
  const contactEmail = user.user_email?.trim() || user.email?.trim() || "—";
  const contactName = user.user_name?.trim() || "—";
  const contactPhone = user.business_phone_number_id?.trim() || "—";

  return {
    id: user.user_id,
    company: companyName,
    industry: user.business_portfolio_id ? `Portfolio: ${user.business_portfolio_id}` : "—",
    region: user.business_account_id ? `Account: ${user.business_account_id}` : "—",
    initials: getInitials(companyName),
    contact: {
      name: contactName,
      email: contactEmail,
      phone: contactPhone,
    },
    activatedAt: formatActivatedDate(user.created_at),
    status: "—" as any,
    plan: "—",
    subscription: {
      status: "—",
      startDate: formatActivatedDate(user.created_at),
      renewalDate: "—",
      billingCycle: "—",
      mrr: 0,
      contractValue: 0,
      paymentStatus: "—",
    },
    renewal: "—",
    usage: {
      messages: 0,
      broadcasts: 0,
      conversations: 0,
      email: 0,
      sms: 0,
      whatsapp: 0,
      api: 0,
      automations: 0,
      storage: 0,
    },
    offerings: [],
    notes: [],
    meetings: [],
    credentials: [],
    invoices: [],
    activities: [],
    health: {
      score: 0,
      status: "—" as any,
      usageTrend: "Stable",
      loginFrequency: "—",
      riskReason: "—",
    },
    owner: {
      name: "—",
      initials: "—",
    },
    lastActivity: "—",
  };
}

/**
 * Fetches customer analytics data from https://api.superblock.chat/customeranalytics
 * with request deduplication and in-memory caching.
 */
export async function fetchCustomerAnalytics(forceRefresh = false): Promise<CustomerAnalyticsApiResponse> {
  if (!forceRefresh && cachedResponse) {
    return cachedResponse;
  }
  if (!forceRefresh && inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      const session = await fetchAuthSession();
      const token =
        session?.tokens?.idToken?.toString() ||
        session?.tokens?.accessToken?.toString() ||
        "";

      if (!token) {
        throw new Error("No active Cognito authentication token found.");
      }

      const res = await fetch("https://api.superblock.chat/customeranalytics", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Customer Analytics API error (${res.status}): ${errBody || res.statusText}`);
      }

      const data: CustomerAnalyticsApiResponse = await res.json();
      cachedResponse = data;
      return data;
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

/**
 * React hook to access and manage real customer analytics data.
 */
export function useCustomerAnalytics() {
  const [customers, setCustomers] = useState<Customer[]>(() => {
    if (cachedResponse?.users) {
      return cachedResponse.users.map(mapApiUserToCustomer);
    }
    return [];
  });
  const [rawUsers, setRawUsers] = useState<ApiCustomerRecord[]>(() => cachedResponse?.users || []);
  const [loading, setLoading] = useState<boolean>(!cachedResponse);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomerAnalytics(forceRefresh);
      if (data && Array.isArray(data.users)) {
        setRawUsers(data.users);
        setCustomers(data.users.map(mapApiUserToCustomer));
      } else {
        throw new Error("Invalid response format from Customer Analytics API");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load customer analytics";
      setError(message);
      console.error("❌ [CustomerAnalytics Hook] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    customers,
    rawUsers,
    loading,
    error,
    refresh: () => loadData(true),
  };
}
