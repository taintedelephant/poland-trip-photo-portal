"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MoonIcon, SunIcon } from "@radix-ui/react-icons"

export function Header() {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Check if user prefers dark mode
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    setIsDarkMode(prefersDark)

    // Apply dark mode class if needed
    if (prefersDark) {
      document.documentElement.classList.add("dark")
    }
  }, [])

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle("dark")
  }

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-950/80 dark:border-slate-800">
      <div className="container flex items-center justify-between h-16 px-4 mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Poland Trip Photo Portal</h1>
        <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
          {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
        </Button>
      </div>
    </header>
  )
} 