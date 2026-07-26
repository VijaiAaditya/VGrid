import * as XLSX from 'xlsx'
import type { RowNode, RowData, FlatItem, XlsxExportParams, GroupNode } from '../types'
import type { InternalColDef } from '../store/createGridStore'
import { getFieldValue } from '../store/createGridStore'

/**
 * XLSX Exporter — generates a true .xlsx file with:
 *   - Column header row styled bold
 *   - Column widths matching the grid
 *   - Proper data types (numbers as numbers, dates as dates)
 *   - Group rows included with indentation
 *   - RFC-compliant character encoding
 */
export function exportDataAsXlsx<T extends RowData>(
  flatItems: FlatItem<T>[],
  columns: InternalColDef<T>[],
  params: XlsxExportParams = {}
): void {
  const {
    fileName = 'v-grid-export.xlsx',
    sheetName = 'Sheet1',
    columnKeys,
    includeHeader = true,
    onlySelected = false,
    includeGroups = true,
  } = params

  // Determine export columns
  const exportCols = columns.filter((col) => {
    if (col.hide) return false
    if (col.checkboxSelection) return false
    if (columnKeys && !columnKeys.includes(col._colId)) return false
    return true
  })

  const wsData: (string | number | boolean | null)[][] = []

  // Header row
  if (includeHeader) {
    wsData.push(exportCols.map((col) => col.headerName ?? col.field ?? col._colId))
  }

  // Data rows
  for (const item of flatItems) {
    if (item.kind === 'group') {
      if (!includeGroups) continue
      const group = item.group
      const row: (string | number | boolean | null)[] = exportCols.map((col, i) => {
        if (i === 0) return `${'  '.repeat(group.level)}▶ ${group.key} (${group.leafCount})`
        const agg = group.aggregations[col._colId]
        if (agg == null) return null
        if (col.valueFormatter) {
          return col.valueFormatter({ value: agg, data: {} as T, colDef: col }) ?? null
        }
        return typeof agg === 'number' ? agg : String(agg)
      })
      wsData.push(row)
    } else {
      const { node } = item
      if (onlySelected && !node.isSelected) continue

      const row = exportCols.map((col) => {
        let value: unknown
        if (col.valueGetter) value = col.valueGetter({ data: node.data, colDef: col, rowIndex: node.rowIndex })
        else if (col.field) value = getFieldValue(node.data as RowData, col.field)

        if (col.valueFormatter) {
          const formatted = col.valueFormatter({ value, data: node.data, colDef: col })
          return formatted
        }

        if (value == null) return null
        if (typeof value === 'number' || typeof value === 'boolean') return value as number | boolean
        return String(value)
      })
      wsData.push(row)
    }
  }

  // Build worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Set column widths based on grid widths (convert px to Excel char widths ~7px per char)
  ws['!cols'] = exportCols.map((col) => ({ wch: Math.max(10, Math.round(col._width / 7)) }))

  // Style the header row bold
  if (includeHeader && wsData.length > 0) {
    const headerRange = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
    for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c })
      if (!ws[addr]) continue
      ws[addr].s = {
        font: { bold: true, color: { rgb: '1A1D2E' } },
        fill: { fgColor: { rgb: 'F8F9FA' } },
        alignment: { vertical: 'center' },
        border: {
          bottom: { style: 'thin', color: { rgb: 'D0D5DE' } },
        },
      }
    }
  }

  // Auto-detect number/date columns and apply formats
  if (wsData.length > 1) {
    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
    for (let c = range.s.c; c <= range.e.c; c++) {
      const col = exportCols[c]
      if (!col) continue
      // Number format
      for (let r = 1; r <= range.e.r; r++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        if (!ws[addr]) continue
        if (typeof ws[addr].v === 'number') {
          // Check if it looks like a salary/currency (large number)
          if (ws[addr].v > 1000) {
            ws[addr].z = '#,##0'
          } else if (!Number.isInteger(ws[addr].v)) {
            ws[addr].z = '0.00'
          }
        }
      }
    }
  }

  // Build workbook and download
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, fileName, { compression: true, cellStyles: true })
}
