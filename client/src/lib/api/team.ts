import { teamMembers as seedMembers } from "@/data/mockData";

export interface TeamMemberItem {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: string;
  department: string;
  customers: number;
  status: "Active" | "Away" | "Disabled";
  lastActive: string;
  createdAt?: string;
  updatedAt?: string;
}

const STORAGE_KEY = "sb_team_members_list";

function getSeedTeamMembers(): TeamMemberItem[] {
  return seedMembers.map((m, idx) => ({
    id: `team-seed-${idx + 1}`,
    name: m.name,
    initials: m.initials,
    email: m.email,
    role: m.role,
    department: m.department,
    customers: m.customers,
    status: (m.status as TeamMemberItem["status"]) || "Active",
    lastActive: m.lastActive,
    createdAt: new Date().toISOString(),
  }));
}

function loadLocalTeamMembers(): TeamMemberItem[] {
  if (typeof window === "undefined") return getSeedTeamMembers();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getSeedTeamMembers();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getSeedTeamMembers();
  } catch (err) {
    console.warn("Could not read team members from localStorage:", err);
    return getSeedTeamMembers();
  }
}

function saveLocalTeamMembers(items: TeamMemberItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn("Could not save team members to localStorage:", err);
  }
}

function getInitials(name?: string): string {
  if (!name || !name.trim()) return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export async function getTeamMembers(): Promise<TeamMemberItem[]> {
  try {
    const res = await fetch("/api/team");
    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data?.teamMembers) && data.teamMembers.length > 0) {
        const mappedFromDb: TeamMemberItem[] = data.teamMembers.map((m: any) => ({
          id: m.id || `tm-${Date.now()}`,
          name: m.name || m.org_user_name || "Team Member",
          initials: getInitials(m.name || m.org_user_name),
          email: m.email || "team@superblock.chat",
          role: m.role || "Member",
          department: m.department || "Customer",
          customers: typeof m.customers === "number" ? m.customers : 0,
          status: m.status || "Active",
          lastActive: m.last_active || "Recently",
          createdAt: m.created_at || new Date().toISOString(),
        }));

        const local = loadLocalTeamMembers();
        const customCreated = local.filter((l) => !mappedFromDb.some((d) => d.id === l.id || d.email === l.email));
        const merged = [...mappedFromDb, ...customCreated];
        saveLocalTeamMembers(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch team members from backend, falling back to local storage:", err);
  }

  return loadLocalTeamMembers();
}

export async function inviteTeamMember(input: Partial<TeamMemberItem>): Promise<TeamMemberItem> {
  const name = input.name?.trim() || "New Member";
  const newMember: TeamMemberItem = {
    id: input.id || `tm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    initials: getInitials(name),
    email: input.email?.trim() || `${name.toLowerCase().replace(/\s+/g, ".")}@superblock.chat`,
    role: input.role || "Customer Success",
    department: input.department || "Customer",
    customers: input.customers ?? 0,
    status: input.status || "Active",
    lastActive: "Just now",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMember),
    });
  } catch (err) {
    console.warn("Backend POST /api/team failed (DB offline), persisting to local storage:", err);
  }

  const existing = loadLocalTeamMembers();
  const updated = [newMember, ...existing.filter((m) => m.id !== newMember.id && m.email !== newMember.email)];
  saveLocalTeamMembers(updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("team-updated", { detail: newMember }));
  }

  return newMember;
}

export async function updateTeamMember(id: string, updates: Partial<TeamMemberItem>): Promise<TeamMemberItem> {
  const existing = loadLocalTeamMembers();
  const target = existing.find((m) => m.id === id || m.email === id);
  if (!target) {
    throw new Error(`Team member ${id} not found`);
  }

  const updatedMember: TeamMemberItem = {
    ...target,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  try {
    await fetch(`/api/team/${encodeURIComponent(target.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedMember),
    });
  } catch (err) {
    console.warn("Backend PUT /api/team failed, persisting to local storage:", err);
  }

  const updatedList = existing.map((m) => (m.id === target.id ? updatedMember : m));
  saveLocalTeamMembers(updatedList);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("team-updated", { detail: updatedMember }));
  }

  return updatedMember;
}

export async function deleteTeamMember(id: string): Promise<boolean> {
  try {
    await fetch(`/api/team/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.warn("Backend DELETE /api/team failed, removing from local storage:", err);
  }

  const existing = loadLocalTeamMembers();
  const updatedList = existing.filter((m) => m.id !== id && m.email !== id);
  saveLocalTeamMembers(updatedList);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("team-updated", { detail: { id } }));
  }

  return true;
}
