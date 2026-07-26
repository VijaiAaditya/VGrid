import React, { memo } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaginationPanelProps {
  currentPage: number       // 0-indexed
  totalPages: number
  totalRows: number
  pageSize: number
  pageSizeOptions: number[]
  onGoToPage: (page: number) => void
  onSetPageSize: (size: number) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PaginationPanel = memo(function PaginationPanel(props: PaginationPanelProps) {
  const { currentPage, totalPages, totalRows, pageSize, pageSizeOptions, onGoToPage, onSetPageSize } = props

  const startRow = totalRows === 0 ? 0 : currentPage * pageSize + 1
  const endRow = Math.min((currentPage + 1) * pageSize, totalRows)

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    border: "1px solid var(--vg-border-color, #2d3748)",
    borderRadius: 6,
    background: "transparent",
    color: disabled ? "var(--vg-text-muted, #718096)" : "var(--vg-text-primary, #e2e8f0)",
    cursor: disabled ? "default" : "pointer",
    fontSize: 14,
    transition: "background 0.15s, border-color 0.15s",
  })

  return (
    <div
      className="vgrid-pagination"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderTop: "1px solid var(--vg-border-color, #2d3748)",
        background: "var(--vg-bg-header, #1a1f2e)",
        fontFamily: "var(--vg-font-family, system-ui, sans-serif)",
        fontSize: 12,
        color: "var(--vg-text-muted, #a0aec0)",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      {/* Row info */}
      <span style={{ marginRight: "auto" }}>
        {totalRows === 0 ? "No rows" : `${startRow}–${endRow} of ${totalRows.toLocaleString()} rows`}
      </span>

      {/* Page size selector */}
      <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
        Rows per page:
        <select
          id="vgrid-page-size-select"
          value={pageSize}
          onChange={(e) => onSetPageSize(Number(e.target.value))}
          style={{
            marginLeft: 4,
            padding: "2px 6px",
            border: "1px solid var(--vg-border-color, #2d3748)",
            borderRadius: 4,
            background: "var(--vg-bg-grid, #111827)",
            color: "var(--vg-text-primary, #e2e8f0)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {pageSizeOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      {/* Page navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {/* First page */}
        <button
          id="vgrid-page-first"
          title="First page"
          style={btnStyle(currentPage === 0)}
          disabled={currentPage === 0}
          onClick={() => onGoToPage(0)}
        >
          «
        </button>

        {/* Prev page */}
        <button
          id="vgrid-page-prev"
          title="Previous page"
          style={btnStyle(currentPage === 0)}
          disabled={currentPage === 0}
          onClick={() => onGoToPage(currentPage - 1)}
        >
          ‹
        </button>

        {/* Page indicator */}
        <span style={{ padding: "0 8px", color: "var(--vg-text-primary, #e2e8f0)", fontVariantNumeric: "tabular-nums" }}>
          {currentPage + 1} / {totalPages}
        </span>

        {/* Next page */}
        <button
          id="vgrid-page-next"
          title="Next page"
          style={btnStyle(currentPage >= totalPages - 1)}
          disabled={currentPage >= totalPages - 1}
          onClick={() => onGoToPage(currentPage + 1)}
        >
          ›
        </button>

        {/* Last page */}
        <button
          id="vgrid-page-last"
          title="Last page"
          style={btnStyle(currentPage >= totalPages - 1)}
          disabled={currentPage >= totalPages - 1}
          onClick={() => onGoToPage(totalPages - 1)}
        >
          »
        </button>
      </div>
    </div>
  )
})
