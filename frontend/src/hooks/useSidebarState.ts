import { useState, useEffect } from "react"

export function useSidebarState(defaultOpen = true) {
  const [open, setOpen] = useState(() => {
    const stored = localStorage.getItem("sidebar-open")
    return stored !== null ? stored === "true" : defaultOpen
  })

  useEffect(() => {
    localStorage.setItem("sidebar-open", String(open))
  }, [open])

  return [open, setOpen] as const
}