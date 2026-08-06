// ─── V-Grid Public API ────────────────────────────────────────────────────────

export { VGrid } from './components/VGrid'

// Phase 2 components (available for custom use)
export { Sparkline, createSparklineCellRenderer } from './components/Sparkline'
export { FilterBuilder } from './components/FilterBuilder'
export { RowGroupPanel } from './components/RowGroupPanel'
export { PopupEditor } from './components/PopupEditor'
export { JsonModal } from './components/JsonModal'
export { MediaModal } from './components/MediaModal'
export { ColumnPicker } from './components/ColumnPicker'


// Phase 3 components
export { ContextMenu, DEFAULT_CONTEXT_MENU_ITEMS } from './components/ContextMenu'
export { PaginationPanel } from './components/PaginationPanel'

// Phase 2 feature utilities
export { UndoStack } from './features/undoStack'
export { computeAggregation } from './features/groupEngine'

// Phase 3 feature utilities
export {
  extractSelectionData,
  exportSelectionAsCsv,
  exportSelectionAsJson,
  exportDataAsCsv,
  copyRangeToClipboard,
  copySelectedRowsToClipboard,
} from './features/exportAndClipboard'

export { ColumnPickerPosition } from './types'
export type { ColumnPickerPositionType } from './types'

// ─── Core Types ───────────────────────────────────────────────────────────────
export type {

  GridOptions,
  ColDef,
  RowData,
  RowNode,
  RowId,
  GridApi,
  SortModel,
  FilterModel,
  FilterOperator,
  FilterCondition,
  CellPosition,
  CellRange,
  CellRendererParams,
  HeaderRendererParams,
  ValueGetterParams,
  ValueSetterParams,
  ValueFormatterParams,
  ColSpanParams,
  CellClassParams,
  CellEditorType,
  CellEditorParams,
  FilterParams,
  RowTransaction,
  CsvExportParams,
  CellClickedEvent,
  CellDoubleClickedEvent,
  CellValueChangedEvent,
  RowClickedEvent,
  SelectionChangedEvent,
  SortChangedEvent,
  FilterChangedEvent,
  GridReadyEvent,
  ColumnResizedEvent,
  DetailCellRendererParams,
  RowSelectionMode,
} from './types'

// ─── Phase 2 Types ────────────────────────────────────────────────────────────
export type {
  // Grouping
  AggregationFunction,
  CustomAggregation,
  GroupNode,
  FlatItem,
  ColDefPhase2,

  // Tree Data
  TreeNode,

  // SSRM
  IServerSideDatasource,
  IServerSideGetRowsParams,

  // Infinite Scroll
  IInfiniteDatasource,
  IInfiniteGetRowsParams,

  // Undo/Redo
  EditAction,

  // Filter Builder
  FilterGroupModel,

  // Sparklines
  SparklineOptions,

  // XLSX Export
  XlsxExportParams,
  ExcelStyleDef,

  // Phase 2 Events
  RowGroupOpenedEvent,
  RowGroupChangedEvent,
  ColumnMovedEvent,
  ColumnVisibilityChangedEvent,
} from './types'


// ─── Phase 3 Types ────────────────────────────────────────────────────────────
export type {
  // Context Menu
  ContextMenuItem,
  ContextMenuActionParams,
  CopiedSelectionData,

  // Floating Filter
  FloatingFilterOperator,

  // Column Type system
  ColumnType,

  // Pagination
  PaginationConfig,
  PaginationChangedEvent,
} from './types'

// ─── Utilities (for custom renderers etc.) ────────────────────────────────────
export { getFieldValue } from './store/createGridStore'
