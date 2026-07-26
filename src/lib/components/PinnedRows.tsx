import React, { memo } from 'react'
import type { InternalColDef } from '../store/createGridStore'
import type { RowData, GridApi } from '../types'
import { GridCell } from './CellRenderer'

interface PinnedRowsProps<T> {
  rows: T[]
  columns: InternalColDef<T>[]
  rowHeight: number
  showCheckbox: boolean
  isMasterDetail: boolean
  api: GridApi<T>
  scrollLeft: number
  position: 'top' | 'bottom'
}

const PinnedRows = memo(<T extends RowData>(props: PinnedRowsProps<T>) => {
  const { rows, columns, rowHeight, showCheckbox, isMasterDetail, api, scrollLeft, position } = props

  if (!rows || rows.length === 0) return null

  const pinnedLeft = columns.filter((c) => c.pinned === 'left' && !c.hide)
  const pinnedRight = columns.filter((c) => c.pinned === 'right' && !c.hide)
  const normal = columns.filter((c) => !c.pinned && !c.hide)
  const normalWidth = normal.reduce((s, c) => s + c._width, 0)

  return (
    <div
      className={`vgrid-pinned-rows-${position}`}
      role="rowgroup"
      aria-label={`${position === 'top' ? 'Top' : 'Bottom'} pinned rows`}
    >
      {rows.map((data, rowIdx) => {
        const fakeNode = {
          id: `pinned-${position}-${rowIdx}`,
          data,
          rowIndex: rowIdx,
          isSelected: false,
          isExpanded: false,
        }

        return (
          <div key={rowIdx} className="vgrid-pinned-row" style={{ height: rowHeight }} role="row">
            {/* Placeholder for checkbox / master column */}
            {(showCheckbox || isMasterDetail) && (
              <div className="vgrid-checkbox-cell" />
            )}

            {/* Pinned left */}
            {pinnedLeft.length > 0 && (
              <div className="vgrid-pinned-left" style={{ display: 'flex' }}>
                {pinnedLeft.map((col) => (
                  <GridCell
                    key={col._colId}
                    col={col}
                    node={fakeNode}
                    isEditing={false}
                    isFocused={false}
                    isInRange={false}
                    onCellClick={() => {}}
                    onCellDoubleClick={() => {}}
                    onCellMouseDown={() => {}}
                    onCellMouseEnter={() => {}}
                    onCommitEdit={() => {}}
                    onCancelEdit={() => {}}
                    api={api}
                  />
                ))}
              </div>
            )}

            {/* Normal columns (scroll-synced) */}
            <div style={{ overflow: 'hidden', flex: 1, display: 'flex' }}>
              <div
                style={{
                  display: 'flex',
                  width: normalWidth,
                  transform: `translateX(-${scrollLeft}px)`,
                  willChange: 'transform',
                }}
              >
                {normal.map((col) => (
                  <GridCell
                    key={col._colId}
                    col={col}
                    node={fakeNode}
                    isEditing={false}
                    isFocused={false}
                    isInRange={false}
                    onCellClick={() => {}}
                    onCellDoubleClick={() => {}}
                    onCellMouseDown={() => {}}
                    onCellMouseEnter={() => {}}
                    onCommitEdit={() => {}}
                    onCancelEdit={() => {}}
                    api={api}
                  />
                ))}
              </div>
            </div>

            {/* Pinned right */}
            {pinnedRight.length > 0 && (
              <div className="vgrid-pinned-right" style={{ display: 'flex' }}>
                {pinnedRight.map((col) => (
                  <GridCell
                    key={col._colId}
                    col={col}
                    node={fakeNode}
                    isEditing={false}
                    isFocused={false}
                    isInRange={false}
                    onCellClick={() => {}}
                    onCellDoubleClick={() => {}}
                    onCellMouseDown={() => {}}
                    onCellMouseEnter={() => {}}
                    onCommitEdit={() => {}}
                    onCancelEdit={() => {}}
                    api={api}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}) as <T extends RowData>(props: PinnedRowsProps<T>) => React.ReactElement | null



export default PinnedRows
