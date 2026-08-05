import React, { useState, useRef, useEffect, memo, useMemo } from 'react'
import ReactDOM from 'react-dom'
import type { InternalColDef } from '../store/createGridStore'
import type { RowData } from '../types'

export interface ColumnPickerProps<T = RowData> {
  /** Full array of column definitions (including visible and hidden columns) */
  columns: InternalColDef<T>[]

  /**
   * Single Column Toggle Callback:
   * Called whenever ONE specific column is checked or unchecked.
   * Useful when you only want to respond to a single column visibility change.
   * @param colId - The ID of the column being toggled (e.g., 'firstName')
   * @param visible - `true` if column was checked visible, `false` if unchecked/hidden
   */
  onColumnToggle: (colId: string, visible: boolean) => void

  /**
   * Bulk / Full State Columns Change Callback:
   * Called whenever column visibility changes (single toggle, Select All, or Deselect All).
   * Passes the COMPLETE updated array of currently VISIBLE columns.
   * Useful for saving/syncing full grid column layouts to backend or localStorage.
   * @param visibleColumns - Array of all active, non-hidden column definitions
   */
  onColumnsChange?: (visibleColumns: InternalColDef<T>[]) => void

  /** Trigger button theme */
  theme?: 'light' | 'dark' | 'custom'
  /** Custom trigger icon / element */
  trigger?: React.ReactNode
  /** Custom trigger button style */
  buttonStyle?: React.CSSProperties
  /** Placement mode */
  placement?: 'header' | 'standalone'
}


/**
 * ColumnPicker — A multi-select dropdown component for dynamically toggling column visibility.
 * Renders popup via Portal to avoid parent overflow clipping.
 */
export const ColumnPicker = memo(<T extends RowData>(props: ColumnPickerProps<T>) => {
  const {
    columns,
    onColumnToggle,
    onColumnsChange,
    theme = 'dark',
    trigger,
    buttonStyle,
    placement = 'standalone',
  } = props

  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement | HTMLDivElement | null>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  // Calculate position on open
  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: Math.min(rect.left + window.scrollX, Math.max(10, window.innerWidth - 250)),
      })
    }
  }

  const handleOpenToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!isOpen) {
      updatePosition()
    }
    setIsOpen((prev) => !prev)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        dropRef.current && !dropRef.current.contains(target) &&
        btnRef.current && !btnRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick, true)
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick, true)
  }, [isOpen])

  const isDark = theme === 'dark'

  const filteredCols = useMemo(() => {
    if (!search.trim()) return columns
    const q = search.toLowerCase()
    return columns.filter(
      (c) => (c.headerName ?? c.field ?? c._colId).toLowerCase().includes(q)
    )
  }, [columns, search])

  const handleToggle = (colId: string, currentVisible: boolean) => {
    const nextVisible = !currentVisible
    onColumnToggle(colId, nextVisible)

    if (onColumnsChange) {
      const updated = columns.map((c) => (c._colId === colId ? { ...c, hide: !nextVisible } : c))
      onColumnsChange(updated.filter((c) => !c.hide))
    }
  }

  const handleSelectAll = () => {
    columns.forEach((c) => {
      if (c.hide) onColumnToggle(c._colId, true)
    })
    if (onColumnsChange) {
      onColumnsChange(columns.map((c) => ({ ...c, hide: false })))
    }
  }

  const handleDeselectAll = () => {
    columns.forEach((c) => {
      if (!c.hide) onColumnToggle(c._colId, false)
    })
    if (onColumnsChange) {
      onColumnsChange(columns.map((c) => ({ ...c, hide: true })))
    }
  }

  const isHeaderMode = placement === 'header'

  const defaultTriggerBtn = (
    <button
      ref={btnRef as React.RefObject<HTMLButtonElement>}
      type="button"
      className="vgrid-column-picker-btn"
      onClick={handleOpenToggle}
      title="Choose Columns"
      aria-label="Choose Columns"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isHeaderMode ? '3px' : '6px 10px',
        borderRadius: isHeaderMode ? 4 : 6,
        border: isHeaderMode ? 'none' : `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
        background: isHeaderMode ? 'transparent' : isDark ? '#1e293b' : '#f8fafc',
        color: isDark ? '#818cf8' : '#4f46e5',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: isOpen ? '0 0 0 2px rgba(99, 102, 241, 0.4)' : 'none',
        ...buttonStyle,
      }}
    >
      {/* Sleek play-button style column manager icon */}
      <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
        <path d="M1.5 2.5A1 1 0 012.5 1.5h8a1 1 0 011 1v11a1 1 0 01-1 1h-8a1 1 0 01-1-1v-11zm2 1h1.5v9H3.5v-9zm2.5 0H7.5v9H6v-9zm2.5 0H10v9H8.5v-9z" opacity="0.85" />
        <path d="M11.5 5.5l3.5 2.5-3.5 2.5V5.5z" />
      </svg>
    </button>
  )


  const dropdownPortal = isOpen ? ReactDOM.createPortal(
    <div
      ref={dropRef}
      className="vgrid-column-picker-dropdown"
      style={{
        position: 'absolute',
        top: coords.top,
        left: coords.left,
        zIndex: 999999,
        minWidth: 220,
        maxWidth: 280,
        maxHeight: 320,
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a',
        border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
        borderRadius: 8,
        boxShadow: isDark
          ? '0 15px 35px -5px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(99, 102, 241, 0.3)'
          : '0 15px 35px -5px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 12,
        animation: 'vgrid-fade-in 0.12s ease-out',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Controls */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isDark ? '#131e32' : '#f8fafc',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>
          COLUMNS ({columns.filter((c) => !c.hide).length}/{columns.length})
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={handleSelectAll}
            style={{
              background: 'none', border: 'none', color: isDark ? '#818cf8' : '#4f46e5',
              cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: 0,
            }}
          >
            All
          </button>
          <span style={{ opacity: 0.3 }}>|</span>
          <button
            type="button"
            onClick={handleDeselectAll}
            style={{
              background: 'none', border: 'none', color: isDark ? '#94a3b8' : '#64748b',
              cursor: 'pointer', fontSize: 11, fontWeight: 500, padding: 0,
            }}
          >
            None
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ padding: '6px 10px', borderBottom: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}` }}>
        <input
          type="search"
          placeholder="Filter columns..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '4px 8px',
            fontSize: 11,
            borderRadius: 4,
            border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
            background: isDark ? '#090d16' : '#fafafa',
            color: isDark ? '#f8fafc' : '#0f172a',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Column Checklist */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {filteredCols.map((col) => {
          const isVisible = !col.hide
          const name = col.headerName ?? col.field ?? col._colId
          return (
            <label
              key={col._colId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                cursor: 'pointer',
                userSelect: 'none',
                background: isVisible
                  ? isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(79, 70, 229, 0.05)'
                  : 'transparent',
                transition: 'background 0.1s ease',
              }}
            >
              <input
                type="checkbox"
                checked={isVisible}
                onChange={() => handleToggle(col._colId, isVisible)}
                style={{
                  accentColor: isDark ? '#818cf8' : '#4f46e5',
                  cursor: 'pointer',
                }}
              />
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: isVisible ? 600 : 400,
                  color: isVisible ? (isDark ? '#f8fafc' : '#0f172a') : (isDark ? '#64748b' : '#94a3b8'),
                }}
              >
                {name}
              </span>
              {col.pinned && (
                <span
                  style={{
                    fontSize: 9,
                    padding: '1px 4px',
                    borderRadius: 3,
                    background: isDark ? '#334155' : '#e2e8f0',
                    color: isDark ? '#cbd5e1' : '#475569',
                    textTransform: 'uppercase',
                  }}
                >
                  {col.pinned}
                </span>
              )}
            </label>
          )
        })}
        {filteredCols.length === 0 && (
          <div style={{ padding: 12, textAlign: 'center', color: isDark ? '#64748b' : '#94a3b8', fontSize: 11 }}>
            No columns match search
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div
      className={`vgrid-column-picker-wrap ${isHeaderMode ? 'vgrid-column-picker-wrap--header' : ''}`}
      style={{ display: 'inline-block' }}
    >
      {trigger ? (
        <div ref={btnRef as React.RefObject<HTMLDivElement>} onClick={handleOpenToggle} style={{ cursor: 'pointer' }}>
          {trigger}
        </div>
      ) : (
        defaultTriggerBtn
      )}

      {dropdownPortal}
    </div>
  )
}) as <T extends RowData>(props: ColumnPickerProps<T>) => React.ReactElement | null
