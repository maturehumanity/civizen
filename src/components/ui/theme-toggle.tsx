"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useLanguage } from "@/contexts/LanguageContext"
import { cn } from "@/lib/utils"

type ThemeValue = "light" | "dark" | "system"

function canHoverOpen(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme, theme } = useTheme()
  const { t } = useLanguage()
  const [open, setOpen] = React.useState(false)
  const closeTimerRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
    }
  }, [])

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const openMenu = () => {
    clearCloseTimer()
    setOpen(true)
  }

  const scheduleClose = () => {
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 160)
  }

  const applyTheme = (next: ThemeValue) => {
    clearCloseTimer()
    setTheme(next)
    setOpen(false)
  }

  const toggleOpposite = () => {
    clearCloseTimer()
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
    if (canHoverOpen()) setOpen(true)
  }

  const options: { value: ThemeValue; label: string }[] = [
    { value: "light", label: t("common.light") },
    { value: "dark", label: t("common.dark") },
    { value: "system", label: t("common.system") },
  ]

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        clearCloseTimer()
        setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t("common.theme")}
          aria-expanded={open}
          className="group relative"
          onMouseEnter={() => {
            if (canHoverOpen()) openMenu()
          }}
          onMouseLeave={() => {
            if (canHoverOpen()) scheduleClose()
          }}
          onPointerDown={(event) => {
            if (canHoverOpen()) event.preventDefault()
          }}
          onClick={() => {
            if (canHoverOpen()) toggleOpposite()
          }}
        >
          <Sun
            className={cn(
              "h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all",
              "group-hover:-rotate-90 group-hover:scale-0",
              "dark:-rotate-90 dark:scale-0",
              "dark:group-hover:rotate-0 dark:group-hover:scale-100",
            )}
          />
          <Moon
            className={cn(
              "absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all",
              "group-hover:rotate-0 group-hover:scale-100",
              "dark:rotate-0 dark:scale-100",
              "dark:group-hover:rotate-90 dark:group-hover:scale-0",
            )}
          />
          <span className="sr-only">{t("common.theme")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-36 p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onMouseEnter={() => {
          if (canHoverOpen()) openMenu()
        }}
        onMouseLeave={() => {
          if (canHoverOpen()) scheduleClose()
        }}
      >
        <div className="flex flex-col" role="listbox" aria-label={t("common.theme")}>
          {options.map((option) => {
            const selected = theme === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-left text-sm outline-none transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground",
                )}
                onClick={() => applyTheme(option.value)}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
