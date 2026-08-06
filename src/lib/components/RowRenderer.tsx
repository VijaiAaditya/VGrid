import React, { memo, useMemo } from 'react'
import type { InternalColDef } from '../store/createGridStore'
import type { RowData, RowNode, CellPosition, CellRange, GridApi, GridOptions } from '../types'
import { GridCell, MasterIcon } from './CellRenderer'

interface RowRendererProps<T> {
  node: RowNode<T>
  columns: InternalColDef<T>[]
  editingCell: CellPosition | null
  activeCell: CellPosition | null
  cellRange: CellRange | null
  onCellClick: (pos: CellPosition, e: React.MouseEvent) => void
  onCellDoubleClick: (pos: CellPosition, e: React.MouseEvent) => void
  onCellMouseDown: (pos: CellPosition, e: React.MouseEvent) => void
  onCellMouseEnter: (pos: CellPosition) => void
  onCommitEdit: (colId: string, rowIndex: number, newValue: unknown) => void
  onCancelEdit: () => void
  onRowClick: (e: React.MouseEvent) => void
  onToggleExpand: (e: React.MouseEvent) => void
  onCheckboxChange: (checked: boolean) => void
  onCheckboxDoubleClick?: (e: React.MouseEvent) => void
  /** Called when the serial-number cell is clicked to open row data popup */
  onRowNumClick?: () => void
  showCheckbox: boolean
  showRowNumber: boolean
  rowClickJsonModal: boolean
  isMasterDetail: boolean
  isFullWidth: boolean
  fullWidthRenderer?: GridOptions<T>['fullWidthCellRenderer']
  detailRenderer?: GridOptions<T>['detailCellRenderer']
  detailHeight: number
  api: GridApi<T>
  style: React.CSSProperties
  /** Total width of all normal (non-pinned) columns */
  normalWidth: number
  scrollLeft: number
}

function isCellInRange(
  rowIndex: number,
  colIndex: number,
  range: CellRange | null
): boolean {
  if (!range) return false
  return (
    rowIndex >= range.startRow &&
    rowIndex <= range.endRow &&
    colIndex >= range.startColIndex &&
    colIndex <= range.endColIndex
  )
}

const RowRenderer = memo(<T extends RowData>(props: RowRendererProps<T>) => {
  const {
    node, columns, editingCell, activeCell, cellRange,
    onCellClick, onCellDoubleClick, onCellMouseDown, onCellMouseEnter,
    onCommitEdit, onCancelEdit, onRowClick, onToggleExpand, onCheckboxChange,
    onCheckboxDoubleClick, onRowNumClick,
    showCheckbox, showRowNumber, rowClickJsonModal,
    isMasterDetail, isFullWidth, fullWidthRenderer, detailRenderer,
    detailHeight, api, style, normalWidth, scrollLeft,
  } = props


  const rowClass = [
    'vgrid-row',
    node.rowIndex % 2 === 0 ? 'vgrid-row--even' : 'vgrid-row--odd',
    node.isSelected ? 'vgrid-row--selected' : '',
  ].filter(Boolean).join(' ')

  const pinnedLeft = columns.filter((c) => c.pinned === 'left' && !c.hide)
  const pinnedRight = columns.filter((c) => c.pinned === 'right' && !c.hide)
  const normal = columns.filter((c) => !c.pinned && !c.hide)

  // For colSpan: we need to skip cells that are "swallowed" by a span
  const renderNormalCells = () => {
    const cells: React.ReactNode[] = []
    let colIndex = pinnedLeft.length
    let skip = 0

    for (const col of normal) {
      if (skip > 0) { skip--; colIndex++; continue }

      // Handle colspan
      const span = col.colSpan ? col.colSpan({ data: node.data, colDef: col, rowIndex: node.rowIndex }) : 1
      const effectiveSpan = Math.min(span, normal.length - (colIndex - pinnedLeft.length))

      let spanWidth = col._width
      if (effectiveSpan > 1) {
        const spanStart = normal.indexOf(col)
        for (let s = 1; s < effectiveSpan; s++) {
          if (normal[spanStart + s]) spanWidth += normal[spanStart + s]._width
        }
        skip = effectiveSpan - 1
      }

      const isEditing = editingCell?.colId === col._colId && editingCell?.rowIndex === node.rowIndex
      const isFocused = activeCell?.colId === col._colId && activeCell?.rowIndex === node.rowIndex
      const inRange = isCellInRange(node.rowIndex, colIndex, cellRange)

      cells.push(
        <GridCell
          key={col._colId}
          col={effectiveSpan > 1 ? { ...col, _width: spanWidth } : col}
          node={node}
          isEditing={isEditing}
          isFocused={isFocused}
          isInRange={inRange}
          onCellClick={onCellClick}
          onCellDoubleClick={onCellDoubleClick}
          onCellMouseDown={onCellMouseDown}
          onCellMouseEnter={onCellMouseEnter}
          onCommitEdit={onCommitEdit}
          onCancelEdit={onCancelEdit}
          api={api}
        />
      )
      colIndex++
    }
    return cells
  }

  const renderPinnedCells = (cols: InternalColDef<T>[], startColIndex: number) =>
    cols.map((col, i) => {
      const colIndex = startColIndex + i
      const isEditing = editingCell?.colId === col._colId && editingCell?.rowIndex === node.rowIndex
      const isFocused = activeCell?.colId === col._colId && activeCell?.rowIndex === node.rowIndex
      const inRange = isCellInRange(node.rowIndex, colIndex, cellRange)

      return (
        <GridCell
          key={col._colId}
          col={col}
          node={node}
          isEditing={isEditing}
          isFocused={isFocused}
          isInRange={inRange}
          onCellClick={onCellClick}
          onCellDoubleClick={onCellDoubleClick}
          onCellMouseDown={onCellMouseDown}
          onCellMouseEnter={onCellMouseEnter}
          onCommitEdit={onCommitEdit}
          onCancelEdit={onCancelEdit}
          api={api}
        />
      )
    })

  // Full-width row
  if (isFullWidth) {
    return (
      <div className="vgrid-fullwidth-row" style={style} role="row" onClick={onRowClick}>
        {fullWidthRenderer
          ? fullWidthRenderer({ value: undefined, data: node.data, colDef: {} as any, rowIndex: node.rowIndex, api })
          : null
        }
      </div>
    )
  }

  const masterRowHeight = (style.height as number) - (node.isExpanded ? detailHeight : 0)

  return (
    <>
      {/* Main Row */}
      <div
        className={rowClass}
        style={{ ...style, height: masterRowHeight }}
        onClick={onRowClick}
        role="row"
        aria-selected={node.isSelected}
        data-row-index={node.rowIndex}
      >
        {/* Serial number cell — always single-click, never editable */}
        {showRowNumber && (
          <div
            className={`vgrid-row-num-cell${rowClickJsonModal ? ' vgrid-row-num-cell--clickable' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              if (rowClickJsonModal) onRowNumClick?.()
            }}
            title={rowClickJsonModal ? 'Click to view row data' : undefined}
            aria-label={`Row ${node.rowIndex + 1}`}
          >
            <span className="vgrid-row-num-cell__num">{node.rowIndex + 1}</span>
            {rowClickJsonModal && (
              <span className="vgrid-row-num-cell__hint" aria-hidden="true">👁</span>
            )}
          </div>
        )}

        {/* Checkbox */}
        {showCheckbox && (
          <div
            className="vgrid-checkbox-cell"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => {
              e.stopPropagation()
              onCheckboxDoubleClick?.(e)
            }}
          >
            <input
              type="checkbox"
              className="vgrid-checkbox"
              checked={node.isSelected}
              onChange={(e) => onCheckboxChange(e.target.checked)}
              aria-label={`Select row ${node.rowIndex + 1}`}
            />
          </div>
        )}


        {/* Master-Detail expand icon (first cell area) */}
        {isMasterDetail && (
          <div className="vgrid-checkbox-cell" onClick={(e) => e.stopPropagation()}>
            <MasterIcon isExpanded={node.isExpanded} onClick={onToggleExpand} />
          </div>
        )}

        {/* Pinned left cells */}
        {pinnedLeft.length > 0 && (
          <div className="vgrid-pinned-left" style={{ display: 'flex' }}>
            {renderPinnedCells(pinnedLeft, 0)}
          </div>
        )}

        {/* Normal scrollable cells */}
        <div style={{ overflow: 'hidden', flex: 1, display: 'flex', minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              width: normalWidth,
              transform: `translateX(-${scrollLeft}px)`,
              willChange: 'transform',
            }}
          >
            {renderNormalCells()}
          </div>
        </div>

        {/* Pinned right cells */}
        {pinnedRight.length > 0 && (
          <div className="vgrid-pinned-right" style={{ display: 'flex' }}>
            {renderPinnedCells(pinnedRight, pinnedLeft.length + normal.length)}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {isMasterDetail && node.isExpanded && (
        <div
          className="vgrid-detail-row"
          style={{
            ...style,
            top: (style.top as number) + masterRowHeight,
            height: detailHeight,
          }}
          role="row"
          aria-label="Detail panel"
        >
          <div className="vgrid-detail-inner">
            {detailRenderer
              ? detailRenderer({ data: node.data, rowIndex: node.rowIndex, api })
              : <span style={{ color: 'var(--vg-text-muted)' }}>No detail renderer provided</span>
            }
          </div>
        </div>
      )}
    </>
  )
}) as <T extends RowData>(props: RowRendererProps<T>) => React.ReactElement | null



export default RowRenderer
