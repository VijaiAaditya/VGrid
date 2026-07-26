import React, { useCallback, useRef, useEffect } from 'react'

export interface ColumnResizeOptions {
  colId: string
  initialWidth: number
  minWidth?: number
  maxWidth?: number
  onResize: (colId: string, newWidth: number) => void
  onResizeEnd?: (colId: string, newWidth: number) => void
}

export interface ColumnResizeResult {
  handleRef: React.RefObject<HTMLDivElement>
  isResizing: boolean
}

/**
 * Drag-to-resize hook for column headers.
 * 
 * Uses pointer events (not mouse events) for reliable cross-browser behavior.
 * All state is in refs — zero re-renders during drag, only one re-render at end.
 */
export function useColumnResize(options: ColumnResizeOptions): ColumnResizeResult {
  const { colId, initialWidth, minWidth = 40, maxWidth = 2000, onResize, onResizeEnd } = options
  const handleRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>
  const isResizingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(initialWidth)
  const currentWidthRef = useRef(initialWidth)

  // Keep current width updated from props
  useEffect(() => {
    if (isResizingRef.current) return
    startWidthRef.current = initialWidth
    currentWidthRef.current = initialWidth
  }, [initialWidth])

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!isResizingRef.current) return
    const dx = e.clientX - startXRef.current
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + dx))
    if (newWidth !== currentWidthRef.current) {
      currentWidthRef.current = newWidth
      onResize(colId, newWidth)
    }
  }, [colId, minWidth, maxWidth, onResize])

  const onPointerUp = useCallback((e: PointerEvent) => {
    if (!isResizingRef.current) return
    isResizingRef.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    handleRef.current?.classList.remove('vgrid-resize-handle--active')
    handleRef.current?.releasePointerCapture(e.pointerId)
    onResizeEnd?.(colId, currentWidthRef.current)
    document.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerup', onPointerUp)
  }, [colId, onPointerMove, onResizeEnd])

  useEffect(() => {
    const el = handleRef.current
    if (!el) return

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      isResizingRef.current = true
      startXRef.current = e.clientX
      startWidthRef.current = currentWidthRef.current
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      el.classList.add('vgrid-resize-handle--active')
      el.setPointerCapture(e.pointerId)
      document.addEventListener('pointermove', onPointerMove)
      document.addEventListener('pointerup', onPointerUp)
    }

    el.addEventListener('pointerdown', onPointerDown)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
    }
  }, [onPointerMove, onPointerUp])

  return { handleRef, isResizing: isResizingRef.current }
}
