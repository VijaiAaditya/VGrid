import React, { memo, useCallback, useRef, useEffect, useState } from 'react'
import type { InternalColDef } from '../store/createGridStore'
import type { RowData, RowNode, CellPosition, GridApi, CellClickedEvent, CellDoubleClickedEvent, CellValueChangedEvent } from '../types'
import { getFieldValue } from '../store/createGridStore'
import { JsonModal } from './JsonModal'
import { MediaModal } from './MediaModal'

// ─── Cell Editor Components ───────────────────────────────────────────────────

interface CellEditorProps {
  value: unknown
  type: string
  options?: string[]
  min?: number
  max?: number
  step?: number
  onCommit: (value: unknown) => void
  onCancel: () => void
}

const CellEditorComponent = memo(({ value, type, options, min, max, step, onCommit, onCancel }: CellEditorProps) => {
  const [localValue, setLocalValue] = useState(() => value == null ? '' : String(value))
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null)

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.focus()
    if (el instanceof HTMLInputElement) el.select()
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onCommit(type === 'number' ? parseFloat(localValue) || 0 : localValue)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
    e.stopPropagation()
  }, [localValue, type, onCommit, onCancel])

  const handleBlur = useCallback(() => {
    onCommit(type === 'number' ? parseFloat(localValue) || 0 : localValue)
  }, [localValue, type, onCommit])

  if (type === 'select' && options) {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        className="vgrid-cell-editor vgrid-cell-editor--select"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    )
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
      className="vgrid-cell-editor"
      value={localValue}
      min={min}
      max={max}
      step={step}
      onChange={(e) => setLocalValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    />
  )
})


// ─── Single Cell ──────────────────────────────────────────────────────────────

interface CellProps<T> {
  col: InternalColDef<T>
  node: RowNode<T>
  isEditing: boolean
  isFocused: boolean
  isInRange: boolean
  onCellClick: (pos: CellPosition, e: React.MouseEvent) => void
  onCellDoubleClick: (pos: CellPosition, e: React.MouseEvent) => void
  onCellMouseDown: (pos: CellPosition, e: React.MouseEvent) => void
  onCellMouseEnter: (pos: CellPosition) => void
  onCommitEdit: (colId: string, rowIndex: number, newValue: unknown) => void
  onCancelEdit: () => void
  api: GridApi<T>
  style?: React.CSSProperties
  className?: string
}

export const GridCell = memo(<T extends RowData>(props: CellProps<T>) => {
  const {
    col, node, isEditing, isFocused, isInRange,
    onCellClick, onCellDoubleClick, onCellMouseDown, onCellMouseEnter,
    onCommitEdit, onCancelEdit, api, style, className
  } = props

  // Compute cell value
  let value: unknown
  if (col.valueGetter) {
    value = col.valueGetter({ data: node.data, colDef: col, rowIndex: node.rowIndex })
  } else if (col.field) {
    value = getFieldValue(node.data as RowData, col.field)
  }

  // Check if this column is configured as JSON, image, html, or video
  const isJsonCol = col.columnType === 'json' || col.cellEditor === 'json'
  const isImageCol = col.columnType === 'image' || col.cellEditor === 'image'
  const isHtmlCol = col.columnType === 'html' || col.cellEditor === 'html'
  const isVideoCol = col.columnType === 'video' || col.cellEditor === 'video'

  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false)
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false)

  // Format for display
  let displayValue: React.ReactNode
  if (col.cellRenderer) {
    displayValue = col.cellRenderer({ value, data: node.data, colDef: col, rowIndex: node.rowIndex, api })
  } else if (col.valueFormatter) {
    displayValue = col.valueFormatter({ value, data: node.data, colDef: col })
  } else if (isJsonCol) {
    let jsonText = ''
    if (typeof value === 'object' && value !== null) {
      try { jsonText = JSON.stringify(value) } catch { jsonText = String(value) }
    } else {
      jsonText = value == null ? '' : String(value)
    }
    const jsonTrigger = col.jsonTrigger ?? 'dblclick'
    displayValue = (
      <div className="vgrid-cell-json">
        <span className="vgrid-cell-json__text" title={jsonText}>{jsonText || '{ }'}</span>
        {jsonTrigger !== 'none' && (
          <button
            type="button"
            className="vgrid-cell-json__expand-btn"
            onClick={(e) => {
              e.stopPropagation()
              setIsJsonModalOpen(true)
            }}
            title={jsonTrigger === 'click' ? 'Expand JSON Popup (Click)' : 'Expand JSON Popup (Double click)'}
          >
            ⤢
          </button>
        )}
      </div>
    )
  } else if (isImageCol) {
    const srcStr = value == null ? '' : String(value)
    displayValue = (
      <div
        className="vgrid-cell-media"
        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
        onClick={(e) => {
          e.stopPropagation()
          setIsMediaModalOpen(true)
        }}
      >
        {srcStr ? (
          <img
            src={srcStr}
            alt={col.headerName ?? 'Image'}
            style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
          />
        ) : (
          <span style={{ opacity: 0.5, fontSize: 11 }}>No Image</span>
        )}
        <span style={{ fontSize: 12, textDecoration: 'underline', color: 'var(--vg-accent, #4f46e5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {srcStr ? 'View Image' : ''}
        </span>
      </div>
    )
  } else if (isHtmlCol) {
    const htmlStr = value == null ? '' : String(value)
    displayValue = (
      <div
        className="vgrid-cell-media"
        style={{ cursor: 'pointer', color: 'var(--vg-accent, #4f46e5)', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        onClick={(e) => {
          e.stopPropagation()
          setIsMediaModalOpen(true)
        }}
      >
        {htmlStr ? 'Render HTML Popup' : <span style={{ opacity: 0.5 }}>Empty HTML</span>}
      </div>
    )
  } else if (isVideoCol) {
    const videoStr = value == null ? '' : String(value)
    displayValue = (
      <div
        className="vgrid-cell-media"
        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--vg-accent, #4f46e5)', textDecoration: 'underline' }}
        onClick={(e) => {
          e.stopPropagation()
          setIsMediaModalOpen(true)
        }}
      >
        <span>🎬</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {videoStr ? 'Watch Video / Link' : <span style={{ opacity: 0.5 }}>No Video</span>}
        </span>
      </div>
    )
  } else {
    displayValue = value == null ? '' : String(value)
  }

  const pos: CellPosition = { rowIndex: node.rowIndex, colId: col._colId }

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    // For JSON cols: only open on dblclick if trigger is 'dblclick' (default)
    if (isJsonCol) {
      const jsonTrigger = col.jsonTrigger ?? 'dblclick'
      if (jsonTrigger === 'dblclick') setIsJsonModalOpen(true)
    } else if (isImageCol || isHtmlCol || isVideoCol) {
      setIsMediaModalOpen(true)
    }
    onCellDoubleClick(pos, e)
  }, [isJsonCol, isImageCol, isHtmlCol, isVideoCol, col.jsonTrigger, onCellDoubleClick, pos])

  // Cell class
  const customClass = typeof col.cellClass === 'function'
    ? col.cellClass({ value, data: node.data, rowIndex: node.rowIndex })
    : (col.cellClass ?? '')

  const cellClass = [
    'vgrid-cell',
    isFocused ? 'vgrid-cell--focused' : '',
    isEditing ? 'vgrid-cell--editing' : '',
    isInRange ? 'vgrid-cell--in-range' : '',
    isJsonCol ? 'vgrid-cell--json' : '',
    customClass,
    className ?? '',
  ].filter(Boolean).join(' ')

  // Cell style
  const customStyle = typeof col.cellStyle === 'function'
    ? col.cellStyle({ value, data: node.data, rowIndex: node.rowIndex })
    : (col.cellStyle ?? {})

  const cellStyle: React.CSSProperties = {
    width: col._width,
    minWidth: col._width,
    maxWidth: col._width,
    ...customStyle,
    ...style,
  }

  const editorType = col.cellEditor ?? 'text'
  const editorParams = col.cellEditorParams ?? {}

  // Tooltip
  let tooltip: string | undefined
  if (col.tooltipValueGetter) {
    tooltip = col.tooltipValueGetter({ data: node.data, colDef: col, rowIndex: node.rowIndex })
  } else if (col.tooltipField) {
    const v = getFieldValue(node.data as RowData, col.tooltipField)
    tooltip = v == null ? undefined : String(v)
  }

  const isEditable = typeof col.editable === 'function'
    ? col.editable({ value, data: node.data, rowIndex: node.rowIndex })
    : col.editable !== false

  const mediaType: 'image' | 'html' | 'video' = isImageCol ? 'image' : isHtmlCol ? 'html' : 'video'

  const handleClick = useCallback((e: React.MouseEvent) => {
    // JSON columns: single click is disabled — only expand button or double-click opens the popup.
    // Returning early prevents setActiveCell, so the cell never becomes focused/editable.
    if (isJsonCol) return
    onCellClick(pos, e)
  }, [isJsonCol, onCellClick, pos])

  return (
    <div
      className={cellClass}
      style={cellStyle}
      role="gridcell"
      tabIndex={isFocused ? 0 : -1}
      title={tooltip}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={(e) => onCellMouseDown(pos, e)}
      onMouseEnter={() => onCellMouseEnter(pos)}
      data-col-id={col._colId}
      data-row-index={node.rowIndex}
    >
      {isEditing && !isJsonCol ? (
        <CellEditorComponent
          value={value}
          type={editorType}
          options={editorParams.options}
          min={editorParams.min}
          max={editorParams.max}
          step={editorParams.step}
          onCommit={(newVal) => onCommitEdit(col._colId, node.rowIndex, newVal)}
          onCancel={onCancelEdit}
        />
      ) : (
        <div className="vgrid-cell__content">
          {displayValue}
        </div>
      )}

      {/* JSON Modal Dialog for JSON columns */}
      {isJsonCol && (
        <JsonModal
          isOpen={isJsonModalOpen}
          title={`${col.headerName ?? col.field ?? 'JSON'} (Row #${node.rowIndex + 1})`}
          value={value}
          readOnly={!isEditable}
          onSave={(newVal) => onCommitEdit(col._colId, node.rowIndex, newVal)}
          onClose={() => setIsJsonModalOpen(false)}
        />
      )}

      {/* Media Modal Dialog for image, html, video columns */}
      {(isImageCol || isHtmlCol || isVideoCol) && (
        <MediaModal
          isOpen={isMediaModalOpen}
          title={`${col.headerName ?? col.field ?? 'Media'} (Row #${node.rowIndex + 1})`}
          src={value == null ? '' : String(value)}
          type={mediaType}
          onClose={() => setIsMediaModalOpen(false)}
        />
      )}
    </div>
  )

}) as <T extends RowData>(props: CellProps<T>) => React.ReactElement | null



// ─── Master/Detail Toggle Cell ────────────────────────────────────────────────

interface MasterIconProps {
  isExpanded: boolean
  onClick: (e: React.MouseEvent) => void
}

export const MasterIcon = memo(({ isExpanded, onClick }: MasterIconProps) => (
  <button
    className={`vgrid-master-icon${isExpanded ? ' vgrid-master-icon--expanded' : ''}`}
    onClick={onClick}
    aria-label={isExpanded ? 'Collapse detail' : 'Expand detail'}
    type="button"
  >
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      {isExpanded
        ? <path d="M2 4L6 8L10 4H2Z" />
        : <path d="M4 2L8 6L4 10V2Z" />
      }
    </svg>
  </button>
))

