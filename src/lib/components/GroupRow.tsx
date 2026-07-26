import React, { memo, useCallback } from 'react'
import type { GroupNode, RowData, GridApi, FlatItem } from '../types'
import type { InternalColDef } from '../store/createGridStore'

interface GroupRowProps<T> {
  group: GroupNode<T>
  columns: InternalColDef<T>[]
  onToggle: (groupId: string) => void
  api: GridApi<T>
  height: number
  normalWidth: number
  scrollLeft: number
  showCheckbox: boolean
  showMasterCol: boolean
  style: React.CSSProperties
}

/**
 * Group row — renders the collapsible group header with:
 * - Expand/collapse chevron
 * - Group key value + leaf count badge
 * - Aggregated values for numeric columns (aligned with their column)
 * - Indentation based on nesting level
 */
const GroupRow = memo(<T extends RowData>(props: GroupRowProps<T>) => {
  const {
    group, columns, onToggle, height,
    normalWidth, scrollLeft, showCheckbox, showMasterCol, style
  } = props

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggle(group.id)
  }, [group.id, onToggle])

  const pinnedLeft = columns.filter((c) => c.pinned === 'left' && !c.hide)
  const pinnedRight = columns.filter((c) => c.pinned === 'right' && !c.hide)
  const normal = columns.filter((c) => !c.pinned && !c.hide)

  const indentWidth = group.level * 20

  const renderAggCell = (col: InternalColDef<T>, extraStyle?: React.CSSProperties) => {
    const agg = group.aggregations[col._colId]
    let display = ''
    if (agg != null) {
      if (col.valueFormatter) {
        display = col.valueFormatter({ value: agg, data: {} as T, colDef: col })
      } else if (typeof agg === 'number') {
        display = Number.isInteger(agg) ? agg.toLocaleString() : agg.toFixed(2)
      } else {
        display = String(agg)
      }
    }
    return (
      <div
        key={col._colId}
        className="vgrid-cell vgrid-group-agg-cell"
        style={{ width: col._width, minWidth: col._width, ...extraStyle }}
      >
        {display && (
          <span style={{ fontSize: 11, color: 'var(--vg-accent)', fontWeight: 600, fontFamily: 'var(--vg-font-mono)' }}>
            {display}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className="vgrid-group-row"
      style={{ ...style, height, cursor: 'pointer' }}
      onClick={handleToggle}
      role="row"
      aria-expanded={group.isExpanded}
      aria-label={`Group: ${group.headerName} = ${group.key}`}
    >
      {/* Checkbox / master column placeholder */}
      {(showCheckbox || showMasterCol) && (
        <div className="vgrid-checkbox-cell" />
      )}

      {/* Pinned left columns */}
      {pinnedLeft.length > 0 && (
        <div className="vgrid-pinned-left" style={{ display: 'flex' }}>
          {pinnedLeft.map((col, i) => {
            if (i === 0) {
              // First pinned left col gets the group label
              return (
                <div
                  key={col._colId}
                  className="vgrid-cell vgrid-group-label-cell"
                  style={{ width: col._width, minWidth: col._width, paddingLeft: 8 + indentWidth }}
                >
                  <button
                    className={`vgrid-group-toggle${group.isExpanded ? ' vgrid-group-toggle--open' : ''}`}
                    onClick={handleToggle}
                    type="button"
                    aria-label={group.isExpanded ? 'Collapse group' : 'Expand group'}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                      <path d={group.isExpanded ? 'M1 3L5 7L9 3H1Z' : 'M3 1L7 5L3 9V1Z'} />
                    </svg>
                  </button>
                  <span className="vgrid-group-label">
                    <span className="vgrid-group-field">{group.headerName}: </span>
                    <span className="vgrid-group-key">{group.key}</span>
                  </span>
                  <span className="vgrid-group-count">{group.leafCount}</span>
                </div>
              )
            }
            return renderAggCell(col)
          })}
        </div>
      )}

      {/* Normal scrollable columns */}
      <div style={{ overflow: 'hidden', flex: 1, display: 'flex', minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            width: normalWidth,
            transform: `translateX(-${scrollLeft}px)`,
            willChange: 'transform',
          }}
        >
          {normal.map((col, i) => {
            // If no pinned left, first normal col gets the label
            if (i === 0 && pinnedLeft.length === 0) {
              return (
                <div
                  key={col._colId}
                  className="vgrid-cell vgrid-group-label-cell"
                  style={{ width: col._width, minWidth: col._width, paddingLeft: 8 + indentWidth }}
                >
                  <button
                    className={`vgrid-group-toggle${group.isExpanded ? ' vgrid-group-toggle--open' : ''}`}
                    onClick={handleToggle}
                    type="button"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                      <path d={group.isExpanded ? 'M1 3L5 7L9 3H1Z' : 'M3 1L7 5L3 9V1Z'} />
                    </svg>
                  </button>
                  <span className="vgrid-group-label">
                    <span className="vgrid-group-field">{group.headerName}: </span>
                    <span className="vgrid-group-key">{group.key}</span>
                  </span>
                  <span className="vgrid-group-count">{group.leafCount}</span>
                </div>
              )
            }
            return renderAggCell(col)
          })}
        </div>
      </div>

      {/* Pinned right */}
      {pinnedRight.length > 0 && (
        <div className="vgrid-pinned-right" style={{ display: 'flex' }}>
          {pinnedRight.map((col) => renderAggCell(col))}
        </div>
      )}
    </div>
  )
}) as <T extends RowData>(props: GroupRowProps<T>) => React.ReactElement | null

export default GroupRow
