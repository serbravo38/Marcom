import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export type ThemeMode = "dark" | "light";

const THEME_STORAGE_KEY = "marcom_theme";

export function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  return "dark";
}

export function applyThemeToDocument(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  document.body.setAttribute("data-theme", theme);
}

interface ThemeToggleProps {
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  useEffect(() => {
    applyThemeToDocument(theme);
    const handleStorageOrCustom = () => {
      const current = getInitialTheme();
      setTheme(current);
      applyThemeToDocument(current);
    };
    window.addEventListener("marcom-theme-change", handleStorageOrCustom);
    window.addEventListener("storage", handleStorageOrCustom);
    return () => {
      window.removeEventListener("marcom-theme-change", handleStorageOrCustom);
      window.removeEventListener("storage", handleStorageOrCustom);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
    applyThemeToDocument(nextTheme);
    window.dispatchEvent(new Event("marcom-theme-change"));
  };

  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="marcom-theme-toggle-btn"
      title={isLight ? "Cambiar a vista Oscura (Dark Mode)" : "Cambiar a vista Clara (Light Mode)"}
      aria-label={isLight ? "Cambiar a vista oscura" : "Cambiar a vista clara"}
    >
      {isLight ? (
        <>
          <Moon size={15} className="theme-icon-moon" />
          {!compact && <span>Oscuro</span>}
        </>
      ) : (
        <>
          <Sun size={15} className="theme-icon-sun" />
          {!compact && <span>Claro</span>}
        </>
      )}
    </button>
  );
};

export default ThemeToggle;
