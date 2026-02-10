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

  // Refs for the two popover containers (FAB + inspection overlay)
  const fabPopoverRef = useRef<HTMLDivElement>(null)
  const overlayPopoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Show the FAB popover on mount - puts it in the browser's TOP LAYER
  useEffect(() => {
    if (!mounted) return
    const el = fabPopoverRef.current
    if (el) {
      try {
        el.showPopover()
      } catch {
        // Popover API not supported - element still renders normally
      }
    }
  }, [mounted])

  // Show/hide the overlay popover when inspection mode toggles
  useEffect(() => {
    if (!mounted) return
    const el = overlayPopoverRef.current
    if (!el) return

    try {
      if (active) {
        el.showPopover()
      } else {
        el.hidePopover()
      }
    } catch {
      // Popover API not supported
    }
  }, [active, mounted])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!active) return

      // Temporarily hide the overlay popover to find the real element beneath
      const overlayEl = overlayPopoverRef.current
      if (overlayEl) overlayEl.style.pointerEvents = "none"

      const target = document.elementFromPoint(e.clientX, e.clientY)

      if (overlayEl) overlayEl.style.pointerEvents = "auto"

      if (!target || target === document.body || target === document.documentElement) {
        setHighlight(null)
        setTooltip(null)
        return
      }

      // Skip our own picker UI elements
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

      const overlayEl = overlayPopoverRef.current
      if (overlayEl) overlayEl.style.pointerEvents = "none"

      const target = document.elementFromPoint(e.clientX, e.clientY)

      if (overlayEl) overlayEl.style.pointerEvents = "auto"

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

  // We use TWO separate popovers:
  // 1. fabPopover: Always visible in top layer - holds the FAB button + banner
  // 2. overlayPopover: Only shown during inspection - holds the overlay + highlight + tooltip
  //
  // The HTML Popover API puts these in the browser's TOP LAYER which is
  // guaranteed above ALL other content (z-index, stacking contexts, inert, pointer-events).
  const pickerUI = (
    <>
      {/* ========== FAB POPOVER (always in top layer) ========== */}
      <div
        ref={fabPopoverRef}
        // @ts-ignore -- popover is a valid HTML attribute, TS may not have types for it
        popover="manual"
        data-element-picker="fab-popover"
        style={{
          // Reset default popover styles (browser adds margin, padding, border)
          margin: 0,
          padding: 0,
          border: "none",
          background: "transparent",
          overflow: "visible",
          // We don't want the popover to act as a positioned box
          position: "fixed",
          inset: "auto",
          bottom: 24,
          left: 24,
        }}
      >
        {/* FAB Button */}
        <button
          data-element-picker="fab"
          onClick={() => setActive((prev) => !prev)}
          className={`flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all duration-200 ${
            active
              ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
              : "bg-card text-muted-foreground border border-border hover:bg-accent hover:text-foreground hover:scale-105"
          }`}
          title={active ? "Cancel element inspection (Esc)" : "Inspect an element to report"}
        >
          {active ? <X className="h-5 w-5" /> : <Crosshair className="h-5 w-5" />}
        </button>

        {/* Active mode banner */}
        {active && (
          <div
            data-element-picker="banner"
            style={{
              position: "fixed",
              bottom: 24,
              left: 80,
            }}
            className="bg-primary text-primary-foreground text-xs font-medium px-3 py-2 rounded-full shadow-lg animate-in fade-in slide-in-from-left-2"
          >
            Click any element to report it &middot; Press ESC to cancel
          </div>
        )}
      </div>

      {/* ========== OVERLAY POPOVER (top layer only during inspection) ========== */}
      <div
        ref={overlayPopoverRef}
        // @ts-ignore
        popover="manual"
        data-element-picker-overlay="true"
        style={{
          margin: 0,
          padding: 0,
          border: "none",
          background: "transparent",
          overflow: "visible",
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          cursor: "crosshair",
        }}
        onMouseMove={(e) => handleMouseMove(e.nativeEvent)}
        onClick={(e) => handleClick(e.nativeEvent)}
        onContextMenu={(e) => handleContextMenu(e.nativeEvent)}
      >
        {/* Highlight rectangle */}
        {highlight && (
          <div
            data-element-picker="highlight"
            style={{
              position: "fixed",
              top: highlight.top,
              left: highlight.left,
              width: highlight.width,
              height: highlight.height,
              border: "2px solid rgba(59, 130, 246, 0.8)",
              borderRadius: 2,
              background: "rgba(59, 130, 246, 0.08)",
              boxShadow: "0 0 0 2000px rgba(0, 0, 0, 0.05)",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Tooltip label near cursor */}
        {highlight && tooltip && (
          <div
            data-element-picker="tooltip"
            style={{
              position: "fixed",
              top: tooltip.y + 16,
              left: tooltip.x + 12,
              pointerEvents: "none",
              zIndex: 1, // relative within the popover
            }}
            className="bg-foreground text-background text-[11px] font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap max-w-xs truncate"
          >
            {highlight.label}
          </div>
        )}
      </div>
    </>
  )

  return createPortal(pickerUI, document.body)
}
