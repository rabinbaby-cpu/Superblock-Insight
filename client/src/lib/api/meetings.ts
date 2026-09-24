import { fetchAuthSession } from "aws-amplify/auth";

export interface MeetingRecord {
  id: string;
  customer_id: string;
  title: string | null;
  description: string | null;
  meeting_date: string | null;
  duration_minutes: number | null;
  status: string | null;
  meeting_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface MeetingsResponse {
  success: boolean;
  count: number;
  customerId: string;
  meetings: MeetingRecord[];
  error?: string;
}

interface CreateMeetingResponse {
  success: boolean;
  meeting?: MeetingRecord;
  error?: string;
}

const PRODUCTION_CUSTOMER_BASE =
  "https://api.superblock.chat/customeranalytics";

const PRODUCTION_DASHBOARD_BASE =
  "https://api.superblock.chat/customeranalyticsdashaboard";

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
    console.warn("Could not retrieve Cognito auth session for meetings:", error);
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

export async function getCustomerMeetings(
  customerId: string
): Promise<MeetingRecord[]> {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  const headers = await authHeaders();

  if (isLocalhost()) {
    try {
      const response = await fetch(
        `/api/meetings?customerId=${encodeURIComponent(customerId)}`,
        { method: "GET", headers }
      );
      if (response.ok) {
        const data = (await response.json().catch(() => null)) as MeetingsResponse | null;
        if (data?.success && Array.isArray(data.meetings)) {
          return data.meetings;
        }
      }
    } catch (err) {
      console.warn("Local meetings fetch failed (database offline), using fallback:", err);
    }
    return [];
  }

  // Production Strategy 1: Path-based on customeranalyticsdashaboard/meetings
  try {
    const dashboardUrl = `${PRODUCTION_DASHBOARD_BASE}/meetings?customerId=${encodeURIComponent(customerId)}`;
    const response = await fetch(dashboardUrl, { method: "GET", headers });
    if (response.ok) {
      const data = (await response.json().catch(() => null)) as MeetingsResponse | null;
      if (data?.success && Array.isArray(data.meetings)) {
        return data.meetings;
      }
    }
  } catch (err) {
    console.warn("Direct fetch from customeranalyticsdashaboard/meetings failed, attempting action param fallback:", err);
  }

  // Production Strategy 2: Action param on customeranalyticsdashaboard?action=meetings
  try {
    const actionUrl = `${PRODUCTION_DASHBOARD_BASE}?action=meetings&customerId=${encodeURIComponent(customerId)}`;
    const response = await fetch(actionUrl, { method: "GET", headers });
    if (response.ok) {
      const data = (await response.json().catch(() => null)) as MeetingsResponse | null;
      if (data?.success && Array.isArray(data.meetings)) {
        return data.meetings;
      }
    }
  } catch (err) {
    console.warn("Fetch from customeranalyticsdashaboard?action=meetings failed, attempting customeranalytics fallback:", err);
  }

  // Production Strategy 3: Fallback to customeranalytics?action=meetings
  const customerApiUrl = `${PRODUCTION_CUSTOMER_BASE}?action=meetings&customerId=${encodeURIComponent(customerId)}`;
  const response = await fetch(customerApiUrl, { method: "GET", headers });
  const data = (await response.json().catch(() => null)) as MeetingsResponse | null;

  if (!response.ok || !data?.success) {
    throw new Error(data?.error || `Failed to fetch meetings (status ${response.status})`);
  }

  return Array.isArray(data.meetings) ? data.meetings : [];
}

export async function createCustomerMeeting(input: {
  customerId: string;
  title: string;
  description?: string;
  meetingDate?: string;
  durationMinutes?: number;
  status?: string;
  meetingUrl?: string;
  createdBy?: string;
}): Promise<MeetingRecord> {
  if (!input.customerId) {
    throw new Error("Customer ID is required");
  }

  if (!input.title.trim()) {
    throw new Error("Meeting title is required");
  }

  const headers = await authHeaders();
  const payload = {
    action: "create_meeting",
    customerId: input.customerId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    meetingDate: input.meetingDate || null,
    durationMinutes: input.durationMinutes ?? null,
    status: input.status || "scheduled",
    meetingUrl: input.meetingUrl || null,
    createdBy: input.createdBy || null,
  };

  if (isLocalhost()) {
    const response = await fetch("/api/meetings", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => null)) as CreateMeetingResponse | null;
    if (!response.ok || !data?.success || !data.meeting) {
      throw new Error(data?.error || `Failed to create meeting (status ${response.status})`);
    }
    return data.meeting;
  }

  // Production Strategy 1: Path-based on customeranalyticsdashaboard/meetings
  try {
    const response = await fetch(`${PRODUCTION_DASHBOARD_BASE}/meetings`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => null)) as CreateMeetingResponse | null;
    if (response.ok && data?.success && data.meeting) {
      return data.meeting;
    }
  } catch (err) {
    console.warn("POST to customeranalyticsdashaboard/meetings failed, attempting action fallback:", err);
  }

  // Production Strategy 2: Action parameter on root customeranalyticsdashaboard
  try {
    const actionUrl = `${PRODUCTION_DASHBOARD_BASE}?action=create_meeting`;
    const response = await fetch(actionUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => null)) as CreateMeetingResponse | null;
    if (response.ok && data?.success && data.meeting) {
      return data.meeting;
    }
  } catch (err) {
    console.warn("POST to customeranalyticsdashaboard?action=create_meeting failed, attempting customeranalytics fallback:", err);
  }

  // Production Strategy 3: Fallback to customeranalytics with action=create_meeting
  const customerApiUrl = `${PRODUCTION_CUSTOMER_BASE}?action=create_meeting`;
  const response = await fetch(customerApiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as CreateMeetingResponse | null;
  if (!response.ok || !data?.success || !data.meeting) {
    throw new Error(data?.error || `Failed to create meeting (status ${response.status})`);
  }

  return data.meeting;
}

export async function updateCustomerMeeting(
  meetingId: string,
  input: {
    title?: string;
    description?: string;
    meetingDate?: string;
    durationMinutes?: number;
    status?: string;
    meetingUrl?: string;
  }
): Promise<MeetingRecord> {
  if (!meetingId) {
    throw new Error("Meeting ID is required");
  }

  const headers = await authHeaders();
  const payload = {
    action: "update_meeting",
    meetingId,
    ...input,
  };

  if (isLocalhost()) {
    const res = await fetch(`/api/meetings/${encodeURIComponent(meetingId)}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success || !data.meeting) {
      throw new Error(data?.error || `Failed to update meeting (${res.status})`);
    }
    return data.meeting;
  }

  // Production Strategy 1: Path-based
  try {
    const res = await fetch(`${PRODUCTION_DASHBOARD_BASE}/meetings/${encodeURIComponent(meetingId)}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.success && data.meeting) return data.meeting;
    }
  } catch (err) {
    console.warn("PUT to dashboard/meetings failed:", err);
  }

  // Production Strategy 2: Action query param
  const res = await fetch(`${PRODUCTION_DASHBOARD_BASE}?action=update_meeting&id=${encodeURIComponent(meetingId)}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success || !data.meeting) {
    throw new Error(data?.error || `Failed to update meeting (${res.status})`);
  }
  return data.meeting;
}

export async function deleteCustomerMeeting(meetingId: string): Promise<boolean> {
  if (!meetingId) {
    throw new Error("Meeting ID is required");
  }

  const headers = await authHeaders();

  if (isLocalhost()) {
    const res = await fetch(`/api/meetings/${encodeURIComponent(meetingId)}`, {
      method: "DELETE",
      headers,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || `Failed to delete meeting (${res.status})`);
    }
    return true;
  }

  // Production Strategy 1: Path-based
  try {
    const res = await fetch(`${PRODUCTION_DASHBOARD_BASE}/meetings/${encodeURIComponent(meetingId)}`, {
      method: "DELETE",
      headers,
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.success) return true;
    }
  } catch (err) {
    console.warn("DELETE to dashboard/meetings failed:", err);
  }

  // Production Strategy 2: Action query param
  const res = await fetch(`${PRODUCTION_DASHBOARD_BASE}?action=delete_meeting&id=${encodeURIComponent(meetingId)}`, {
    method: "DELETE",
    headers,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || `Failed to delete meeting (${res.status})`);
  }
  return true;
}

