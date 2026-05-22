import { useState, useEffect, useRef } from "react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("theme") as Theme) ?? "system",
  );
  const isMounted = useRef(false);

  useEffect(() => {
    const root = document.documentElement;

    const apply = (t: Theme) => {
      if (t === "system") {
        const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", dark);
      } else {
        root.classList.toggle("dark", t === "dark");
      }
    };

    // Skip the very first run — main.tsx already applied the correct class
    // from localStorage before React mounted, so we avoid a redundant toggle
    if (!isMounted.current) {
      isMounted.current = true;
      localStorage.setItem("theme", theme); // still sync storage on first mount
    } else {
      apply(theme);
      localStorage.setItem("theme", theme);
    }

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => apply("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  return { theme, setTheme };
}
