import { fetchAuthSession } from "aws-amplify/auth";

export interface NoteRecord {
  id: string;
  customer_id: string;
  title: string | null;
  content: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface GetNotesResponse {
  success: boolean;
  count: number;
  customerId: string;
  notes: NoteRecord[];
  error?: string;
}

interface MutateNoteResponse {
  success: boolean;
  note?: NoteRecord;
  id?: string;
  customerId?: string;
  message?: string;
  error?: string;
}

// Working customer API base (same as customerAnalytics.ts)
const PRODUCTION_CUSTOMER_BASE =
  "https://api.superblock.chat/customeranalytics";

// Dashboard base
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
 * Retrieves the Cognito Access Token directly from the active Amplify Auth session,
 * strictly using the Access Token for the dashboard API as required.
 */
async function getAuthHeaders(
  customHeaders: Record<string, string> = {}
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  try {
    const session = await fetchAuthSession();
    // Strictly use Cognito Access Token for dashboard API
    const token = session?.tokens?.accessToken?.toString() || "";
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn("Could not retrieve Cognito auth token for notes API:", err);
  }

  return headers;
}

/**
 * Fetches customer notes using the exact same authentication and routing pattern as customerAnalytics.
 */
export async function getCustomerNotes(
  customerId: string
): Promise<NoteRecord[]> {
  if (!customerId) return [];

  const headers = await getAuthHeaders();

  // Local development: use Express proxy
  if (isLocalhost()) {
    const res = await fetch(
      `/api/notes?customerId=${encodeURIComponent(customerId)}`,
      { method: "GET", headers }
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(
        `Failed to fetch notes (${res.status}): ${errBody || res.statusText}`
      );
    }
    const data = (await res.json().catch(() => null)) as GetNotesResponse | null;
    return Array.isArray(data?.notes) ? data.notes : [];
  }

  // Production: Primary target is official customeranalyticsdashboard/notes
  try {
    const dashboardUrl = `${PRODUCTION_DASHBOARD_BASE}/notes?customerId=${encodeURIComponent(customerId)}`;
    const res = await fetch(dashboardUrl, { method: "GET", headers });
    if (res.ok) {
      const data = (await res.json().catch(() => null)) as GetNotesResponse | null;
      if (data?.success && Array.isArray(data?.notes)) {
        return data.notes;
      }
    }
  } catch (err) {
    console.warn("Direct fetch from customeranalyticsdashboard/notes failed, attempting fallback:", err);
  }

  // Fallback to customeranalytics?action=notes
  const customerApiUrl = `${PRODUCTION_CUSTOMER_BASE}?action=notes&customerId=${encodeURIComponent(customerId)}`;
  const res = await fetch(customerApiUrl, { method: "GET", headers });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `Failed to fetch notes (${res.status}): ${errBody || res.statusText}`
    );
  }

  const data = (await res.json().catch(() => null)) as GetNotesResponse | null;
  if (!data?.success || !Array.isArray(data?.notes)) {
    throw new Error(data?.error || "Invalid response format from notes API");
  }

  return data.notes;
}

/**
 * Creates a customer note persisting to PostgreSQL through the authenticated customer analytics endpoint.
 */
export async function createCustomerNote(input: {
  customerId: string;
  title?: string;
  content: string;
  createdBy?: string;
}): Promise<NoteRecord> {
  if (!input.customerId) throw new Error("Customer ID is required");
  if (!input.content.trim()) throw new Error("Note content is required");

  const headers = await getAuthHeaders();
  const payload = {
    action: "create_note",
    customerId: input.customerId,
    customer_id: input.customerId,
    title: input.title?.trim() || null,
    content: input.content.trim(),
    createdBy: input.createdBy || null,
  };

  if (isLocalhost()) {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as MutateNoteResponse | null;
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || `Failed to create note (${res.status})`);
    }
    if (!data.note) {
      throw new Error("Backend did not return created note record");
    }
    return data.note;
  }

  // Production: Primary target is official customeranalyticsdashboard/notes
  try {
    const dashboardUrl = `${PRODUCTION_DASHBOARD_BASE}/notes`;
    const res = await fetch(dashboardUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as MutateNoteResponse | null;
    if (res.ok && data?.success && data?.note) {
      return data.note;
    }
  } catch (err) {
    console.warn("POST to customeranalyticsdashboard/notes failed, attempting fallback:", err);
  }

  // Fallback to customeranalytics?action=create_note
  const customerApiUrl = `${PRODUCTION_CUSTOMER_BASE}?action=create_note`;
  const res = await fetch(customerApiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => null)) as MutateNoteResponse | null;
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || `Failed to create note (${res.status})`);
  }

  if (!data.note) {
    throw new Error("Backend did not return created note record");
  }

  return data.note;
}

/**
 * Updates an existing customer note by ID.
 */
export async function updateCustomerNote(
  noteId: string,
  input: { title?: string; content?: string }
): Promise<NoteRecord> {
  if (!noteId) throw new Error("Note ID is required");

  const headers = await getAuthHeaders();
  const payload = {
    action: "update_note",
    id: noteId,
    title: input.title?.trim() || null,
    content: input.content?.trim() || "",
  };

  if (isLocalhost()) {
    const res = await fetch(`/api/notes/${encodeURIComponent(noteId)}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as MutateNoteResponse | null;
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || `Failed to update note (${res.status})`);
    }
    if (!data.note) {
      throw new Error("Backend did not return updated note record");
    }
    return data.note;
  }

  // Production: Primary target is official customeranalyticsdashboard/notes/:id
  try {
    const dashboardUrl = `${PRODUCTION_DASHBOARD_BASE}/notes/${encodeURIComponent(noteId)}`;
    const res = await fetch(dashboardUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as MutateNoteResponse | null;
    if (res.ok && data?.success && data?.note) {
      return data.note;
    }
  } catch (err) {
    console.warn("PUT to customeranalyticsdashboard/notes failed, attempting fallback:", err);
  }

  // Fallback to customeranalytics with action=update_note
  const customerApiUrl = `${PRODUCTION_CUSTOMER_BASE}?action=update_note&id=${encodeURIComponent(noteId)}`;
  const res = await fetch(customerApiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => null)) as MutateNoteResponse | null;
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || `Failed to update note (${res.status})`);
  }

  if (!data.note) {
    throw new Error("Backend did not return updated note record");
  }

  return data.note;
}

/**
 * Deletes a customer note by ID from PostgreSQL.
 */
export async function deleteCustomerNote(noteId: string): Promise<boolean> {
  if (!noteId) throw new Error("Note ID is required");

  const headers = await getAuthHeaders();

  if (isLocalhost()) {
    const res = await fetch(`/api/notes/${encodeURIComponent(noteId)}`, {
      method: "DELETE",
      headers,
    });
    const data = (await res.json().catch(() => null)) as MutateNoteResponse | null;
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || `Failed to delete note (${res.status})`);
    }
    return true;
  }

  // Production: Primary target is official customeranalyticsdashboard/notes/:id
  try {
    const dashboardUrl = `${PRODUCTION_DASHBOARD_BASE}/notes/${encodeURIComponent(noteId)}`;
    const res = await fetch(dashboardUrl, {
      method: "DELETE",
      headers,
    });
    const data = (await res.json().catch(() => null)) as MutateNoteResponse | null;
    if (res.ok && data?.success) {
      return true;
    }
  } catch (err) {
    console.warn("DELETE to customeranalyticsdashboard/notes failed, attempting fallback:", err);
  }

  // Fallback to customeranalytics with action=delete_note
  const customerApiUrl = `${PRODUCTION_CUSTOMER_BASE}?action=delete_note&id=${encodeURIComponent(noteId)}`;
  const res = await fetch(customerApiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "delete_note", id: noteId }),
  });

  const data = (await res.json().catch(() => null)) as MutateNoteResponse | null;
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || `Failed to delete note (${res.status})`);
  }

  return true;
}
