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
        { field: 'id', headerName: '#' },
        { field: 'name' },
        { field: 'avatar', columnType: 'image' },
        { field: 'bio', columnType: 'html' },
        { field: 'video', columnType: 'video' },
        { field: 'meta', headerName: 'Config (JSON)', columnType: 'json', editable: true }
      ]}
      rowClickJsonModal={true}
      rowSelection="multiple"
      checkboxSelection={true}
    />
  )
}
```

## Features
- **Dynamic Multi-Select Column Picker (`ColumnPicker`)**: Multi-choose column picker dropdown with play-style icon (`▶`) and hover tooltip (`Choose Columns`). Toggling a column on appends it to the end of visible columns with `onColumnVisibilityChanged` callback event.
- **Whole-Row Data JSON Popup (`rowClickJsonModal: true`)**: Double-clicking row index cell (`#`) or checkbox cell pops up the **entire raw row object with all existing fields** (including unpopulated or hidden data) in an interactive `JsonModal`.

- **Media & Content Column Types (`columnType`)**:
  - `'image'`: In-cell thumbnail & full resolution image viewer modal.
  - `'html'`: In-cell link & sanitized HTML rendering modal.
  - `'video'`: In-cell link & video player modal with clickable link.

---

### [GitHub Repository](https://github.com/VijaiAaditya/VGrid)

### [NPM Package](https://www.npmjs.com/package/@openden/v-grid)

## Feedback & Issues

Have suggestions, feature requests, or found a bug? We'd love to hear from you! Please submit your feedback and raise issues on [GitHub Issues](https://github.com/VijaiAaditya/VGrid/issues).


