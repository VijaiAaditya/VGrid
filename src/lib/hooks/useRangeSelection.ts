import { useCallback, useRef } from 'react'
import type { CellRange, CellPosition } from '../types'

export interface RangeSelectionOptions {
  onRangeChange: (range: CellRange | null) => void
  onRangeSelecting: (v: boolean) => void
  getColIndexById: (colId: string) => number
}

/**
 * Excel-style drag range selection hook.
 * Tracks mousedown → mousemove → mouseup across cells.
 * All tracking in refs — no state updates during drag.
 */
export function useRangeSelection(options: RangeSelectionOptions) {
  const { onRangeChange, onRangeSelecting, getColIndexById } = options
  const isSelectingRef = useRef(false)
  const startCellRef = useRef<CellPosition | null>(null)

  const onCellMouseDown = useCallback((pos: CellPosition, e: React.MouseEvent) => {
    if (e.button !== 0) return
    isSelectingRef.current = true
    startCellRef.current = pos
    onRangeSelecting(true)
    onRangeChange({
      startRow: pos.rowIndex,
      endRow: pos.rowIndex,
      startColIndex: getColIndexById(pos.colId),
      endColIndex: getColIndexById(pos.colId),
    })
  }, [onRangeChange, onRangeSelecting, getColIndexById])

  const onCellMouseEnter = useCallback((pos: CellPosition) => {
    if (!isSelectingRef.current || !startCellRef.current) return
    const startColIdx = getColIndexById(startCellRef.current.colId)
    const endColIdx = getColIndexById(pos.colId)
    onRangeChange({
      startRow: Math.min(startCellRef.current.rowIndex, pos.rowIndex),
      endRow: Math.max(startCellRef.current.rowIndex, pos.rowIndex),
      startColIndex: Math.min(startColIdx, endColIdx),
      endColIndex: Math.max(startColIdx, endColIdx),
    })
  }, [onRangeChange, getColIndexById])

  const onMouseUp = useCallback(() => {
    if (!isSelectingRef.current) return
    isSelectingRef.current = false
    onRangeSelecting(false)
  }, [onRangeSelecting])

  return { onCellMouseDown, onCellMouseEnter, onMouseUp }
}
