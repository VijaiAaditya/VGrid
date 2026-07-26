import React, { memo, useCallback, useMemo, useState, useRef, useEffect } from 'react'
import type { InternalColDef } from '../store/createGridStore'
import type { ColDef, RowData, SortModel, GridApi, FloatingFilterOperator } from '../types'
import { useColumnResize } from '../hooks/useColumnResize'


// ─── Sort Icon ────────────────────────────────────────────────────────────────

const SortIcon = memo(({ direction }: { direction: 'asc' | 'desc' | null }) => {
  if (!direction) return (
    <span className="vgrid-header-cell__sort-icon" aria-hidden>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
        <path d="M5 1L8 4H2L5 1Z" opacity="0.4" />
        <path d="M5 9L2 6H8L5 9Z" opacity="0.4" />
      </svg>
    </span>
  )
  return (
    <span className="vgrid-header-cell__sort-icon" aria-hidden>
      {direction === 'asc' ? (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M5 1L8 5H2L5 1Z" />
          <path d="M5 9L2 6H8L5 9Z" opacity="0.3" />
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M5 1L8 4H2L5 1Z" opacity="0.3" />
          <path d="M5 9L2 6H8L5 9Z" />
        </svg>
      )}
    </span>
  )
})


// ─── Single Header Cell ───────────────────────────────────────────────────────

interface HeaderCellProps<T> {
  col: InternalColDef<T>
  sortModel: SortModel[]
  onSort: (colId: string, multiSort: boolean) => void
  onResize: (colId: string, newWidth: number) => void
  onMoveColumn?: (fromColId: string, toColId: string) => void
  api: GridApi<T>
  isCheckbox?: boolean
  onSelectAll?: (checked: boolean) => void
  allSelected?: boolean
  someSelected?: boolean
  style?: React.CSSProperties
}

const HeaderCell = memo(<T extends RowData>(props: HeaderCellProps<T>) => {
  const { col, sortModel, onSort, onResize, onMoveColumn, api, isCheckbox, onSelectAll, allSelected, someSelected, style } = props

  const sortEntry = sortModel.find((s) => s.colId === col._colId)
  const sortDirection = sortEntry?.sort ?? null
  const sortIndex = sortModel.length > 1 ? sortModel.findIndex((s) => s.colId === col._colId) : -1

  const { handleRef } = useColumnResize({
    colId: col._colId,
    initialWidth: col._width,
    minWidth: col.minWidth,
    maxWidth: col.maxWidth,
    onResize,
  })

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!col.sortable) return
    onSort(col._colId, e.shiftKey)
  }, [col._colId, col.sortable, onSort])

  // Drag and Drop Event Handlers
  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (isCheckbox) return
    e.dataTransfer.setData('vgrid-col-id', col._colId)
    e.dataTransfer.effectAllowed = 'move'
    e.currentTarget.classList.add('vgrid-header-cell--dragging')
  }, [col._colId, isCheckbox])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    e.currentTarget.classList.remove('vgrid-header-cell--dragging')
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (isCheckbox) return
    if (e.dataTransfer.types.includes('vgrid-col-id')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      e.currentTarget.classList.add('vgrid-header-cell--drag-over')
    }
  }, [isCheckbox])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.currentTarget.classList.remove('vgrid-header-cell--drag-over')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('vgrid-header-cell--drag-over')
    const sourceColId = e.dataTransfer.getData('vgrid-col-id')
    if (sourceColId && sourceColId !== col._colId) {
      onMoveColumn?.(sourceColId, col._colId)
    }
  }, [col._colId, onMoveColumn])

  const cellStyle: React.CSSProperties = {
    width: col._width,
    minWidth: col._width,
    maxWidth: col._width,
    cursor: isCheckbox ? 'default' : 'grab',
    ...style,
  }

  // Checkbox column header
  if (isCheckbox) {
    return (
      <div className="vgrid-checkbox-cell vgrid-header-cell" style={{ width: 40, minWidth: 40, maxWidth: 40 }}>
        {col.headerCheckboxSelection && (
          <input
            type="checkbox"
            className="vgrid-checkbox"
            checked={allSelected ?? false}
            ref={(el) => {
              if (el) el.indeterminate = !!(someSelected && !allSelected)
            }}
            onChange={(e) => onSelectAll?.(e.target.checked)}
            aria-label="Select all rows"
          />
        )}
      </div>
    )
  }

  const classes = [
    'vgrid-header-cell',
    col.sortable ? 'vgrid-header-cell--sortable' : '',
    sortDirection ? 'vgrid-header-cell--sorted' : '',
    col.headerClass ?? '',
  ].filter(Boolean).join(' ')

  const displayName = col.headerName ?? col.field ?? col._colId

  return (
    <div
      className={classes}
      style={cellStyle}
      onClick={handleClick}
      role={col.sortable ? 'button' : 'columnheader'}
      aria-sort={sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : undefined}
      tabIndex={col.sortable ? 0 : -1}
      onKeyDown={(e) => { if (e.key === 'Enter' && col.sortable) onSort(col._colId, e.shiftKey) }}
      draggable={!isCheckbox && col.draggable !== false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {col.headerRenderer
        ? col.headerRenderer({ colDef: col, displayName, api })
        : <span className="vgrid-header-cell__label">{displayName}</span>
      }
      {col.sortable && <SortIcon direction={sortDirection} />}
      {sortIndex >= 0 && <span className="vgrid-sort-index">{sortIndex + 1}</span>}
      {col.resizable !== false && (
        <div
          ref={handleRef}
          className="vgrid-resize-handle"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          aria-hidden
        />
      )}
    </div>
  )
}) as <T extends RowData>(props: HeaderCellProps<T>) => React.ReactElement | null



// ─── Column Group Header Row ──────────────────────────────────────────────────

interface GroupHeaderRowProps<T> {
  columnDefs: ColDef<T>[]
  columns: InternalColDef<T>[]
  scrollLeft: number
  pinnedLeftWidth: number
  pinnedRightWidth: number
}

const GroupHeaderRow = memo(<T extends RowData>(props: GroupHeaderRowProps<T>) => {
  const { columnDefs, columns, scrollLeft } = props

  // Build group header cells
  const cells: React.ReactNode[] = []

  function renderGroupDef(def: ColDef<T>, colMap: Map<string, InternalColDef<T>>): React.ReactNode {
    if (!def.children || def.children.length === 0) {
      const internal = colMap.get(def.colId || def.field || '')
      if (!internal) return null
      return (
        <div
          key={internal._colId}
          className="vgrid-group-header-cell"
          style={{ width: internal._width }}
          aria-hidden
        />
      )
    }

    // Compute total width of children
    let totalWidth = 0
    function countWidth(d: ColDef<T>): void {
      if (!d.children || d.children.length === 0) {
        const col = colMap.get(d.colId || d.field || '')
        if (col) totalWidth += col._width
      } else {
        d.children.forEach(countWidth)
      }
    }
    countWidth(def)

    return (
      <div
        key={def.groupId || def.headerName}
        className="vgrid-group-header-cell"
        style={{ width: totalWidth }}
      >
        {def.headerName}
      </div>
    )
  }

  const colMap = new Map(columns.map((c) => [c._colId, c]))
  for (const def of columnDefs) {
    cells.push(renderGroupDef(def, colMap))
  }

  return (
    <div className="vgrid-header-group-row" style={{ transform: `translateX(-${scrollLeft}px)` }}>
      {cells}
    </div>
  )
}) as <T extends RowData>(props: GroupHeaderRowProps<T>) => React.ReactElement | null



// ─── Floating Filter Row ──────────────────────────────────────────────────────

interface ExcelFilterDropdownProps {
  options: string[]
  selected: Set<string>
  onToggle: (val: string) => void
  onSelectAll: () => void
  onClear: () => void
  onClose: () => void
  anchorRef: React.RefObject<HTMLDivElement | null>
}

const ExcelFilterDropdown = memo(function ExcelFilterDropdown(props: ExcelFilterDropdownProps) {
  const { options, selected, onToggle, onSelectAll, onClear, onClose, anchorRef } = props
  const dropRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        dropRef.current && !dropRef.current.contains(target) &&
        anchorRef.current && !anchorRef.current.contains(target)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [onClose, anchorRef])

  const popStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    zIndex: 9999,
    minWidth: 180,
    maxHeight: 260,
    background: 'var(--vg-bg-header, #1e2433)',
    border: '1px solid var(--vg-border-color, #2d3748)',
    borderRadius: 6,
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'var(--vg-font-family, system-ui)',
    fontSize: 12,
    color: 'var(--vg-text-primary, #e2e8f0)',
  }

  const [search, setSearch] = useState('')

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const q = search.toLowerCase()
    return options.filter((o) => String(o).toLowerCase().includes(q))
  }, [options, search])

  return (
    <div ref={dropRef} style={popStyle}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 4, padding: '4px 8px', borderBottom: '1px solid var(--vg-border-color, #2d3748)', flexShrink: 0 }}>
        <button
          style={excelBtnStyle}
          onClick={onSelectAll}
        >
          All
        </button>
        <button
          style={excelBtnStyle}
          onClick={onClear}
        >
          Clear
        </button>
        <button
          style={{ ...excelBtnStyle, marginLeft: 'auto', padding: '2px 6px' }}
          onClick={onClose}
          title="Close"
        >
          ✕
        </button>
      </div>
      {/* Search Input */}
      <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--vg-border-color, #2d3748)', flexShrink: 0 }}>
        <input
          type="search"
          placeholder="Search dropdown..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '3px 6px',
            fontSize: 11,
            borderRadius: 4,
            border: '1px solid var(--vg-border-color, #2d3748)',
            background: 'var(--vg-bg-grid, #111827)',
            color: 'var(--vg-text-primary, #e2e8f0)',
            outline: 'none',
          }}
        />
      </div>
      {/* Option list */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '2px 0' }}>
        {filteredOptions.map((opt) => (
          <label
            key={opt}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 8px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <input
              type="checkbox"
              checked={selected.has(opt)}
              onChange={() => onToggle(opt)}
              style={{ accentColor: 'var(--vg-accent, #4a6cf7)', cursor: 'pointer' }}
            />
            <span>{opt}</span>
          </label>
        ))}
        {filteredOptions.length === 0 && (
          <div style={{ padding: '8px', color: 'var(--vg-text-muted, #718096)' }}>No values</div>
        )}
      </div>
    </div>
  )
})

const excelBtnStyle: React.CSSProperties = {
  padding: '2px 8px',
  background: 'transparent',
  border: '1px solid var(--vg-border-color, #2d3748)',
  borderRadius: 4,
  color: 'var(--vg-text-primary, #e2e8f0)',
  fontSize: 11,
  cursor: 'pointer',
}

interface FloatingFilterRowProps<T> {
  columns: InternalColDef<T>[]
  filterValues: Record<string, string>
  filterOperators: Record<string, FloatingFilterOperator>
  onFilterChange: (colId: string, value: string) => void
  onFilterOperatorChange: (colId: string, op: FloatingFilterOperator) => void
  scrollLeft: number
  checkboxWidth: number
  uniqueValues?: Record<string, string[]>
}

export const FloatingFilterRow = memo(<T extends RowData>(props: FloatingFilterRowProps<T>) => {
  const {
    columns, filterValues, filterOperators,
    onFilterChange, onFilterOperatorChange,
    scrollLeft, checkboxWidth, uniqueValues,
  } = props

  const [excelOpen, setExcelOpen] = useState<Record<string, boolean>>({})
  const [excelSelected, setExcelSelected] = useState<Record<string, Set<string>>>({})
  const anchorRefs = useRef<Record<string, React.RefObject<HTMLDivElement | null>>>({})

  const getAnchorRef = (colId: string): React.RefObject<HTMLDivElement | null> => {
    if (!anchorRefs.current[colId]) {
      anchorRefs.current[colId] = React.createRef<HTMLDivElement>()
    }
    return anchorRefs.current[colId]
  }

  const pinnedLeft = columns.filter((c) => c.pinned === 'left' && !c.hide)
  const pinnedRight = columns.filter((c) => c.pinned === 'right' && !c.hide)
  const normal = columns.filter((c) => !c.pinned && !c.hide)

  const renderCell = (col: InternalColDef<T>) => {
    const val = filterValues[col._colId] ?? ''
    const operator = filterOperators[col._colId] ?? 'contains'

    const filterProp = col.filter
    let effectiveFilterType: string | false
    if (filterProp === false) {
      effectiveFilterType = false
    } else if (typeof filterProp === 'string') {
      effectiveFilterType = filterProp
    } else if (filterProp === true || filterProp === undefined) {
      const ct = col.columnType
      effectiveFilterType = ct === 'number' ? 'number'
        : ct === 'date'    ? 'date'
        : ct === 'boolean' ? 'select'
        : 'text'
    } else {
      effectiveFilterType = false
    }
    const isSelect = effectiveFilterType === 'select'
    const isExcel  = effectiveFilterType === 'excel'
    const isNumber = effectiveFilterType === 'number'
    const isDate   = effectiveFilterType === 'date'
    const isText   = !isSelect && !isExcel && !isNumber && !isDate && effectiveFilterType !== false

    if (effectiveFilterType === false) {
      return <div key={col._colId} className="vgrid-filter-cell" style={{ width: col._width, minWidth: col._width }} />
    }

    if (isExcel) {
      const anchorRef = getAnchorRef(col._colId)
      const isOpen = excelOpen[col._colId] ?? false
      const allOptions = uniqueValues?.[col._colId] ?? []
      const selected = excelSelected[col._colId] ?? new Set<string>()
      const hasFilter = selected.size > 0 && selected.size < allOptions.length

      const toggle = (v: string) => {
        setExcelSelected((prev) => {
          const s = new Set(prev[col._colId] ?? allOptions)
          if (s.has(v)) s.delete(v)
          else s.add(v)
          const next = { ...prev, [col._colId]: s }
          onFilterChange(col._colId, s.size === allOptions.length ? '' : Array.from(s).join(','))
          return next
        })
      }
      const selectAll = () => {
        setExcelSelected((prev) => ({
          ...prev,
          [col._colId]: new Set(allOptions),
        }))
        onFilterChange(col._colId, '')
      }
      const clearAll = () => {
        setExcelSelected((prev) => ({
          ...prev,
          [col._colId]: new Set<string>(),
        }))
        onFilterChange(col._colId, '__none__')
      }

      return (
        <div
          key={col._colId}
          ref={anchorRef as React.RefObject<HTMLDivElement>}
          className="vgrid-filter-cell"
          style={{ width: col._width, minWidth: col._width, position: 'relative' }}
        >
          <button
            id={`vgrid-excel-filter-${col._colId}`}
            title={`Filter ${col.headerName ?? col.field ?? ''}`}
            onClick={() => setExcelOpen((prev) => ({ ...prev, [col._colId]: !prev[col._colId] }))}
            style={{
              width: '100%',
              height: 'calc(100% - 4px)',
              margin: '2px 0',
              padding: '0 6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: hasFilter ? 'rgba(74,108,247,0.12)' : 'var(--vg-bg-grid, #111827)',
              border: `1px solid ${hasFilter ? 'var(--vg-accent, #4a6cf7)' : 'var(--vg-border-color, #2d3748)'}`,
              borderRadius: 4,
              color: hasFilter ? 'var(--vg-accent, #4a6cf7)' : 'var(--vg-text-muted, #a0aec0)',
              fontSize: 11,
              cursor: 'pointer',
              gap: 4,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {hasFilter
                ? `${selected.size} selected`
                : `All (${allOptions.length})`
              }
            </span>
            <span>▾</span>
          </button>
          {isOpen && (
            <ExcelFilterDropdown
              options={allOptions}
              selected={selected}
              onToggle={toggle}
              onSelectAll={selectAll}
              onClear={clearAll}
              onClose={() => setExcelOpen((prev) => ({ ...prev, [col._colId]: false }))}
              anchorRef={anchorRef}
            />
          )}
        </div>
      )
    }

    if (isSelect) {
      return (
        <div key={col._colId} className="vgrid-filter-cell" style={{ width: col._width, minWidth: col._width }}>
          <select
            className={`vgrid-filter-select${val ? ' vgrid-filter-select--active' : ''}`}
            value={val}
            onChange={(e) => onFilterChange(col._colId, e.target.value)}
            aria-label={`Filter ${col.headerName ?? col.field ?? ''}`}
            style={{
              width: '100%',
              height: 'calc(100% - 4px)',
              margin: '2px 0',
              padding: '2px 6px',
              borderRadius: 4,
              border: '1px solid var(--vg-border-color)',
              background: 'var(--vg-bg-grid)',
              color: 'var(--vg-text-primary)',
              fontSize: 12,
              outline: 'none',
            }}
          >
            <option value="">All</option>
            {(uniqueValues?.[col._colId] ?? []).map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      )
    }

    const operatorOptions: { value: FloatingFilterOperator; label: string }[] = isText
      ? [
          { value: 'contains', label: '⊃' },
          { value: 'equals',   label: '=' },
        ]
      : isNumber
      ? [
          { value: 'equals',   label: '=' },
          { value: 'gt',       label: '>' },
          { value: 'lt',       label: '<' },
          { value: 'contains', label: '⊃' },
        ]
      : []

    return (
      <div
        key={col._colId}
        className="vgrid-filter-cell"
        style={{ width: col._width, minWidth: col._width, display: 'flex', alignItems: 'center', gap: 2, padding: '2px 2px' }}
      >
        {operatorOptions.length > 0 && (
          <select
            title="Filter operator"
            value={operator}
            onChange={(e) => onFilterOperatorChange(col._colId, e.target.value as FloatingFilterOperator)}
            style={{
              flexShrink: 0,
              width: 30,
              height: 24,
              padding: '0 2px',
              borderRadius: 4,
              border: '1px solid var(--vg-border-color, #2d3748)',
              background: 'var(--vg-bg-grid, #111827)',
              color: 'var(--vg-text-muted, #a0aec0)',
              fontSize: 12,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {operatorOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}

        <input
          className={`vgrid-filter-input${val ? ' vgrid-filter-input--active' : ''}`}
          type={isDate ? 'date' : isNumber ? 'number' : 'text'}
          placeholder={isDate ? '' : `Filter…`}
          value={val}
          onChange={(e) => onFilterChange(col._colId, e.target.value)}
          aria-label={`Filter ${col.headerName ?? col.field ?? ''}`}
          style={{ flex: 1, minWidth: 0 }}
        />
      </div>
    )
  }

  return (
    <div className="vgrid-filter-row" role="row" aria-label="Column filters">
      {/* Checkbox placeholder */}
      {checkboxWidth > 0 && <div className="vgrid-filter-cell" style={{ width: checkboxWidth }} />}
      {/* Pinned left — no scroll */}
      {pinnedLeft.map(renderCell)}
      {/* Normal columns — scroll with body */}
      <div style={{ overflow: 'hidden', flex: 1, display: 'flex' }}>
        <div style={{ display: 'flex', transform: `translateX(-${scrollLeft}px)`, willChange: 'transform' }}>
          {normal.map(renderCell)}
        </div>
      </div>
      {/* Pinned right — no scroll */}
      {pinnedRight.map(renderCell)}
    </div>
  )
}) as <T extends RowData>(props: FloatingFilterRowProps<T>) => React.ReactElement | null



// ─── Main Grid Header ─────────────────────────────────────────────────────────

interface GridHeaderProps<T> {
  columns: InternalColDef<T>[]
  columnDefs: ColDef<T>[]
  hasGroupedHeaders: boolean
  sortModel: SortModel[]
  onSort: (colId: string, multiSort: boolean) => void
  onResize: (colId: string, newWidth: number) => void
  onMoveColumn?: (fromColId: string, toColId: string) => void
  scrollLeft: number
  showFloatingFilter: boolean
  filterValues: Record<string, string>
  filterOperators: Record<string, FloatingFilterOperator>
  onFilterChange: (colId: string, value: string) => void
  onFilterOperatorChange: (colId: string, op: FloatingFilterOperator) => void
  showCheckbox: boolean
  allSelected: boolean
  someSelected: boolean
  onSelectAll: (checked: boolean) => void
  api: GridApi<T>
  headerHeight: number
  uniqueValues?: Record<string, string[]>
}


export const GridHeader = memo(<T extends RowData>(props: GridHeaderProps<T>) => {
  const {
    columns, columnDefs, hasGroupedHeaders, sortModel, onSort, onResize, onMoveColumn,
    scrollLeft, showFloatingFilter, filterValues, filterOperators,
    onFilterChange, onFilterOperatorChange,
    showCheckbox, allSelected, someSelected, onSelectAll, api, headerHeight, uniqueValues,
  } = props

  const pinnedLeft = columns.filter((c) => c.pinned === 'left' && !c.hide)
  const pinnedRight = columns.filter((c) => c.pinned === 'right' && !c.hide)
  const normal = columns.filter((c) => !c.pinned && !c.hide)

  const pinnedLeftWidth = useMemo(() => pinnedLeft.reduce((s, c) => s + c._width, 0), [pinnedLeft])
  const pinnedRightWidth = useMemo(() => pinnedRight.reduce((s, c) => s + c._width, 0), [pinnedRight])
  const totalNormalWidth = useMemo(() => normal.reduce((s, c) => s + c._width, 0), [normal])

  const checkboxWidth = showCheckbox ? 40 : 0

  const renderHeaderCell = (col: InternalColDef<T>) => (
    <HeaderCell
      key={col._colId}
      col={col}
      sortModel={sortModel}
      onSort={onSort}
      onResize={onResize}
      onMoveColumn={onMoveColumn}
      api={api}
    />
  )

  return (
    <div className="vgrid-header-wrapper" role="rowgroup" aria-label="Column headers">
      <div className="vgrid-header-inner">
        {/* Group header row (if any column groups) */}
        {hasGroupedHeaders && (
          <GroupHeaderRow
            columnDefs={columnDefs}
            columns={columns}
            scrollLeft={scrollLeft}
            pinnedLeftWidth={pinnedLeftWidth}
            pinnedRightWidth={pinnedRightWidth}
          />
        )}

        {/* Main header row */}
        <div className="vgrid-header-row" style={{ height: headerHeight }} role="row">
          {/* Checkbox header */}
          {showCheckbox && (
            <HeaderCell
              col={{ _colId: '__checkbox__', _width: 40, _left: 0, _pinnedLeft: 0, _pinnedRight: 0, checkboxSelection: true, headerCheckboxSelection: true }}
              sortModel={[]}
              onSort={() => {}}
              onResize={() => {}}
              api={api}
              isCheckbox
              onSelectAll={onSelectAll}
              allSelected={allSelected}
              someSelected={someSelected}
            />
          )}

          {/* Pinned left — always visible */}
          {pinnedLeft.length > 0 && (
            <div className="vgrid-pinned-left" style={{ display: 'flex', zIndex: 'var(--vg-z-pinned)' as any }}>
              {pinnedLeft.map(renderHeaderCell)}
            </div>
          )}

          {/* Normal columns — scroll with body */}
          <div style={{ overflow: 'hidden', flex: 1, display: 'flex' }}>
            <div
              style={{
                display: 'flex',
                width: totalNormalWidth,
                transform: `translateX(-${scrollLeft}px)`,
                willChange: 'transform',
              }}
            >
              {normal.map(renderHeaderCell)}
            </div>
          </div>

          {/* Pinned right — always visible */}
          {pinnedRight.length > 0 && (
            <div className="vgrid-pinned-right" style={{ display: 'flex' }}>
              {pinnedRight.map(renderHeaderCell)}
            </div>
          )}
        </div>

        {/* Floating filter row */}
        {showFloatingFilter && (
          <FloatingFilterRow
            columns={columns}
            filterValues={filterValues}
            filterOperators={filterOperators}
            onFilterChange={onFilterChange}
            onFilterOperatorChange={onFilterOperatorChange}
            scrollLeft={scrollLeft}
            checkboxWidth={checkboxWidth}
            uniqueValues={uniqueValues}
          />
        )}
      </div>
    </div>
  )
}) as <T extends RowData>(props: GridHeaderProps<T>) => React.ReactElement | null
