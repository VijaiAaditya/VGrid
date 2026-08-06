import type { RowData } from '../types'

/**
 * Extracts a value from a row data object using path/dot-notation (e.g., 'user.name').
 */
export function getFieldValue(data: RowData, field: string): unknown {
  if (!field) return undefined
  const parts = field.split('.')
  let cur: unknown = data
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}
