# V-Grid

**Ultra-fast, lightweight, zero-dependency React data grid with virtualization, pinning, sorting, filtering, editing, row grouping, context menus, pagination, and Excel exports.**

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![Zero global CSS](https://img.shields.io/badge/CSS-scoped%20%7C%20no%20global%20bleed-green)]()
[![React 18+](https://img.shields.io/badge/React-18%2B-61dafb)]()
[![License](https://img.shields.io/badge/License-MIT-brightgreen)]()

---

## Quick Start

### Installation

```bash
npm install @openden/v-grid
```

### Basic Usage

```tsx
import React from 'react'
import { VGrid } from '@openden/v-grid'
import '@openden/v-grid/styles'

export function App() {
  const rowData = [
    { id: 1, name: 'Alice', department: 'Engineering', salary: 95000, status: 'Active' },
    { id: 2, name: 'Bob', department: 'Sales', salary: 78000, status: 'On Leave' },
  ]

  const columnDefs = [
    { field: 'id', headerName: '#', width: 70, pinned: 'left' },
    { field: 'name', headerName: 'Employee Name', sortable: true, filter: 'text' },
    { field: 'department', headerName: 'Department', filter: 'excel', filterParams: { options: ['Engineering', 'Sales', 'HR', 'Marketing'] } },
    { field: 'salary', headerName: 'Salary', filter: 'number', valueFormatter: (p) => `$${Number(p.value).toLocaleString()}` },
    { field: 'status', headerName: 'Status', filter: 'select', editable: true, cellEditor: 'select', cellEditorParams: { options: ['Active', 'On Leave', 'Remote'] } },
  ]

  return (
    <div style={{ height: 500, width: '100%' }}>
      <VGrid
        rowData={rowData}
        columnDefs={columnDefs}
        rowSelection="multiple"
        checkboxSelection={true}
        enableContextMenu={true}
        pagination={true}
        paginationPageSize={10}
      />
    </div>
  )
}
```

---

## Component Configuration Props (`<VGrid />`)

### Core & Layout Props
| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `rowData` | `T[]` | `[]` | Array of row data objects to display in the grid. |
| `columnDefs` | `ColDef<T>[]` | `[]` | Array of column definitions describing headers, fields, and behavior. |
| `defaultColDef` | `Partial<ColDef<T>>` | `{}` | Default settings merged into every column definition. |
| `theme` | `'dark' \| 'light' \| 'custom'` | `'dark'` | Visual theme for the grid. |
| `rowHeight` | `number` | `36` | Height of rows in pixels. |
| `headerHeight` | `number` | `38` | Height of column headers in pixels. |
| `getRowId` | `(data: T) => string` | `data.id` | Callback returning a unique identifier string for each row. |

### Selection Props
| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `rowSelection` | `'multiple' \| 'single'` | `'multiple'` | Enable single or multi-row selection. |
| `checkboxSelection` | `boolean` | `false` | Automatically adds a pinned left checkbox selection column. |
| `suppressRowClickSelection` | `boolean` | `false` | When true, row click does not alter row selection. |
| `enableRangeSelection` | `boolean` | `false` | Enables Excel-style rectangular cell range drag-selection. |
| `enableFillHandle` | `boolean` | `false` | Shows an Excel-style fill handle on selected cell ranges. |
| `fillHandleDirection` | `'x' \| 'y' \| 'xy'` | `'y'` | Allowed direction for drag-filling cell values. |

### Filtering & Search Props
| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `floatingFilter` | `boolean` | `false` | Displays input filter cells under each column header. |
| `enableGlobalSearch` | `boolean` | `false` | Shows a search input bar above the grid for global matching. |
| `quickFilterText` | `string` | `''` | External search query string to filter rows globally across fields. |
| `showFilterPanel` | `boolean` | `false` | Shows the advanced multi-condition AND/OR Filter Builder drawer. |

### Editing Props
| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `editable` | `boolean` | `false` | Enables double-click inline cell editing across all editable columns. |
| `singleClickEdit` | `boolean` | `false` | Enables cell editing on single click instead of double click. |
| `stopEditingWhenCellsLoseFocus` | `boolean` | `true` | Commits cell edit changes when focus moves away from the editing cell. |
| `enableUndo` | `boolean` | `false` | Tracks edit history allowing Ctrl+Z (Undo) and Ctrl+Y (Redo). |

### Right-Click Context Menu Props
| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `enableContextMenu` | `boolean` | `false` | Enables the built-in right-click context menu on grid cells. |
| `contextMenuItems` | `ContextMenuItem<T>[]` | `DEFAULT` | Array of built-in or custom context menu items with callbacks. |
| `onContextMenuAction` | `(actionId: string, params: ContextMenuActionParams<T>) => void` | `undefined` | Fired when a context menu item action executes. |

#### Built-In Context Menu Actions
The following string identifiers can be included in your `contextMenuItems` array:
* `'copy-selection'` — Copies selected cells as Tab-Separated Values (TSV) to clipboard.
* `'copy-selection-json'` — Copies selected cells formatted as a JSON array string directly to clipboard.
* `'export-selection-csv'` — Downloads selected cells as `.csv`.
* `'export-selection-json'` — Downloads selected cells as `.json`.
* `'chart'` — Launches inline chart creation modal.
* `'pivot'` — Launches pivot table configuration modal.
* `'separator'` — Renders a visual divider line.

#### Adding Custom Options on Top of Built-ins

Built-in options are immutable and protected. You can append new custom options on top of built-ins, or omit built-in options you don't want:

```tsx
import type { ContextMenuItem } from 'v-grid'

const myContextMenuItems: ContextMenuItem<Employee>[] = [
  // Built-in actions (protected & built-in):
  'copy-selection',        // Copy as TSV
  'copy-selection-json',   // Copy as JSON to clipboard
  'export-selection-csv',  // Download CSV
  'separator',

  // Custom options configured on top:
  {
    label: 'Send Email Notification',
    icon: '✉️',
    action: (params) => {
      const clickedRow = params.data
      const selectedRows = params.api.getSelectedRows()
      alert(`Sending email to ${selectedRows.length || 1} employee(s)...`)
    },
  },
  {
    label: 'Mark Status Inactive',
    icon: '🚫',
    action: (params) => {
      if (params.data) {
        params.api.applyTransaction({ update: [{ ...params.data, status: 'Inactive' }] })
      }
    },
  },
]

<VGrid
  enableContextMenu={true}
  contextMenuItems={myContextMenuItems}
/>
```

### Pagination Props
| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `pagination` | `boolean` | `false` | Enables page navigation bar at the bottom of the grid. |
| `paginationPageSize` | `number` | `10` | Number of rows displayed per page. |
| `paginationPageSizeOptions` | `number[]` | `[5, 10, 20, 50]` | Dropdown choices available for page size selection. |

### Grouping, Tree & Master-Detail Props
| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `showGroupPanel` | `boolean` | `false` | Shows top drag-and-drop panel to group rows by columns. |
| `treeData` | `boolean` | `false` | Enables hierarchical tree row rendering using parent-child row nodes. |
| `masterDetail` | `boolean` | `false` | Enables expandable row detail views. |
| `detailCellRenderer` | `(params: DetailCellRendererParams<T>) => ReactNode` | `undefined` | Custom React renderer for expanded detail rows. |
| `detailRowHeight` | `number` | `180` | Pixel height reserved for expanded detail view rows. |

### Server-Side Data Props
| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `serverSideDatasource` | `IServerSideDatasource` | `undefined` | Enterprise Server-Side Row Model (SSRM) data provider. |
| `infiniteDatasource` | `IInfiniteDatasource` | `undefined` | Infinite scroll data provider. |

---

## Column Definition Reference (`ColDef<T>`)

| Property | Type | Description |
| :--- | :--- | :--- |
| `field` | `keyof T \| string` | Object property field name to bind cell value. |
| `headerName` | `string` | Display title shown in column header. |
| `colId` | `string` | Unique identifier for column (defaults to `field`). |
| `width` | `number` | Initial column width in pixels. |
| `minWidth` | `number` | Minimum allowed width during drag-resize (default: `50`). |
| `maxWidth` | `number` | Maximum allowed width during drag-resize. |
| `pinned` | `'left' \| 'right'` | Fix column position to the left or right side of the grid. |
| `sortable` | `boolean` | Enable column header clicking to sort (`asc` -> `desc` -> `none`). |
| `resizable` | `boolean` | Enable drag handle on header boundary to resize column width. |
| `filter` | `'text' \| 'number' \| 'date' \| 'select' \| 'excel' \| boolean` | Column filter type. `'excel'` activates multi-select checklist popup. |
| `filterParams` | `{ options?: (string \| number)[] }` | Pre-defined options list for `'select'` or `'excel'` dropdown filters. |
| `editable` | `boolean \| ((params) => boolean)` | Enables editing on this specific column. |
| `cellEditor` | `'text' \| 'number' \| 'select' \| 'date' \| 'textarea'` | Built-in cell editor type when entering edit mode. |
| `cellEditorParams` | `{ options?: string[] }` | Option choices passed to `'select'` cell editor. |
| `cellRenderer` | `(params: CellRendererParams<T>) => ReactNode` | Custom React element renderer for cells in this column. |
| `headerRenderer` | `(params: HeaderRendererParams<T>) => ReactNode` | Custom React renderer for the column header cell. |
| `valueGetter` | `(params: ValueGetterParams<T>) => any` | Function to compute dynamic or nested cell values. |
| `valueFormatter` | `(params: ValueFormatterParams<T>) => string` | Function to format raw values into display text (e.g. currency). |

---

## Grid API (`apiRef.current`)

Access the Grid API using a `useRef`:

```tsx
const apiRef = useRef<GridApi<MyData> | null>(null)

<VGrid onGridReady={(e) => { apiRef.current = e.api }} />
```

### Selection API
* `api.selectAll()` — Selects all rows currently in the grid.
* `api.deselectAll()` — Deselects all rows.
* `api.selectRow(rowIndex: number, addToSelection?: boolean)` — Selects a row by index.
* `api.deselectRow(rowIndex: number)` — Deselects a specific row index.
* `api.getSelectedRows()` — Returns an array of selected data objects.

### Filter & Sort API
* `api.setFilterModel(model: FilterModel)` — Programmatically applies column filter models.
* `api.getFilterModel()` — Returns active filter models.
* `api.setSortModel(model: SortModel[])` — Programmatically applies sort rules.
* `api.getSortModel()` — Returns active sort rules.

### Data & Transaction API
* `api.setRowData(data: T[])` — Replaces current row data set.
* `api.applyTransaction(tx: RowTransaction<T>)` — Mutates data via `{ add?: T[], update?: T[], remove?: T[] }`.
* `api.exportDataAsCsv(params?: CsvExportParams)` — Downloads active grid data as a `.csv` file.
* `api.exportDataAsJson(fileName?: string)` — Downloads active grid data as `.json`.
* `api.refreshServerSideStore()` — Refreshes SSRM server data provider.

---

## Subpath Modules & Exports

To keep your application bundle light, optional modules are decoupled:

### 1. Excel Exporter Module (`v-grid/excel`)
To export true `.xlsx` files, import the lightweight subpath module:

```tsx
import { exportDataAsXlsx } from 'v-grid/excel'

// Trigger Excel download:
exportDataAsXlsx(flatItems, columns, {
  fileName: 'employees.xlsx',
  sheetName: 'Data',
})
```

### 2. Styles Import (`v-grid/styles`)
Import styles once at root entry:

```tsx
import 'v-grid/styles'
```

---

---

## Event Callbacks Reference

V_Grid provides comprehensive event callbacks for user interactions, column manipulation, row selection, editing, and layout changes.

### Complete Event Callbacks Example

```tsx
<VGrid
  // Grid Ready
  onGridReady={(e) => console.log('Grid API ready:', e.api)}

  // Column Drag / Reorder & Resize
  onColumnMoved={(e) => console.log(`Column ${e.colId} moved from index ${e.fromIndex} to ${e.toIndex}`)}
  onColumnResized={(e) => console.log(`Column ${e.colId} resized to ${e.newWidth}px`)}
  onColumnVisibilityChanged={(e) => console.log(`Column ${e.colId} visible: ${e.visible}`)}

  // Selection & Cell Edits
  onSelectionChanged={(e) => console.log('Selected rows:', e.selectedRows, 'Count:', e.selectedRows.length)}
  onCellValueChanged={(e) => console.log(`Cell [${e.colDef.field}] changed:`, e.oldValue, '->', e.newValue)}

  // Click & Interaction Events
  onRowClicked={(e) => console.log('Row clicked index:', e.rowIndex, 'Data:', e.data)}
  onRowDoubleClicked={(e) => console.log('Row double-clicked:', e.data)}
  onCellClicked={(e) => console.log('Cell clicked:', e.colDef.field, 'Value:', e.value)}
  onCellDoubleClicked={(e) => console.log('Cell double-clicked:', e.colDef.field)}

  // Filter, Sort & Pagination
  onFilterChanged={(e) => console.log('Active Filter Model:', e.filterModel)}
  onSortChanged={(e) => console.log('Active Sort Model:', e.sortModel)}
  onPaginationChanged={(e) => console.log(`Page changed: ${e.currentPage} / ${e.totalPages}, PageSize: ${e.pageSize}`)}

  // Context Menu & Clipboard
  onContextMenuAction={(actionId, params) => console.log('Context menu item clicked:', actionId, params)}
  onCopySelection={(data) => console.log('Copied selection range:', data)}

  // Row Grouping Events
  onRowGroupOpened={(e) => console.log('Group node expanded/collapsed:', e.node.key, 'Expanded:', e.node.expanded)}
  onRowGroupChanged={(e) => console.log('Grouping columns changed:', e.groupColIds)}
/>
```

### Event Callbacks Table

| Event Callback | Event Object Signature | Description |
| :--- | :--- | :--- |
| `onGridReady` | `{ api: GridApi<T> }` | Fired once when the grid initializes and the API is ready for use. |
| `onColumnMoved` | `{ colId: string, fromIndex: number, toIndex: number }` | Fired when a user drags a column header to reorder columns. |
| `onColumnResized` | `{ colId: string, newWidth: number }` | Fired when a user drags a column border to resize column width. |
| `onColumnVisibilityChanged` | `{ colId: string, visible: boolean }` | Fired when a column is shown or hidden. |
| `onSelectionChanged` | `{ selectedRows: T[], selectedNodes: RowNode<T>[] }` | Fired whenever row selection changes via click, drag, or checkbox. |
| `onCellValueChanged` | `{ data: T, colDef: ColDef<T>, oldValue: any, newValue: any, rowIndex: number }` | Fired when inline cell editing is committed. |
| `onRowClicked` | `{ data: T, rowIndex: number, event: MouseEvent }` | Fired when a row is clicked. |
| `onRowDoubleClicked` | `{ data: T, rowIndex: number, event: MouseEvent }` | Fired when a row is double clicked. |
| `onCellClicked` | `{ data: T, colDef: ColDef<T>, value: any, rowIndex: number, event: MouseEvent }` | Fired when a specific cell is clicked. |
| `onCellDoubleClicked` | `{ data: T, colDef: ColDef<T>, value: any, rowIndex: number, event: MouseEvent }` | Fired when a specific cell is double clicked. |
| `onFilterChanged` | `{ filterModel: FilterModel }` | Fired when any column filter or global search is updated. |
| `onSortChanged` | `{ sortModel: SortModel[] }` | Fired when column sorting changes. |
| `onPaginationChanged` | `{ currentPage: number, totalPages: number, pageSize: number, totalRows: number }` | Fired when page number or page size changes. |
| `onContextMenuAction` | `(actionId: string, params: ContextMenuActionParams<T>) => void` | Fired when a right-click context menu option is executed. |
| `onCopySelection` | `(data: CopiedSelectionData) => void` | Fired when cell range copy action is executed (Ctrl+C). |
| `onRowGroupOpened` | `{ node: GroupNode<T> }` | Fired when a row group node is expanded or collapsed. |
| `onRowGroupChanged` | `{ groupColIds: string[] }` | Fired when active row grouping columns change. |

### [GitHub Repository](https://github.com/VijaiAaditya/VGrid)

### [NPM Package](https://www.npmjs.com/package/@openden/v-grid)