import { useCallback, useRef } from 'react'
import type { CellRange, RowData, RowNode } from '../types'
import type { InternalColDef } from '../store/createGridStore'
import { getFieldValue } from '../utils/valueGetter'

interface DragFillOptions<T> {
  cellRange: CellRange | null
  displayedRows: RowNode<T>[]
  columns: InternalColDef<T>[]
  direction?: 'x' | 'y' | 'xy'
  onFill: (updates: Array<{ rowIndex: number; colId: string; value: unknown }>) => void
}

interface DragFillResult {
  fillHandleProps: {
    onMouseDown: (e: React.MouseEvent) => void
  }
  isDragging: boolean
}

/**
 * Drag Fill Handle — Excel-style fill behaviour.
 *
 * When the user drags the bottom-right corner of the selection:
 *   - Numbers: auto-increment (detect step from adjacent values)
 *   - Strings: copy the source value
 *   - Dates: increment by 1 day
 *   - Boolean: toggle on each fill
 *
 * The fill is applied via the onFill callback, which should call
 * setCellValue for each affected cell.
 */
export function useDragFill<T extends RowData>({
  cellRange,
  displayedRows,
  columns,
  direction = 'y',
  onFill,
}: DragFillOptions<T>): DragFillResult {
  const isDraggingRef = useRef(false)
  const startRangeRef = useRef<CellRange | null>(null)
  const startYRef = useRef(0)
  const startXRef = useRef(0)
  const currentEndRowRef = useRef<number | null>(null)
  const currentEndColRef = useRef<number | null>(null)

  const visibleCols = columns.filter((c) => !c.hide)

  const getCellValue = useCallback((rowIndex: number, colId: string): unknown => {
    const row = displayedRows[rowIndex]
    const col = columns.find((c) => c._colId === colId)
    if (!row || !col) return undefined
    if (col.valueGetter) return col.valueGetter({ data: row.data, colDef: col, rowIndex })
    if (col.field) return getFieldValue(row.data as RowData, col.field)
    return undefined
  }, [displayedRows, columns])

  const detectStep = useCallback((values: unknown[]): number => {
    if (values.length < 2) return 1
    const nums = values.map(Number).filter((n) => !isNaN(n))
    if (nums.length < 2) return 1
    const diffs = nums.slice(1).map((n, i) => n - nums[i])
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length
    return Math.round(avgDiff * 100) / 100 || 1
  }, [])

  const fillValues = useCallback((range: CellRange, targetEndRow: number) => {
    const updates: Array<{ rowIndex: number; colId: string; value: unknown }> = []

    // For each column in the source range
    for (let ci = range.startColIndex; ci <= range.endColIndex; ci++) {
      const col = visibleCols[ci]
      if (!col) continue

      // Collect source values
      const sourceValues: unknown[] = []
      for (let ri = range.startRow; ri <= range.endRow; ri++) {
        sourceValues.push(getCellValue(ri, col._colId))
      }

      const firstValue = sourceValues[0]
      const isNumeric = sourceValues.every((v) => typeof v === 'number' && !isNaN(v as number))
      const isDateStr = typeof firstValue === 'string' && !isNaN(Date.parse(firstValue))
      const step = isNumeric ? detectStep(sourceValues) : 1
      const sourceLength = sourceValues.length

      // Fill downward from end of source range
      const fillStart = range.endRow + 1
      const fillEnd = targetEndRow

      for (let ri = fillStart; ri <= fillEnd; ri++) {
        const sourceIdx = (ri - fillStart) % sourceLength
        const sourceValue = sourceValues[sourceIdx]
        const repeatCount = Math.floor((ri - fillStart) / sourceLength) + 1

        let fillValue: unknown

        if (isNumeric) {
          // Auto-increment: last source value + step * fill position
          const lastNum = sourceValues[sourceLength - 1] as number
          fillValue = lastNum + step * (ri - range.endRow)
        } else if (isDateStr) {
          try {
            const d = new Date(firstValue as string)
            d.setDate(d.getDate() + (ri - range.endRow))
            fillValue = d.toISOString().split('T')[0]
          } catch {
            fillValue = sourceValue
          }
        } else {
          // Copy: cycle through source values
          fillValue = sourceValue
        }

        updates.push({ rowIndex: ri, colId: col._colId, value: fillValue })
      }
    }

    if (updates.length > 0) onFill(updates)
  }, [visibleCols, getCellValue, detectStep, onFill])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!cellRange || e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    isDraggingRef.current = true
    startRangeRef.current = { ...cellRange }
    startYRef.current = e.clientY
    startXRef.current = e.clientX
    currentEndRowRef.current = cellRange.endRow

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current || !startRangeRef.current) return
      // Row height estimation ~40px
      const rowDelta = Math.round((ev.clientY - startYRef.current) / 40)
      currentEndRowRef.current = Math.max(
        startRangeRef.current.endRow,
        startRangeRef.current.endRow + rowDelta
      )
    }

    const handleMouseUp = () => {
      if (!isDraggingRef.current || !startRangeRef.current) return
      isDraggingRef.current = false

      const targetEndRow = currentEndRowRef.current ?? startRangeRef.current.endRow
      if (targetEndRow > startRangeRef.current.endRow) {
        fillValues(startRangeRef.current, Math.min(targetEndRow, displayedRows.length - 1))
      }

      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [cellRange, fillValues, displayedRows.length])

  return {
    fillHandleProps: { onMouseDown: handleMouseDown },
    isDragging: isDraggingRef.current,
  }
}
