export interface ProfileSettings {
  fullName: string;
  displayName: string;
  email: string;
  phone: string;
  timezone: string;
}

export interface NotificationSettings {
  renewalAlerts: boolean;
  billingExceptions: boolean;
  usageAnomalies: boolean;
  productUpdates: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginAlerts: boolean;
  sessionTimeoutHours: string;
  activeSessions: {
    id: string;
    device: string;
    location: string;
    lastActive: string;
    isCurrent: boolean;
  }[];
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  expiresAt: string;
}

export interface AppSettings {
  profile: ProfileSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  apiKeys: ApiKeyRecord[];
  workspaceName: string;
}

const STORAGE_KEY = "sb_user_settings";

const defaultSettings: AppSettings = {
  profile: {
    fullName: "Anika Shah",
    displayName: "Anika",
    email: "anika@superblock.chat",
    phone: "+91 98765 43210",
    timezone: "ist",
  },
  notifications: {
    renewalAlerts: true,
    billingExceptions: true,
    usageAnomalies: true,
    productUpdates: false,
  },
  security: {
    twoFactorEnabled: false,
    loginAlerts: true,
    sessionTimeoutHours: "8",
    activeSessions: [
      {
        id: "sess-1",
        device: "Chrome on macOS",
        location: "Mumbai, India",
        lastActive: "Active now",
        isCurrent: true,
      },
      {
        id: "sess-2",
        device: "Safari on iPhone",
        location: "Mumbai, India",
        lastActive: "2 days ago",
        isCurrent: false,
      },
    ],
  },
  apiKeys: [
    {
      id: "key-1",
      name: "Production Webhook",
      keyPrefix: "sb_live_92f...",
      createdAt: "01 Sep 2026",
      expiresAt: "01 Sep 2027",
    },
  ],
  workspaceName: "Superblock HQ",
};

export function loadLocalSettings(): AppSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
      return defaultSettings;
    }
    const parsed = JSON.parse(raw);
    return {
      ...defaultSettings,
      ...parsed,
      profile: { ...defaultSettings.profile, ...parsed.profile },
      notifications: { ...defaultSettings.notifications, ...parsed.notifications },
      security: { ...defaultSettings.security, ...parsed.security },
      apiKeys: Array.isArray(parsed.apiKeys) ? parsed.apiKeys : defaultSettings.apiKeys,
    };
  } catch (err) {
    console.warn("Could not read settings from localStorage:", err);
    return defaultSettings;
  }
}

export function saveLocalSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn("Could not save settings to localStorage:", err);
  }
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data?.settings) {
        const merged = { ...defaultSettings, ...data.settings };
        saveLocalSettings(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn("Backend GET /api/settings failed, using local storage:", err);
  }
  return loadLocalSettings();
}

export async function saveSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  const current = loadLocalSettings();
  const merged: AppSettings = {
    ...current,
    ...updates,
    profile: { ...current.profile, ...(updates.profile || {}) },
    notifications: { ...current.notifications, ...(updates.notifications || {}) },
    security: { ...current.security, ...(updates.security || {}) },
    apiKeys: updates.apiKeys || current.apiKeys,
  };

  try {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(merged),
    });
  } catch (err) {
    console.warn("Backend POST /api/settings failed (DB offline), persisting locally:", err);
  }

  saveLocalSettings(merged);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("settings-updated", { detail: merged }));
  }

  return merged;
}

export async function createApiKey(
  name: string,
  expiryDays = 365
): Promise<{ apiKey: ApiKeyRecord; rawKey: string; settings: AppSettings }> {
  const settings = loadLocalSettings();
  const rand = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  const rawKey = `sb_live_${rand}`;
  const newKey: ApiKeyRecord = {
    id: `key-${Date.now()}`,
    name: name.trim() || "API Key",
    keyPrefix: `sb_live_${rand.slice(0, 6)}...`,
    createdAt: new Date().toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    expiresAt: new Date(Date.now() + expiryDays * 86400000).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  };

  const updatedKeys = [newKey, ...settings.apiKeys];
  const updated = await saveSettings({ apiKeys: updatedKeys });
  return { apiKey: newKey, rawKey, settings: updated };
}

export async function revokeApiKey(keyId: string): Promise<AppSettings> {
  const settings = loadLocalSettings();
  const updatedKeys = settings.apiKeys.filter((k) => k.id !== keyId);
  return await saveSettings({ apiKeys: updatedKeys });
}

export async function revokeSession(sessionId: string): Promise<AppSettings> {
  const settings = loadLocalSettings();
  const updatedSessions = settings.security.activeSessions.filter(
    (s) => s.id !== sessionId
  );
  return await saveSettings({
    security: {
      ...settings.security,
      activeSessions: updatedSessions,
    },
  });
}

