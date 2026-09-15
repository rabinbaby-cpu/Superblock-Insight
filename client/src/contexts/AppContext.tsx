import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type ThemeMode = "light" | "dark" | "system";

type AppContextValue = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isRefreshing: boolean;
  refreshData: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [theme, setThemeState] = useState<ThemeMode>(() => (localStorage.getItem("superblock-theme") as ThemeMode) || "light");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const applyTheme = () => {
      const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    applyTheme();
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    query.addEventListener("change", applyTheme);
    return () => query.removeEventListener("change", applyTheme);
  }, [theme]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const setTheme = (nextTheme: ThemeMode) => {
    localStorage.setItem("superblock-theme", nextTheme);
    setThemeState(nextTheme);
  };

  const refreshData = () => {
    setIsRefreshing(true);
    window.setTimeout(() => setIsRefreshing(false), 950);
  };

  const value = useMemo(() => ({
    sidebarCollapsed,
    toggleSidebar: () => setSidebarCollapsed((value) => !value),
    mobileNavOpen,
    setMobileNavOpen,
    searchOpen,
    setSearchOpen,
    theme,
    setTheme,
    isRefreshing,
    refreshData,
  }), [sidebarCollapsed, mobileNavOpen, searchOpen, theme, isRefreshing]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
