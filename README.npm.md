# V_Grid

> Ultra-fast, fully-featured, lightweight React data grid with virtualization, pinning, sorting, filtering, editing, row grouping, and Excel exports.

## Quick Start

```bash
npm install v-grid
```

```tsx
import { VGrid } from '@openden/v-grid'
import '@openden/v-grid/styles'

export function App() {
  return (
    <VGrid
      rowData={[{ id: 1, name: 'Alice', avatar: 'https://example.com/pic.jpg', bio: '<b>Senior Dev</b>', video: 'https://example.com/intro.mp4', meta: { role: 'admin', active: true } }]}
      columnDefs={[
        { field: 'name' },
        { field: 'avatar', columnType: 'image' },
        { field: 'bio', columnType: 'html' },
        { field: 'video', columnType: 'video' },
        { field: 'meta', headerName: 'Config (JSON)', columnType: 'json', editable: true }
      ]}
      rowNumberColumn={{ clickToOpenJsonModal: true }}
      rowSelection="multiple"
      checkboxSelection={true}
    />
  )
}
```

## Features
- **Dynamic Multi-Select Column Picker (`ColumnPicker`)**: Multi-choose column picker dropdown with play-style icon (`▶`) and hover tooltip (`Choose Columns`). Toggling a column on appends it to the end of visible columns with `onColumnVisibilityChanged` callback event.
- **Whole-Row Data JSON Popup (`rowNumberColumn: true`, `rowClickJsonModal: true`)**: Prepends a dedicated serial-number (`#`) column. Single-clicking any row number cell pops up the **entire raw row object with all fields** in an interactive `JsonModal`. Cell has an eye icon visual hint on hover and is always read-only.

- **Media & Content Column Types (`columnType`)**:
  - `'image'`: In-cell thumbnail & full resolution image viewer modal.
  - `'html'`: In-cell link & sanitized HTML rendering modal.
  - `'video'`: In-cell link & video player modal with clickable link.
  - `'json'`: In-cell JSON preview + interactive popup editor modal (double-click or `⤢` button). **Single click is intentionally disabled** — inline editing is always popup-only. Use `jsonTrigger: 'none'` to make a JSON column display-only.

- **Pagination**: Built-in page navigation bar with first/prev/next/last buttons, page-size selector, page number input, and row count summary. Configure with `pagination`, `paginationPageSize`, and `paginationPageSizeOptions` props. React to changes via `onPaginationChanged`.

---

### [GitHub Repository](https://github.com/VijaiAaditya/VGrid)

### [NPM Package](https://www.npmjs.com/package/@openden/v-grid)

## Feedback & Issues

Have suggestions, feature requests, or found a bug? We'd love to hear from you! Please submit your feedback and raise issues on [GitHub Issues](https://github.com/VijaiAaditya/VGrid/issues).


