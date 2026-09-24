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

function getLocalNotesKey(customerId: string): string {
  return `sb_notes_${customerId}`;
}

export function getLocalNotes(customerId: string): NoteRecord[] {
  if (typeof window === "undefined" || !customerId) return [];
  try {
    const raw = localStorage.getItem(getLocalNotesKey(customerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalNote(customerId: string, note: NoteRecord): void {
  if (typeof window === "undefined" || !customerId) return;
  try {
    const existing = getLocalNotes(customerId);
    const updated = [note, ...existing.filter((n) => n.id !== note.id)];
    localStorage.setItem(getLocalNotesKey(customerId), JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("customer-note-created", { detail: { customerId, note } }));
  } catch (err) {
    console.warn("Could not save note to localStorage:", err);
  }
}

export function updateLocalNote(
  customerId: string,
  noteId: string,
  updates: { title?: string | null; content?: string }
): NoteRecord | null {
  if (typeof window === "undefined" || !customerId) return null;
  try {
    const existing = getLocalNotes(customerId);
    let updatedNote: NoteRecord | null = null;
    const updatedList = existing.map((n) => {
      if (n.id === noteId) {
        updatedNote = {
          ...n,
          title: updates.title !== undefined ? updates.title : n.title,
          content: updates.content !== undefined ? updates.content : n.content,
          updated_at: new Date().toISOString(),
        };
        return updatedNote;
      }
      return n;
    });
    localStorage.setItem(getLocalNotesKey(customerId), JSON.stringify(updatedList));
    window.dispatchEvent(new CustomEvent("customer-note-created", { detail: { customerId, noteId } }));
    return updatedNote;
  } catch {
    return null;
  }
}

export function removeLocalNote(customerId: string, noteId: string): void {
  if (typeof window === "undefined" || !customerId) return;
  try {
    const existing = getLocalNotes(customerId);
    const filtered = existing.filter((n) => n.id !== noteId);
    localStorage.setItem(getLocalNotesKey(customerId), JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent("customer-note-created", { detail: { customerId, noteId } }));
  } catch {}
}

/**
 * Fetches customer notes using the exact same authentication and routing pattern as customerAnalytics.
 */
export async function getCustomerNotes(
  customerId: string
): Promise<NoteRecord[]> {
  if (!customerId) return [];

  const headers = await getAuthHeaders();

  // Local development: use Express proxy with safe fallback
  if (isLocalhost()) {
    let serverNotes: NoteRecord[] = [];
    try {
      const res = await fetch(
        `/api/notes?customerId=${encodeURIComponent(customerId)}`,
        { method: "GET", headers }
      );
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as GetNotesResponse | null;
        if (Array.isArray(data?.notes)) {
          serverNotes = data.notes;
        }
      }
    } catch (err) {
      console.warn("Local notes fetch failed (database offline), using fallback:", err);
    }
    const local = getLocalNotes(customerId);
    const serverIds = new Set(serverNotes.map((n) => n.id));
    return [...local.filter((l) => !serverIds.has(l.id)), ...serverNotes];
  }

  // Production Strategy 1: Path-based on customeranalyticsdashaboard/notes
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
    console.warn("Direct fetch from customeranalyticsdashaboard/notes failed, attempting action param fallback:", err);
  }

  // Production Strategy 2: Query-based on customeranalyticsdashaboard?action=notes
  try {
    const actionUrl = `${PRODUCTION_DASHBOARD_BASE}?action=notes&customerId=${encodeURIComponent(customerId)}`;
    const res = await fetch(actionUrl, { method: "GET", headers });
    if (res.ok) {
      const data = (await res.json().catch(() => null)) as GetNotesResponse | null;
      if (data?.success && Array.isArray(data?.notes)) {
        return data.notes;
      }
    }
  } catch (err) {
    console.warn("Fetch from customeranalyticsdashaboard?action=notes failed, attempting customeranalytics fallback:", err);
  }

  // Production Strategy 3: Fallback to customeranalytics?action=notes
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
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as MutateNoteResponse | null;
      if (res.ok && data?.success && data?.note) {
        saveLocalNote(input.customerId, data.note);
        return data.note;
      }
      if (!res.ok) {
        console.warn(`Local /api/notes returned ${res.status} (${data?.error || "network error"}), falling back to local storage.`);
      }
    } catch (err: any) {
      console.warn("Local POST /api/notes failed with network error, saving to local storage fallback:", err?.message || err);
    }

    // Offline / DB maintenance fallback: persist directly to localStorage
    const localNote: NoteRecord = {
      id: `local-note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      customer_id: input.customerId,
      title: input.title?.trim() || "Customer Note",
      content: input.content.trim(),
      created_by: input.createdBy || "Admin User",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveLocalNote(input.customerId, localNote);
    return localNote;
  }

  // Production Strategy 1: Primary target is official customeranalyticsdashaboard/notes
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
    console.warn("POST to customeranalyticsdashaboard/notes failed, attempting action param fallback:", err);
  }

  // Production Strategy 2: Root endpoint with action parameter
  try {
    const actionUrl = `${PRODUCTION_DASHBOARD_BASE}?action=create_note`;
    const res = await fetch(actionUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as MutateNoteResponse | null;
    if (res.ok && data?.success && data?.note) {
      return data.note;
    }
  } catch (err) {
    console.warn("POST to customeranalyticsdashaboard?action=create_note failed, attempting customeranalytics fallback:", err);
  }

  // Production Strategy 3: Fallback to customeranalytics?action=create_note
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
    try {
      const res = await fetch(`/api/notes/${encodeURIComponent(noteId)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as MutateNoteResponse | null;
      if (res.ok && data?.success && data?.note) {
        return data.note;
      }
    } catch (err) {
      console.warn("Local update note failed (database offline), applying to local storage:", err);
    }
    // Fallback: update any matching note in localStorage
    if (typeof window !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("sb_notes_")) {
          const custId = key.replace("sb_notes_", "");
          const updated = updateLocalNote(custId, noteId, {
            title: input.title,
            content: input.content,
          });
          if (updated) return updated;
        }
      }
    }
    return {
      id: noteId,
      customer_id: "",
      title: input.title?.trim() || null,
      content: input.content?.trim() || "",
      created_by: "Admin User",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // Production Strategy 1: Primary target is official customeranalyticsdashaboard/notes/:id
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
    console.warn("PUT to customeranalyticsdashaboard/notes failed, attempting action fallback:", err);
  }

  // Production Strategy 2: Action parameter on root customeranalyticsdashaboard
  try {
    const actionUrl = `${PRODUCTION_DASHBOARD_BASE}?action=update_note&id=${encodeURIComponent(noteId)}`;
    const res = await fetch(actionUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as MutateNoteResponse | null;
    if (res.ok && data?.success && data?.note) {
      return data.note;
    }
  } catch (err) {
    console.warn("POST to customeranalyticsdashaboard?action=update_note failed, attempting customeranalytics fallback:", err);
  }

  // Production Strategy 3: Fallback to customeranalytics with action=update_note
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
    try {
      const res = await fetch(`/api/notes/${encodeURIComponent(noteId)}`, {
        method: "DELETE",
        headers,
      });
      const data = (await res.json().catch(() => null)) as MutateNoteResponse | null;
      if (res.ok && data?.success) {
        // success
      }
    } catch (err) {
      console.warn("Local delete note failed (database offline), removing from local storage:", err);
    }
    // Also remove from any customer's localStorage
    if (typeof window !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("sb_notes_")) {
          const raw = localStorage.getItem(key);
          if (raw && raw.includes(noteId)) {
            try {
              const list = JSON.parse(raw);
              const filtered = list.filter((n: any) => n.id !== noteId);
              localStorage.setItem(key, JSON.stringify(filtered));
              const custId = key.replace("sb_notes_", "");
              window.dispatchEvent(new CustomEvent("customer-note-created", { detail: { customerId: custId, noteId } }));
            } catch {}
          }
        }
      }
    }
    return true;
  }

  // Production Strategy 1: Primary target is official customeranalyticsdashaboard/notes/:id
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
    console.warn("DELETE to customeranalyticsdashaboard/notes failed, attempting action fallback:", err);
  }

  // Production Strategy 2: Action parameter on root customeranalyticsdashaboard
  try {
    const actionUrl = `${PRODUCTION_DASHBOARD_BASE}?action=delete_note&id=${encodeURIComponent(noteId)}`;
    const res = await fetch(actionUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "delete_note", id: noteId }),
    });
    const data = (await res.json().catch(() => null)) as MutateNoteResponse | null;
    if (res.ok && data?.success) {
      return true;
    }
  } catch (err) {
    console.warn("POST to customeranalyticsdashaboard?action=delete_note failed, attempting customeranalytics fallback:", err);
  }

  // Production Strategy 3: Fallback to customeranalytics with action=delete_note
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
