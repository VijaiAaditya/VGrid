import React, { useRef, useEffect, useState, useCallback } from 'react'
import ReactDOM from 'react-dom'
import type { CellPosition, RowData } from '../types'

interface PopupEditorProps {
  value: unknown
  type: 'text' | 'number' | 'select' | 'date' | 'textarea'
  options?: string[]
  min?: number
  max?: number
  step?: number
  placeholder?: string
  cellRef: React.RefObject<HTMLElement | null>
  onCommit: (value: unknown) => void
  onCancel: () => void
  theme: 'light' | 'dark' | 'custom'
  title?: string
}

/**
 * Popup Editor — renders a floating editor card positioned near the source cell.
 * Uses a React Portal so it's not clipped by any overflow:hidden ancestor.
 *
 * Features:
 * - Auto-positions above/below the cell based on viewport space
 * - Trap focus inside the popup
 * - Click-outside and Escape to cancel
 * - Supports text, number, select, date, and textarea types
 */
export function PopupEditor({
  value, type, options, min, max, step, placeholder,
  cellRef, onCommit, onCancel, theme, title,
}: PopupEditorProps) {
  const [localValue, setLocalValue] = useState(() => value == null ? '' : String(value))
  const [error, setError] = useState<string | null>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 200 })
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  // Position the popup relative to the cell
  useEffect(() => {
    const cell = cellRef.current
    if (!cell) return
    const rect = cell.getBoundingClientRect()
    const popupHeight = type === 'textarea' ? 160 : 120
    const viewH = window.innerHeight

    // Show above or below based on available space
    const showAbove = rect.bottom + popupHeight > viewH - 20
    const top = showAbove
      ? rect.top + window.scrollY - popupHeight - 4
      : rect.bottom + window.scrollY + 4

    setPos({
      top,
      left: rect.left + window.scrollX,
      width: Math.max(240, rect.width),
    })
  }, [cellRef, type])

  // Auto-focus
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.focus()
    if (el instanceof HTMLInputElement) el.select()
  }, [])

  // Click-outside to cancel
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onCancel()
      }
    }
    // Small delay to prevent immediate close from the cell double-click
    const t = setTimeout(() => document.addEventListener('mousedown', handleClick), 50)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handleClick) }
  }, [onCancel])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onCancel() }
    if (e.key === 'Enter' && (type !== 'textarea' || e.ctrlKey)) {
      e.preventDefault()
      handleCommit()
    }
    e.stopPropagation()
  }, [localValue, type])

  const handleCommit = useCallback(() => {
    const parsed = type === 'number' ? (parseFloat(localValue) || 0) : localValue
    onCommit(parsed)
  }, [localValue, type, onCommit])

  const bg = theme === 'dark' ? '#161b27' : '#ffffff'
  const border = theme === 'dark' ? '#2a3550' : '#d0d5de'
  const text = theme === 'dark' ? '#e4e8f0' : '#1a1d2e'
  const accent = theme === 'dark' ? '#648bff' : '#4a6cf7'
  const shadow = theme === 'dark'
    ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(100,139,255,0.2)'
    : '0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(74,108,247,0.15)'

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px',
    border: `1.5px solid ${error ? '#ef4444' : accent}`,
    borderRadius: 6, background: theme === 'dark' ? '#1a2035' : '#f8f9ff',
    color: text, fontSize: 13, outline: 'none',
    fontFamily: 'var(--vg-font-family)',
    boxShadow: `0 0 0 3px ${error ? '#ef444420' : `${accent}20`}`,
  }

  const content = (
    <div
      ref={popupRef}
      style={{
        position: 'absolute',
        top: pos.top, left: pos.left, width: pos.width,
        background: bg, border: `1px solid ${border}`,
        borderRadius: 10, padding: 16, zIndex: 99999,
        boxShadow: shadow,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
      role="dialog"
      aria-label={`Edit ${title ?? 'cell'}`}
    >
      {/* Title */}
      {title && (
        <div style={{ fontSize: 11, fontWeight: 600, color: theme === 'dark' ? '#8b95ad' : '#5a6072', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </div>
      )}

      {/* Input */}
      {type === 'textarea' ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          placeholder={placeholder}
        />
      ) : type === 'select' && options ? (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ ...inputStyle, cursor: 'pointer', height: 36 }}
        >
          {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ ...inputStyle, height: 36 }}
          min={min} max={max} step={step}
          placeholder={placeholder}
        />
      )}

      {/* Error message */}
      {error && (
        <div style={{ fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>⚠</span> {error}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
            background: 'transparent', border: `1px solid ${border}`, color: text, cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleCommit}
          style={{
            padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: accent, border: 'none', color: '#fff', cursor: 'pointer',
          }}
        >
          Save
        </button>
      </div>

      {/* Hint */}
      <div style={{ fontSize: 10, color: theme === 'dark' ? '#3d4560' : '#c8cdd8' }}>
        {type === 'textarea' ? 'Ctrl+Enter to save · Esc to cancel' : 'Enter to save · Esc to cancel'}
      </div>
    </div>
  )

  return ReactDOM.createPortal(content, document.body)
}
