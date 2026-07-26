import React, { useState, useCallback, useRef } from 'react'
import type { InternalColDef } from '../store/createGridStore'
import type { RowData } from '../types'

interface RowGroupPanelProps<T> {
  columns: InternalColDef<T>[]
  groupByColIds: string[]
  onGroupByChange: (colIds: string[]) => void
  theme: 'light' | 'dark' | 'custom'
}

/**
 * Row Group Drop Panel — shown above the grid when showRowGroupPanel = true.
 * 
 * Users drag columns from the header into this panel to group the data.
 * Supports:
 *   - Drag columns from header → panel to add grouping
 *   - Click × on a group chip to remove that grouping
 *   - Drag chips within the panel to reorder group priority
 *   - Click a column name in the "available" list to toggle grouping
 */
export function RowGroupPanel<T extends RowData>({ columns, groupByColIds, onGroupByChange, theme }: RowGroupPanelProps<T>) {
  const [isDragOver, setIsDragOver] = useState(false)
  const dragColIdRef = useRef<string | null>(null)
  const dragChipIndexRef = useRef<number | null>(null)

  const groupableCols = columns.filter((c) => c.enableRowGroup !== false && !c.hide && !c.checkboxSelection)
  const groupedCols = groupByColIds.map((id) => columns.find((c) => c._colId === id)).filter(Boolean) as InternalColDef<T>[]
  const ungroupedCols = groupableCols.filter((c) => !groupByColIds.includes(c._colId))

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const colId = e.dataTransfer.getData('vgrid-col-id') || dragColIdRef.current
    if (!colId) return
    if (!groupByColIds.includes(colId)) {
      onGroupByChange([...groupByColIds, colId])
    }
    dragColIdRef.current = null
  }, [groupByColIds, onGroupByChange])

  const removeGroup = useCallback((colId: string) => {
    onGroupByChange(groupByColIds.filter((id) => id !== colId))
  }, [groupByColIds, onGroupByChange])

  const toggleGroup = useCallback((colId: string) => {
    if (groupByColIds.includes(colId)) {
      onGroupByChange(groupByColIds.filter((id) => id !== colId))
    } else {
      onGroupByChange([...groupByColIds, colId])
    }
  }, [groupByColIds, onGroupByChange])

  const clearAll = useCallback(() => onGroupByChange([]), [onGroupByChange])

  const bg = theme === 'dark' ? '#111520' : '#f4f6f9'
  const border = theme === 'dark' ? '#1e2535' : '#e2e6ec'
  const text = theme === 'dark' ? '#8b95ad' : '#5a6072'
  const chipBg = theme === 'dark' ? '#1e2d52' : '#e8effe'
  const chipText = theme === 'dark' ? '#7fa8ff' : '#1a3fa8'
  const accent = theme === 'dark' ? '#648bff' : '#4a6cf7'

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: bg, borderBottom: `1px solid ${border}`,
        minHeight: 44, flexWrap: 'wrap',
      }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Label */}
      <span style={{ fontSize: 11, color: text, fontWeight: 500, flexShrink: 0 }}>
        Row Groups:
      </span>

      {/* Drop zone hint */}
      {groupByColIds.length === 0 && (
        <div style={{
          padding: '4px 12px', borderRadius: 6, fontSize: 11, color: text,
          border: `1.5px dashed ${isDragOver ? accent : border}`,
          background: isDragOver ? (theme === 'dark' ? '#1e2747' : '#eef2ff') : 'transparent',
          transition: 'all 0.15s',
        }}>
          Drag columns here to group
        </div>
      )}

      {/* Group chips */}
      {groupedCols.map((col, i) => (
        <div
          key={col._colId}
          draggable
          onDragStart={(e) => {
            dragChipIndexRef.current = i
            e.dataTransfer.setData('vgrid/chipIndex', String(i))
          }}
          onDrop={(e) => {
            e.stopPropagation()
            const fromIdx = parseInt(e.dataTransfer.getData('vgrid/chipIndex'))
            if (isNaN(fromIdx) || fromIdx === i) return
            const newOrder = [...groupByColIds]
            const [moved] = newOrder.splice(fromIdx, 1)
            newOrder.splice(i, 0, moved)
            onGroupByChange(newOrder)
          }}
          onDragOver={(e) => e.preventDefault()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '3px 8px 3px 10px', borderRadius: 20,
            background: chipBg, color: chipText,
            fontSize: 11, fontWeight: 600, cursor: 'grab',
            border: `1px solid ${accent}40`,
          }}
        >
          <span>≡</span>
          <span>{col.headerName ?? col.field ?? col._colId}</span>
          <button
            onClick={() => removeGroup(col._colId)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: chipText, fontSize: 14, lineHeight: 1, padding: 0,
              display: 'flex', alignItems: 'center',
            }}
            aria-label={`Remove ${col.headerName} grouping`}
          >×</button>
        </div>
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Quick-add buttons for ungrouped columns */}
      {ungroupedCols.slice(0, 5).map((col) => (
        <button
          key={col._colId}
          onClick={() => toggleGroup(col._colId)}
          style={{
            padding: '3px 8px', borderRadius: 4, fontSize: 11,
            background: 'transparent', color: text,
            border: `1px solid ${border}`, cursor: 'pointer',
          }}
          title={`Group by ${col.headerName ?? col.field}`}
        >
          + {col.headerName ?? col.field}
        </button>
      ))}

      {/* Clear all */}
      {groupByColIds.length > 0 && (
        <button
          onClick={clearAll}
          style={{
            padding: '3px 8px', borderRadius: 4, fontSize: 11,
            background: 'transparent', color: text,
            border: `1px solid ${border}`, cursor: 'pointer',
          }}
        >
          Clear all
        </button>
      )}
    </div>
  )
}
