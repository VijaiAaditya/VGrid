import type { ReactNode, CSSProperties } from 'react'

// ─── Row Data ────────────────────────────────────────────────────────────────

export type RowId = string | number

export interface RowNode<T = RowData> {
  id: RowId
  data: T
  rowIndex: number
  isSelected: boolean
  isExpanded: boolean
  detailData?: unknown
}

// Using a flexible type that allows typed interfaces as subtypes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RowData = Record<string, any>

// ─── Column Definitions ──────────────────────────────────────────────────────

export interface CellRendererParams<T = RowData> {
  value: unknown
  data: T
  colDef: ColDef<T>
  rowIndex: number
  api: GridApi<T>
}

export interface HeaderRendererParams<T = RowData> {
  colDef: ColDef<T>
  displayName: string
  api: GridApi<T>
}

export interface ValueGetterParams<T = RowData> {
  data: T
  colDef: ColDef<T>
  rowIndex: number
}

export interface ValueSetterParams<T = RowData> {
  data: T
  newValue: unknown
  oldValue: unknown
  colDef: ColDef<T>
}

export interface ValueFormatterParams<T = RowData> {
  value: unknown
  data: T
  colDef: ColDef<T>
}

export interface ColSpanParams<T = RowData> {
  data: T
  colDef: ColDef<T>
  rowIndex: number
}

export interface ComparatorParams {
  a: unknown
  b: unknown
  sortDirection: 'asc' | 'desc'
}

export interface CellClassParams<T = RowData> {
  value: unknown
  data: T
  rowIndex: number
}

// ─── Column Type ─────────────────────────────────────────────────────────────

/**
 * Drives default filter, editor, and formatter when not explicitly set.
 * Defaults to 'string' if omitted.
 */
export type ColumnType = 'string' | 'number' | 'date' | 'boolean' | 'json'

export type CellEditorType = 'text' | 'number' | 'select' | 'date' | 'textarea' | 'json'


export interface CellEditorParams {
  options?: string[]
  min?: number
  max?: number
  step?: number
  placeholder?: string
}

export interface FilterParams {
  /** Filter input type — 'text' (default), 'number', 'date', 'select', or 'excel' (multiselect dropdown) */
  type?: 'text' | 'number' | 'date' | 'select' | 'excel'
  /** Custom operators to expose in the filter builder */
  operators?: FilterOperator[]
  /** Pre-set option list for 'select'/'excel' type. Auto-derived from data if omitted. */
  values?: string[]
  /** Placeholder text for text/number filter inputs */
  placeholder?: string
  /** Debounce delay in ms before applying the filter. Default: 200 */
  debounceMs?: number
}

/** Floating-filter operator — drives the small operator selector in each filter cell */
export type FloatingFilterOperator = 'contains' | 'equals' | 'gt' | 'lt'


export interface ColDef<T = RowData> {
  /** Field path in row data (dot notation supported: "address.city") */
  field?: string
  /** Display name shown in the column header */
  headerName?: string
  /** Unique column id — auto-derived from field if not set */
  colId?: string

  // ── Sizing ──────────────────────────────────────────────────────────────
  width?: number
  minWidth?: number
  maxWidth?: number
  flex?: number

  // ── Pinning ─────────────────────────────────────────────────────────────
  pinned?: 'left' | 'right' | null

  // ── Visibility ──────────────────────────────────────────────────────────
  hide?: boolean

  // ── Behaviour ────────────────────────────────────────────────────────────
  sortable?: boolean
  resizable?: boolean
  draggable?: boolean
  editable?: boolean | ((params: CellClassParams<T>) => boolean)
  /** Filter type. true = text, 'excel' = Excel-style multiselect dropdown */
  filter?: boolean | 'select' | 'text' | 'number' | 'date' | 'excel'
  checkboxSelection?: boolean
  headerCheckboxSelection?: boolean

  // ── Column Type ──────────────────────────────────────────────────────────
  /**
   * Declares the data type of this column.
   * Drives default filter input, editor type, and formatter.
   * Default: 'string'
   */
  columnType?: ColumnType

  // ── Renderers ───────────────────────────────────────────────────────────
  cellRenderer?: (params: CellRendererParams<T>) => ReactNode
  headerRenderer?: (params: HeaderRendererParams<T>) => ReactNode
  loadingCellRenderer?: () => ReactNode

  // ── Value Accessors ─────────────────────────────────────────────────────
  valueGetter?: (params: ValueGetterParams<T>) => unknown
  valueSetter?: (params: ValueSetterParams<T>) => boolean
  valueFormatter?: (params: ValueFormatterParams<T>) => string

  // ── Spanning ────────────────────────────────────────────────────────────
  colSpan?: (params: ColSpanParams<T>) => number

  // ── Styling ─────────────────────────────────────────────────────────────
  cellClass?: string | ((params: CellClassParams<T>) => string)
  cellStyle?: CSSProperties | ((params: CellClassParams<T>) => CSSProperties)
  headerClass?: string

  // ── Sorting ─────────────────────────────────────────────────────────────
  comparator?: (a: unknown, b: unknown) => number
  sort?: 'asc' | 'desc' | null
  sortIndex?: number

  // ── Filtering ───────────────────────────────────────────────────────────
  filterParams?: FilterParams

  // ── Editing ─────────────────────────────────────────────────────────────
  cellEditor?: CellEditorType
  cellEditorParams?: CellEditorParams
  singleClickEdit?: boolean

  // ── Column Groups ────────────────────────────────────────────────────────
  /** Child columns — makes this a column group header */
  children?: ColDef<T>[]
  /** Group id for grouping headers */
  groupId?: string

  // ── Row Spanning ────────────────────────────────────────────────────────
  rowSpan?: (params: ColSpanParams<T>) => number

  // ── Tooltip ─────────────────────────────────────────────────────────────
  tooltipField?: string
  tooltipValueGetter?: (params: ValueGetterParams<T>) => string

  // ── Phase 2: Grouping ────────────────────────────────────────────────────
  /** Aggregation function applied when this column is in a group. e.g. 'sum' */
  aggFunc?: AggregationFunction | ((values: unknown[], nodes: RowNode<T>[]) => unknown)
  /** Auto-group this column on load */
  rowGroup?: boolean
  /** Position in the group-by order */
  rowGroupIndex?: number
  /** Allow user to drag this column to the group panel */
  enableRowGroup?: boolean
  /** Allow this column's values to be aggregated */
  enableValue?: boolean

  // ── Phase 2: Sparkline ───────────────────────────────────────────────────
  /** Sparkline config — set cellRenderer to 'sparkline' and provide this */
  sparklineOptions?: SparklineOptions

  // ── Phase 2: Validation ──────────────────────────────────────────────────
  /** Return a string error message or null if valid */
  validate?: (value: unknown, data: T) => string | null

  // ── Phase 2: Popup Editor ────────────────────────────────────────────────
  /** Render the cell editor in a floating popup instead of inline */
  cellEditorPopup?: boolean
}

// ─── Sort & Filter Models ────────────────────────────────────────────────────

export interface SortModel {
  colId: string
  sort: 'asc' | 'desc'
}

export type FilterOperator =
  | 'contains'
  | 'notContains'
  | 'equals'
  | 'notEquals'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'blank'
  | 'notBlank'
  // Aliases used by floating filter operator selector
  | 'gt'
  | 'lt'
  // Excel multiselect — value is comma-separated allowlist
  | 'in'

export interface FilterCondition {
  colId: string
  operator: FilterOperator
  value: string
}

export type FilterModel = Record<string, FilterCondition>

// ─── Selection ───────────────────────────────────────────────────────────────

export interface CellPosition {
  rowIndex: number
  colId: string
}

export interface CellRange {
  startRow: number
  endRow: number
  startColIndex: number
  endColIndex: number
}

export type RowSelectionMode = 'single' | 'multiple'

// ─── Grid API ────────────────────────────────────────────────────────────────

export interface GridApi<T = RowData> {
  /** Get all displayed/filtered row nodes */
  getDisplayedRowNodes: () => RowNode<T>[]
  /** Get selected row data */
  getSelectedRows: () => T[]
  /** Get selected row nodes */
  getSelectedNodes: () => RowNode<T>[]
  /** Select all rows */
  selectAll: () => void
  /** Deselect all rows */
  deselectAll: () => void
  /** Select a row by index */
  selectRow: (rowIndex: number, addToSelection?: boolean) => void
  /** Deselect a row by index */
  deselectRow: (rowIndex: number) => void
  /** Set new row data */
  setRowData: (rowData: T[]) => void
  /** Apply delta changes (add, update, remove) */
  applyTransaction: (transaction: RowTransaction<T>) => void
  /** Update column definitions */
  setColumnDefs: (colDefs: ColDef<T>[]) => void
  /** Export to CSV */
  exportDataAsCsv: (params?: CsvExportParams) => void
  /** Export to XLSX — Phase 2 */
  exportDataAsXlsx: (params?: XlsxExportParams) => void
  /** Set filter model */
  setFilterModel: (filterModel: FilterModel) => void
  /** Get current filter model */
  getFilterModel: () => FilterModel
  /** Set sort model */
  setSortModel: (sortModel: SortModel[]) => void
  /** Get current sort model */
  getSortModel: () => SortModel[]
  /** Refresh all cells */
  refreshCells: () => void
  /** Get cell value */
  getCellValue: (rowIndex: number, colId: string) => unknown
  /** Set cell value */
  setCellValue: (rowIndex: number, colId: string, value: unknown) => void
  /** Expand or collapse a master row */
  setRowExpanded: (rowIndex: number, expanded: boolean) => void
  /** Scroll to a row */
  ensureRowVisible: (rowIndex: number) => void
  /** Scroll to a column */
  ensureColumnVisible: (colId: string) => void
  /** Destroy the grid (cleanup) */
  destroy: () => void

  // ── Phase 2 API ────────────────────────────────────────────────────────────
  /** Set columns to group by (Phase 2) */
  setGroupByColumns: (colIds: string[]) => void
  /** Get current group-by column IDs (Phase 2) */
  getGroupByColumns: () => string[]
  /** Expand a specific group by its ID (Phase 2) */
  expandGroup: (groupId: string) => void
  /** Collapse a specific group by its ID (Phase 2) */
  collapseGroup: (groupId: string) => void
  /** Expand all groups (Phase 2) */
  expandAll: () => void
  /** Collapse all groups (Phase 2) */
  collapseAll: () => void
  /** Undo last cell edit (Phase 2, requires enableUndoRedo) */
  undo: () => void
  /** Redo last undone cell edit (Phase 2, requires enableUndoRedo) */
  redo: () => void
  /** Trigger a fresh SSRM fetch (Phase 2, requires rowModelType = 'serverSide') */
  refreshServerSideStore: () => void

  // ── Phase 3: Pagination ────────────────────────────────────────────────────
  goToPage: (page: number) => void
  setPageSize: (size: number) => void
  getCurrentPage: () => number
  getTotalPages: () => number

  // ── Phase 3: Column Visibility ────────────────────────────────────────────
  setColumnVisible: (colId: string, visible: boolean) => void
  getColumnState: () => ColumnState[]
  showColumnPanel: () => void
  hideColumnPanel: () => void

  // ── Phase 3: Chart ────────────────────────────────────────────────────────
  showChart: (config: ChartConfig) => void
  hideChart: () => void

  // ── Phase 3: Pivot ────────────────────────────────────────────────────────
  setPivot: (config: PivotConfig) => void
  clearPivot: () => void

  // ── Phase 3: Formula ──────────────────────────────────────────────────────
  getCellFormula: (rowIndex: number, colId: string) => string | null
}

// ─── Row Transactions ────────────────────────────────────────────────────────

export interface RowTransaction<T = RowData> {
  add?: T[]
  addIndex?: number
  update?: T[]
  remove?: T[]
}

// ─── Export Options ──────────────────────────────────────────────────────────

export interface CsvExportParams {
  fileName?: string
  columnSeparator?: string
  /** Export only visible (filtered) rows. Default: true */
  onlySelected?: boolean
  /** Columns to include. Default: all visible */
  columnKeys?: string[]
  /** Include header row. Default: true */
  includeHeader?: boolean
  /** Custom value processor per cell */
  processCellCallback?: (params: CellRendererParams) => string
}

// ─── Event Callbacks ─────────────────────────────────────────────────────────

export interface CellClickedEvent<T = RowData> {
  data: T
  colDef: ColDef<T>
  value: unknown
  rowIndex: number
  event: MouseEvent
}

export interface CellDoubleClickedEvent<T = RowData> extends CellClickedEvent<T> {}

export interface CellValueChangedEvent<T = RowData> {
  data: T
  colDef: ColDef<T>
  oldValue: unknown
  newValue: unknown
  rowIndex: number
}

export interface RowClickedEvent<T = RowData> {
  data: T
  rowIndex: number
  event: MouseEvent
}

export interface SelectionChangedEvent<T = RowData> {
  selectedRows: T[]
  selectedNodes: RowNode<T>[]
}

export interface SortChangedEvent {
  sortModel: SortModel[]
}

export interface FilterChangedEvent {
  filterModel: FilterModel
}

export interface GridReadyEvent<T = RowData> {
  api: GridApi<T>
}

export interface ColumnResizedEvent {
  colId: string
  newWidth: number
}

export interface ColumnMovedEvent {
  /** The column that was moved */
  colId: string
  /** The column it was dropped onto (swapped with) */
  toColId: string
  /** New ordered list of all visible column IDs after the move */
  columnOrder: string[]
}

export interface DetailCellRendererParams<T = RowData> {
  data: T
  rowIndex: number
  api: GridApi<T>
}

// ─── Grid Options ─────────────────────────────────────────────────────────────

export interface GridOptions<T = RowData> {
  // ── Data ──────────────────────────────────────────────────────────────────
  rowData: T[]
  columnDefs: ColDef<T>[]
  /** Default col def applied to all columns (overridden by individual colDef) */
  defaultColDef?: Partial<ColDef<T>>
  /** Unique row ID getter — defaults to rowIndex */
  getRowId?: (data: T) => RowId
  /** Rows pinned to top */
  pinnedTopRowData?: T[]
  /** Rows pinned to bottom */
  pinnedBottomRowData?: T[]

  // ── Heights ───────────────────────────────────────────────────────────────
  /** Fixed row height in px. Default: 40 */
  rowHeight?: number
  /** Per-row height override */
  getRowHeight?: (data: T, rowIndex: number) => number
  /** Header height in px. Default: 48 */
  headerHeight?: number
  /** Filter row height. Default: 36 */
  floatingFilterHeight?: number

  // ── Theme ─────────────────────────────────────────────────────────────────
  theme?: 'light' | 'dark' | 'custom'

  // ── Selection ─────────────────────────────────────────────────────────────
  rowSelection?: RowSelectionMode
  enableRangeSelection?: boolean
  suppressRowClickSelection?: boolean
  /** Show checkbox column automatically */
  checkboxSelection?: boolean

  // ── Editing ───────────────────────────────────────────────────────────────
  editable?: boolean
  singleClickEdit?: boolean
  stopEditingWhenCellsLoseFocus?: boolean

  // ── Clipboard ─────────────────────────────────────────────────────────────
  enableClipboard?: boolean
  /** Copy only selected rows. Default: false — copies range selection */
  copySelectedRowsToClipboard?: boolean

  // ── Sorting ───────────────────────────────────────────────────────────────
  multiSortKey?: 'ctrl' | 'shift'

  // ── Filtering ─────────────────────────────────────────────────────────────
  /** Show floating filter row below headers. Default: false */
  floatingFilter?: boolean
  /** Show global search bar above grid. Default: false */
  enableGlobalSearch?: boolean
  quickFilterText?: string

  // ── Master-Detail ─────────────────────────────────────────────────────────
  masterDetail?: boolean
  detailCellRenderer?: (params: DetailCellRendererParams<T>) => ReactNode
  detailRowHeight?: number | ((data: T) => number)
  /** Which rows are master rows. Default: all rows */
  isRowMaster?: (data: T) => boolean

  // ── Full-Width Rows ───────────────────────────────────────────────────────
  fullWidthCellRenderer?: (params: CellRendererParams<T>) => ReactNode
  isFullWidthRow?: (data: T, rowIndex: number) => boolean

  // ── Virtualization ────────────────────────────────────────────────────────
  /** Rows rendered outside visible viewport. Default: 5 */
  rowBuffer?: number
  suppressRowVirtualisation?: boolean
  suppressColumnVirtualisation?: boolean

  // ── Column sizing ─────────────────────────────────────────────────────────
  /** If true, columns fill container width. Default: false */
  sizeColumnsToFit?: boolean

  // ── Overlay messages ──────────────────────────────────────────────────────
  overlayLoadingTemplate?: string
  overlayNoRowsTemplate?: string
  loading?: boolean

  // ── Misc ─────────────────────────────────────────────────────────────────
  /** CSS class applied to the root container */
  className?: string
  style?: CSSProperties

  // ── Events ────────────────────────────────────────────────────────────────
  onGridReady?: (event: GridReadyEvent<T>) => void
  onRowClicked?: (event: RowClickedEvent<T>) => void
  onRowDoubleClicked?: (event: RowClickedEvent<T>) => void
  onCellClicked?: (event: CellClickedEvent<T>) => void
  onCellDoubleClicked?: (event: CellDoubleClickedEvent<T>) => void
  onCellValueChanged?: (event: CellValueChangedEvent<T>) => void
  onSelectionChanged?: (event: SelectionChangedEvent<T>) => void
  onSortChanged?: (event: SortChangedEvent) => void
  onFilterChanged?: (event: FilterChangedEvent) => void
  onColumnResized?: (event: ColumnResizedEvent) => void
  /** Fired when user drags a column header to a new position */
  onColumnMoved?: (event: ColumnMovedEvent) => void

  // ── Phase 2: Row Grouping ─────────────────────────────────────────────────
  /** Columns to group rows by (applied in order) */
  rowGroupPanelShow?: 'always' | 'onlyWhenGrouping' | 'never'
  /** Show the row group drop panel above the grid */
  showRowGroupPanel?: boolean
  /** Custom aggregation function per column (overrides aggFunc in colDef) */
  groupAggFunction?: Record<string, AggregationFunction | CustomAggregation<T>>
  /** Height for group rows. Default: rowHeight */
  groupRowHeight?: number
  /** Show group row totals */
  showGroupTotals?: boolean

  // ── Phase 2: Tree Data ───────────────────────────────────────────────────
  /** Enable hierarchical tree data rendering */
  treeData?: boolean
  /** Given a row's data, returns path segments e.g. ['Org', 'Dept', 'Team'] */
  getDataPath?: (data: T) => string[]
  /** Auto-expand all tree nodes on load */
  autoExpandAll?: boolean

  // ── Phase 2: Server-Side Row Model ───────────────────────────────────────
  rowModelType?: 'clientSide' | 'serverSide' | 'infinite'
  /** Used when rowModelType = 'serverSide' */
  serverSideDatasource?: IServerSideDatasource<T>
  /** Page size for SSRM requests */
  cacheBlockSize?: number

  // ── Phase 2: Infinite Scroll ─────────────────────────────────────────────
  /** Used when rowModelType = 'infinite' */
  datasource?: IInfiniteDatasource<T>
  /** How many rows per fetch block. Default: 100 */
  infiniteInitialRowCount?: number

  // ── Phase 2: Undo/Redo ───────────────────────────────────────────────────
  /** Enable Ctrl+Z / Ctrl+Y undo/redo for cell edits. Default: false */
  enableUndoRedo?: boolean
  /** Max undo history size. Default: 50 */
  undoRedoCellEditingLimit?: number

  // ── Phase 2: Advanced Filter Builder ────────────────────────────────────
  /** Show the visual AND/OR filter builder panel */
  enableFilterPanel?: boolean

  // ── Phase 2: Drag Fill ───────────────────────────────────────────────────
  /** Enable Excel-style drag-fill handle on range selection. Default: false */
  enableFillHandle?: boolean
  /** Fill behaviour: 'copy' duplicates, 'increment' increases numeric values */
  fillHandleDirection?: 'x' | 'y' | 'xy'

  // ── Phase 2: XLSX Export ─────────────────────────────────────────────────
  /** Extra XLSX export options */
  excelStyles?: ExcelStyleDef[]

  // ── Phase 2: Events ──────────────────────────────────────────────────────
  onRowGroupOpened?: (event: RowGroupOpenedEvent<T>) => void
  onRowGroupChanged?: (event: RowGroupChangedEvent) => void
  onUndoStarted?: () => void
  onRedoStarted?: () => void

  // ── Phase 3: Pagination ──────────────────────────────────────────────────
  pagination?: boolean
  paginationPageSize?: number
  paginationPageSizeOptions?: number[]
  onPaginationChanged?: (event: PaginationChangedEvent) => void

  // ── Phase 3: Column Visibility Panel ────────────────────────────────────
  showColumnPanel?: boolean
  onColumnVisibilityChanged?: (event: ColumnVisibilityChangedEvent) => void

  // ── Phase 3: Context Menu ────────────────────────────────────────────────
  enableContextMenu?: boolean
  /** Items to show in the right-click menu. Omit to use defaults. */
  contextMenuItems?: ContextMenuItem<T>[]
  /** Fired when the built-in 'copy-selection' action runs */
  onCopySelection?: (data: CopiedSelectionData) => void
  /** Fired when a named built-in action (chart, pivot, etc.) is triggered */
  onContextMenuAction?: (action: string, params: ContextMenuActionParams<T>) => void

  // ── Phase 3: Header Menu ─────────────────────────────────────────────────
  enableHeaderMenu?: boolean

  // ── Phase 3: Charts ──────────────────────────────────────────────────────
  enableCharts?: boolean
  chartConfig?: ChartConfig
  chartOnSelection?: boolean
  onChartChanged?: (event: ChartChangedEvent) => void

  // ── Phase 3: Pivot ───────────────────────────────────────────────────────
  pivot?: boolean
  pivotConfig?: PivotConfig
  onPivotChanged?: (event: PivotChangedEvent) => void

  // ── Phase 3: Formula ─────────────────────────────────────────────────────
  enableFormulas?: boolean
}


// ─── Phase 2: Aggregation Types ──────────────────────────────────────────────

export type AggregationFunction = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'first' | 'last'
export type CustomAggregation<T = RowData> = (values: unknown[], nodes: RowNode<T>[]) => unknown

// Extend ColDef with Phase 2 fields (merged back into ColDef via module augmentation pattern)
// These are optional additions to the existing ColDef interface already defined
export interface ColDefPhase2<T = RowData> {
  /** Aggregation function to apply when grouping. e.g. 'sum', 'avg', 'count' */
  aggFunc?: AggregationFunction | CustomAggregation<T>
  /** Automatically group by this column */
  rowGroup?: boolean
  /** Index in the row group order (0 = first grouping level) */
  rowGroupIndex?: number
  /** Allow dragging this column to the group panel */
  enableRowGroup?: boolean
  /** Allow this column to be used as an aggregation value column */
  enableValue?: boolean
  /** Sparkline options (used when cellRenderer = 'sparkline') */
  sparklineOptions?: SparklineOptions
  /** Validation function: return error string or null if valid */
  validate?: (value: unknown, data: T) => string | null
  /** Use popup editor instead of inline editor */
  cellEditorPopup?: boolean
}

// ─── Phase 2: Group Node ─────────────────────────────────────────────────────

export interface GroupNode<T = RowData> {
  type: 'group'
  id: string
  /** The value of the grouped field for this group (e.g. "Engineering") */
  key: string
  /** The field being grouped (e.g. "department") */
  field: string
  /** Header name of the grouped column */
  headerName: string
  /** Nesting depth (0 = top-level group) */
  level: number
  /** Whether this group is expanded */
  isExpanded: boolean
  /** Number of leaf rows in this group */
  leafCount: number
  /** Computed aggregations for each column */
  aggregations: Record<string, unknown>
  /** Child items — can be nested groups or row nodes */
  children: Array<GroupNode<T> | RowNode<T>>
}

/** Flat item for virtualizer — either a group header or a data row */
export type FlatItem<T = RowData> =
  | { kind: 'group'; group: GroupNode<T> }
  | { kind: 'row'; node: RowNode<T>; level: number }

// ─── Phase 2: Tree Data Node ──────────────────────────────────────────────────

export interface TreeNode<T = RowData> {
  type: 'tree'
  id: string
  key: string
  level: number
  isExpanded: boolean
  isLeaf: boolean
  data: T
  children: TreeNode<T>[]
}

// ─── Phase 2: SSRM ───────────────────────────────────────────────────────────

export interface IServerSideDatasource<T = RowData> {
  getRows: (params: IServerSideGetRowsParams<T>) => void
  destroy?: () => void
}

export interface IServerSideGetRowsParams<T = RowData> {
  request: {
    startRow: number
    endRow: number
    sortModel: SortModel[]
    filterModel: FilterModel
  }
  success: (result: { rowData: T[]; rowCount?: number }) => void
  fail: () => void
}

// ─── Phase 2: Infinite Datasource ────────────────────────────────────────────

export interface IInfiniteDatasource<T = RowData> {
  rowCount?: number
  getRows: (params: IInfiniteGetRowsParams<T>) => void
}

export interface IInfiniteGetRowsParams<T = RowData> {
  startRow: number
  endRow: number
  sortModel: SortModel[]
  filterModel: FilterModel
  successCallback: (rows: T[], lastRow?: number) => void
  failCallback: () => void
}

// ─── Phase 2: Undo/Redo ──────────────────────────────────────────────────────

export interface EditAction {
  rowId: RowId
  rowIndex: number
  colId: string
  oldValue: unknown
  newValue: unknown
  timestamp: number
}

// ─── Phase 2: Advanced Filter Model ─────────────────────────────────────────

export interface FilterGroupModel {
  logic: 'AND' | 'OR'
  conditions: FilterCondition[]
  groups?: FilterGroupModel[]
}

// ─── Phase 2: Sparkline ──────────────────────────────────────────────────────

export interface SparklineOptions {
  type?: 'line' | 'bar' | 'area'
  color?: string
  fillColor?: string
  strokeWidth?: number
  height?: number
  min?: number
  max?: number
  showPoints?: boolean
}

// ─── Phase 2: XLSX Export ────────────────────────────────────────────────────

export interface XlsxExportParams {
  fileName?: string
  sheetName?: string
  columnKeys?: string[]
  includeHeader?: boolean
  onlySelected?: boolean
  /** Include group rows in export */
  includeGroups?: boolean
  /** Style definitions keyed by name */
  styles?: ExcelStyleDef[]
}

export interface ExcelStyleDef {
  id: string
  font?: { bold?: boolean; italic?: boolean; color?: string; size?: number }
  fill?: { color?: string }
  alignment?: { horizontal?: 'left' | 'center' | 'right'; wrapText?: boolean }
  border?: { all?: boolean; color?: string }
}

// ─── Phase 2: Events ─────────────────────────────────────────────────────────

export interface RowGroupOpenedEvent<T = RowData> {
  groupId: string
  key: string
  expanded: boolean
  data?: T
}

export interface RowGroupChangedEvent {
  groupByColumns: string[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── PHASE 3 TYPES ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginationChangedEvent {
  currentPage: number
  totalPages: number
  pageSize: number
  totalRows: number
}

// ─── Column State (Visibility Panel) ─────────────────────────────────────────

export interface ColumnState {
  colId: string
  headerName: string
  visible: boolean
  width: number
  pinned: 'left' | 'right' | null
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

/**
 * The data payload delivered to onCopySelection.
 * - cells: raw cell values, each inner array is one row (no JSON key overload)
 * - columns: column metadata for each column in the selection
 */
export interface CopiedSelectionData {
  /** Rows × Columns matrix of raw cell values */
  cells: unknown[][]
  /** Column descriptor for each column in the selection */
  columns: Array<{ index: number; name: string }>
}

/** Built-in items recognised by the context menu */
export type BuiltInContextMenuItem =
  | 'copy-selection'          // copy selected range as TSV
  | 'copy-selection-json'     // copy selected range as JSON to clipboard
  | 'export-selection-csv'    // download selected range as .csv
  | 'export-selection-json'   // download selected range as .json
  | 'separator'               // visual divider
  | 'chart'                   // fires onContextMenuAction('chart', params)
  | 'pivot'                   // fires onContextMenuAction('pivot', params)

export interface CustomContextMenuItem<T = RowData> {
  label: string
  icon?: string       // emoji or short text icon
  disabled?: boolean
  action: (params: ContextMenuActionParams<T>) => void
}

export type ContextMenuItem<T = RowData> = BuiltInContextMenuItem | CustomContextMenuItem<T>

/** Params delivered to custom item actions and onContextMenuAction */
export interface ContextMenuActionParams<T = RowData> {
  rowIndex: number | null
  colIndex: number | null
  data: T | null
  /** The current range selection, pre-extracted for convenience */
  selection: CopiedSelectionData | null
  api: GridApi<T>
}

/** @deprecated use ContextMenuActionParams */
export interface ContextMenuParams<T = RowData> {
  data: T | null
  rowIndex: number | null
  colDef: ColDef<T> | null
  value: unknown
  api: GridApi<T>
  event: MouseEvent
}


// ─── Header Menu ──────────────────────────────────────────────────────────────

export type BuiltInHeaderMenuItem =
  | 'sort-asc' | 'sort-desc' | 'sort-clear'
  | 'pin-left' | 'pin-right' | 'unpin'
  | 'auto-size' | 'hide' | 'separator'
  | 'filter-clear'

export interface CustomHeaderMenuItem<T = RowData> {
  label: string
  icon?: string
  disabled?: boolean
  action: (params: HeaderMenuParams<T>) => void
}

export type HeaderMenuItem<T = RowData> = BuiltInHeaderMenuItem | CustomHeaderMenuItem<T>

export interface HeaderMenuParams<T = RowData> {
  colDef: ColDef<T>
  api: GridApi<T>
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter'

export interface ChartConfig {
  type: ChartType
  /** Column ID for X-axis labels */
  xField: string
  /** Column ID for Y-axis values */
  yField: string
  /** Aggregation applied to Y per X group. Default: 'sum' */
  aggFunc?: AggregationFunction
  title?: string
  height?: number
  /** Custom colour palette */
  colors?: string[]
  /** Whether chart updates on row selection change */
  chartOnSelection?: boolean
}

export interface ChartDataset {
  label: string
  value: number
  color: string
}

// ─── Pivot ────────────────────────────────────────────────────────────────────

export interface PivotConfig {
  /** Column whose unique values become rows */
  rowField: string
  /** Column whose unique values become columns */
  colField: string
  /** Column to aggregate in each cell */
  valueField: string
  /** Aggregation function. Default: 'sum' */
  aggFunc?: AggregationFunction
}

// ─── Formula ──────────────────────────────────────────────────────────────────

export interface FormulaCellMeta {
  /** Raw formula string, e.g. '=SUM(salary)' */
  formula: string
  /** Last evaluated result */
  result: unknown
  /** Error message if evaluation failed */
  error?: string
}

// ─── Phase 3 Grid API Extensions ─────────────────────────────────────────────
// (added via module augmentation on GridApi — see index.ts re-exports)

// ─── Phase 3 GridOptions Extensions ──────────────────────────────────────────
// These are merged into GridOptions<T> inside VGrid.tsx via spread props

export interface GridOptionsPhase3<T = RowData> {
  // ── Pagination ──────────────────────────────────────────────────────────────
  pagination?: boolean
  paginationPageSize?: number
  paginationPageSizeOptions?: number[]
  onPaginationChanged?: (event: PaginationChangedEvent) => void

  // ── Column Visibility Panel ─────────────────────────────────────────────────
  showColumnPanel?: boolean

  // ── Context Menu ────────────────────────────────────────────────────────────
  enableContextMenu?: boolean
  contextMenuItems?: ContextMenuItem<T>[]
  getContextMenuItems?: (params: ContextMenuParams<T>) => ContextMenuItem<T>[]

  // ── Header Menu ─────────────────────────────────────────────────────────────
  enableHeaderMenu?: boolean

  // ── Charts ──────────────────────────────────────────────────────────────────
  enableCharts?: boolean
  chartConfig?: ChartConfig
  chartOnSelection?: boolean

  // ── Pivot ───────────────────────────────────────────────────────────────────
  pivot?: boolean
  pivotConfig?: PivotConfig

  // ── Formula ─────────────────────────────────────────────────────────────────
  enableFormulas?: boolean
}

// ─── Phase 3 Events ──────────────────────────────────────────────────────────

export interface ColumnVisibilityChangedEvent {
  colId: string
  visible: boolean
}

export interface PivotChangedEvent {
  config: PivotConfig | null
}

export interface ChartChangedEvent {
  config: ChartConfig | null
}
