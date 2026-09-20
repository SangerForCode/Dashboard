"use client";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function storedTheme() {
  try {
    return localStorage.getItem("theme");
  } catch {
    return null;
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function subscribeToTheme(onStoreChange: () => void) {
  const root = document.documentElement;
  const observer = new MutationObserver(onStoreChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const followSystemTheme = (event: MediaQueryListEvent) => {
    if (!storedTheme()) {
      applyTheme(event.matches ? "dark" : "light");
      onStoreChange();
    }
  };

  observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  media.addEventListener("change", followSystemTheme);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", followSystemTheme);
  };
}

function clientSnapshot() {
  return document.documentElement.dataset.theme === "dark";
}

export function ThemeToggle() {
  // A stable server snapshot prevents the server's moon button from differing
  // from the client during hydration; React syncs with the bootstrap theme next.
  const isDark = useSyncExternalStore(subscribeToTheme, clientSnapshot, () => false);

  function toggle() {
    const next: Theme = isDark ? "light" : "dark";
    const commit = () => {
      applyTheme(next);
      try {
        localStorage.setItem("theme", next);
      } catch {
        // The current session still receives the requested theme if storage is unavailable.
      }
    };

    const documentWithTransition = document as Document & {
      startViewTransition?: (callback: () => void) => void;
    };
    if (
      documentWithTransition.startViewTransition &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      documentWithTransition.startViewTransition(commit);
    } else {
      commit();
    }
  }

  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
