import type { RowNode, ColDef, RowData, CellRange, CsvExportParams, GridApi } from '../types'
import type { CopiedSelectionData } from '../types'
import type { InternalColDef } from '../store/createGridStore'
import { getFieldValue } from '../store/createGridStore'

// ─── CSV Export ───────────────────────────────────────────────────────────────

export function exportDataAsCsv<T extends RowData>(
  displayedRows: RowNode<T>[],
  columns: InternalColDef<T>[],
  params: CsvExportParams = {},
  api: GridApi<T>
): void {
  const {
    fileName = 'v-grid-export.csv',
    columnSeparator = ',',
    onlySelected = false,
    columnKeys,
    includeHeader = true,
    processCellCallback,
  } = params

  const exportCols = columns.filter((col) => {
    if (col.hide) return false
    if (columnKeys && !columnKeys.includes(col._colId)) return false
    if (col.checkboxSelection) return false
    return true
  })

  const rows = onlySelected ? displayedRows.filter((n) => n.isSelected) : displayedRows
  const lines: string[] = []

  if (includeHeader) {
    lines.push(exportCols.map((col) => escapeCsvCell(col.headerName ?? col.field ?? col._colId)).join(columnSeparator))
  }

  for (const node of rows) {
    const rowLine = exportCols.map((col) => {
      let value: unknown
      if (col.valueGetter) value = col.valueGetter({ data: node.data, colDef: col, rowIndex: node.rowIndex })
      else if (col.field) value = getFieldValue(node.data as RowData, col.field)

      let strValue: string
      if (processCellCallback) {
        strValue = processCellCallback({ value, data: node.data, colDef: col as ColDef<T>, rowIndex: node.rowIndex, api } as any)
      } else if (col.valueFormatter) {
        strValue = col.valueFormatter({ value, data: node.data, colDef: col })
      } else {
        strValue = value == null ? '' : String(value)
      }
      return escapeCsvCell(strValue)
    }).join(columnSeparator)
    lines.push(rowLine)
  }

  const csvContent = lines.join('\n')
  downloadText('\uFEFF' + csvContent, fileName, 'text/csv;charset=utf-8;')
}

function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return ""
  }
  return value
}

// ─── Clipboard ────────────────────────────────────────────────────────────────

export function copyRangeToClipboard<T extends RowData>(
  range: CellRange,
  displayedRows: RowNode<T>[],
  columns: InternalColDef<T>[]
): void {
  const visibleCols = columns.filter((c) => !c.hide && !c.checkboxSelection)
  const selectedCols = visibleCols.slice(range.startColIndex, range.endColIndex + 1)
  const lines: string[] = []
  for (let r = range.startRow; r <= range.endRow; r++) {
    const node = displayedRows[r]
    if (!node) continue
    const cells = selectedCols.map((col) => {
      let value: unknown
      if (col.valueGetter) value = col.valueGetter({ data: node.data, colDef: col, rowIndex: node.rowIndex })
      else if (col.field) value = getFieldValue(node.data as RowData, col.field)
      if (col.valueFormatter) return col.valueFormatter({ value, data: node.data, colDef: col })
      return value == null ? '' : String(value)
    })
    lines.push(cells.join('\t'))
  }
  writeToClipboard(lines.join('\n'))
}

export function copySelectedRowsToClipboard<T extends RowData>(
  displayedRows: RowNode<T>[],
  columns: InternalColDef<T>[]
): void {
  const selectedRows = displayedRows.filter((n) => n.isSelected)
  if (selectedRows.length === 0) return
  const visibleCols = columns.filter((c) => !c.hide && !c.checkboxSelection)
  const headerRow = visibleCols.map((c) => c.headerName ?? c.field ?? c._colId).join('\t')
  const lines = [headerRow]
  for (const node of selectedRows) {
    const cells = visibleCols.map((col) => {
      let value: unknown
      if (col.valueGetter) value = col.valueGetter({ data: node.data, colDef: col, rowIndex: node.rowIndex })
      else if (col.field) value = getFieldValue(node.data as RowData, col.field)
      if (col.valueFormatter) return col.valueFormatter({ value, data: node.data, colDef: col })
      return value == null ? '' : String(value)
    })
    lines.push(cells.join('\t'))
  }
  writeToClipboard(lines.join('\n'))
}

// ─── Selection extraction + export ───────────────────────────────────────────

export function extractSelectionData<T extends RowData>(
  range: CellRange,
  displayedRows: RowNode<T>[],
  columns: InternalColDef<T>[]
): CopiedSelectionData {
  const visibleCols = columns.filter((c) => !c.hide && !c.checkboxSelection)
  const selectedCols = visibleCols.slice(range.startColIndex, range.endColIndex + 1)
  const columnsMeta = selectedCols.map((col, i) => ({
    index: range.startColIndex + i,
    name: col.headerName ?? col.field ?? col._colId,
  }))
  const cells: unknown[][] = []
  for (let r = range.startRow; r <= range.endRow; r++) {
    const node = displayedRows[r]
    if (!node) continue
    const rowCells = selectedCols.map((col) => {
      let value: unknown
      if (col.valueGetter) value = col.valueGetter({ data: node.data, colDef: col, rowIndex: node.rowIndex })
      else if (col.field) value = getFieldValue(node.data as RowData, col.field)
      return value ?? null
    })
    cells.push(rowCells)
  }
  return { cells, columns: columnsMeta }
}

export function exportSelectionAsCsv(data: CopiedSelectionData, fileName = 'selection.csv'): void {
  const header = data.columns.map((c) => escapeCsvCell(c.name)).join(',')
  const rows = data.cells.map((row) => row.map((v) => escapeCsvCell(v == null ? '' : String(v))).join(','))
  downloadText('\uFEFF' + [header, ...rows].join('\n'), fileName, 'text/csv;charset=utf-8;')
}

export function exportSelectionAsJson(data: CopiedSelectionData, fileName = 'selection.json'): void {
  const records = data.cells.map((row) => {
    const obj: Record<string, unknown> = {}
    data.columns.forEach((col, i) => { obj[col.name] = row[i] ?? null })
    return obj
  })
  downloadText(JSON.stringify(records, null, 2), fileName, 'application/json')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadText(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function writeToClipboard(text: string): void {
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  })
}
