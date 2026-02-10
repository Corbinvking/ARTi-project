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

/**
 * The FAB button UI - rendered identically in both the base layer and dialog layers.
 */
function FabButton({
  active,
  onClick,
}: {
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      data-element-picker="fab"
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        onClick()
      }}
      onPointerDown={(e) => {
        // Prevent dialog dismiss behavior from stealing this click
        e.stopPropagation()
      }}
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        zIndex: 2147483647,
        // Ensure we're always interactive
        pointerEvents: "auto",
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
  )
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
  // Track the topmost dialog portal element (if any dialog is open)
  const [dialogPortal, setDialogPortal] = useState<Element | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Watch for Radix dialog portals appearing/disappearing in the DOM.
  // When a dialog opens, we detect its portal and render a FAB clone inside it
  // so the FAB is always at the same stacking layer as the topmost dialog.
  useEffect(() => {
    if (!mounted) return

    const findTopmostPortal = () => {
      // Radix portals use [data-radix-portal] attribute
      const portals = document.querySelectorAll("[data-radix-portal]")
      if (portals.length > 0) {
        // Use the last one (most recently opened / topmost)
        setDialogPortal(portals[portals.length - 1])
      } else {
        setDialogPortal(null)
      }
    }

    // Initial check
    findTopmostPortal()

    // Watch for portals being added/removed
    const observer = new MutationObserver(() => {
      findTopmostPortal()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [mounted])

  const toggleActive = useCallback(() => {
    setActive((prev) => !prev)
  }, [])

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

  // The inspection overlay (full-screen, captures mouse events for element selection)
  const inspectionOverlay = active ? (
    <div
      ref={overlayRef}
      data-element-picker-overlay="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        cursor: "crosshair",
        pointerEvents: "auto",
      }}
      onMouseMove={(e) => handleMouseMove(e.nativeEvent)}
      onClick={(e) => handleClick(e.nativeEvent)}
      onContextMenu={(e) => handleContextMenu(e.nativeEvent)}
    >
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
      {highlight && tooltip && (
        <div
          data-element-picker="tooltip"
          style={{
            position: "fixed",
            top: tooltip.y + 16,
            left: tooltip.x + 12,
            pointerEvents: "none",
            zIndex: 2147483647,
          }}
          className="bg-foreground text-background text-[11px] font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap max-w-xs truncate"
        >
          {highlight.label}
        </div>
      )}
    </div>
  ) : null

  // The banner shown during inspection mode
  const banner = active ? (
    <div
      data-element-picker="banner"
      style={{
        position: "fixed",
        bottom: 24,
        left: 80,
        zIndex: 2147483647,
        pointerEvents: "none",
      }}
      className="bg-primary text-primary-foreground text-xs font-medium px-3 py-2 rounded-full shadow-lg"
    >
      Click any element to report it &middot; Press ESC to cancel
    </div>
  ) : null

  // STRATEGY:
  // - When NO dialog is open: render FAB + overlay via portal to document.body
  // - When a dialog IS open: render FAB + overlay inside the dialog's portal
  //   container so they live at the dialog's stacking layer.
  // The user sees one persistent button; under the hood it swaps layers.

  if (dialogPortal) {
    // A dialog is open - render everything inside the dialog's portal
    return (
      <>
        {/* Hidden base-layer FAB (behind dialog, invisible to user) */}
        {createPortal(
          <FabButton active={active} onClick={toggleActive} />,
          document.body
        )}
        {/* Active FAB inside the dialog layer (this is the one the user clicks) */}
        {createPortal(
          <>
            <FabButton active={active} onClick={toggleActive} />
            {banner}
            {inspectionOverlay}
          </>,
          dialogPortal
        )}
      </>
    )
  }

  // No dialog open - render normally on the page
  return createPortal(
    <>
      <FabButton active={active} onClick={toggleActive} />
      {banner}
      {inspectionOverlay}
    </>,
    document.body
  )
}
