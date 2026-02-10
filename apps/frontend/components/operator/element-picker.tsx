"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { Crosshair, X } from "lucide-react"

export interface ElementData {
  selector: string
  tagName: string
  id: string | null
  classes: string[]
  textContent: string
  pageUrl: string
  boundingRect: {
    top: number
    left: number
    width: number
    height: number
  }
  timestamp: string
}

interface ElementPickerProps {
  onElementSelected: (data: ElementData) => void
}

/**
 * Generate a readable CSS selector path for an element.
 */
function generateSelector(el: Element): string {
  const parts: string[] = []
  let current: Element | null = el

  while (current && current !== document.body && current !== document.documentElement) {
    if (current.id) {
      parts.unshift(`#${current.id}`)
      break
    }

    let part = current.tagName.toLowerCase()

    const meaningful = Array.from(current.classList).filter(
      (c) => !c.startsWith("h-") && !c.startsWith("w-") && !c.startsWith("p-") &&
             !c.startsWith("m-") && !c.startsWith("text-") && !c.startsWith("bg-") &&
             !c.startsWith("border-") && !c.startsWith("flex") && !c.startsWith("grid") &&
             !c.startsWith("col-") && !c.startsWith("row-") && !c.startsWith("gap-") &&
             !c.startsWith("space-") && !c.startsWith("rounded") && !c.startsWith("shadow") &&
             !c.startsWith("transition") && !c.startsWith("animate") && !c.startsWith("hover:") &&
             !c.startsWith("focus:") && !c.startsWith("dark:") && !c.startsWith("sm:") &&
             !c.startsWith("md:") && !c.startsWith("lg:") && !c.startsWith("xl:") &&
             !c.startsWith("min-") && !c.startsWith("max-") && c.length < 30
    )
    if (meaningful.length > 0) {
      part += "." + meaningful.slice(0, 2).join(".")
    }

    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (s) => s.tagName === current!.tagName
      )
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        part += `:nth-child(${index})`
      }
    }

    parts.unshift(part)
    current = current.parentElement
  }

  return parts.join(" > ")
}

function getTextContent(el: Element): string {
  const text = (el as HTMLElement).innerText || el.textContent || ""
  const cleaned = text.replace(/\s+/g, " ").trim()
  return cleaned.slice(0, 200)
}

export function ElementPicker({ onElementSelected }: ElementPickerProps) {
  const [active, setActive] = useState(false)
  const [highlight, setHighlight] = useState<{
    top: number
    left: number
    width: number
    height: number
    label: string
  } | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // CRITICAL: Use capture-phase listeners on document to intercept clicks
  // on the FAB *before* Radix UI dialog overlays/focus-traps can steal them.
  useEffect(() => {
    if (!mounted) return

    const handleCapturePointerDown = (e: PointerEvent) => {
      const fab = fabRef.current
      if (!fab) return

      // Check if the click target is the FAB or inside it
      const target = e.target as Node
      if (fab === target || fab.contains(target)) {
        // Stop the event from reaching dialog overlays
        e.stopPropagation()
      }
    }

    const handleCaptureClick = (e: MouseEvent) => {
      const fab = fabRef.current
      if (!fab) return

      const target = e.target as Node
      if (fab === target || fab.contains(target)) {
        e.stopPropagation()
        // Toggle active state
        setActive((prev) => !prev)
      }
    }

    // Capture phase = fires BEFORE any bubble handlers (like Radix overlays)
    document.addEventListener("pointerdown", handleCapturePointerDown, true)
    document.addEventListener("click", handleCaptureClick, true)

    return () => {
      document.removeEventListener("pointerdown", handleCapturePointerDown, true)
      document.removeEventListener("click", handleCaptureClick, true)
    }
  }, [mounted])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!active) return

      const overlay = overlayRef.current
      if (overlay) overlay.style.pointerEvents = "none"

      const target = document.elementFromPoint(e.clientX, e.clientY)

      if (overlay) overlay.style.pointerEvents = "auto"

      if (!target || target === document.body || target === document.documentElement) {
        setHighlight(null)
        setTooltip(null)
        return
      }

      if (
        target.closest("[data-element-picker]") ||
        target.closest("[data-element-picker-overlay]")
      ) {
        setHighlight(null)
        setTooltip(null)
        return
      }

      const rect = target.getBoundingClientRect()
      const tag = target.tagName.toLowerCase()
      const cls = Array.from(target.classList).slice(0, 3).join(".")
      const label = cls ? `${tag}.${cls}` : tag

      setHighlight({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        label,
      })
      setTooltip({ x: e.clientX, y: e.clientY })
    },
    [active]
  )

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!active) return

      e.preventDefault()
      e.stopPropagation()

      const overlay = overlayRef.current
      if (overlay) overlay.style.pointerEvents = "none"

      const target = document.elementFromPoint(e.clientX, e.clientY)

      if (overlay) overlay.style.pointerEvents = "auto"

      if (
        !target ||
        target === document.body ||
        target === document.documentElement ||
        target.closest("[data-element-picker]")
      ) {
        return
      }

      const rect = target.getBoundingClientRect()
      const data: ElementData = {
        selector: generateSelector(target),
        tagName: target.tagName,
        id: target.id || null,
        classes: Array.from(target.classList),
        textContent: getTextContent(target),
        pageUrl: window.location.pathname,
        boundingRect: {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        timestamp: new Date().toISOString(),
      }

      setActive(false)
      setHighlight(null)
      setTooltip(null)
      onElementSelected(data)
    },
    [active, onElementSelected]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (active && e.key === "Escape") {
        setActive(false)
        setHighlight(null)
        setTooltip(null)
      }
    },
    [active]
  )

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      if (active) {
        e.preventDefault()
        setActive(false)
        setHighlight(null)
        setTooltip(null)
      }
    },
    [active]
  )

  useEffect(() => {
    if (active) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
  }, [active, handleKeyDown])

  if (!mounted) return null

  const pickerUI = (
    <>
      {/* Floating Action Button - ALWAYS on top and clickable */}
      <button
        ref={fabRef}
        data-element-picker="fab"
        // onClick is handled by the capture-phase document listener above
        // so it works even when dialogs/modals are open
        style={{
          zIndex: 2147483647,
          // Ensure the button creates its own stacking context
          isolation: "isolate",
          position: "fixed",
          bottom: 24,
          left: 24,
        }}
        className={`flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all duration-200 ${
          active
            ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
            : "bg-card text-muted-foreground border border-border hover:bg-accent hover:text-foreground hover:scale-105"
        }`}
        title={active ? "Cancel element inspection (Esc)" : "Inspect an element to report"}
      >
        {active ? <X className="h-5 w-5" /> : <Crosshair className="h-5 w-5" />}
      </button>

      {/* Active mode indicator */}
      {active && (
        <div
          data-element-picker="banner"
          style={{ zIndex: 2147483647, position: "fixed", bottom: 24, left: 80 }}
          className="bg-primary text-primary-foreground text-xs font-medium px-3 py-2 rounded-full shadow-lg animate-in fade-in slide-in-from-left-2"
        >
          Click any element to report it &middot; Press ESC to cancel
        </div>
      )}

      {/* Full-screen overlay during inspection */}
      {active && (
        <div
          ref={overlayRef}
          data-element-picker-overlay="true"
          style={{ zIndex: 2147483646, position: "fixed", inset: 0 }}
          className="cursor-crosshair"
          onMouseMove={(e) => handleMouseMove(e.nativeEvent)}
          onClick={(e) => handleClick(e.nativeEvent)}
          onContextMenu={(e) => handleContextMenu(e.nativeEvent)}
        />
      )}

      {/* Highlight rectangle */}
      {active && highlight && (
        <div
          data-element-picker="highlight"
          className="pointer-events-none border-2 border-primary/80 rounded-sm"
          style={{
            zIndex: 2147483646,
            position: "fixed",
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
            background: "rgba(59, 130, 246, 0.08)",
            boxShadow: "0 0 0 2000px rgba(0, 0, 0, 0.05)",
          }}
        />
      )}

      {/* Tooltip label near cursor */}
      {active && highlight && tooltip && (
        <div
          data-element-picker="tooltip"
          className="pointer-events-none bg-foreground text-background text-[11px] font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap max-w-xs truncate"
          style={{
            zIndex: 2147483647,
            position: "fixed",
            top: tooltip.y + 16,
            left: tooltip.x + 12,
          }}
        >
          {highlight.label}
        </div>
      )}
    </>
  )

  return createPortal(pickerUI, document.body)
}
