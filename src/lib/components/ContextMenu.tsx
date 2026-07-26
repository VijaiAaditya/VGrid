import React, { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import type {
  ContextMenuItem,
  CustomContextMenuItem,
  ContextMenuActionParams,
  CopiedSelectionData,
  RowData,
} from "../types"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContextMenuProps<T extends RowData> {
  x: number
  y: number
  items: ContextMenuItem<T>[]
  params: ContextMenuActionParams<T>
  onCopySelection?: (data: CopiedSelectionData) => void
  onContextMenuAction?: (action: string, params: ContextMenuActionParams<T>) => void
  onClose: () => void
  selectionData: CopiedSelectionData | null
  onExportSelectionCsv: (data: CopiedSelectionData) => void
  onExportSelectionJson: (data: CopiedSelectionData) => void
}

// ─── Default items shown when contextMenuItems is not specified ───────────────

export const DEFAULT_CONTEXT_MENU_ITEMS: ContextMenuItem<RowData>[] = [
  "copy-selection",
  "copy-selection-json",
  "separator",
  "export-selection-csv",
  "export-selection-json",
  "separator",
  "chart",
  "pivot",
]

// ─── Label / icon map for built-ins ──────────────────────────────────────────

const BUILT_IN_META: Record<string, { label: string; icon: string }> = {
  "copy-selection":        { label: "Copy Selection (TSV)", icon: "📋" },
  "copy-selection-json":   { label: "Copy Selection (JSON)",icon: "{ }" },
  "export-selection-csv":  { label: "Export as CSV",        icon: "⬇️" },
  "export-selection-json": { label: "Export as JSON",       icon: "📄" },
  "chart":                 { label: "Create Chart…",        icon: "📊" },
  "pivot":                 { label: "Create Pivot…",        icon: "⊞" },
}

// ─── Shared item button style ─────────────────────────────────────────────────

function itemStyle(disabled?: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "6px 12px",
    background: "transparent",
    border: "none",
    color: disabled ? "var(--vg-text-muted, #718096)" : "inherit",
    cursor: disabled ? "default" : "pointer",
    textAlign: "left",
    fontSize: 13,
    whiteSpace: "nowrap",
    transition: "background 0.1s",
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ContextMenu<T extends RowData>(props: ContextMenuProps<T>): React.ReactElement | null {
  const {
    x, y, items, params,
    onCopySelection, onContextMenuAction, onClose,
    selectionData,
    onExportSelectionCsv, onExportSelectionJson,
  } = props

  const menuRef = useRef<HTMLDivElement>(null)

  // Clamp position to stay inside viewport
  const vw = typeof window !== "undefined" ? window.innerWidth : 1920
  const vh = typeof window !== "undefined" ? window.innerHeight : 1080
  const menuW = 220
  const menuH = items.length * 32
  const clampedX = Math.min(x, vw - menuW - 8)
  const clampedY = Math.min(y, vh - menuH - 8)

  // Close on outside click, Escape, or scroll
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    const handleScroll = () => onClose()
    document.addEventListener("mousedown", handleClick, true)
    document.addEventListener("keydown", handleKey, true)
    document.addEventListener("scroll", handleScroll, true)
    return () => {
      document.removeEventListener("mousedown", handleClick, true)
      document.removeEventListener("keydown", handleKey, true)
      document.removeEventListener("scroll", handleScroll, true)
    }
  }, [onClose])

  const handleBuiltIn = (key: string) => {
    onClose()
    if (key === "copy-selection") {
      if (!selectionData) return
      const text = [
        selectionData.columns.map((c) => c.name).join("\t"),
        ...selectionData.cells.map((row) =>
          row.map((v) => (v == null ? "" : String(v))).join("\t")
        ),
      ].join("\n")
      navigator.clipboard.writeText(text).catch(() => {})
      onCopySelection?.(selectionData)
    } else if (key === "copy-selection-json") {
      if (!selectionData) return
      const jsonText = JSON.stringify(
        selectionData.cells.map((row) => {
          const obj: Record<string, unknown> = {}
          selectionData.columns.forEach((col, idx) => {
            obj[col.name] = row[idx]
          })
          return obj
        }),
        null,
        2
      )
      navigator.clipboard.writeText(jsonText).catch(() => {})
      onCopySelection?.(selectionData)
    } else if (key === "export-selection-csv") {
      if (selectionData) onExportSelectionCsv(selectionData)
    } else if (key === "export-selection-json") {
      if (selectionData) onExportSelectionJson(selectionData)
    } else {
      onContextMenuAction?.(key, params)
    }
  }

  const renderItem = (item: ContextMenuItem<T>, idx: number): React.ReactNode => {
    if (item === "separator") {
      return (
        <div
          key={`sep-${idx}`}
          style={{ height: 1, background: "var(--vg-border-color, #2d3748)", margin: "4px 0" }}
        />
      )
    }

    if (typeof item === "string") {
      const meta = BUILT_IN_META[item]
      if (!meta) return null
      const needsSel = item === "copy-selection" || item === "export-selection-csv" || item === "export-selection-json"
      const disabled = needsSel && !selectionData
      return (
        <button
          key={`${item}-${idx}`}
          id={`vgrid-ctx-${item.replace(/[^a-z0-9]/g, "-")}`}
          style={itemStyle(disabled)}
          disabled={disabled}
          onClick={() => !disabled && handleBuiltIn(item)}
          onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.background = "var(--vg-bg-row-hover, #2d3748)" }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
        >
          <span style={{ width: 20, textAlign: "center", flexShrink: 0 }}>{meta.icon}</span>
          <span>{meta.label}</span>
          {disabled && <span style={{ marginLeft: "auto", opacity: 0.4, fontSize: 11 }}>No selection</span>}
        </button>
      )
    }

    const custom = item as CustomContextMenuItem<T>
    return (
      <button
        key={`custom-${idx}`}
        style={itemStyle(custom.disabled)}
        disabled={custom.disabled}
        onClick={() => {
          if (!custom.disabled) { onClose(); custom.action(params) }
        }}
        onMouseEnter={(e) => { if (!custom.disabled) (e.currentTarget as HTMLElement).style.background = "var(--vg-bg-row-hover, #2d3748)" }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
      >
        <span style={{ width: 20, textAlign: "center", flexShrink: 0 }}>{custom.icon ?? ""}</span>
        <span>{custom.label}</span>
      </button>
    )
  }

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: clampedY,
        left: clampedX,
        zIndex: 99999,
        minWidth: menuW,
        background: "var(--vg-bg-header, #1e2433)",
        border: "1px solid var(--vg-border-color, #2d3748)",
        borderRadius: 8,
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        padding: "4px 0",
        fontFamily: "var(--vg-font-family, system-ui, sans-serif)",
        fontSize: 13,
        color: "var(--vg-text-primary, #e2e8f0)",
        userSelect: "none",
      }}
      role="menu"
      aria-label="Context menu"
    >
      {items.map((item, idx) => renderItem(item, idx))}
    </div>,
    document.body
  )
}
