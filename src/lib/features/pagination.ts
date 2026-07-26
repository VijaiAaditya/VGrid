/**
 * pagination.ts — Client-side page slice utility
 */

export interface PageResult<T> {
  rows: T[]
  currentPage: number    // 0-indexed
  totalPages: number
  totalRows: number
  pageSize: number
  startRow: number       // 1-indexed for display
  endRow: number         // 1-indexed for display
}

export function paginateRows<T>(
  rows: T[],
  page: number,    // 0-indexed
  pageSize: number
): PageResult<T> {
  const totalRows = rows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const safePage = Math.min(Math.max(0, page), totalPages - 1)
  const start = safePage * pageSize
  const end = Math.min(start + pageSize, totalRows)
  return {
    rows: rows.slice(start, end),
    currentPage: safePage,
    totalPages,
    totalRows,
    pageSize,
    startRow: totalRows === 0 ? 0 : start + 1,
    endRow: end,
  }
}
