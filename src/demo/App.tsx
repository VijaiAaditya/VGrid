import React, { useState, useCallback, useRef, useMemo } from 'react'
import { VGrid } from '../lib/components/VGrid'
import { ColumnPicker } from '../lib/components/ColumnPicker'
import { Sparkline, createSparklineCellRenderer } from '../lib/components/Sparkline'

import type {
  ColDef, GridApi, GridReadyEvent, CellRendererParams,
  DetailCellRendererParams, IServerSideDatasource, IInfiniteDatasource,
  IServerSideGetRowsParams, IInfiniteGetRowsParams,
} from '../lib/types'
import { generateEmployees, type Employee } from './mockData'

// ─── Custom Cell Renderers ────────────────────────────────────────────────────

const StatusBadge = ({ value }: { value: unknown }) => {
  const statusColors: Record<string, { bg: string; color: string }> = {
    Active: { bg: '#d1fae5', color: '#065f46' },
    'On Leave': { bg: '#fef3c7', color: '#92400e' },
    Remote: { bg: '#dbeafe', color: '#1e40af' },
    Contract: { bg: '#ede9fe', color: '#5b21b6' },
    Probation: { bg: '#fee2e2', color: '#991b1b' },
  }
  const s = String(value)
  const { bg = '#f3f4f6', color = '#374151' } = statusColors[s] ?? {}
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: bg, color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {s}
    </span>
  )
}

const ScoreBar = ({ value }: { value: unknown }) => {
  const score = Number(value)
  const pct = (score / 5) * 100
  const color = score >= 4 ? '#10b981' : score >= 3 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s ease' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, minWidth: 24 }}>{score.toFixed(1)}</span>
    </div>
  )
}

// Detail panel for master-detail
const DetailPanel = ({ data }: DetailCellRendererParams<Employee>) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, padding: '4px 0' }}>
    {([
      ['Email', data.email],
      ['Start Date', data.startDate],
      ['Years Exp.', `${data.yearsExperience} years`],
      ['Projects', String(data.projects)],
      ['Country', data.country],
      ['City', data.city],
    ] as const).map(([label, val]) => (
      <div key={label} style={{ background: 'var(--vg-bg-grid)', borderRadius: 6, padding: '8px 12px', border: '1px solid var(--vg-border-color)' }}>
        <div style={{ fontSize: 10, color: 'var(--vg-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 13, color: 'var(--vg-text-primary)', fontWeight: 500 }}>{val}</div>
      </div>
    ))}
  </div>
)

// ─── Mock SSRM Datasource ─────────────────────────────────────────────────────

function createSSRMDatasource(allData: Employee[]): IServerSideDatasource<Employee> {
  return {
    getRows: ({ request, success }: IServerSideGetRowsParams<Employee>) => {
      const { startRow, endRow, sortModel, filterModel } = request
      let filtered = [...allData]

      // Apply filter
      Object.values(filterModel).forEach((cond) => {
        if (!cond.value && cond.operator !== 'blank' && cond.operator !== 'notBlank') return
        filtered = filtered.filter((row) => {
          const val = String((row as unknown as Record<string, unknown>)[cond.colId] ?? '').toLowerCase()
          const v = String(cond.value).toLowerCase()
          switch (cond.operator) {
            case 'contains': return val.includes(v)
            case 'equals': return val === v
            default: return val.includes(v)
          }
        })
      })

      // Apply sort
      if (sortModel.length > 0) {
        filtered.sort((a, b) => {
          for (const sm of sortModel) {
            const av = (a as unknown as Record<string, unknown>)[sm.colId]
            const bv = (b as unknown as Record<string, unknown>)[sm.colId]
            const cmp = av === bv ? 0 : av! > bv! ? 1 : -1
            if (cmp !== 0) return sm.sort === 'asc' ? cmp : -cmp
          }
          return 0
        })
      }

      // Simulate network delay
      setTimeout(() => {
        success({
          rowData: filtered.slice(startRow, endRow),
          rowCount: filtered.length,
        })
      }, 300)
    },
  }
}

// ─── Mock Infinite Datasource ─────────────────────────────────────────────────

function createInfiniteDatasource(allData: Employee[]): IInfiniteDatasource<Employee> {
  return {
    rowCount: allData.length,
    getRows: ({ startRow, endRow, successCallback }: IInfiniteGetRowsParams<Employee>) => {
      setTimeout(() => {
        const rows = allData.slice(startRow, endRow)
        const lastRow = endRow >= allData.length ? allData.length : -1
        successCallback(rows, lastRow === -1 ? undefined : lastRow)
      }, 200)
    },
  }
}

// ─── Mode constants ───────────────────────────────────────────────────────────

type DemoMode = 'basic' | 'grouping' | 'tree' | 'ssrm' | 'infinite' | 'sparkline' | 'callbacks'

const MODE_INFO: Record<DemoMode, { label: string; icon: string; description: string }> = {
  basic: { label: 'Standard', icon: '📋', description: '100k rows · all Phase 1 features' },
  grouping: { label: 'Row Grouping', icon: '📊', description: 'Group by dept & role · Aggregations (sum/avg/count)' },
  tree: { label: 'Tree Data', icon: '🌳', description: 'Hierarchical org chart data' },
  ssrm: { label: 'Server-Side', icon: '⚡', description: 'SSRM · filter/sort calls remote' },
  infinite: { label: 'Infinite', icon: '♾️', description: 'Infinite scroll · progressive load' },
  sparkline: { label: 'Sparklines', icon: '📈', description: 'SVG mini charts in cells' },
  callbacks: { label: 'Callbacks & Events Demo', icon: '🔔', description: 'Alert & console.log all callback props/events' },
}

// ─── Main Demo App ────────────────────────────────────────────────────────────

const ROW_COUNTS = [1_000, 10_000, 100_000]

export default function App() {
  const [rowCount, setRowCount] = useState(10_000)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [mode, setMode] = useState<DemoMode>('grouping')
  const [floatingFilter, setFloatingFilter] = useState(true)
  const [globalSearch, setGlobalSearch] = useState(false)
  const [enableEditing, setEnableEditing] = useState(true)
  const [enableRange, setEnableRange] = useState(true)
  const [showCheckbox, setShowCheckbox] = useState(true)
  const [showGroupPanel, setShowGroupPanel] = useState(true)
  const [enableUndo, setEnableUndo] = useState(true)
  const [enableFill, setEnableFill] = useState(true)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [selectedCount, setSelectedCount] = useState(0)
  const [masterDetail, setMasterDetail] = useState(true)
  const apiRef = useRef<GridApi<Employee> | null>(null)

  // Generate data
  const allData = useMemo(() => generateEmployees(rowCount), [rowCount])

  // For sparkline mode, add a history array to each row
  const rowData = useMemo<Employee[]>(() => {
    if (mode !== 'sparkline') return allData
    return allData.map((row, i) => ({
      ...row,
      history: Array.from({ length: 12 }, (_, m) => Math.max(0, row.performanceScore + Math.sin(i + m) * 1.5)),
    }))
  }, [allData, mode])

  // Datasources
  const ssrmDatasource = useMemo(() => createSSRMDatasource(allData), [allData])
  const infiniteDatasource = useMemo(() => createInfiniteDatasource(allData), [allData])

  // Tree data: build a path based on country/department
  const getDataPath = useCallback((d: Employee) => [d.country, d.department, `${d.firstName} ${d.lastName}`], [])

  // ── Column Definitions ────────────────────────────────────────────────────
  const columnDefs = useMemo<ColDef<Employee>[]>(() => {
    const sparklineCols: ColDef<Employee>[] = mode === 'sparkline' ? [
      {
        headerName: 'Perf History',
        colId: 'history',
        width: 140,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        valueGetter: ({ data }) => (data as any).history ?? [],
        cellRenderer: (params: CellRendererParams<Employee>) => (
          <Sparkline
            data={Array.isArray(params.value) ? params.value : []}
            options={{ type: 'area', color: '#648bff', fillColor: '#648bff25', strokeWidth: 1.5 }}
            width={120}
            height={28}
          />
        ),
      },
      {
        headerName: 'Bar Chart',
        colId: 'history_bar',
        width: 120,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        valueGetter: ({ data }) => (data as any).history ?? [],
        cellRenderer: (params: CellRendererParams<Employee>) => (
          <Sparkline
            data={Array.isArray(params.value) ? params.value : []}
            options={{ type: 'bar', color: '#10b981' }}
            width={100}
            height={28}
          />
        ),
      },
    ] : []

    return [

      {
        headerName: 'Personal Info', groupId: 'personal',
        children: [
          {
            field: 'firstName', headerName: 'First Name', width: 120, sortable: true, filter: true, editable: true, cellEditor: 'text',
            validate: (v) => !v ? 'Name cannot be empty' : null,
          },
          { field: 'lastName', headerName: 'Last Name', width: 120, sortable: true, filter: true, editable: true },
        ],
      },
      {
        headerName: 'Work', groupId: 'work',
        children: [
          {
            field: 'department', headerName: 'Department', width: 130,
            sortable: true, filter: 'excel', editable: true,
            cellEditor: 'select',
            cellEditorParams: { options: ['Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'Finance', 'HR', 'Legal', 'Operations', 'Support'] },
            aggFunc: 'count',
            enableRowGroup: true,
          },
          {
            field: 'role', headerName: 'Role', width: 110, sortable: true, filter: 'select',
            enableRowGroup: true, aggFunc: 'count',
          },
          {
            field: 'salary', headerName: 'Salary', width: 130, sortable: true, filter: true,
            cellRenderer: ({ value }: { value: unknown }) => (
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                ${Number(value).toLocaleString()}
              </span>
            ),
            aggFunc: 'sum',
            enableValue: true,
            comparator: (a, b) => Number(a) - Number(b),
            valueFormatter: ({ value }) => `$${Number(value).toLocaleString()}`,
          },
        ],
      },
      {
        headerName: 'Performance', groupId: 'perf',
        children: [
          {
            field: 'performanceScore', headerName: 'Score', width: 150, sortable: true,
            cellRenderer: (params: CellRendererParams<Employee>) => <ScoreBar value={params.value} />,
            aggFunc: 'avg',
            enableValue: true,
            comparator: (a, b) => Number(a) - Number(b),
          },
          {
            field: 'yearsExperience', headerName: 'Experience', width: 110, sortable: true, filter: true,
            valueFormatter: ({ value }) => `${value} yrs`,
            aggFunc: 'avg',
          },
          { field: 'projects', headerName: 'Projects', width: 90, sortable: true, filter: true, aggFunc: 'sum' },
        ],
      },
      ...sparklineCols,
      {
        headerName: 'Location', groupId: 'location',
        children: [
          { field: 'country', headerName: 'Country', width: 140, sortable: true, filter: 'excel', enableRowGroup: true },
          { field: 'city', headerName: 'City', width: 120, sortable: true, filter: true },
        ],
      },
      {
        field: 'metadata', headerName: 'Config (JSON)', width: 170,
        columnType: 'json', editable: true, sortable: false, filter: false,
      },
      {
        field: 'avatarUrl', headerName: 'Avatar (Image)', width: 140,
        columnType: 'image', sortable: false, filter: false,
      },
      {
        field: 'bioHtml', headerName: 'Bio (HTML)', width: 150,
        columnType: 'html', sortable: false, filter: false,
      },
      {
        field: 'demoVideo', headerName: 'Demo (Video)', width: 150,
        columnType: 'video', sortable: false, filter: false,
      },
      {
        field: 'status', headerName: 'Status', width: 120, pinned: 'right',
        sortable: true, filter: 'select', editable: true,
        cellEditor: 'select',
        cellEditorParams: { options: ['Active', 'On Leave', 'Remote', 'Contract', 'Probation'] },
        cellRenderer: (params: CellRendererParams<Employee>) => <StatusBadge value={params.value} />,
        enableRowGroup: true,
      },
    ]
  }, [mode])


  const defaultColDef = useMemo<Partial<ColDef<Employee>>>(() => ({
    resizable: true, sortable: true, filter: true, minWidth: 60,
  }), [])

  // Pinned summary row
  const pinnedBottomRowData = useMemo<Employee[]>(() => {
    if (mode === 'ssrm' || mode === 'infinite') return []
    return [{
      id: 0, firstName: '━━ TOTAL', lastName: '',
      email: '', department: `${new Set(rowData.map((r) => r.department)).size} depts`,
      role: '', salary: rowData.reduce((s, r) => s + r.salary, 0),
      country: `${new Set(rowData.map((r) => r.country)).size} countries`,
      city: '', startDate: '',
      yearsExperience: Math.round(rowData.reduce((s, r) => s + r.yearsExperience, 0) / (rowData.length || 1)),
      performanceScore: Math.round(rowData.reduce((s, r) => s + r.performanceScore, 0) / (rowData.length || 1) * 10) / 10,
      isActive: true, status: '', projects: rowData.reduce((s, r) => s + r.projects, 0),
    }]
  }, [rowData, mode])

  const handleGridReady = useCallback((e: GridReadyEvent<Employee>) => {
    apiRef.current = e.api
  }, [])

  // Theme tokens
  const bgColor = theme === 'dark' ? '#090d17' : '#f0f2f8'
  const textColor = theme === 'dark' ? '#e4e8f0' : '#1a1d2e'
  const cardBg = theme === 'dark' ? '#0f1420' : '#ffffff'
  const border = theme === 'dark' ? '#1a2035' : '#e2e6ec'
  const muted = theme === 'dark' ? '#4a5470' : '#9098ad'
  const accent = theme === 'dark' ? '#648bff' : '#4a6cf7'

  return (
    <div style={{ minHeight: '100vh', background: bgColor, color: textColor, fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <header style={{
        padding: '12px 20px', borderBottom: `1px solid ${border}`,
        background: cardBg, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        boxShadow: theme === 'dark' ? '0 2px 20px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: `linear-gradient(135deg, ${accent}, #a78bfa)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="white">
              <rect x="2" y="2" width="16" height="3" rx="1" />
              <rect x="2" y="7" width="16" height="3" rx="1" opacity="0.8" />
              <rect x="2" y="12" width="10" height="3" rx="1" opacity="0.6" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: accent }}>V-Grid <span style={{ fontSize: 10, opacity: 0.6 }}>v2.0</span></div>
            <div style={{ fontSize: 9, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Phase 2 · All Features</div>
          </div>
        </div>

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 3, background: theme === 'dark' ? '#0a0e1a' : '#f0f2f8', borderRadius: 8, padding: 3 }}>
          {(Object.entries(MODE_INFO) as [DemoMode, typeof MODE_INFO[DemoMode]][]).map(([m, info]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                background: mode === m ? accent : 'transparent',
                color: mode === m ? '#fff' : muted,
                transition: 'all 0.15s',
              }}
              title={info.description}
            >
              {info.icon} {info.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Stats */}
        {[
          [`${rowCount.toLocaleString()}`, 'Rows'],
          [`${selectedCount}`, 'Selected'],
          [MODE_INFO[mode].icon, MODE_INFO[mode].label],
        ].map(([val, label]) => (
          <div key={label} style={{ textAlign: 'center', minWidth: 48 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: accent }}>{val}</div>
            <div style={{ fontSize: 9, color: muted, textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}

        {/* Controls */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Row counts */}
          <div style={{ display: 'flex', gap: 2 }}>
            {ROW_COUNTS.map((n) => (
              <button key={n} onClick={() => setRowCount(n)} style={{
                padding: '4px 10px', borderRadius: 5, border: `1px solid ${n === rowCount ? accent : border}`,
                background: n === rowCount ? accent : 'transparent',
                color: n === rowCount ? '#fff' : textColor,
                cursor: 'pointer', fontSize: 11, fontWeight: 600,
              }}>
                {n >= 1000 ? `${n / 1000}k` : n}
              </button>
            ))}
          </div>

          {/* Toggles */}
          {([
            ['Filters', floatingFilter, setFloatingFilter],
            ['Search', globalSearch, setGlobalSearch],
            ['Detail', masterDetail, setMasterDetail],
            ['Edit', enableEditing, setEnableEditing],
            ['Range', enableRange, setEnableRange],
            ['☑', showCheckbox, setShowCheckbox],
            ['Groups', showGroupPanel, setShowGroupPanel],
            ['Undo', enableUndo, setEnableUndo],
            ['Fill', enableFill, setEnableFill],
            ['Filter⚙', showFilterPanel, setShowFilterPanel],
          ] as const).map(([label, val, setter]) => (
            <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, userSelect: 'none' }}>
              <div
                onClick={() => (setter as (v: boolean) => void)(!val)}
                style={{
                  width: 28, height: 16, borderRadius: 8,
                  background: val ? accent : border,
                  position: 'relative', transition: 'background 0.15s', cursor: 'pointer',
                }}
              >
                <div style={{
                  position: 'absolute', top: 2, left: val ? 14 : 2, width: 12, height: 12,
                  borderRadius: 6, background: 'white', transition: 'left 0.15s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </div>
              <span style={{ color: muted }}>{label}</span>
            </label>
          ))}

          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} style={{
            padding: '4px 10px', borderRadius: 6, border: `1px solid ${border}`,
            background: 'transparent', color: textColor, cursor: 'pointer', fontSize: 11,
          }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <button onClick={() => apiRef.current?.exportDataAsCsv({ fileName: 'vgrid.csv' })} style={{
            padding: '4px 10px', borderRadius: 6, background: 'transparent', border: `1px solid ${border}`,
            color: textColor, cursor: 'pointer', fontSize: 11, fontWeight: 600,
          }}>
            CSV ↓
          </button>

          <button onClick={() => apiRef.current?.exportDataAsXlsx({ fileName: 'vgrid.xlsx' })} style={{
            padding: '4px 12px', borderRadius: 6, background: accent, border: 'none',
            color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600,
          }}>
            XLSX ↓
          </button>
        </div>
      </header>

      {/* ── Mode Banner ────────────────────────────────────────────── */}
      <div style={{ padding: '6px 20px', background: cardBg, borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{MODE_INFO[mode].icon} {MODE_INFO[mode].label}</span>
        <span style={{ fontSize: 11, color: muted }}>—</span>
        <span style={{ fontSize: 11, color: muted }}>{MODE_INFO[mode].description}</span>
        {mode === 'grouping' && (
          <span style={{ fontSize: 11, color: muted }}>· Drag columns to group panel · Click group headers to expand</span>
        )}
        {enableUndo && <span style={{ fontSize: 11, color: muted }}>· Ctrl+Z/Y to undo/redo edits</span>}
        {enableFill && enableRange && <span style={{ fontSize: 11, color: muted }}>· Drag fill handle to auto-fill</span>}
      </div>

      {/* ── Grid ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: 16 }}>
        <VGrid<Employee>
          // Core
          rowData={mode === 'ssrm' || mode === 'infinite' ? [] : rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={(d) => d.id}
          theme={theme}
          style={{ height: 'calc(100vh - 175px)', width: '100%' }}
          rowHeight={44}
          headerHeight={48}
          rowBuffer={8}

          // Pinned rows (not for SSRM/infinite)
          pinnedBottomRowData={pinnedBottomRowData}

          // Feature toggles
          rowNumberColumn={{ clickToOpenJsonModal: true }}
          floatingFilter={floatingFilter}

          enableGlobalSearch={globalSearch}
          checkboxSelection={showCheckbox}
          rowSelection="multiple"
          enableRangeSelection={enableRange}
          enableClipboard={true}
          editable={enableEditing}
          masterDetail={masterDetail && mode !== 'grouping' && mode !== 'tree'}
          detailRowHeight={180}
          detailCellRenderer={(p) => <DetailPanel {...p} />}

          // Phase 2: Row Grouping
          showRowGroupPanel={showGroupPanel && mode === 'grouping'}
          groupAggFunction={{ salary: 'sum', yearsExperience: 'avg', performanceScore: 'avg', projects: 'sum' }}
          showGroupTotals={mode === 'grouping'}
          groupRowHeight={44}

          // Phase 2: Tree Data
          treeData={mode === 'tree'}
          getDataPath={getDataPath}
          autoExpandAll={false}

          // Phase 2: SSRM
          rowModelType={mode === 'ssrm' ? 'serverSide' : mode === 'infinite' ? 'infinite' : 'clientSide'}
          serverSideDatasource={mode === 'ssrm' ? ssrmDatasource : undefined}
          datasource={mode === 'infinite' ? infiniteDatasource : undefined}
          cacheBlockSize={100}

          // Phase 2: Undo/Redo
          enableUndoRedo={enableUndo}
          undoRedoCellEditingLimit={100}

          // Phase 2: Filter panel
          enableFilterPanel={showFilterPanel}

          // Phase 2: Drag fill
          enableFillHandle={enableFill && enableRange}
          fillHandleDirection="y"

          // Context menu & pagination options demo
          enableContextMenu={true}
          pagination={mode === 'callbacks' ? { pageSize: 10, pageSizeOptions: [5, 10, 20, 50] } : null}
          onPaginationChanged={(e) => {
            if (mode === 'callbacks') alert(`Event: onPaginationChanged | Page: ${e.currentPage}, PageSize: ${e.pageSize}, TotalPages: ${e.totalPages}`)
            console.log('[VGrid Callback] onPaginationChanged:', e)
          }}
          onContextMenuAction={(actionId) => {
            if (mode === 'callbacks') alert(`Event: onContextMenuAction | Action: ${actionId}`)
            console.log('[VGrid Callback] onContextMenuAction:', actionId)
          }}

          // Events with alert & console.log
          onGridReady={(e) => {
            handleGridReady(e)
            if (mode === 'callbacks') alert('Event: onGridReady | Grid API ready!')
            console.log('[VGrid Callback] onGridReady:', e)
          }}
          onSelectionChanged={(e) => {
            setSelectedCount(e.selectedRows.length)
            if (mode === 'callbacks') //alert(`Event: onSelectionChanged | Selected Rows Count: ${e.selectedRows.length}`)
              console.log('[VGrid Callback] onSelectionChanged:', e)
          }}
          onCellValueChanged={(e) => {
            if (mode === 'callbacks') alert(`Event: onCellValueChanged | Column: ${e.colDef.field} | Old: ${e.oldValue} -> New: ${e.newValue}`)
            console.log('[VGrid Callback] onCellValueChanged:', e)
          }}
          onFilterChanged={(e) => {
            if (mode === 'callbacks') alert(`Event: onFilterChanged | Active Filters: ${JSON.stringify(e.filterModel)}`)
            console.log('[VGrid Callback] onFilterChanged:', e)
          }}
          onSortChanged={(e) => {
            if (mode === 'callbacks') alert(`Event: onSortChanged | Sort Model: ${JSON.stringify(e.sortModel)}`)
            console.log('[VGrid Callback] onSortChanged:', e)
          }}
          onColumnResized={(e) => {
            if (mode === 'callbacks') alert(`Event: onColumnResized | ColId: ${e.colId}, NewWidth: ${e.newWidth}`)
            console.log('[VGrid Callback] onColumnResized:', e)
          }}
          onColumnMoved={(e) => {
            if (mode === 'callbacks') alert(`Event: onColumnMoved | From: ${e.colId} -> To: ${e.toColId}`)
            console.log('[VGrid Callback] onColumnMoved:', e)
          }}
          onColumnVisibilityChanged={(e) => {
            if (mode === 'callbacks') alert(`Event: onColumnVisibilityChanged | Col: ${e.colId}, Visible: ${e.visible}, Total Visible: ${e.visibleColumnIds.length}`)
            console.log('[VGrid Callback] onColumnVisibilityChanged:', e)
          }}

          onRowClicked={(e) => {
            if (mode === 'callbacks') //alert(`Event: onRowClicked | Row Index: ${e.rowIndex}`)
              console.log('[VGrid Callback] onRowClicked:', e)
          }}
          onCellClicked={(e) => {
            if (mode === 'callbacks') //alert(`Event: onCellClicked | ColId: ${e.colDef._colId}, RowIndex: ${e.rowIndex}`)
              console.log('[VGrid Callback] onCellClicked:', e)
          }}
          onRowGroupChanged={(e) => {
            if (mode === 'callbacks') alert(`Event: onRowGroupChanged | Group By: ${e.groupByColumns.join(', ')}`)
            console.log('[VGrid Callback] onRowGroupChanged:', e)
          }}
          overlayNoRowsTemplate="No matching employees found"
        />
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer style={{
        padding: '8px 20px', background: cardBg, borderTop: `1px solid ${border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 10, color: muted,
      }}>
        <span>V-Grid Phase 2 · {rowCount.toLocaleString()} rows · Grouping · Tree · SSRM · Infinite · Undo/Redo · XLSX · Sparklines · Drag Fill · Filter Builder</span>
        <span>
          <b>Ctrl+C</b> copy · <b>Ctrl+Z</b> undo · <b>F2</b> edit · <b>Del</b> clear · <b>→←↑↓</b> navigate
        </span>
      </footer>
    </div>
  )
}
