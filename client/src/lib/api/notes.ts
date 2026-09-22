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
 * Retrieves the Cognito Access Token directly from the active Amplify Auth session.
 * Uses the Cognito ACCESS TOKEN in Authorization: Bearer <token>.
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
    // Strictly send the Cognito ACCESS TOKEN as instructed
    const accessToken = session?.tokens?.accessToken?.toString() || "";
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
  } catch (err) {
    console.warn("Could not retrieve Cognito access token for notes API:", err);
  }

  return headers;
}

/**
 * Fetches customer notes from customeranalyticsdashboard/notes in production
 * or /api/notes locally.
 */
export async function getCustomerNotes(
  customerId: string
): Promise<NoteRecord[]> {
  if (!customerId) return [];

  const url = isLocalhost()
    ? `/api/notes?customerId=${encodeURIComponent(customerId)}`
    : `${PRODUCTION_DASHBOARD_BASE}/notes?customerId=${encodeURIComponent(customerId)}`;

  const headers = await getAuthHeaders();
  const res = await fetch(url, { method: "GET", headers });

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
 * Creates a customer note persisting to PostgreSQL through customeranalyticsdashboard/notes.
 */
export async function createCustomerNote(input: {
  customerId: string;
  title?: string;
  content: string;
  createdBy?: string;
}): Promise<NoteRecord> {
  if (!input.customerId) throw new Error("Customer ID is required");
  if (!input.content.trim()) throw new Error("Note content is required");

  const url = isLocalhost()
    ? "/api/notes"
    : `${PRODUCTION_DASHBOARD_BASE}/notes`;

  const headers = await getAuthHeaders();
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      customerId: input.customerId,
      customer_id: input.customerId,
      title: input.title?.trim() || null,
      content: input.content.trim(),
      createdBy: input.createdBy || null,
    }),
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

  const url = isLocalhost()
    ? `/api/notes/${encodeURIComponent(noteId)}`
    : `${PRODUCTION_DASHBOARD_BASE}/notes/${encodeURIComponent(noteId)}`;

  const headers = await getAuthHeaders();
  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      title: input.title?.trim() || null,
      content: input.content?.trim() || "",
    }),
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

  const url = isLocalhost()
    ? `/api/notes/${encodeURIComponent(noteId)}`
    : `${PRODUCTION_DASHBOARD_BASE}/notes/${encodeURIComponent(noteId)}`;

  const headers = await getAuthHeaders();
  const res = await fetch(url, {
    method: "DELETE",
    headers,
  });

  const data = (await res.json().catch(() => null)) as MutateNoteResponse | null;
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || `Failed to delete note (${res.status})`);
  }

  return true;
}
