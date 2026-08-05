import React, {
  useRef, useEffect, useCallback, useMemo, useState
} from 'react'
import type {
  GridOptions, RowData, ColDef, CellPosition, GridApi,
  RowNode, FilterModel, RowTransaction, CsvExportParams,
  FlatItem, GroupNode, FilterGroupModel, EditAction,
  XlsxExportParams, IServerSideDatasource, IInfiniteDatasource,
  FloatingFilterOperator, ContextMenuActionParams, CopiedSelectionData,
} from '../types'
import { createGridStore, getFieldValue, type InternalColDef } from '../store/createGridStore'

import { useVirtualizer } from '../hooks/useVirtualizer'
import { useRangeSelection } from '../hooks/useRangeSelection'
import { useDragFill } from '../hooks/useDragFill'
import { GridHeader } from './GridHeader'
import RowRenderer from './RowRenderer'
import PinnedRows from './PinnedRows'
import GroupRow from './GroupRow'
import { RowGroupPanel } from './RowGroupPanel'
import { FilterBuilder } from './FilterBuilder'
import { ColumnPicker } from './ColumnPicker'
import { Sparkline } from './Sparkline'

import {
  exportDataAsCsv,
  copyRangeToClipboard,
  copySelectedRowsToClipboard,
  extractSelectionData,
  exportSelectionAsCsv,
  exportSelectionAsJson,
} from '../features/exportAndClipboard'
import { ContextMenu, DEFAULT_CONTEXT_MENU_ITEMS } from './ContextMenu'
import { PaginationPanel } from './PaginationPanel'
import { JsonModal } from './JsonModal'
import {
  buildGroupTree,
  flattenGroupTree,
  wrapRowNodesAsFlatItems,
  computeGrandTotals,
} from '../features/groupEngine'
import { buildTreeFromData } from '../features/treeEngine'
import { UndoStack } from '../features/undoStack'

import '../styles/tokens.css'
import '../styles/vgrid.css'

// ─── Global Search Bar ───────────────────────────────────────────────────────

const GlobalSearch = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="vgrid-toolbar">
    <div className="vgrid-search-wrap">
      <span className="vgrid-search-icon">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <path fillRule="evenodd" clipRule="evenodd" d="M6 1a5 5 0 100 10A5 5 0 006 1zM0 6a6 6 0 1110.89 3.477l2.817 2.816a.75.75 0 01-1.06 1.061l-2.817-2.817A6 6 0 010 6z" />
        </svg>
      </span>
      <input
        type="search"
        className="vgrid-search-input"
        placeholder="Search all columns…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Global search"
        id="vgrid-global-search"
      />
    </div>
  </div>
)

// ─── No Rows Overlay ─────────────────────────────────────────────────────────

const NoRowsOverlay = ({ loading, template }: { loading?: boolean; template?: string }) => (
  <div className={`vgrid-overlay${loading ? ' vgrid-overlay--loading' : ''}`} aria-live="polite">
    {loading ? (
      <div className="vgrid-loading-spinner" role="status" aria-label="Loading" />
    ) : (
      <>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor" style={{ opacity: 0.2 }}>
          <rect x="4" y="8" width="32" height="3" rx="1.5" />
          <rect x="4" y="16" width="22" height="3" rx="1.5" />
          <rect x="4" y="24" width="28" height="3" rx="1.5" />
          <rect x="4" y="32" width="18" height="3" rx="1.5" />
        </svg>
        <span>{template ?? 'No rows to display'}</span>
      </>
    )}
  </div>
)

// ─── Undo/Redo Toast ─────────────────────────────────────────────────────────

const UndoToast = ({ message }: { message: string }) => (
  <div className="vgrid-undo-toast">
    <span>{message}</span>
  </div>
)

// ─── Main VGrid Component ────────────────────────────────────────────────────

function VGridInner<T extends RowData>(props: GridOptions<T>): React.ReactElement {
  const {
    rowData,
    columnDefs,
    defaultColDef,
    getRowId,
    pinnedTopRowData,
    pinnedBottomRowData,
    rowHeight = 40,
    getRowHeight,
    headerHeight = 48,
    floatingFilterHeight = 36,
    theme = 'light',
    rowSelection = 'multiple',
    enableRangeSelection = false,
    suppressRowClickSelection = false,
    checkboxSelection = false,
    rowClickJsonModal = false,
    columnPicker = true,
    editable = false,


    singleClickEdit = false,
    enableClipboard = true,
    copySelectedRowsToClipboard: copySelectedRows = false,
    floatingFilter = false,
    enableGlobalSearch = false,
    quickFilterText = '',

    // Phase 2
    showRowGroupPanel = false,
    groupAggFunction,
    groupRowHeight,
    showGroupTotals = false,
    treeData = false,
    getDataPath,
    autoExpandAll = false,
    rowModelType = 'clientSide',
    serverSideDatasource,
    cacheBlockSize = 100,
    datasource,
    infiniteInitialRowCount = 100,
    enableUndoRedo = false,
    undoRedoCellEditingLimit = 50,
    enableFilterPanel = false,
    enableFillHandle = false,
    fillHandleDirection = 'y',

    // Master-Detail
    masterDetail = false,
    detailCellRenderer,
    detailRowHeight = 200,
    isRowMaster,
    fullWidthCellRenderer,
    isFullWidthRow,

    rowBuffer = 5,
    suppressRowVirtualisation = false,
    overlayNoRowsTemplate,
    loading = false,
    className = '',
    style,

    // Phase 3 — Context Menu
    enableContextMenu = false,
    contextMenuItems,
    onCopySelection,
    onContextMenuAction,

    // Phase 3 — Pagination
    pagination = false,
    paginationPageSize: initialPageSize = 25,
    paginationPageSizeOptions = [10, 25, 50, 100],
    onPaginationChanged,

    // Events
    onGridReady,
    onRowClicked,
    onRowDoubleClicked,
    onCellClicked,
    onCellDoubleClicked,
    onCellValueChanged,
    onSelectionChanged,
    onSortChanged,
    onFilterChanged,
    onColumnResized,
    onColumnMoved,
    onColumnVisibilityChanged,
    onRowGroupOpened,

    onRowGroupChanged,
    onUndoStarted,
    onRedoStarted,
  } = props

  // ── Per-instance store ────────────────────────────────────────────────────
  const storeRef = useRef(createGridStore<T>())
  const useStore = storeRef.current

  const columns = useStore((s) => s.columns)
  const columnDefsState = useStore((s) => s.columnDefs)
  const hasGroupedHeaders = useStore((s) => s.hasGroupedHeaders)
  const sortModel = useStore((s) => s.sortModel)
  const filterModel = useStore((s) => s.filterModel)
  const quickFilter = useStore((s) => s.quickFilterText)
  const displayedRows = useStore((s) => s.displayedRowNodes)
  const selectedRowIds = useStore((s) => s.selectedRowIds)
  const activeCell = useStore((s) => s.activeCell)
  const cellRange = useStore((s) => s.cellRange)
  const editingCell = useStore((s) => s.editingCell)
  const scrollLeft = useStore((s) => s.scrollLeft)

  // ── Phase 2 local state ───────────────────────────────────────────────────
  const [groupByColIds, setGroupByColIds] = useState<string[]>(() =>
    (columnDefs ?? []).flatMap((c) => {
      if ('children' in c) return (c.children as ColDef<T>[]).filter((cc) => cc.rowGroup).sort((a, b) => (a.rowGroupIndex ?? 99) - (b.rowGroupIndex ?? 99)).map((cc) => cc.field ?? '')
      if (c.rowGroup) return [c.field ?? '']
      return []
    }).filter(Boolean)
  )
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(() => new Set())
  const [treeExpandedIds, setTreeExpandedIds] = useState<Set<string>>(() => new Set())
  const [ssrmLoading, setSsrmLoading] = useState(false)
  const [ssrmTotalRows, setSsrmTotalRows] = useState<number | null>(null)
  const [infiniteRows, setInfiniteRows] = useState<T[]>([])
  const [infiniteLastRow, setInfiniteLastRow] = useState<number | null>(null)
  const [infiniteFetching, setInfiniteFetching] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(enableFilterPanel)
  const [filterGroupModel, setFilterGroupModel] = useState<FilterGroupModel | null>(null)
  const [undoToast, setUndoToast] = useState<string | null>(null)

  // Resolve columnPicker config (boolean or object)
  const columnPickerEnabled = typeof columnPicker === 'boolean' ? columnPicker : (columnPicker.enabled ?? true)
  const columnPickerPos = typeof columnPicker === 'object' && columnPicker.position ? columnPicker.position : 'header'


  // ── Phase 3 local state ───────────────────────────────────────────────────
  const [filterOperators, setFilterOperators] = useState<Record<string, FloatingFilterOperator>>({})
  const [contextMenuState, setContextMenuState] = useState<{
    x: number; y: number
    params: ContextMenuActionParams<T>
    selectionData: CopiedSelectionData | null
  } | null>(null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSizeState] = useState(initialPageSize)
  const [rowJsonModalData, setRowJsonModalData] = useState<{ title: string; value: unknown } | null>(null)

  // ── Undo stack ────────────────────────────────────────────────────────────
  const undoStackRef = useRef(new UndoStack(undoRedoCellEditingLimit))

  // ── Sync props → store ────────────────────────────────────────────────────
  useEffect(() => {
    useStore.getState().setColumnDefs(columnDefs, defaultColDef, getRowId)
  }, [columnDefs, defaultColDef, getRowId])

  useEffect(() => {
    if (rowModelType === 'clientSide') {
      useStore.getState().setRowData(rowData)
    }
  }, [rowData, rowModelType])

  useEffect(() => {
    if (pinnedTopRowData) useStore.getState().setPinnedTopRowData(pinnedTopRowData)
  }, [pinnedTopRowData])

  useEffect(() => {
    if (pinnedBottomRowData) useStore.getState().setPinnedBottomRowData(pinnedBottomRowData)
  }, [pinnedBottomRowData])

  useEffect(() => {
    if (quickFilterText) useStore.getState().setQuickFilter(quickFilterText)
  }, [quickFilterText])

  // ── SSRM: Fetch on mount + sort/filter change ─────────────────────────────
  const ssrmFetchRef = useRef(false)
  const fetchSsrmRows = useCallback(() => {
    if (!serverSideDatasource || rowModelType !== 'serverSide') return
    setSsrmLoading(true)
    serverSideDatasource.getRows({
      request: {
        startRow: 0,
        endRow: cacheBlockSize,
        sortModel: useStore.getState().sortModel,
        filterModel: useStore.getState().filterModel,
      },
      success: ({ rowData: fetchedRows, rowCount }) => {
        useStore.getState().setRowData(fetchedRows as T[])
        if (rowCount != null) setSsrmTotalRows(rowCount)
        setSsrmLoading(false)
      },
      fail: () => setSsrmLoading(false),
    })
  }, [serverSideDatasource, rowModelType, cacheBlockSize])

  useEffect(() => {
    if (rowModelType === 'serverSide' && serverSideDatasource) {
      fetchSsrmRows()
    }
  }, [rowModelType, sortModel, filterModel, fetchSsrmRows])

  // ── Infinite Scroll: Initial fetch ────────────────────────────────────────
  const infiniteBlockRef = useRef(0)
  const fetchInfiniteBlock = useCallback((startRow: number) => {
    if (!datasource || rowModelType !== 'infinite' || infiniteFetching) return
    setInfiniteFetching(true)
    datasource.getRows({
      startRow,
      endRow: startRow + cacheBlockSize,
      sortModel: useStore.getState().sortModel,
      filterModel: useStore.getState().filterModel,
      successCallback: (rows, lastRow) => {
        setInfiniteRows((prev) => {
          const combined = [...prev]
          rows.forEach((r, i) => { combined[startRow + i] = r })
          return combined
        })
        if (lastRow != null) setInfiniteLastRow(lastRow)
        setInfiniteFetching(false)
        infiniteBlockRef.current = startRow + rows.length
      },
      failCallback: () => setInfiniteFetching(false),
    })
  }, [datasource, rowModelType, cacheBlockSize, infiniteFetching])

  useEffect(() => {
    if (rowModelType === 'infinite' && datasource) {
      fetchInfiniteBlock(0)
    }
  }, [rowModelType, datasource])

  // Sync infinite rows → store
  useEffect(() => {
    if (rowModelType === 'infinite') {
      useStore.getState().setRowData(infiniteRows)
    }
  }, [infiniteRows, rowModelType])

  // ── Derived column data ───────────────────────────────────────────────────
  const pinnedLeftCols = useMemo(() => columns.filter((c) => c.pinned === 'left' && !c.hide), [columns])
  const pinnedRightCols = useMemo(() => columns.filter((c) => c.pinned === 'right' && !c.hide), [columns])
  const normalCols = useMemo(() => columns.filter((c) => !c.pinned && !c.hide), [columns])
  const normalWidth = useMemo(() => normalCols.reduce((s, c) => s + c._width, 0), [normalCols])

  const colIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    columns.filter((c) => !c.hide).forEach((c, i) => map.set(c._colId, i))
    return map
  }, [columns])

  const getColIndexById = useCallback((colId: string) => colIndexMap.get(colId) ?? 0, [colIndexMap])

  // ── Merge aggFunc from groupAggFunction prop into columns ─────────────────
  const columnsWithAgg = useMemo(() => {
    if (!groupAggFunction) return columns
    return columns.map((col) => {
      const overrideFn = groupAggFunction[col._colId] ?? groupAggFunction[col.field ?? '']
      return overrideFn ? { ...col, aggFunc: overrideFn } : col
    })
  }, [columns, groupAggFunction])

  // ── FlatItems computation (grouping / tree / plain) ───────────────────────
  const flatItems = useMemo<FlatItem<T>[]>(() => {
    if (treeData && getDataPath) {
      return buildTreeFromData(displayedRows, getDataPath, treeExpandedIds, autoExpandAll)
    }
    if (groupByColIds.length > 0) {
      const tree = buildGroupTree(displayedRows, groupByColIds, columnsWithAgg, expandedGroupIds)
      return flattenGroupTree(tree)
    }
    return wrapRowNodesAsFlatItems(displayedRows)
  }, [displayedRows, treeData, getDataPath, treeExpandedIds, autoExpandAll, groupByColIds, columnsWithAgg, expandedGroupIds])

  // ── Grand total row (shown when showGroupTotals = true) ───────────────────
  const grandTotals = useMemo(() => {
    if (!showGroupTotals || groupByColIds.length === 0) return null
    return computeGrandTotals(displayedRows, columnsWithAgg)
  }, [showGroupTotals, groupByColIds, displayedRows, columnsWithAgg])

  // ── Row sizing ────────────────────────────────────────────────────────────
  const getItemSize = useCallback((index: number): number => {
    const item = flatItems[index]
    if (!item) return rowHeight
    if (item.kind === 'group') return groupRowHeight ?? rowHeight
    const node = item.node
    const baseH = getRowHeight ? getRowHeight(node.data, index) : rowHeight
    const detailH = masterDetail && node.isExpanded
      ? (typeof detailRowHeight === 'function' ? detailRowHeight(node.data) : detailRowHeight)
      : 0
    return baseH + detailH
  }, [flatItems, rowHeight, groupRowHeight, getRowHeight, masterDetail, detailRowHeight])

  // ── Scroll container ref ──────────────────────────────────────────────────
  const bodyRef = useRef<HTMLDivElement>(null)

  // ── Virtualizer ───────────────────────────────────────────────────────────
  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getItemSize,
    containerRef: bodyRef,
    overscan: rowBuffer,
  })

  const virtualItems = suppressRowVirtualisation
    ? flatItems.map((_, i) => ({
        index: i,
        start: flatItems.slice(0, i).reduce((s, _, j) => s + getItemSize(j), 0),
        size: getItemSize(i),
        end: 0,
      }))
    : virtualizer.virtualItems

  // ── Infinite scroll trigger ───────────────────────────────────────────────
  const scrollSyncRAF = useRef<number | null>(null)
  const handleBodyScroll = useCallback(() => {
    if (scrollSyncRAF.current !== null) return
    scrollSyncRAF.current = requestAnimationFrame(() => {
      scrollSyncRAF.current = null
      const el = bodyRef.current
      if (!el) return
      useStore.getState().setScrollLeft(el.scrollLeft)

      // Infinite scroll: trigger next block when near bottom
      if (rowModelType === 'infinite' && datasource) {
        const threshold = 200
        const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
        if (distFromBottom < threshold && !infiniteFetching && (infiniteLastRow == null || infiniteBlockRef.current < infiniteLastRow)) {
          fetchInfiniteBlock(infiniteBlockRef.current)
        }
      }
    })
  }, [rowModelType, datasource, infiniteFetching, infiniteLastRow, fetchInfiniteBlock])

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.addEventListener('scroll', handleBodyScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', handleBodyScroll)
      if (scrollSyncRAF.current) cancelAnimationFrame(scrollSyncRAF.current)
    }
  }, [handleBodyScroll])

  // ── Filter values (floating filter) ──────────────────────────────────────
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  const uniqueValues = useMemo(() => {
    const map: Record<string, string[]> = {}
    columns.forEach((col) => {
      const isSelect = col.filter === 'select' || col.filterParams?.type === 'select'
      const isExcel  = col.filter === 'excel'  || col.filterParams?.type === 'excel'
      if (isSelect || isExcel) {
        if (col.filterParams?.values) {
          map[col._colId] = col.filterParams.values
          return
        }
        const vals = new Set<string>()
        displayedRows.forEach((node) => {
          let val: unknown
          if (col.valueGetter) val = col.valueGetter({ data: node.data, colDef: col, rowIndex: node.rowIndex })
          else if (col.field) val = getFieldValue(node.data as RowData, col.field)
          if (val != null && val !== '') vals.add(String(val))
        })
        map[col._colId] = Array.from(vals).sort()
      }
    })
    return map
  }, [columns, displayedRows])

  const handleColumnMove = useCallback((fromColId: string, toColId: string) => {
    useStore.getState().moveColumn(fromColId, toColId)
    const newOrder = useStore.getState().columns.filter((c) => !c.hide).map((c) => c._colId)
    onColumnMoved?.({ colId: fromColId, toColId, columnOrder: newOrder })
  }, [onColumnMoved])

  const handleColumnToggle = useCallback((colId: string, visible: boolean) => {
    const currentCols = useStore.getState().columns
    const targetIdx = currentCols.findIndex((c) => c._colId === colId)
    if (targetIdx === -1) return

    let updatedCols = [...currentCols]
    const targetCol = { ...updatedCols[targetIdx], hide: !visible }

    if (visible) {
      // Move toggled-on column to the end of array so it appears as last column
      updatedCols.splice(targetIdx, 1)
      updatedCols.push(targetCol)
    } else {
      updatedCols[targetIdx] = targetCol
    }

    // Recompute column offsets (_left, _pinnedLeft, etc)
    let leftPinnedOffset = 0
    let normalLeftOffset = 0
    let rightOffset = 0

    const pinnedLeft = updatedCols.filter((c) => !c.hide && c.pinned === 'left')
    const normal = updatedCols.filter((c) => !c.hide && !c.pinned)
    const pinnedRight = updatedCols.filter((c) => !c.hide && c.pinned === 'right')

    pinnedLeft.forEach((c) => {
      c._pinnedLeft = leftPinnedOffset
      leftPinnedOffset += c._width
    })
    normal.forEach((c) => {
      c._left = normalLeftOffset
      normalLeftOffset += c._width
    })
    for (let i = pinnedRight.length - 1; i >= 0; i--) {
      pinnedRight[i]._pinnedRight = rightOffset
      rightOffset += pinnedRight[i]._width
    }

    useStore.setState({ columns: updatedCols })

    if (onColumnVisibilityChanged) {
      const visibleCols = updatedCols.filter((c) => !c.hide)
      onColumnVisibilityChanged({
        colId,
        visible,
        visibleColumns: visibleCols as ColDef<T>[],
        visibleColumnIds: visibleCols.map((c) => c._colId),
      })
    }
  }, [onColumnVisibilityChanged])



  const handleFilterChange = useCallback((colId: string, value: string) => {
    setFilterValues((prev) => {
      const next = { ...prev, [colId]: value }
      const newModel: FilterModel = {}
      for (const [cid, val] of Object.entries(next)) {
        if (val.trim() && val !== '') {
          const col = columns.find((c) => c._colId === cid)
          const isSelect = col?.filter === 'select' || col?.filterParams?.type === 'select'
          const isExcel  = col?.filter === 'excel'  || col?.filterParams?.type === 'excel'
          const op: FilterModel[string]['operator'] = isExcel ? 'in'
            : isSelect ? 'equals'
            : (filterOperators[cid] ?? 'contains') as FilterModel[string]['operator']
          newModel[cid] = { colId: cid, operator: op, value: val }
        }
      }
      useStore.getState().setFilterModel(newModel)
      return next
    })
    onFilterChanged?.({ filterModel: useStore.getState().filterModel })
  }, [columns, filterOperators, onFilterChanged])

  const handleFilterOperatorChange = useCallback((colId: string, op: FloatingFilterOperator) => {
    setFilterOperators((prev) => {
      const next = { ...prev, [colId]: op }
      // Re-apply existing text value with the new operator immediately
      setFilterValues((fv) => {
        const currentVal = fv[colId] ?? ''
        if (currentVal.trim()) {
          const newModel = { ...useStore.getState().filterModel }
          newModel[colId] = { colId, operator: op as FilterModel[string]['operator'], value: currentVal }
          useStore.getState().setFilterModel(newModel)
          onFilterChanged?.({ filterModel: newModel })
        }
        return fv
      })
      return next
    })
  }, [onFilterChanged])


  // ── Advanced filter builder apply ─────────────────────────────────────────
  const handleFilterBuilderApply = useCallback((model: FilterGroupModel) => {
    setFilterGroupModel(model)
    // Convert FilterGroupModel to FilterModel for the store
    const newModel: FilterModel = {}
    model.conditions.forEach((cond) => {
      if (cond.colId && cond.value !== '' || cond.operator === 'blank' || cond.operator === 'notBlank') {
        newModel[cond.colId] = cond
      }
    })
    useStore.getState().setFilterModel(newModel)
    onFilterChanged?.({ filterModel: newModel })
  }, [onFilterChanged])

  // ── Sort ──────────────────────────────────────────────────────────────────
  const handleSort = useCallback((colId: string, multiSort: boolean) => {
    useStore.getState().toggleSort(colId, multiSort)
    if (rowModelType === 'serverSide') fetchSsrmRows()
    onSortChanged?.({ sortModel: useStore.getState().sortModel })
  }, [rowModelType, fetchSsrmRows, onSortChanged])

  // ── Column Resize ─────────────────────────────────────────────────────────
  const handleColumnResize = useCallback((colId: string, newWidth: number) => {
    useStore.getState().resizeColumn(colId, newWidth)
    onColumnResized?.({ colId, newWidth })
  }, [onColumnResized])


  // ── Group toggle ──────────────────────────────────────────────────────────
  const handleToggleGroup = useCallback((groupId: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev)
      const wasExpanded = next.has(groupId)
      if (wasExpanded) next.delete(groupId)
      else next.add(groupId)
      // Find group info for event
      const group = findGroupById(flatItems, groupId)
      onRowGroupOpened?.({ groupId, key: group?.key ?? groupId, expanded: !wasExpanded })
      return next
    })
  }, [flatItems, onRowGroupOpened])

  const handleToggleTreeNode = useCallback((nodeId: string) => {
    setTreeExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }, [])

  // ── Row group panel ───────────────────────────────────────────────────────
  const handleGroupByChange = useCallback((colIds: string[]) => {
    setGroupByColIds(colIds)
    // Reset expanded state when grouping changes
    setExpandedGroupIds(new Set())
    onRowGroupChanged?.({ groupByColumns: colIds })
  }, [onRowGroupChanged])

  // ── Selection ─────────────────────────────────────────────────────────────
  const allSelected = useMemo(
    () => displayedRows.length > 0 && displayedRows.every((n) => n.isSelected),
    [displayedRows, selectedRowIds]
  )
  const someSelected = useMemo(
    () => displayedRows.some((n) => n.isSelected),
    [displayedRows, selectedRowIds]
  )

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) useStore.getState().selectAll()
    else useStore.getState().deselectAll()
    const state = useStore.getState()
    onSelectionChanged?.({
      selectedRows: state.displayedRowNodes.filter((n) => n.isSelected).map((n) => n.data),
      selectedNodes: state.displayedRowNodes.filter((n) => n.isSelected),
    })
  }, [onSelectionChanged])

  const handleRowClick = useCallback((node: RowNode<T>, e: React.MouseEvent) => {
    if (!suppressRowClickSelection) {
      useStore.getState().selectRow(
        node.rowIndex,
        e.ctrlKey || e.metaKey || rowSelection === 'multiple',
        e.shiftKey
      )
      const state = useStore.getState()
      onSelectionChanged?.({
        selectedRows: state.displayedRowNodes.filter((n) => n.isSelected).map((n) => n.data),
        selectedNodes: state.displayedRowNodes.filter((n) => n.isSelected),
      })
    }
    onRowClicked?.({ data: node.data, rowIndex: node.rowIndex, event: e.nativeEvent })
  }, [suppressRowClickSelection, rowSelection, onRowClicked, onSelectionChanged])

  const handleCheckboxChange = useCallback((node: RowNode<T>, checked: boolean) => {
    useStore.getState().selectRow(node.rowIndex, true, false)
    if (!checked) {
      const ids = new Set(useStore.getState().selectedRowIds)
      ids.delete(node.id)
      useStore.setState({ selectedRowIds: ids })
    }
    const state = useStore.getState()
    onSelectionChanged?.({
      selectedRows: state.displayedRowNodes.filter((n) => n.isSelected).map((n) => n.data),
      selectedNodes: state.displayedRowNodes.filter((n) => n.isSelected),
    })
  }, [onSelectionChanged])

  // ── Cell events ───────────────────────────────────────────────────────────
  const handleCellClick = useCallback((pos: CellPosition, e: React.MouseEvent) => {
    useStore.getState().setActiveCell(pos)
    const col = columns.find((c) => c._colId === pos.colId)
    if (!col) return
    const node = displayedRows[pos.rowIndex]
    if (!node) return
    let value: unknown
    if (col.valueGetter) value = col.valueGetter({ data: node.data, colDef: col, rowIndex: node.rowIndex })
    else if (col.field) value = getFieldValue(node.data as RowData, col.field)
    onCellClicked?.({ data: node.data, colDef: col, value, rowIndex: pos.rowIndex, event: e.nativeEvent })

    const isEditable = typeof col.editable === 'function'
      ? col.editable({ value, data: node.data, rowIndex: node.rowIndex })
      : (col.editable ?? editable)
    if ((singleClickEdit || col.singleClickEdit) && isEditable) {
      useStore.getState().startEditing(pos)
    }
  }, [columns, displayedRows, editable, singleClickEdit, onCellClicked])

  const handleCellDoubleClick = useCallback((pos: CellPosition, e: React.MouseEvent) => {
    const col = columns.find((c) => c._colId === pos.colId)
    if (!col) return
    const node = displayedRows[pos.rowIndex]
    if (!node) return
    let value: unknown
    if (col.valueGetter) value = col.valueGetter({ data: node.data, colDef: col, rowIndex: node.rowIndex })
    else if (col.field) value = getFieldValue(node.data as RowData, col.field)
    onCellDoubleClicked?.({ data: node.data, colDef: col, value, rowIndex: pos.rowIndex, event: e.nativeEvent })

    const isIndexCol = col.field === 'id' || col._colId === 'id' || col.colId === 'id' || pos.colId === columns[0]?._colId

    // If rowClickJsonModal is enabled and double clicked on index/id column or first column
    if (rowClickJsonModal && isIndexCol) {
      setRowJsonModalData({
        title: `Row Data #${node.rowIndex + 1} (${getRowId ? getRowId(node.data) : node.id})`,
        value: node.data,
      })
      return
    }

    const isEditable = typeof col.editable === 'function'
      ? col.editable({ value, data: node.data, rowIndex: node.rowIndex })
      : (col.editable ?? editable)
    if (!singleClickEdit && !col.singleClickEdit && isEditable && !isIndexCol) {
      useStore.getState().startEditing(pos)
    }

  }, [columns, displayedRows, editable, singleClickEdit, rowClickJsonModal, getRowId, onCellDoubleClicked])


  const handleCommitEdit = useCallback((colId: string, rowIndex: number, newValue: unknown) => {
    const col = columns.find((c) => c._colId === colId)
    const node = displayedRows[rowIndex]
    if (!col || !node) { useStore.getState().stopEditing(); return }

    // Validation
    if (col.validate) {
      const error = col.validate(newValue, node.data)
      if (error) {
        // Show validation error — keep editing open
        console.warn(`[VGrid] Validation: ${error}`)
        return
      }
    }

    let oldValue: unknown
    if (col.valueGetter) oldValue = col.valueGetter({ data: node.data, colDef: col, rowIndex })
    else if (col.field) oldValue = getFieldValue(node.data as RowData, col.field)

    // Push to undo stack
    if (enableUndoRedo) {
      undoStackRef.current.push({
        rowId: node.id,
        rowIndex,
        colId,
        oldValue,
        newValue,
        timestamp: Date.now(),
      })
    }

    useStore.getState().setCellValue(rowIndex, colId, newValue, getRowId)
    useStore.getState().stopEditing()
    onCellValueChanged?.({ data: node.data, colDef: col, oldValue, newValue, rowIndex })
  }, [columns, displayedRows, getRowId, editable, enableUndoRedo, onCellValueChanged])

  const handleCancelEdit = useCallback(() => {
    useStore.getState().stopEditing()
  }, [])

  // ── Range Selection ───────────────────────────────────────────────────────
  const { onCellMouseDown: rangeMouseDown, onCellMouseEnter, onMouseUp: rangeMouseUp } = useRangeSelection({
    onRangeChange: (range) => useStore.getState().setCellRange(range),
    onRangeSelecting: (v) => useStore.getState().setRangeSelecting(v),
    getColIndexById,
  })

  const handleCellMouseDown = useCallback((pos: CellPosition, e: React.MouseEvent) => {
    if (enableRangeSelection) rangeMouseDown(pos, e)
  }, [enableRangeSelection, rangeMouseDown])

  // ── Drag Fill ─────────────────────────────────────────────────────────────
  const { fillHandleProps } = useDragFill({
    cellRange,
    displayedRows,
    columns,
    direction: fillHandleDirection,
    onFill: (updates) => {
      updates.forEach(({ rowIndex, colId, value }) => {
        const col = columns.find((c) => c._colId === colId)
        const node = displayedRows[rowIndex]
        if (!col || !node) return
        let oldValue: unknown
        if (col.field) oldValue = getFieldValue(node.data as RowData, col.field)
        useStore.getState().setCellValue(rowIndex, colId, value, getRowId)
        onCellValueChanged?.({ data: node.data, colDef: col, oldValue, newValue: value, rowIndex })
      })
    },
  })

  // ── Keyboard: clipboard + navigation + undo/redo ─────────────────────────
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const onKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey

      // Clipboard
      if (ctrl && e.key === 'c' && enableClipboard) {
        e.preventDefault()
        const { cellRange: range, displayedRowNodes: rows, columns: cols } = useStore.getState()
        if (range) copyRangeToClipboard(range, rows, cols)
        else if (copySelectedRows) copySelectedRowsToClipboard(rows, cols)
        return
      }

      // Undo
      if (ctrl && e.key === 'z' && enableUndoRedo) {
        e.preventDefault()
        const action = undoStackRef.current.undo()
        if (action) {
          useStore.getState().setCellValue(action.rowIndex, action.colId, action.oldValue, getRowId)
          showUndoToast('↩ Undone')
          onUndoStarted?.()
        }
        return
      }

      // Redo
      if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z')) && enableUndoRedo) {
        e.preventDefault()
        const action = undoStackRef.current.redo()
        if (action) {
          useStore.getState().setCellValue(action.rowIndex, action.colId, action.newValue, getRowId)
          showUndoToast('↪ Redone')
          onRedoStarted?.()
        }
        return
      }

      // Arrow key navigation
      const { activeCell: ac, editingCell: ec } = useStore.getState()
      if (ec) return
      if (!ac) return

      const visibleCols = columns.filter((c) => !c.hide)
      const curColIdx = visibleCols.findIndex((c) => c._colId === ac.colId)

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const next = Math.min(ac.rowIndex + 1, displayedRows.length - 1)
        useStore.getState().setActiveCell({ rowIndex: next, colId: ac.colId })
        virtualizer.scrollToIndex(next)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = Math.max(ac.rowIndex - 1, 0)
        useStore.getState().setActiveCell({ rowIndex: prev, colId: ac.colId })
        virtualizer.scrollToIndex(prev)
      } else if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault()
        const nextCol = visibleCols[Math.min(curColIdx + 1, visibleCols.length - 1)]
        if (nextCol) useStore.getState().setActiveCell({ rowIndex: ac.rowIndex, colId: nextCol._colId })
      } else if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault()
        const prevCol = visibleCols[Math.max(curColIdx - 1, 0)]
        if (prevCol) useStore.getState().setActiveCell({ rowIndex: ac.rowIndex, colId: prevCol._colId })
      } else if (e.key === 'Enter' || e.key === 'F2') {
        const col = visibleCols[curColIdx]
        const node = displayedRows[ac.rowIndex]
        if (col && node) {
          let value: unknown
          if (col.field) value = getFieldValue(node.data as RowData, col.field)
          const isEditable = typeof col.editable === 'function'
            ? col.editable({ value, data: node.data, rowIndex: ac.rowIndex })
            : (col.editable ?? editable)
          if (isEditable) useStore.getState().startEditing(ac)
        }
      } else if (e.key === 'Escape') {
        useStore.getState().stopEditing()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Clear cell value
        const { activeCell: acc } = useStore.getState()
        if (!acc) return
        const col = visibleCols.find((c) => c._colId === acc.colId)
        const node = displayedRows[acc.rowIndex]
        const isEditable = typeof col?.editable === 'function'
          ? col.editable({ value: undefined, data: node?.data, rowIndex: acc.rowIndex })
          : (col?.editable ?? editable)
        if (col && node && isEditable) {
          let oldValue: unknown
          if (col.field) oldValue = getFieldValue(node.data as RowData, col.field)
          if (enableUndoRedo) {
            undoStackRef.current.push({ rowId: node.id, rowIndex: acc.rowIndex, colId: acc.colId, oldValue, newValue: '', timestamp: Date.now() })
          }
          useStore.getState().setCellValue(acc.rowIndex, acc.colId, '', getRowId)
        }
      }
    }

    el.addEventListener('keydown', onKeyDown)
    return () => el.removeEventListener('keydown', onKeyDown)
  }, [columns, displayedRows, enableClipboard, copySelectedRows, editable, enableUndoRedo, getRowId, virtualizer, onUndoStarted, onRedoStarted])

  // ── Undo toast helper ─────────────────────────────────────────────────────
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showUndoToast = useCallback((msg: string) => {
    setUndoToast(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setUndoToast(null), 2000)
  }, [])

  // ── Grid API ──────────────────────────────────────────────────────────────
  const api = useMemo<GridApi<T>>(() => ({
    getDisplayedRowNodes: () => useStore.getState().displayedRowNodes,
    getSelectedRows: () => useStore.getState().displayedRowNodes.filter((n) => n.isSelected).map((n) => n.data),
    getSelectedNodes: () => useStore.getState().displayedRowNodes.filter((n) => n.isSelected),
    selectAll: () => useStore.getState().selectAll(),
    deselectAll: () => useStore.getState().deselectAll(),
    selectRow: (rowIndex, add = false) => useStore.getState().selectRow(rowIndex, add, false),
    deselectRow: (rowIndex) => {
      const node = useStore.getState().displayedRowNodes[rowIndex]
      if (!node) return
      const ids = new Set(useStore.getState().selectedRowIds)
      ids.delete(node.id)
      useStore.setState({ selectedRowIds: ids })
    },
    setRowData: (rows) => useStore.getState().setRowData(rows as T[]),
    applyTransaction: (tx) => useStore.getState().applyTransaction(tx as RowTransaction<T>),
    setColumnDefs: (defs) => useStore.getState().setColumnDefs(defs as ColDef<T>[], defaultColDef, getRowId),
    exportDataAsCsv: (params) => exportDataAsCsv(
      useStore.getState().displayedRowNodes,
      useStore.getState().columns,
      params,
      api
    ),
    exportDataAsXlsx: () => {
      console.warn('[V_Grid] exportDataAsXlsx has been decoupled for lighter bundle size. Please import { exportDataAsXlsx } from "v-grid/excel"')
    },
    setFilterModel: (model) => {
      useStore.getState().setFilterModel(model)
      onFilterChanged?.({ filterModel: model })
    },
    getFilterModel: () => useStore.getState().filterModel,
    setSortModel: (model) => {
      useStore.getState().setSortModel(model)
      onSortChanged?.({ sortModel: model })
    },
    getSortModel: () => useStore.getState().sortModel,
    refreshCells: () => {
      const rows = [...useStore.getState().displayedRowNodes]
      useStore.setState({ displayedRowNodes: rows })
    },
    getCellValue: (rowIndex, colId) => {
      const node = useStore.getState().displayedRowNodes[rowIndex]
      const col = useStore.getState().columns.find((c) => c._colId === colId)
      if (!node || !col) return undefined
      if (col.valueGetter) return col.valueGetter({ data: node.data, colDef: col, rowIndex })
      if (col.field) return getFieldValue(node.data as RowData, col.field)
      return undefined
    },
    setCellValue: (rowIndex, colId, value) => useStore.getState().setCellValue(rowIndex, colId, value, getRowId),
    setRowExpanded: (rowIndex, expanded) => {
      const node = useStore.getState().displayedRowNodes[rowIndex]
      if (node) useStore.getState().setRowExpanded(node.id, expanded)
    },
    ensureRowVisible: (rowIndex) => virtualizer.scrollToIndex(rowIndex, 'start'),
    ensureColumnVisible: (_colId) => {
      const el = bodyRef.current
      const col = useStore.getState().columns.find((c) => c._colId === _colId)
      if (el && col && !col.pinned) el.scrollLeft = col._left
    },
    // Phase 2 API
    setGroupByColumns: (colIds: string[]) => { setGroupByColIds(colIds); setExpandedGroupIds(new Set()) },
    getGroupByColumns: () => groupByColIds,
    expandGroup: (groupId: string) => setExpandedGroupIds((prev) => new Set([...prev, groupId])),
    collapseGroup: (groupId: string) => setExpandedGroupIds((prev) => { const s = new Set(prev); s.delete(groupId); return s }),
    expandAll: () => {
      const ids = new Set<string>()
      flatItems.forEach((item) => { if (item.kind === 'group') ids.add(item.group.id) })
      setExpandedGroupIds(ids)
    },
    collapseAll: () => setExpandedGroupIds(new Set()),
    undo: () => {
      if (!enableUndoRedo) return
      const action = undoStackRef.current.undo()
      if (action) useStore.getState().setCellValue(action.rowIndex, action.colId, action.oldValue, getRowId)
    },
    redo: () => {
      if (!enableUndoRedo) return
      const action = undoStackRef.current.redo()
      if (action) useStore.getState().setCellValue(action.rowIndex, action.colId, action.newValue, getRowId)
    },
    refreshServerSideStore: () => fetchSsrmRows(),
    destroy: () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    },

    // ── Phase 3: Pagination ──────────────────────────────────────────────────
    goToPage: (p: number) => {
      const rows = useStore.getState().displayedRowNodes.length
      const total = Math.max(1, Math.ceil(rows / pageSize))
      const clamped = Math.max(0, Math.min(p, total - 1))
      setPage(clamped)
      onPaginationChanged?.({ currentPage: clamped, totalPages: total, pageSize, totalRows: rows })
    },
    setPageSize: (size: number) => {
      setPageSizeState(size)
      setPage(0)
      const rows = useStore.getState().displayedRowNodes.length
      const total = Math.max(1, Math.ceil(rows / size))
      onPaginationChanged?.({ currentPage: 0, totalPages: total, pageSize: size, totalRows: rows })
    },
    getCurrentPage: () => page,
    getTotalPages: () => Math.max(1, Math.ceil(useStore.getState().displayedRowNodes.length / pageSize)),

    // ── Phase 3: Column Visibility (stubs) ───────────────────────────────────
    setColumnVisible: (colId: string, visible: boolean) => {
      const cols = useStore.getState().columns.map((c) =>
        c._colId === colId ? { ...c, hide: !visible } : c
      )
      useStore.setState({ columns: cols })
    },
    getColumnState: () => useStore.getState().columns.map((c) => ({
      colId: c._colId,
      headerName: c.headerName ?? c.field ?? c._colId,
      visible: !c.hide,
      width: c._width,
      pinned: (c.pinned ?? null) as 'left' | 'right' | null,
    })),
    showColumnPanel: () => { /* not yet wired */ },
    hideColumnPanel: () => { /* not yet wired */ },

    // ── Phase 3: Chart / Pivot / Formula stubs ────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    showChart: (_config: any) => { /* not yet wired */ },
    hideChart: () => { /* not yet wired */ },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setPivot: (_config: any) => { /* not yet wired */ },
    clearPivot: () => { /* not yet wired */ },
    getCellFormula: (_rowIndex: number, _colId: string) => null,

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [defaultColDef, getRowId, onFilterChanged, onSortChanged, virtualizer, flatItems, groupByColIds, enableUndoRedo, fetchSsrmRows, page, pageSize, onPaginationChanged])


  // Fire onGridReady once
  const gridReadyFired = useRef(false)
  useEffect(() => {
    if (!gridReadyFired.current && columns.length > 0) {
      gridReadyFired.current = true
      onGridReady?.({ api })
    }
  }, [columns, api, onGridReady])

  // ── Master-detail toggle ──────────────────────────────────────────────────
  const handleToggleExpand = useCallback((node: RowNode<T>, e: React.MouseEvent) => {
    e.stopPropagation()
    useStore.getState().toggleRowExpanded(node.id)
  }, [])

  // ── Drag fill handle position ─────────────────────────────────────────────
  const fillHandlePosition = useMemo(() => {
    if (!enableFillHandle || !cellRange) return null
    const lastRowItem = flatItems[cellRange.endRow]
    if (!lastRowItem || lastRowItem.kind !== 'row') return null
    // Position is computed relative to body
    return {
      bottom: true,
      rowIndex: cellRange.endRow,
      colIndex: cellRange.endColIndex,
    }
  }, [enableFillHandle, cellRange, flatItems])

  const showCheckbox = checkboxSelection || columns.some((c) => c.checkboxSelection)
  const showMasterCol = masterDetail
  const pinnedTopRows = useStore((s) => s.pinnedTopRowData)
  const pinnedBottomRows = useStore((s) => s.pinnedBottomRowData)
  const totalBodyHeight = virtualizer.totalSize

  // ── Context menu handler ──────────────────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!enableContextMenu) return
    e.preventDefault()
    const cell = (e.target as HTMLElement).closest('[data-row-index][data-col-id]') as HTMLElement | null
    const rowIndex = cell ? Number(cell.dataset.rowIndex) : null
    const colId = cell?.dataset.colId ?? null
    const node = rowIndex != null ? displayedRows[rowIndex] ?? null : null
    const colIndex = colId ? columns.filter((c) => !c.hide).findIndex((c) => c._colId === colId) : null
    const { cellRange: cr, displayedRowNodes, columns: cols } = useStore.getState()
    const sel = cr ? extractSelectionData(cr, displayedRowNodes, cols) : null
    setContextMenuState({
      x: e.clientX, y: e.clientY, selectionData: sel,
      params: { rowIndex: rowIndex ?? null, colIndex: colIndex ?? null, data: node?.data ?? null, selection: sel, api },
    })
  }, [enableContextMenu, columns, displayedRows, api])

  // ── Pagination computed values ────────────────────────────────────────────
  const totalRows = displayedRows.length
  const totalPages = pagination ? Math.max(1, Math.ceil(totalRows / pageSize)) : 1
  const clampedPage = Math.min(page, Math.max(0, totalPages - 1))
  const paginatedFlatItems = useMemo(() => {
    if (!pagination || groupByColIds.length > 0 || treeData) return flatItems
    const start = clampedPage * pageSize
    return flatItems.slice(start, start + pageSize)
  }, [flatItems, pagination, clampedPage, pageSize, groupByColIds.length, treeData])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={rootRef}
      className={`vgrid-root ${className}`}
      data-theme={theme}
      style={style}
      role="grid"
      aria-label="Data grid"
      aria-rowcount={displayedRows.length}

      aria-colcount={columns.filter((c) => !c.hide).length}
      tabIndex={0}
      onMouseUp={rangeMouseUp}
      onContextMenu={enableContextMenu ? handleContextMenu : undefined}
    >
      {/* Top Left Standalone Column Picker */}
      {columnPickerEnabled && columnPickerPos === 'topLeft' && (
        <div style={{ padding: '6px 12px', background: 'var(--vg-bg-header)', borderBottom: 'var(--vg-border-width) var(--vg-border-style) var(--vg-border-color)', display: 'flex', alignItems: 'center' }}>
          <ColumnPicker
            columns={columns}
            onColumnToggle={handleColumnToggle}
            onColumnsChange={(visCols: InternalColDef<T>[]) => {
              onColumnVisibilityChanged?.({
                colId: '',
                visible: true,
                visibleColumns: visCols as ColDef<T>[],
                visibleColumnIds: visCols.map((c) => c._colId),
              })
            }}
            theme={theme}
            placement="standalone"
          />
        </div>
      )}




      {/* Global Search */}
      {enableGlobalSearch && (

        <GlobalSearch
          value={quickFilter}
          onChange={(v) => {
            useStore.getState().setQuickFilter(v)
            onFilterChanged?.({ filterModel: useStore.getState().filterModel })
          }}
        />
      )}

      {/* Row Group Panel */}
      {showRowGroupPanel && (
        <div className="vgrid-group-panel">
          <RowGroupPanel
            columns={columnsWithAgg}
            groupByColIds={groupByColIds}
            onGroupByChange={handleGroupByChange}
            theme={theme}
          />
        </div>
      )}

      {/* Advanced Filter Builder */}
      {showFilterPanel && (
        <div className="vgrid-filter-panel">
          <FilterBuilder
            columns={columnsWithAgg}
            onApply={handleFilterBuilderApply}
            onClear={() => {
              setFilterGroupModel(null)
              useStore.getState().setFilterModel({})
              onFilterChanged?.({ filterModel: {} })
            }}
            theme={theme}
            initialModel={filterGroupModel ?? undefined}
          />
        </div>
      )}

      {/* Header */}
      <GridHeader
        columns={columnsWithAgg}
        columnDefs={columnDefsState}
        hasGroupedHeaders={hasGroupedHeaders}
        sortModel={sortModel}
        onSort={handleSort}
        onResize={handleColumnResize}
        onMoveColumn={handleColumnMove}
        scrollLeft={scrollLeft}
        showFloatingFilter={floatingFilter}
        filterValues={filterValues}
        filterOperators={filterOperators}
        onFilterChange={handleFilterChange}
        onFilterOperatorChange={handleFilterOperatorChange}
        showCheckbox={showCheckbox || showMasterCol}
        showColumnPicker={columnPickerEnabled && columnPickerPos === 'header'}
        onColumnToggle={handleColumnToggle}


        onColumnsChange={(visCols) => {
          onColumnVisibilityChanged?.({
            colId: '',
            visible: true,
            visibleColumns: visCols as ColDef<T>[],
            visibleColumnIds: visCols.map((c) => c._colId),
          })
        }}
        allColumns={columns}
        allSelected={allSelected}

        someSelected={someSelected}
        onSelectAll={handleSelectAll}
        api={api}
        headerHeight={headerHeight}
        uniqueValues={uniqueValues}
      />

      {/* Pinned Top Rows */}
      {pinnedTopRows && pinnedTopRows.length > 0 && (
        <PinnedRows
          rows={pinnedTopRows}
          columns={columnsWithAgg}
          rowHeight={rowHeight}
          showCheckbox={showCheckbox}
          isMasterDetail={showMasterCol}
          api={api}
          scrollLeft={scrollLeft}
          position="top"
        />
      )}

      {/* Body */}
      <div
        ref={bodyRef}
        className="vgrid-body-wrapper"
        role="rowgroup"
        aria-label="Grid rows"
      >
        <div className="vgrid-body-inner" style={{ height: totalBodyHeight, position: 'relative' }}>
          {/* Empty/loading overlay */}
          {flatItems.length === 0 && !loading && !ssrmLoading && (
            <NoRowsOverlay template={overlayNoRowsTemplate} />
          )}
          {(loading || ssrmLoading) && <NoRowsOverlay loading />}

          {/* Virtual rows */}
          {virtualItems.map((vItem) => {
            const flatItem = flatItems[vItem.index]
            if (!flatItem) return null

            const itemStyle: React.CSSProperties = {
              position: 'absolute',
              top: vItem.start,
              left: 0,
              right: 0,
              height: vItem.size,
            }

            // ── Group Row ────────────────────────────────────────────
            if (flatItem.kind === 'group') {
              return (
                <GroupRow
                  key={flatItem.group.id}
                  group={flatItem.group}
                  columns={columnsWithAgg}
                  onToggle={handleToggleGroup}
                  api={api}
                  height={vItem.size}
                  normalWidth={normalWidth}
                  scrollLeft={scrollLeft}
                  showCheckbox={showCheckbox}
                  showMasterCol={showMasterCol}
                  style={itemStyle}
                />
              )
            }

            // ── Data Row ─────────────────────────────────────────────
            const { node, level } = flatItem
            const isMaster = masterDetail && (isRowMaster ? isRowMaster(node.data) : true)
            const isFullWidth = isFullWidthRow ? isFullWidthRow(node.data, node.rowIndex) : false
            const detailH = isMaster && node.isExpanded
              ? (typeof detailRowHeight === 'function' ? detailRowHeight(node.data) : detailRowHeight)
              : 0

            return (
              <RowRenderer
                key={node.id}
                node={node}
                columns={columnsWithAgg}
                editingCell={editingCell}
                activeCell={activeCell}
                cellRange={cellRange}
                onCellClick={handleCellClick}
                onCellDoubleClick={handleCellDoubleClick}
                onCellMouseDown={handleCellMouseDown}
                onCellMouseEnter={onCellMouseEnter}
                onCommitEdit={handleCommitEdit}
                onCancelEdit={handleCancelEdit}
                onRowClick={(e) => handleRowClick(node, e)}
                onToggleExpand={(e) => handleToggleExpand(node, e)}
                onCheckboxChange={(checked) => handleCheckboxChange(node, checked)}
                onCheckboxDoubleClick={() => {
                  if (rowClickJsonModal) {
                    setRowJsonModalData({
                      title: `Row Data #${node.rowIndex + 1} (${getRowId ? getRowId(node.data) : node.id})`,
                      value: node.data,
                    })
                  }
                }}
                showCheckbox={showCheckbox}

                isMasterDetail={isMaster}
                isFullWidth={isFullWidth}
                fullWidthRenderer={fullWidthCellRenderer}
                detailRenderer={detailCellRenderer}
                detailHeight={detailH}
                api={api}
                style={{ ...itemStyle, paddingLeft: level > 0 ? level * 20 : undefined }}
                normalWidth={normalWidth}
                scrollLeft={scrollLeft}
              />
            )
          })}

          {/* Infinite scroll loading indicator */}
          {rowModelType === 'infinite' && infiniteFetching && (
            <div
              className="vgrid-loading-row"
              style={{
                position: 'absolute',
                top: totalBodyHeight,
                height: rowHeight,
              }}
            >
              Loading more rows…
            </div>
          )}

          {/* Drag fill handle */}
          {enableFillHandle && cellRange && (
            <div
              className="vgrid-fill-handle"
              {...fillHandleProps}
              style={{
                bottom: 0,
                right: 0,
              }}
              aria-label="Drag to fill"
              title="Drag to fill cells"
            />
          )}
        </div>
      </div>

      {/* Pinned Bottom Rows */}
      {pinnedBottomRows && pinnedBottomRows.length > 0 && (
        <PinnedRows
          rows={pinnedBottomRows}
          columns={columnsWithAgg}
          rowHeight={rowHeight}
          showCheckbox={showCheckbox}
          isMasterDetail={showMasterCol}
          api={api}
          scrollLeft={scrollLeft}
          position="bottom"
        />
      )}

      {/* Undo/Redo toast */}
      {undoToast && <UndoToast message={undoToast} />}

      {/* Pagination Panel */}
      {pagination && (
        <PaginationPanel
          currentPage={clampedPage}
          totalPages={totalPages}
          totalRows={totalRows}
          pageSize={pageSize}
          pageSizeOptions={paginationPageSizeOptions}
          onGoToPage={(p) => {
            setPage(p)
            onPaginationChanged?.({ currentPage: p, totalPages, pageSize, totalRows })
          }}
          onSetPageSize={(s) => {
            setPageSizeState(s)
            setPage(0)
            const newTotal = Math.max(1, Math.ceil(totalRows / s))
            onPaginationChanged?.({ currentPage: 0, totalPages: newTotal, pageSize: s, totalRows })
          }}
        />
      )}

      {/* Context Menu portal */}
      {enableContextMenu && contextMenuState && (
        <ContextMenu
          x={contextMenuState.x}
          y={contextMenuState.y}
          items={contextMenuItems ?? (DEFAULT_CONTEXT_MENU_ITEMS as any)}
          params={contextMenuState.params}
          onCopySelection={onCopySelection}
          onContextMenuAction={onContextMenuAction}
          onClose={() => setContextMenuState(null)}
          selectionData={contextMenuState.selectionData}
          onExportSelectionCsv={(data) => exportSelectionAsCsv(data)}
          onExportSelectionJson={(data) => exportSelectionAsJson(data)}
        />
      )}

      {/* Row Data JSON Modal (Double click index / checkbox cell) */}
      {rowJsonModalData && (
        <JsonModal
          isOpen={!!rowJsonModalData}
          title={rowJsonModalData.title}
          value={rowJsonModalData.value}
          readOnly={true}
          onClose={() => setRowJsonModalData(null)}
        />
      )}
    </div>
  )
}



// ─── Helper: find group by id in flat items ───────────────────────────────────

function findGroupById<T>(flatItems: FlatItem<T>[], groupId: string): GroupNode<T> | null {
  for (const item of flatItems) {
    if (item.kind === 'group' && item.group.id === groupId) return item.group
  }
  return null
}

// ─── Exported VGrid (with generic type forwarding) ────────────────────────────

export const VGrid = VGridInner as <T extends RowData = RowData>(
  props: GridOptions<T>
) => React.ReactElement
