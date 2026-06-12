import { Airplay, Moon, Sun } from "lucide-react"

import { cn } from "@/lib/utils"
import { useTheme, type Theme } from "@/lib/theme"

const OPTIONS: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Airplay, label: "System" },
]

/**
 * Three-way segmented theme switcher — mirrors the fumadocs pill on tbench.ai.
 * Active icon gets an accent disc background; others sit muted in the pill.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <div
      className="inline-flex items-center rounded-full border p-1"
      role="radiogroup"
      aria-label="Theme"
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "size-6 rounded-full p-1 transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-full" fill="currentColor" />
          </button>
        )
      })}
    </div>
  )
}
