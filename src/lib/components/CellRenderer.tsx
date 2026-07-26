import React, { memo, useCallback, useRef, useEffect, useState } from 'react'
import type { InternalColDef } from '../store/createGridStore'
import type { RowData, RowNode, CellPosition, GridApi, CellClickedEvent, CellDoubleClickedEvent, CellValueChangedEvent } from '../types'
import { getFieldValue } from '../store/createGridStore'

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

  // Format for display
  let displayValue: React.ReactNode
  if (col.cellRenderer) {
    displayValue = col.cellRenderer({ value, data: node.data, colDef: col, rowIndex: node.rowIndex, api })
  } else if (col.valueFormatter) {
    displayValue = col.valueFormatter({ value, data: node.data, colDef: col })
  } else {
    displayValue = value == null ? '' : String(value)
  }

  // Cell class
  const customClass = typeof col.cellClass === 'function'
    ? col.cellClass({ value, data: node.data, rowIndex: node.rowIndex })
    : (col.cellClass ?? '')

  const cellClass = [
    'vgrid-cell',
    isFocused ? 'vgrid-cell--focused' : '',
    isEditing ? 'vgrid-cell--editing' : '',
    isInRange ? 'vgrid-cell--in-range' : '',
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

  const pos: CellPosition = { rowIndex: node.rowIndex, colId: col._colId }

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

  return (
    <div
      className={cellClass}
      style={cellStyle}
      role="gridcell"
      tabIndex={isFocused ? 0 : -1}
      title={tooltip}
      onClick={(e) => onCellClick(pos, e)}
      onDoubleClick={(e) => onCellDoubleClick(pos, e)}
      onMouseDown={(e) => onCellMouseDown(pos, e)}
      onMouseEnter={() => onCellMouseEnter(pos)}
      data-col-id={col._colId}
      data-row-index={node.rowIndex}
    >
      {isEditing ? (
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

