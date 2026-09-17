import { signOut } from "aws-amplify/auth";

/**
 * Perform complete user sign-out:
 * 1. Sign out of AWS Amplify auth (global & local)
 * 2. Invalidate server session cookie via /api/set-user-session
 * 3. Expire all cookies across paths and domains
 * 4. Clear Web CacheStorage
 * 5. Clear LocalStorage and SessionStorage
 * 6. Dispatch storage event to notify all active browser tabs
 * 7. Redirect to /login with full page reload
 */
export async function clearAllUserSessionsAndCache(redirect: boolean = true) {
  try {
    await signOut({ global: true });
    console.log("✅ Amplify user signed out globally");
  } catch (error) {
    try {
      await signOut();
      console.log("✅ Amplify user signed out locally");
    } catch (err) {
      console.error("Error signing out with Amplify:", err);
    }
  }

  // Invalidate backend user session
  try {
    await fetch("/api/set-user-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "" }),
    });
  } catch (e) {
    // Ignore network error during logout session cleanup
  }

  // Clear all authentication and session cookies across path/domain scopes
  if (typeof document !== "undefined") {
    const cookiesToClear = [
      "user_session",
      "user_id",
      "access_token",
      "refresh_token",
      "clientUserId",
      "sb-auth-email",
      "sb_user_session",
      "supabase-auth-token",
      "next-auth.session-token",
      "next-auth.callback-url",
      "next-auth.csrf-token",
      "amplify-redirected-from-hosted-ui",
    ];

    const hostname = window.location.hostname;
    const domainParts = hostname.split(".");

    cookiesToClear.forEach((name) => {
      document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax`;
      document.cookie = `${name}=; Path=/; Domain=${hostname}; Expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax`;

      if (domainParts.length > 2) {
        const parentDomain = "." + domainParts.slice(-2).join(".");
        document.cookie = `${name}=; Path=/; Domain=${parentDomain}; Expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax`;
      }
    });
  }

  // Clear Web CacheStorage caches
  if (typeof window !== "undefined" && "caches" in window) {
    try {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      console.log("✅ Cleared all Web CacheStorage caches");
    } catch (e) {
      console.error("Error clearing CacheStorage:", e);
    }
  }

  // Clear LocalStorage and SessionStorage
  if (typeof window !== "undefined") {
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log("✅ Cleared LocalStorage and SessionStorage");
    } catch (e) {
      console.error("Error clearing web storage:", e);
    }

    try {
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}

    if (redirect) {
      window.location.href = "/login";
    }
  }
}
