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
  "https://api.superblock.chat/customeranalyticsdashboard";

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    const session = await fetchAuthSession();
    const token =
      session?.tokens?.accessToken?.toString() ||
      session?.tokens?.idToken?.toString() ||
      "";

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn("Could not retrieve Cognito auth session for meetings:", error);
  }

  return headers;
}

function isLocalhost(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
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
    const response = await fetch(
      `/api/meetings?customerId=${encodeURIComponent(customerId)}`,
      { method: "GET", headers }
    );
    const data = (await response.json().catch(() => null)) as MeetingsResponse | null;
    if (!response.ok || !data?.success) {
      throw new Error(data?.error || `Failed to fetch meetings (status ${response.status})`);
    }
    return Array.isArray(data.meetings) ? data.meetings : [];
  }

  // Production: Primary target is official customeranalyticsdashboard/meetings
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
    console.warn("Direct fetch from customeranalyticsdashboard/meetings failed, attempting fallback:", err);
  }

  // Fallback to customeranalytics?action=meetings
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

  // Production: Primary target is official customeranalyticsdashboard/meetings
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
    console.warn("POST to customeranalyticsdashboard/meetings failed, attempting fallback:", err);
  }

  // Fallback to customeranalytics with action=create_meeting
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
