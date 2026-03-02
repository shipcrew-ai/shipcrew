"use client";
import { useEffect } from "react";
import { useAppStore } from "@/store";

export function ThemeSync() {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return null;
}
