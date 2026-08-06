# V-Grid

**Ultra-fast, lightweight, zero-dependency React data grid with virtualization, pinning, sorting, filtering, editing, row grouping, context menus, pagination, and Excel exports.**

[![npm version](https://img.shields.io/npm/v/@openden/v-grid.svg?style=flat-square&color=cb3837)](https://www.npmjs.com/package/@openden/v-grid)
[![npm downloads](https://img.shields.io/npm/dm/@openden/v-grid.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/@openden/v-grid)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![React 18+](https://img.shields.io/badge/React-18%2B-61dafb)]()
[![License](https://img.shields.io/badge/License-MIT-brightgreen)](https://opensource.org/licenses/MIT)

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
    { id: 1, name: 'Alice', department: 'Engineering', salary: 95000, status: 'Active', config: { theme: 'dark', permissions: ['read', 'write'] } },
    { id: 2, name: 'Bob', department: 'Sales', salary: 78000, status: 'On Leave', config: { theme: 'light', permissions: ['read'] } },
  ]

  const columnDefs = [
    { field: 'name', headerName: 'Employee Name', sortable: true, filter: 'text' },
    { field: 'department', headerName: 'Department', filter: 'excel', filterParams: { options: ['Engineering', 'Sales', 'HR', 'Marketing'] } },
    { field: 'salary', headerName: 'Salary', filter: 'number', valueFormatter: (p) => `$${Number(p.value).toLocaleString()}` },
    { field: 'config', headerName: 'User Config (JSON)', columnType: 'json', editable: true, width: 180 },
    { field: 'status', headerName: 'Status', filter: 'select', editable: true, cellEditor: 'select', cellEditorParams: { options: ['Active', 'On Leave', 'Remote'] } },
  ]

  return (
    <div style={{ height: 500, width: '100%' }}>
      <VGrid
        rowData={rowData}
        columnDefs={columnDefs}
        rowNumberColumn={{ clickToOpenJsonModal: true }}
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
| `rowData` | `any[]` | `[]` | Array of row data objects to display in the grid. |
| `columnDefs` | `ColDef[]` | `[]` | Array of column definitions describing headers, fields, and behavior. |
| `defaultColDef` | `Partial<ColDef>` | `{}` | Default settings merged into every column definition. |
| `theme` | `'dark' \| 'light' \| 'custom'` | `'dark'` | Visual theme for the grid. |
| `rowHeight` | `number` | `36` | Height of rows in pixels. |
| `headerHeight` | `number` | `38` | Height of column headers in pixels. |
| `getRowId` | `(data: any) => string` | `data.id` | Callback returning a unique identifier string for each row. |

### Selection Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `rowSelection` | `'multiple' \| 'single'` | `'multiple'` | Enable single or multi-row selection. |
| `checkboxSelection` | `boolean` | `false` | Automatically adds a pinned left checkbox selection column. |
| `rowNumberColumn` | `boolean` | `false` | Prepends a read-only serial number (#) column. If `rowClickJsonModal` is also `true`, clicking the serial cell opens the row data JSON popup. |
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
| `contextMenuItems` | `ContextMenuItem[]` | `DEFAULT` | Array of built-in or custom context menu items with callbacks. |
| `onContextMenuAction` | `(actionId: string, params: ContextMenuActionParams) => void` | `undefined` | Fired when a context menu item action executes. |

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

The pagination bar includes: **first / previous / next / last** navigation buttons, a **page-size selector** dropdown, a **page number input**, and a **row count summary** (`Showing X–Y of N rows`).

Use the `onPaginationChanged` callback to react to page changes:

```tsx
<VGrid
  pagination={true}
  paginationPageSize={20}
  paginationPageSizeOptions={[10, 20, 50, 100]}
  onPaginationChanged={(e) =>
    console.log(`Page ${e.currentPage} of ${e.totalPages} — ${e.totalRows} total rows`)
  }
/>

### Grouping, Tree & Master-Detail Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `showGroupPanel` | `boolean` | `false` | Shows top drag-and-drop panel to group rows by columns. |
| `treeData` | `boolean` | `false` | Enables hierarchical tree row rendering using parent-child row nodes. |
| `masterDetail` | `boolean` | `false` | Enables expandable row detail views. |
| `detailCellRenderer` | `(params: DetailCellRendererParams) => ReactNode` | `undefined` | Custom React renderer for expanded detail rows. |
| `detailRowHeight` | `number` | `180` | Pixel height reserved for expanded detail view rows. |

### Server-Side Data Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `serverSideDatasource` | `IServerSideDatasource` | `undefined` | Enterprise Server-Side Row Model (SSRM) data provider. |
| `infiniteDatasource` | `IInfiniteDatasource` | `undefined` | Infinite scroll data provider. |

### Excel Export Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `excelStyles` | `ExcelStyleDef[]` | `undefined` | Custom styling configurations for Excel cell formatting. |
| `excelExportParams` | `XlsxExportParams` | `undefined` | Default configuration settings for the Excel export action. |

---

## Column Definition Reference (`ColDef`)

| Property | Type | Description |
| :--- | :--- | :--- |
| `field` | `string` | Object property field name to bind cell value. |
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
| `columnType` | `'string' \| 'number' \| 'date' \| 'boolean' \| 'json' \| 'image' \| 'html' \| 'video'` | Declares column data type. Supports JSON, image, html, and video popups. |
| `cellEditor` | `'text' \| 'number' \| 'select' \| 'date' \| 'textarea' \| 'json' \| 'image' \| 'html' \| 'video'` | Built-in cell editor type when entering edit mode. |
| `cellEditorParams` | `{ options?: string[] }` | Option choices passed to `'select'` cell editor. |
| `jsonTrigger` | `'dblclick' \| 'none'` | Controls how the JSON popup opens for `columnType: 'json'` columns. `'dblclick'` (default) opens on double-click; `'none'` disables the modal entirely. |
| `cellRenderer` | `(params: CellRendererParams) => ReactNode` | Custom React element renderer for cells in this column. |
| `headerRenderer` | `(params: HeaderRendererParams) => ReactNode` | Custom React renderer for the column header cell. |
| `valueGetter` | `(params: ValueGetterParams) => any` | Function to compute dynamic or nested cell values. |
| `valueFormatter` | `(params: ValueFormatterParams) => string` | Function to format raw values into display text (e.g. currency). |

### Dynamic Multi-Select Column Picker (`ColumnPicker`)

V-Grid provides an interactive multi-select column picker to dynamically choose which columns appear on the grid.
- **Added at the end**: Toggling a hidden column back on automatically appends it to the end of the active visible columns.
- **Built-in Header Icon**: Rendered by default in the serial number / checkbox header cell with a sleek play-style column manager icon (`▶`) and hover tooltip (`Choose Columns`).

- **Standalone Component**: Can also be rendered separately anywhere in your toolbar or custom UI.
- **Callback Event (`onColumnVisibilityChanged`)**: Emits the toggled column ID, visibility status, and full list of current visible columns.

#### Callback Props Comparison: `onColumnToggle` vs `onColumnsChange`

| Callback Prop | Trigger Event | Passed Data | Primary Use Case |
| :--- | :--- | :--- | :--- |
| **`onColumnToggle(colId, visible)`** | Fires when **one specific column** is checked or unchecked. | `colId: string`<br/>`visible: boolean` | Tracking single-column visibility toggles or auditing user actions. |
| **`onColumnsChange(visibleColumns)`** | Fires on **any visibility change** (single toggle, Select All, or Deselect All). | `visibleColumns: ColDef[]` | Saving or syncing the **complete active visible columns layout** to a server API or `localStorage`. |

#### 1. Embedded Header Picker (`columnPicker={true}` or `{ position: ColumnPickerPosition.HEADER }`)
```tsx
import { VGrid, ColumnPickerPosition } from '@openden/v-grid'

// Simple boolean (defaults to header position):
<VGrid
  rowData={rowData}
  columnDefs={columnDefs}
  columnPicker={true} // Enabled in serial/id header cell (default)
  onColumnVisibilityChanged={(e) => console.log('Visible columns:', e.visibleColumns)}
/>

// Or object configuration using Enum:
<VGrid
  rowData={rowData}
  columnDefs={columnDefs}
  columnPicker={{ enabled: true, position: ColumnPickerPosition.HEADER }}
  onColumnVisibilityChanged={(e) => console.log('Visible columns:', e.visibleColumns)}
/>
```

#### 2. Top-Left Corner Toolbar Picker (`columnPicker={{ position: ColumnPickerPosition.TOP_LEFT }}`)
```tsx
import { VGrid, ColumnPickerPosition } from '@openden/v-grid'

<VGrid
  rowData={rowData}
  columnDefs={columnDefs}
  columnPicker={{ enabled: true, position: ColumnPickerPosition.TOP_LEFT }} // Rendered in top-left toolbar above grid
  onColumnVisibilityChanged={(e) => console.log('Visible columns:', e.visibleColumns)}
/>
```


#### 2. Standalone ColumnPicker Component
```tsx
import { ColumnPicker } from '@openden/v-grid'

export function MyToolbar({ columns, handleToggle, handleFullLayoutSave }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <ColumnPicker
        columns={columns}
        // 1. Listen to individual column toggle events:
        onColumnToggle={(colId, visible) => {
          console.log(`Single column changed: ${colId} -> ${visible}`)
          handleToggle(colId, visible)
        }}
        // 2. Or receive the complete list of visible columns (e.g. after 'Select All' / 'Deselect All' / Toggle):
        onColumnsChange={(visibleCols) => {
          console.log('Save full visible column layout:', visibleCols)
          handleFullLayoutSave(visibleCols)
        }}
        theme="dark"
      />
    </div>
  )
}
```


---

### Whole-Row Data JSON Popup (`rowNumberColumn: { clickToOpenJsonModal: true }`)

By setting `rowNumberColumn={{ clickToOpenJsonModal: true }}` on `<VGrid />`, a dedicated serial-number (`#`) column is prepended. 
- A single click on the serial-number cell opens an interactive `JsonModal` popup showing the **entire raw row object with all fields**.
- The serial-number cell is read-only (no edit cursor, no inline editing).
- Visually, hovering over the cell shows a subtle `👁` eye icon as a guide.

```tsx
<VGrid
  rowData={rowData}
  columnDefs={columnDefs}
  rowNumberColumn={{ clickToOpenJsonModal: true }} // Enable serial-number column + single-click popup
/>
```


---

### Media & Content Column Types (`image`, `html`, `video`)

V-Grid provides built-in media previewers with interactive popup modal dialogs:

1. **`columnType: 'image'`**: Displays an in-cell image thumbnail & "View Image" trigger. Clicking or double-clicking pops up the full-resolution image dialog.
2. **`columnType: 'html'`**: Displays an in-cell "Render HTML Popup" link. Clicking renders the raw HTML content in a sanitized modal container.
3. **`columnType: 'video'`**: Displays an in-cell video link/icon (`🎬 Watch Video`). Clicking opens a video player popup modal with direct playback controls and a clickable video URL link.

```tsx
const columnDefs = [
  { field: 'avatarUrl', headerName: 'Avatar', columnType: 'image', width: 140 },
  { field: 'bioHtml', headerName: 'Biography', columnType: 'html', width: 160 },
  { field: 'demoVideo', headerName: 'Video Link', columnType: 'video', width: 160 },
  { field: 'config', headerName: 'Row Metadata', columnType: 'json', width: 180 },
]
```

---

### JSON Column Type (`columnType: 'json'`)

When a column is configured with `columnType: 'json'`, V-Grid automatically handles structured object/array data with a **popup-only** editing model:

- **In-Cell Preview**: Displays a clean, single-line JSON string preview with an expand icon button (`⤢`).
- **Single click**: Does nothing — the cell does not become focused or editable on single click.
- **Popup Modal** (double-click the cell, or click the `⤢` button): Opens the interactive JSON viewer & editor modal.
- **No Inline Editing**: Inline text editing is fully disabled for JSON columns regardless of the grid's `editable` prop. All edits happen exclusively inside the popup modal.
- **Modal Capabilities**: JSON Prettify (2-space), Minify, Copy to Clipboard, and live syntax validation.

```tsx
const columnDefs = [
  {
    field: 'payload',
    headerName: 'Event Data (JSON)',
    columnType: 'json',
    editable: true,   // enables Save button in the popup modal
    width: 200,
  },
]
```

#### `jsonTrigger` — Control how the popup opens

| Value | Behaviour |
| :--- | :--- |
| `'dblclick'` *(default)* | Double-clicking the cell body opens the popup. The `⤢` button also opens it. |
| `'none'` | The popup and the `⤢` expand button are completely hidden (view-only). |

```tsx
// Disable popup entirely — display only, no editing
{ field: 'payload', columnType: 'json', jsonTrigger: 'none' }
```


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
  exportMode: 'filtered', // 'filtered' (default) exports active rows, 'all' exports all original rows
})
```

You can also trigger exports using the Grid API on the ref:
```tsx
// Using the grid ref API
apiRef.current?.exportDataAsXlsx({
  fileName: 'grid-export.xlsx',
  exportMode: 'all', // export all rows unfiltered
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
| `onGridReady` | `{ api: GridApi }` | Fired once when the grid initializes and the API is ready for use. |
| `onColumnMoved` | `{ colId: string, fromIndex: number, toIndex: number }` | Fired when a user drags a column header to reorder columns. |
| `onColumnResized` | `{ colId: string, newWidth: number }` | Fired when a user drags a column border to resize column width. |
| `onColumnVisibilityChanged` | `{ colId: string, visible: boolean }` | Fired when a column is shown or hidden. |
| `onSelectionChanged` | `{ selectedRows: any[], selectedNodes: RowNode[] }` | Fired whenever row selection changes via click, drag, or checkbox. |
| `onCellValueChanged` | `{ data: any, colDef: ColDef, oldValue: any, newValue: any, rowIndex: number }` | Fired when inline cell editing is committed. |
| `onRowClicked` | `{ data: any, rowIndex: number, event: MouseEvent }` | Fired when a row is clicked. |
| `onRowDoubleClicked` | `{ data: any, rowIndex: number, event: MouseEvent }` | Fired when a row is double clicked. |
| `onCellClicked` | `{ data: any, colDef: ColDef, value: any, rowIndex: number, event: MouseEvent }` | Fired when a specific cell is clicked. |
| `onCellDoubleClicked` | `{ data: any, colDef: ColDef, value: any, rowIndex: number, event: MouseEvent }` | Fired when a specific cell is double clicked. |
| `onFilterChanged` | `{ filterModel: FilterModel }` | Fired when any column filter or global search is updated. |
| `onSortChanged` | `{ sortModel: SortModel[] }` | Fired when column sorting changes. |
| `onPaginationChanged` | `{ currentPage: number, totalPages: number, pageSize: number, totalRows: number }` | Fired when page number or page size changes. |
| `onContextMenuAction` | `(actionId: string, params: ContextMenuActionParams) => void` | Fired when a right-click context menu option is executed. |
| `onCopySelection` | `(data: CopiedSelectionData) => void` | Fired when cell range copy action is executed (Ctrl+C). |
| `onRowGroupOpened` | `{ node: GroupNode }` | Fired when a row group node is expanded or collapsed. |
| `onRowGroupChanged` | `{ groupColIds: string[] }` | Fired when active row grouping columns change. |


---

### [GitHub Repository](https://github.com/VijaiAaditya/VGrid)

### [NPM Package](https://www.npmjs.com/package/@openden/v-grid)

## Feedback & Issues

Have suggestions, feature requests, or found a bug? We'd love to hear from you! Please submit your feedback and raise issues on [GitHub Issues](https://github.com/VijaiAaditya/VGrid/issues).
