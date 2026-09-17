import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { getCurrentUser } from "aws-amplify/auth";
import { initAmplify } from "@/lib/amplify";
import { clearAllUserSessionsAndCache } from "@/lib/auth/logout";

export interface AuthUser {
  userId: string;
  username: string;
  email: string;
  clientId: string;
  client: string;
  businessName: string;
  phone: string;
  avatar: string;
  initials: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getUserFromStorage(
  cognitoUsername?: string,
  cognitoUserId?: string
): AuthUser | null {
  if (typeof window === "undefined") return null;

  const userId =
    cognitoUserId ||
    localStorage.getItem("userId") ||
    localStorage.getItem("clientUserId") ||
    "";
  if (!userId) return null;

  const email = localStorage.getItem("sb-auth-email") || "";
  const username =
    localStorage.getItem("username") ||
    localStorage.getItem("user_name") ||
    localStorage.getItem("client") ||
    cognitoUsername ||
    (email ? email.split("@")[0] : "User");

  const clientId = localStorage.getItem("clientId") || "";
  const client = localStorage.getItem("client") || "";
  const businessName =
    localStorage.getItem("business_name") || "Superblock HQ";
  const phone = localStorage.getItem("phone_number") || "";
  const avatar = localStorage.getItem("profile_picture") || "";

  const initials = (username || "User")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "SB";

  return {
    userId,
    username,
    email,
    clientId,
    client,
    businessName,
    phone,
    avatar,
    initials,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuth = useCallback(async () => {
    try {
      initAmplify();
      const cognitoUser = await getCurrentUser();
      if (cognitoUser && cognitoUser.userId) {
        const userObj = getUserFromStorage(
          cognitoUser.username,
          cognitoUser.userId
        );
        setUser(userObj);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [checkAuth]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    await clearAllUserSessionsAndCache(true);
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
  }, []);

  const refreshAuth = useCallback(async () => {
    await checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        signOut,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
