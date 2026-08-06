import { create } from 'zustand'
import { getFieldValue } from '../utils/valueGetter'
import type {
  ColDef,
  RowData,
  RowNode,
  RowId,
  SortModel,
  FilterModel,
  CellRange,
  CellPosition,
  RowTransaction,
} from '../types'

// ─── Internal Column State ────────────────────────────────────────────────────

export interface InternalColDef<T = RowData> extends ColDef<T> {
  _colId: string
  _width: number
  _left: number        // computed px offset from left
  _pinnedLeft: number  // offset within pinned-left section
  _pinnedRight: number // offset within pinned-right section
}

// ─── Grid Store State ─────────────────────────────────────────────────────────

export interface GridStoreState<T = RowData> {
  // Raw data
  rowData: T[]
  pinnedTopRowData: T[]
  pinnedBottomRowData: T[]

  // Processed column definitions (flat — groups are expanded)
  columns: InternalColDef<T>[]
  // Original column definitions (with group hierarchy)
  columnDefs: ColDef<T>[]
  hasGroupedHeaders: boolean

  // Sort & Filter
  sortModel: SortModel[]
  filterModel: FilterModel
  quickFilterText: string

  // Computed display rows (post sort/filter)
  displayedRowNodes: RowNode<T>[]

  // Selection
  selectedRowIds: Set<RowId>
  lastClickedRowIndex: number | null
  activeCell: CellPosition | null
  cellRange: CellRange | null
  isRangeSelecting: boolean

  // Editing
  editingCell: CellPosition | null

  // Expanded master rows
  expandedRowIds: Set<RowId>

  // Scroll sync refs (stored as state so header can read them)
  scrollLeft: number

  // ── Actions ────────────────────────────────────────────────────────────
  setRowData: (rows: T[]) => void
  applyTransaction: (tx: RowTransaction<T>) => void
  setPinnedTopRowData: (rows: T[]) => void
  setPinnedBottomRowData: (rows: T[]) => void
  setColumnDefs: (defs: ColDef<T>[], defaultColDef?: Partial<ColDef<T>>, getRowId?: (d: T) => RowId) => void
  resizeColumn: (colId: string, newWidth: number) => void
  moveColumn: (fromColId: string, toColId: string) => void
  setSortModel: (model: SortModel[]) => void
  toggleSort: (colId: string, multiSort: boolean) => void
  setFilterModel: (model: FilterModel) => void
  setQuickFilter: (text: string) => void
  computeDisplayedRows: (getRowId?: (d: T) => RowId) => void
  getUnfilteredRowNodes: (getRowId?: (d: T) => RowId) => RowNode<T>[]

  // Selection actions
  selectRow: (rowIndex: number, addToSelection: boolean, range: boolean) => void
  selectAll: () => void
  deselectAll: () => void
  setActiveCell: (pos: CellPosition | null) => void
  setCellRange: (range: CellRange | null) => void
  setRangeSelecting: (v: boolean) => void

  // Editing actions
  startEditing: (pos: CellPosition) => void
  stopEditing: () => void
  setCellValue: (rowIndex: number, colId: string, newValue: unknown, getRowId?: (d: T) => RowId) => void

  // Master-detail
  toggleRowExpanded: (rowId: RowId) => void
  setRowExpanded: (rowId: RowId, expanded: boolean) => void

  // Scroll sync
  setScrollLeft: (v: number) => void
}



// ─── Helper: flatten grouped ColDefs into a flat list ────────────────────────

export function flattenColDefs<T>(
  defs: ColDef<T>[],
  defaultColDef?: Partial<ColDef<T>>
): ColDef<T>[] {
  const flat: ColDef<T>[] = []
  for (const def of defs) {
    if (def.children && def.children.length > 0) {
      flat.push(...flattenColDefs(def.children, defaultColDef))
    } else {
      flat.push({ ...defaultColDef, ...def })
    }
  }
  return flat
}

// ─── Helper: check if any ColDef has children (grouped headers) ───────────────

export function hasGroups<T>(defs: ColDef<T>[]): boolean {
  return defs.some((d) => d.children && d.children.length > 0)
}

// ─── Helper: compute column layout ────────────────────────────────────────────

function computeColumnLayout<T>(flatCols: ColDef<T>[]): InternalColDef<T>[] {
  const DEFAULT_WIDTH = 150
  let leftPinnedOffset = 0
  const rightPinnedCols: InternalColDef<T>[] = []
  const normalCols: InternalColDef<T>[] = []

  // First pass: assign ids + widths
  const withIds = flatCols
    .filter((c) => !c.hide)
    .map((c, i) => {
      const colId = c.colId || c.field || `col_${i}`
      const width = c.width ?? DEFAULT_WIDTH
      return { ...c, _colId: colId, _width: width, _left: 0, _pinnedLeft: 0, _pinnedRight: 0 } as InternalColDef<T>
    })

  // Separate pinned left / right / normal
  const pinnedLeft = withIds.filter((c) => c.pinned === 'left')
  const pinnedRight = withIds.filter((c) => c.pinned === 'right')
  const normal = withIds.filter((c) => !c.pinned)

  // Compute left pinned offsets
  for (const col of pinnedLeft) {
    col._pinnedLeft = leftPinnedOffset
    leftPinnedOffset += col._width
  }

  // Compute normal column left positions
  let normalLeftOffset = 0
  for (const col of normal) {
    col._left = normalLeftOffset
    normalLeftOffset += col._width
  }

  // Compute right pinned offsets (RTL from right edge)
  let rightOffset = 0
  for (let i = pinnedRight.length - 1; i >= 0; i--) {
    pinnedRight[i]._pinnedRight = rightOffset
    rightOffset += pinnedRight[i]._width
    rightPinnedCols.unshift(pinnedRight[i])
  }

  return [...pinnedLeft, ...normal, ...rightPinnedCols]
}

// ─── Sort Engine ──────────────────────────────────────────────────────────────

function sortRows<T>(rows: RowNode<T>[], sortModel: SortModel[], columns: InternalColDef<T>[]): RowNode<T>[] {
  if (sortModel.length === 0) return rows
  const colMap = new Map(columns.map((c) => [c._colId, c]))

  return [...rows].sort((a, b) => {
    for (const sort of sortModel) {
      const col = colMap.get(sort.colId)
      if (!col) continue

      let aVal: unknown, bVal: unknown
      if (col.valueGetter) {
        aVal = col.valueGetter({ data: a.data, colDef: col, rowIndex: a.rowIndex })
        bVal = col.valueGetter({ data: b.data, colDef: col, rowIndex: b.rowIndex })
      } else if (col.field) {
        aVal = getFieldValue(a.data as RowData, col.field)
        bVal = getFieldValue(b.data as RowData, col.field)
      }

      let cmp = 0
      if (col.comparator) {
        cmp = col.comparator(aVal, bVal)
      } else if (aVal == null && bVal == null) {
        cmp = 0
      } else if (aVal == null) {
        cmp = 1
      } else if (bVal == null) {
        cmp = -1
      } else if (typeof aVal === 'string' && typeof bVal === 'string') {
        cmp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' })
      } else {
        cmp = (aVal as number) < (bVal as number) ? -1 : (aVal as number) > (bVal as number) ? 1 : 0
      }

      if (cmp !== 0) return sort.sort === 'asc' ? cmp : -cmp
    }
    return 0
  })
}

// ─── Filter Engine ────────────────────────────────────────────────────────────

function filterRows<T>(
  rows: RowNode<T>[],
  filterModel: FilterModel,
  quickFilter: string,
  columns: InternalColDef<T>[]
): RowNode<T>[] {
  let result = rows

  // Quick global filter
  if (quickFilter.trim()) {
    const q = quickFilter.toLowerCase()
    result = result.filter((node) => {
      for (const col of columns) {
        let val: unknown
        if (col.valueGetter) {
          val = col.valueGetter({ data: node.data, colDef: col, rowIndex: node.rowIndex })
        } else if (col.field) {
          val = getFieldValue(node.data as RowData, col.field)
        }
        if (val != null && String(val).toLowerCase().includes(q)) return true
      }
      return false
    })
  }

  // Column-level filters
  const filterEntries = Object.entries(filterModel)
  if (filterEntries.length === 0) return result

  const colMap = new Map(columns.map((c) => [c._colId, c]))

  return result.filter((node) => {
    for (const [colId, condition] of filterEntries) {
      if (!condition.value && condition.operator !== 'blank' && condition.operator !== 'notBlank') continue
      const col = colMap.get(colId)
      if (!col) continue

      let cellVal: unknown
      if (col.valueGetter) {
        cellVal = col.valueGetter({ data: node.data, colDef: col, rowIndex: node.rowIndex })
      } else if (col.field) {
        cellVal = getFieldValue(node.data as RowData, col.field)
      }

      const strVal = cellVal == null ? '' : String(cellVal).toLowerCase()
      const filterVal = condition.value?.toLowerCase() ?? ''
      const numCell = parseFloat(strVal)
      const numFilter = parseFloat(filterVal)

      let match = true
      switch (condition.operator) {
        case 'contains':       match = strVal.includes(filterVal); break
        case 'notContains':    match = !strVal.includes(filterVal); break
        case 'equals':         match = strVal === filterVal; break
        case 'notEquals':      match = strVal !== filterVal; break
        case 'startsWith':     match = strVal.startsWith(filterVal); break
        case 'endsWith':       match = strVal.endsWith(filterVal); break
        case 'greaterThan':
        case 'gt':             match = !isNaN(numCell) && !isNaN(numFilter) && numCell > numFilter; break
        case 'lessThan':
        case 'lt':             match = !isNaN(numCell) && !isNaN(numFilter) && numCell < numFilter; break
        case 'greaterThanOrEqual': match = !isNaN(numCell) && !isNaN(numFilter) && numCell >= numFilter; break
        case 'lessThanOrEqual':    match = !isNaN(numCell) && !isNaN(numFilter) && numCell <= numFilter; break
        case 'blank':          match = strVal === ''; break
        case 'notBlank':       match = strVal !== ''; break
        // Excel multiselect: value is a comma-separated allowlist.
        // Special value '__none__' means no values should pass.
        case 'in': {
          if (condition.value === '__none__') { match = false; break }
          const allowed = new Set((condition.value ?? '').split(',').map((v) => v.toLowerCase()))
          match = allowed.has(strVal)
          break
        }
      }
      if (!match) return false
    }
    return true
  })
}


// ─── Create Grid Store Factory ────────────────────────────────────────────────
// Using a factory so each grid instance gets its own isolated store

export function createGridStore<T = RowData>() {
  return create<GridStoreState<T>>()((set, get) => ({
    // ── Initial State ────────────────────────────────────────────────────────
    rowData: [],
    pinnedTopRowData: [],
    pinnedBottomRowData: [],
    columns: [],
    columnDefs: [],
    hasGroupedHeaders: false,
    sortModel: [],
    filterModel: {},
    quickFilterText: '',
    displayedRowNodes: [],
    selectedRowIds: new Set(),
    lastClickedRowIndex: null,
    activeCell: null,
    cellRange: null,
    isRangeSelecting: false,
    editingCell: null,
    expandedRowIds: new Set(),
    scrollLeft: 0,

    // ── Data Actions ─────────────────────────────────────────────────────────
    setRowData: (rows) => {
      set({ rowData: rows })
      get().computeDisplayedRows()
    },

    applyTransaction: (tx) => {
      const { rowData } = get()
      let newData = [...rowData]

      if (tx.remove) {
        const removeSet = new Set(tx.remove.map((r) => JSON.stringify(r)))
        newData = newData.filter((r) => !removeSet.has(JSON.stringify(r)))
      }
      if (tx.update) {
        for (const updated of tx.update) {
          const idx = newData.findIndex((r) => JSON.stringify(r) === JSON.stringify(updated))
          if (idx >= 0) newData[idx] = updated
        }
      }
      if (tx.add) {
        const addIndex = tx.addIndex ?? newData.length
        newData.splice(addIndex, 0, ...tx.add)
      }

      set({ rowData: newData })
      get().computeDisplayedRows()
    },

    setPinnedTopRowData: (rows) => set({ pinnedTopRowData: rows }),
    setPinnedBottomRowData: (rows) => set({ pinnedBottomRowData: rows }),

    setColumnDefs: (defs, defaultColDef, _getRowId) => {
      const flat = flattenColDefs(defs, defaultColDef)
      const columns = computeColumnLayout(flat)
      set({
        columnDefs: defs,
        columns,
        hasGroupedHeaders: hasGroups(defs),
      })
      get().computeDisplayedRows()
    },

    resizeColumn: (colId, newWidth) => {
      const { columns } = get()
      const idx = columns.findIndex((c) => c._colId === colId)
      if (idx === -1) return
      const updated = [...columns]
      updated[idx] = { ...updated[idx], _width: Math.max(newWidth, updated[idx].minWidth ?? 40) }
      // Recompute _left for normal columns
      const pinnedLeft = updated.filter((c) => c.pinned === 'left')
      const pinnedRight = updated.filter((c) => c.pinned === 'right')
      const normal = updated.filter((c) => !c.pinned)
      let lo = 0
      for (const c of pinnedLeft) { c._pinnedLeft = lo; lo += c._width }
      let no = 0
      for (const c of normal) { c._left = no; no += c._width }
      let ro = 0
      for (let i = pinnedRight.length - 1; i >= 0; i--) { pinnedRight[i]._pinnedRight = ro; ro += pinnedRight[i]._width }
      set({ columns: updated })
    },

    moveColumn: (fromColId, toColId) => {
      const { columns } = get()
      const fromIndex = columns.findIndex((c) => c._colId === fromColId)
      const toIndex = columns.findIndex((c) => c._colId === toColId)
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return

      const updated = [...columns]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)

      // Recompute offsets (_left, _pinnedLeft, _pinnedRight)
      const pinnedLeft = updated.filter((c) => c.pinned === 'left')
      const pinnedRight = updated.filter((c) => c.pinned === 'right')
      const normal = updated.filter((c) => !c.pinned)

      let lo = 0
      for (const c of pinnedLeft) { c._pinnedLeft = lo; lo += c._width }
      let no = 0
      for (const c of normal) { c._left = no; no += c._width }
      let ro = 0
      for (let i = pinnedRight.length - 1; i >= 0; i--) { pinnedRight[i]._pinnedRight = ro; ro += pinnedRight[i]._width }

      set({ columns: updated })
    },

    // ── Sort Actions ──────────────────────────────────────────────────────────
    setSortModel: (model) => {
      set({ sortModel: model })
      get().computeDisplayedRows()
    },

    toggleSort: (colId, multiSort) => {
      const { sortModel } = get()
      const existing = sortModel.find((s) => s.colId === colId)
      let newModel: SortModel[]

      if (!existing) {
        const newSort: SortModel = { colId, sort: 'asc' }
        newModel = multiSort ? [...sortModel, newSort] : [newSort]
      } else if (existing.sort === 'asc') {
        newModel = sortModel.map((s) => s.colId === colId ? { ...s, sort: 'desc' } : s)
      } else {
        newModel = sortModel.filter((s) => s.colId !== colId)
      }

      set({ sortModel: newModel })
      get().computeDisplayedRows()
    },

    // ── Filter Actions ────────────────────────────────────────────────────────
    setFilterModel: (model) => {
      set({ filterModel: model })
      get().computeDisplayedRows()
    },

    setQuickFilter: (text) => {
      set({ quickFilterText: text })
      get().computeDisplayedRows()
    },

    // ── Core: Compute Displayed Rows ─────────────────────────────────────────
    computeDisplayedRows: (getRowId) => {
      const { rowData, sortModel, filterModel, quickFilterText, columns } = get()

      // Build row nodes
      let nodes: RowNode<T>[] = rowData.map((data, i) => ({
        id: getRowId ? getRowId(data) : i,
        data,
        rowIndex: i,
        isSelected: false,
        isExpanded: false,
      }))

      // Filter
      nodes = filterRows(nodes, filterModel, quickFilterText, columns)

      // Sort
      nodes = sortRows(nodes, sortModel, columns)

      // Re-assign rowIndex after sort/filter
      nodes = nodes.map((n, i) => ({ ...n, rowIndex: i }))

      // Mark selected
      const { selectedRowIds } = get()
      nodes = nodes.map((n) => ({ ...n, isSelected: selectedRowIds.has(n.id) }))

      // Mark expanded
      const { expandedRowIds } = get()
      nodes = nodes.map((n) => ({ ...n, isExpanded: expandedRowIds.has(n.id) }))

      set({ displayedRowNodes: nodes })
    },

    getUnfilteredRowNodes: (getRowId) => {
      const { rowData, sortModel, columns, selectedRowIds, expandedRowIds } = get()

      // Build row nodes
      let nodes: RowNode<T>[] = rowData.map((data, i) => ({
        id: getRowId ? getRowId(data) : i,
        data,
        rowIndex: i,
        isSelected: selectedRowIds.has(getRowId ? getRowId(data) : i),
        isExpanded: expandedRowIds.has(getRowId ? getRowId(data) : i),
      }))

      // Sort
      nodes = sortRows(nodes, sortModel, columns)

      // Re-assign rowIndex after sort
      return nodes.map((n, i) => ({ ...n, rowIndex: i }))
    },

    // ── Selection Actions ─────────────────────────────────────────────────────
    selectRow: (rowIndex, addToSelection, range) => {
      const { displayedRowNodes, selectedRowIds, lastClickedRowIndex } = get()
      const node = displayedRowNodes[rowIndex]
      if (!node) return

      let newSelected = new Set(selectedRowIds)

      if (range && lastClickedRowIndex !== null) {
        const start = Math.min(lastClickedRowIndex, rowIndex)
        const end = Math.max(lastClickedRowIndex, rowIndex)
        if (!addToSelection) newSelected.clear()
        for (let i = start; i <= end; i++) {
          const n = displayedRowNodes[i]
          if (n) newSelected.add(n.id)
        }
      } else if (addToSelection) {
        if (newSelected.has(node.id)) {
          newSelected.delete(node.id)
        } else {
          newSelected.add(node.id)
        }
      } else {
        if (newSelected.size === 1 && newSelected.has(node.id)) {
          newSelected.clear()
        } else {
          newSelected = new Set([node.id])
        }
      }

      set({
        selectedRowIds: newSelected,
        lastClickedRowIndex: rowIndex,
        displayedRowNodes: displayedRowNodes.map((n) => ({ ...n, isSelected: newSelected.has(n.id) })),
      })
    },

    selectAll: () => {
      const { displayedRowNodes } = get()
      const allIds = new Set(displayedRowNodes.map((n) => n.id))
      set({
        selectedRowIds: allIds,
        displayedRowNodes: displayedRowNodes.map((n) => ({ ...n, isSelected: true })),
      })
    },

    deselectAll: () => {
      const { displayedRowNodes } = get()
      set({
        selectedRowIds: new Set(),
        displayedRowNodes: displayedRowNodes.map((n) => ({ ...n, isSelected: false })),
      })
    },

    setActiveCell: (pos) => set({ activeCell: pos }),
    setCellRange: (range) => set({ cellRange: range }),
    setRangeSelecting: (v) => set({ isRangeSelecting: v }),

    // ── Editing ───────────────────────────────────────────────────────────────
    startEditing: (pos) => set({ editingCell: pos }),
    stopEditing: () => set({ editingCell: null }),

    setCellValue: (rowIndex, colId, newValue, _getRowId) => {
      const { displayedRowNodes, columns } = get()
      const node = displayedRowNodes[rowIndex]
      if (!node) return
      const col = columns.find((c) => c._colId === colId)
      if (!col) return

      if (col.valueSetter) {
        const oldValue = col.field ? getFieldValue(node.data as RowData, col.field) : undefined
        const accepted = col.valueSetter({
          data: node.data,
          newValue,
          oldValue,
          colDef: col,
        })
        if (!accepted) return
      } else if (col.field) {
        // Direct field mutation (shallow)
        const data = node.data as RowData
        const parts = col.field.split('.')
        if (parts.length === 1) {
          data[col.field] = newValue
        } else {
          let cur = data as Record<string, unknown>
          for (let i = 0; i < parts.length - 1; i++) {
            if (!cur[parts[i]]) cur[parts[i]] = {}
            cur = cur[parts[i]] as Record<string, unknown>
          }
          cur[parts[parts.length - 1]] = newValue
        }
      }

      // Force re-render of the affected row
      const updatedNodes = [...displayedRowNodes]
      updatedNodes[rowIndex] = { ...updatedNodes[rowIndex] }
      set({ displayedRowNodes: updatedNodes })
    },

    // ── Master-Detail ─────────────────────────────────────────────────────────
    toggleRowExpanded: (rowId) => {
      const { expandedRowIds, displayedRowNodes } = get()
      const newIds = new Set(expandedRowIds)
      if (newIds.has(rowId)) {
        newIds.delete(rowId)
      } else {
        newIds.add(rowId)
      }
      set({
        expandedRowIds: newIds,
        displayedRowNodes: displayedRowNodes.map((n) => ({
          ...n,
          isExpanded: newIds.has(n.id),
        })),
      })
    },

    setRowExpanded: (rowId, expanded) => {
      const { expandedRowIds, displayedRowNodes } = get()
      const newIds = new Set(expandedRowIds)
      if (expanded) { newIds.add(rowId) } else { newIds.delete(rowId) }
      set({
        expandedRowIds: newIds,
        displayedRowNodes: displayedRowNodes.map((n) => ({
          ...n,
          isExpanded: newIds.has(n.id),
        })),
      })
    },

    // ── Scroll Sync ───────────────────────────────────────────────────────────
    setScrollLeft: (v) => set({ scrollLeft: v }),
  }))
}

export type GridStore<T = RowData> = ReturnType<typeof createGridStore<T>>
