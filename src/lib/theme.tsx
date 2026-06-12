import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type Theme = "light" | "dark" | "system"
const STORAGE_KEY = "tb-hub-theme"

type ThemeCtx = {
  theme: Theme
  resolved: "light" | "dark"
  setTheme: (t: Theme) => void
}

const Ctx = createContext<ThemeCtx | null>(null)

function readStored(): Theme {
  if (typeof localStorage === "undefined") return "system"
  const v = localStorage.getItem(STORAGE_KEY)
  return v === "light" || v === "dark" || v === "system" ? v : "system"
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

function applyTheme(t: Theme): "light" | "dark" {
  const dark = t === "dark" || (t === "system" && systemPrefersDark())
  document.documentElement.classList.toggle("dark", dark)
  return dark ? "dark" : "light"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStored())
  const [resolved, setResolved] = useState<"light" | "dark">(() => applyTheme(readStored()))

  // React to system-preference changes while in "system" mode.
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => {
      if (theme === "system") setResolved(applyTheme("system"))
    }
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [theme])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem(STORAGE_KEY, t)
    setResolved(applyTheme(t))
  }

  return <Ctx.Provider value={{ theme, resolved, setTheme }}>{children}</Ctx.Provider>
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error("useTheme must be used inside <ThemeProvider>")
  return v
}
