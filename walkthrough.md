# V-Grid — Phase 2 Complete ✅

**Dev server: http://localhost:5173** — all features live via HMR

---

## What's New in Phase 2

### 📊 Row Grouping + Aggregations
Group rows by any column (drag to group panel or via API). Each group shows aggregated values aligned with their columns.

```tsx
<VGrid
  showRowGroupPanel={true}          // drag-drop panel above grid
  groupAggFunction={{
    salary: 'sum',                  // sum of salaries per group
    performanceScore: 'avg',        // avg score per group
    projects: 'sum',
  }}
  showGroupTotals={true}            // grand totals row
/>

// Or in ColDef:
{ field: 'salary', aggFunc: 'sum' }  // 'sum'|'avg'|'min'|'max'|'count'|'first'|'last'
{ field: 'salary', aggFunc: (values) => values.reduce((a, b) => a + b, 0) }  // custom fn
```

**API:**
```ts
api.setGroupByColumns(['department', 'role'])
api.expandAll()
api.collapseAll()
```

---

### 🌳 Tree Data
Hierarchical rows using a path-based data model.

```tsx
<VGrid
  treeData={true}
  getDataPath={(d) => [d.country, d.department, d.name]}
  autoExpandAll={false}
/>
```

---

### ⚡ Server-Side Row Model (SSRM)
Sort/filter/paginate on the server — only fetches the visible window.

```tsx
<VGrid
  rowModelType="serverSide"
  serverSideDatasource={{
    getRows: ({ request, success, fail }) => {
      fetch(`/api/rows?start=${request.startRow}&end=${request.endRow}`)
        .then(r => r.json())
        .then(data => success({ rowData: data.rows, rowCount: data.total }))
        .catch(fail)
    }
  }}
  cacheBlockSize={100}
/>
```

---

### ♾️ Infinite Scroll
Progressively loads blocks as user scrolls. Auto-fetches next block within 200px of bottom.

```tsx
<VGrid
  rowModelType="infinite"
  datasource={{
    getRows: ({ startRow, endRow, successCallback }) => {
      fetch(`/api/rows?from=${startRow}&to=${endRow}`)
        .then(r => r.json())
        .then(data => successCallback(data.rows, data.lastRow))
    }
  }}
/>
```

---

### ↩ Undo / Redo
Full edit history with `Ctrl+Z` / `Ctrl+Y`. Toast notification on each undo/redo.

```tsx
<VGrid enableUndoRedo={true} undoRedoCellEditingLimit={100} />

// API:
api.undo()
api.redo()
```

---

### ✅ Cell Validation
Prevent invalid values from being committed.

```tsx
{
  field: 'email',
  validate: (value, data) => {
    if (!String(value).includes('@')) return 'Must be a valid email'
    return null   // valid
  }
}
```

---

### 📈 Sparklines (zero-dependency SVG)
Mini charts rendered directly inside cells — line, bar, or area.

```tsx
import { Sparkline, createSparklineCellRenderer } from 'v-grid'

// In a cell renderer:
{ field: 'history', cellRenderer: ({ value }) => (
    <Sparkline data={value} options={{ type: 'area', color: '#648bff' }} />
)}

// Or use the factory:
{ field: 'history', cellRenderer: createSparklineCellRenderer({ type: 'line' }) }
```

---

### 🔧 Advanced Filter Builder
Visual AND/OR query builder panel.

```tsx
<VGrid enableFilterPanel={true} />
```

Users can add multiple conditions with operators (contains, equals, >, <, blank, etc.), switch between AND/OR logic, and apply instantly.

---

### 📥 XLSX Export
Downloads a styled .xlsx file with column widths, bold headers, and number formatting.

```tsx
api.exportDataAsXlsx({
  fileName: 'report.xlsx',
  sheetName: 'Employees',
  includeHeader: true,
  includeGroups: true,   // includes group rows with aggregations
  onlySelected: false,
})
```

---

### ✏️ Drag Fill Handle
Excel-style corner handle on range selection. Drag down to:
- **Numbers**: auto-increment (detects step from adjacent values)
- **Strings**: copy value
- **Dates**: increment by 1 day per row

```tsx
<VGrid enableFillHandle={true} enableRangeSelection={true} />
```

---

### 🪟 Popup Editors
Floating card editor that positions itself above/below the cell.

```tsx
{ field: 'notes', editable: true, cellEditorPopup: true, cellEditor: 'textarea' }
```

---

## Keyboard Shortcuts (Full List)

| Key | Action |
|---|---|
| `↑↓←→` | Navigate cells |
| `Tab / Shift+Tab` | Next / previous cell |
| `Enter / F2` | Edit focused cell |
| `Escape` | Cancel edit |
| `Delete / Backspace` | Clear cell value |
| `Ctrl+C` | Copy range to clipboard |
| `Ctrl+Z` | Undo last edit |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |

---

## Phase 2 Files Created

| File | Purpose |
|---|---|
| `features/groupEngine.ts` | Group tree builder + aggregation engine |
| `features/treeEngine.ts` | Hierarchical tree data flattener |
| `features/undoStack.ts` | Edit history stack (outside React state) |
| `features/xlsxExporter.ts` | SheetJS-based XLSX exporter |
| `components/GroupRow.tsx` | Collapsible group row with aggregation cells |
| `components/RowGroupPanel.tsx` | Drag-drop group panel above grid |
| `components/FilterBuilder.tsx` | AND/OR visual filter builder |
| `components/Sparkline.tsx` | Zero-dep SVG sparklines (line/bar/area) |
| `components/PopupEditor.tsx` | Portal-based floating cell editor |
| `hooks/useDragFill.ts` | Excel drag-fill handle hook |

---

## Phase 3 Roadmap
- Cross-Tab Pivot Tables
- Integrated Chart Engine (bar, line, pie)
- Column Visibility Panel (show/hide columns UI)
- API based data fetch

