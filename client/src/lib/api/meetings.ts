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

const PRODUCTION_BASE =
  "https://api.superblock.chat/customeranalyticsdashboard";

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    const session = await fetchAuthSession();
    // Strictly send the Cognito ACCESS TOKEN in Authorization: Bearer <token>
    const token = session?.tokens?.accessToken?.toString() || "";

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn("Could not retrieve Cognito auth session:", error);
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

function meetingsUrl(customerId: string): string {
  const encoded = encodeURIComponent(customerId);

  if (isLocalhost()) {
    return `/api/meetings?customerId=${encoded}`;
  }

  return `${PRODUCTION_BASE}/meetings?customerId=${encoded}`;
}

export async function getCustomerMeetings(
  customerId: string
): Promise<MeetingRecord[]> {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  const response = await fetch(meetingsUrl(customerId), {
    method: "GET",
    headers: await authHeaders(),
  });

  const data = (await response.json().catch(() => null)) as MeetingsResponse | null;

  if (!response.ok || !data?.success) {
    throw new Error(
      data?.error || `Failed to fetch meetings (status ${response.status})`
    );
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

  const response = await fetch(
    isLocalhost() ? "/api/meetings" : `${PRODUCTION_BASE}/meetings`,
    {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        customerId: input.customerId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        meetingDate: input.meetingDate || null,
        durationMinutes: input.durationMinutes ?? null,
        status: input.status || "scheduled",
        meetingUrl: input.meetingUrl || null,
        createdBy: input.createdBy || null,
      }),
    }
  );

  const data = (await response.json().catch(() => null)) as CreateMeetingResponse | null;

  if (!response.ok || !data?.success || !data.meeting) {
    throw new Error(
      data?.error || `Failed to create meeting (status ${response.status})`
    );
  }

  return data.meeting;
}
