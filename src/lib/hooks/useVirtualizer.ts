import { useCallback, useRef, useState, useEffect } from 'react'

export interface VirtualizerOptions {
  count: number
  getItemSize: (index: number) => number
  containerRef: React.RefObject<HTMLElement | null>
  overscan?: number
  horizontal?: boolean
}

export interface VirtualItem {
  index: number
  start: number
  size: number
  end: number
}

export interface VirtualizerResult {
  virtualItems: VirtualItem[]
  totalSize: number
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void
}

/**
 * Core bi-directional virtualizer hook.
 * 
 * Design principles:
 * - scroll handler uses RAF batching — never blocks the paint thread
 * - visible range computed via O(log n) binary search on cumulative offsets
 * - state update only fires when visible range actually changes (no spurious re-renders)
 * - works for both row virtualization and column virtualization
 */
export function useVirtualizer(options: VirtualizerOptions): VirtualizerResult {
  const { count, getItemSize, containerRef, overscan = 5, horizontal = false } = options

  // Pre-build cumulative offset array for O(log n) lookup
  // Rebuild only when count changes — stable otherwise
  const offsetsRef = useRef<Float64Array>(new Float64Array(0))
  const totalSizeRef = useRef(0)

  const buildOffsets = useCallback(() => {
    const arr = new Float64Array(count + 1)
    let total = 0
    for (let i = 0; i < count; i++) {
      arr[i] = total
      total += getItemSize(i)
    }
    arr[count] = total
    offsetsRef.current = arr
    totalSizeRef.current = total
  }, [count, getItemSize])

  // Rebuild offsets whenever count changes
  useEffect(() => {
    buildOffsets()
  }, [buildOffsets])

  // Binary search: find first item whose end > scrollPos
  const findStartIndex = useCallback((scrollPos: number): number => {
    const arr = offsetsRef.current
    let lo = 0, hi = count - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (arr[mid + 1] <= scrollPos) lo = mid + 1
      else hi = mid
    }
    return lo
  }, [count])

  // Visible range state — only track [start, end] to minimize re-renders
  const [range, setRange] = useState<[number, number]>([0, Math.min(30, count - 1)])
  const rangeRef = useRef<[number, number]>(range)

  const computeRange = useCallback(() => {
    const el = containerRef.current
    if (!el) return

    buildOffsets() // ensure up to date if sizes changed

    const scrollPos = horizontal ? el.scrollLeft : el.scrollTop
    const viewSize = horizontal ? el.clientWidth : el.clientHeight

    if (count === 0) {
      setRange([0, -1])
      return
    }

    const startIdx = Math.max(0, findStartIndex(scrollPos) - overscan)
    const endScrollPos = scrollPos + viewSize
    
    // Find end index
    const arr = offsetsRef.current
    let endIdx = startIdx
    while (endIdx < count && arr[endIdx] < endScrollPos) endIdx++
    endIdx = Math.min(count - 1, endIdx + overscan)

    if (rangeRef.current[0] !== startIdx || rangeRef.current[1] !== endIdx) {
      rangeRef.current = [startIdx, endIdx]
      setRange([startIdx, endIdx])
    }
  }, [count, overscan, horizontal, containerRef, findStartIndex, buildOffsets])

  // RAF-batched scroll handler — scroll events fire dozens/second, we batch them
  const rafRef = useRef<number | null>(null)

  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return // already scheduled
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      computeRange()
    })
  }, [computeRange])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Initial compute
    computeRange()

    el.addEventListener('scroll', handleScroll, { passive: true })

    // Also react to container resize
    const ro = new ResizeObserver(() => {
      buildOffsets()
      computeRange()
    })
    ro.observe(el)

    return () => {
      el.removeEventListener('scroll', handleScroll)
      ro.disconnect()
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [containerRef, handleScroll, computeRange, buildOffsets])

  // Build virtual items from current range
  const [startIdx, endIdx] = range
  const arr = offsetsRef.current

  const virtualItems: VirtualItem[] = []
  for (let i = startIdx; i <= endIdx && i < count; i++) {
    virtualItems.push({
      index: i,
      start: arr[i] || 0,
      size: getItemSize(i),
      end: (arr[i + 1]) || 0,
    })
  }

  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    const el = containerRef.current
    if (!el) return
    buildOffsets()
    const arr = offsetsRef.current
    const itemStart = arr[index] || 0
    const itemSize = getItemSize(index)
    const viewSize = horizontal ? el.clientWidth : el.clientHeight

    let scrollTo = itemStart
    if (align === 'center') scrollTo = itemStart - viewSize / 2 + itemSize / 2
    else if (align === 'end') scrollTo = itemStart - viewSize + itemSize

    if (horizontal) el.scrollLeft = Math.max(0, scrollTo)
    else el.scrollTop = Math.max(0, scrollTo)
  }, [containerRef, getItemSize, horizontal, buildOffsets])

  return {
    virtualItems,
    totalSize: totalSizeRef.current,
    scrollToIndex,
  }
}
