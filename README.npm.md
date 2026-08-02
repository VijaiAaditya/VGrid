# V_Grid

> Ultra-fast, fully-featured, lightweight React data grid with virtualization, pinning, sorting, filtering, editing, row grouping, and Excel exports.

## Quick Start

```bash
npm install v-grid
```

```tsx
import { VGrid } from 'v-grid'
import 'v-grid/styles'

export function App() {
  return (
    <VGrid
      rowData={[{ id: 1, name: 'Alice' }]}
      columnDefs={[{ field: 'id' }, { field: 'name' }]}
      rowSelection="multiple"
      checkboxSelection={true}
    />
  )
}
```

## Feedback & Issues

Have suggestions, feature requests, or found a bug? We'd love to hear from you! Please submit your feedback and raise issues on [GitHub Issues](https://github.com/VijaiAaditya/VGrid/issues).

---

### [GitHub Repository](https://github.com/VijaiAaditya/VGrid)

### [NPM Package](https://www.npmjs.com/package/@openden/v-grid)