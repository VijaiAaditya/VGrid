import React, { useState, useCallback, useId } from 'react'
import type { FilterGroupModel, FilterCondition, FilterOperator } from '../types'
import type { InternalColDef } from '../store/createGridStore'
import type { RowData } from '../types'

const TEXT_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'contains', label: 'Contains' },
  { value: 'notContains', label: 'Does not contain' },
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Not equals' },
  { value: 'startsWith', label: 'Starts with' },
  { value: 'endsWith', label: 'Ends with' },
  { value: 'blank', label: 'Is blank' },
  { value: 'notBlank', label: 'Is not blank' },
]

const NUMBER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: '= Equals' },
  { value: 'notEquals', label: '≠ Not equals' },
  { value: 'greaterThan', label: '> Greater than' },
  { value: 'greaterThanOrEqual', label: '≥ Greater or equal' },
  { value: 'lessThan', label: '< Less than' },
  { value: 'lessThanOrEqual', label: '≤ Less or equal' },
  { value: 'blank', label: 'Is blank' },
  { value: 'notBlank', label: 'Is not blank' },
]

interface ConditionRowProps<T> {
  condition: FilterCondition
  columns: InternalColDef<T>[]
  onChange: (updated: FilterCondition) => void
  onRemove: () => void
  theme: 'light' | 'dark' | 'custom'
}

function ConditionRow<T extends RowData>({ condition, columns, onChange, onRemove, theme }: ConditionRowProps<T>) {
  const col = columns.find((c) => c._colId === condition.colId)
  const isNumeric = col?.filterParams?.type === 'number'
  const operators = isNumeric ? NUMBER_OPERATORS : TEXT_OPERATORS
  const hideValue = condition.operator === 'blank' || condition.operator === 'notBlank'

  const border = theme === 'dark' ? '#1e2535' : '#e2e6ec'
  const bg = theme === 'dark' ? '#161b27' : '#ffffff'
  const text = theme === 'dark' ? '#e4e8f0' : '#1a1d2e'
  const muted = theme === 'dark' ? '#5a6480' : '#9098ad'

  const selectStyle: React.CSSProperties = {
    height: 32, padding: '0 8px', borderRadius: 6,
    border: `1px solid ${border}`, background: bg, color: text,
    fontSize: 12, outline: 'none', cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {/* Column selector */}
      <select
        value={condition.colId}
        onChange={(e) => onChange({ ...condition, colId: e.target.value })}
        style={{ ...selectStyle, minWidth: 120 }}
        aria-label="Filter column"
      >
        {columns.filter((c) => c.filter !== false && !c.checkboxSelection && !c.hide).map((c) => (
          <option key={c._colId} value={c._colId}>
            {c.headerName ?? c.field ?? c._colId}
          </option>
        ))}
      </select>

      {/* Operator selector */}
      <select
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value as FilterOperator })}
        style={{ ...selectStyle, minWidth: 150 }}
        aria-label="Filter operator"
      >
        {operators.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {/* Value input */}
      {!hideValue && (
        <input
          type={isNumeric ? 'number' : 'text'}
          value={condition.value}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          placeholder="Filter value…"
          style={{
            ...selectStyle,
            minWidth: 140, paddingLeft: 10,
          }}
          aria-label="Filter value"
        />
      )}

      {/* Remove button */}
      <button
        onClick={onRemove}
        style={{
          width: 28, height: 28, borderRadius: 6, background: 'transparent',
          border: `1px solid ${border}`, cursor: 'pointer', color: muted,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}
        aria-label="Remove condition"
      >×</button>
    </div>
  )
}

interface FilterBuilderProps<T> {
  columns: InternalColDef<T>[]
  onApply: (model: FilterGroupModel) => void
  onClear: () => void
  theme: 'light' | 'dark' | 'custom'
  initialModel?: FilterGroupModel
}

/**
 * Advanced AND/OR filter builder panel.
 * 
 * Users can:
 * - Add multiple conditions (each with column, operator, value)
 * - Switch between AND / OR logic
 * - Add nested condition groups
 * - Apply or clear the filter
 */
export function FilterBuilder<T extends RowData>({ columns, onApply, onClear, theme, initialModel }: FilterBuilderProps<T>) {
  const firstFilterableCol = columns.find((c) => c.filter !== false && !c.checkboxSelection && !c.hide)
  const defaultColId = firstFilterableCol?._colId ?? ''

  const [model, setModel] = useState<FilterGroupModel>(initialModel ?? {
    logic: 'AND',
    conditions: [],
  })

  const border = theme === 'dark' ? '#1e2535' : '#e2e6ec'
  const bg = theme === 'dark' ? '#0f1117' : '#ffffff'
  const panelBg = theme === 'dark' ? '#111520' : '#f8f9fa'
  const text = theme === 'dark' ? '#e4e8f0' : '#1a1d2e'
  const muted = theme === 'dark' ? '#5a6480' : '#9098ad'
  const accent = theme === 'dark' ? '#648bff' : '#4a6cf7'

  const addCondition = useCallback(() => {
    setModel((m) => ({
      ...m,
      conditions: [
        ...m.conditions,
        { colId: defaultColId, operator: 'contains' as FilterOperator, value: '' },
      ],
    }))
  }, [defaultColId])

  const updateCondition = useCallback((index: number, updated: FilterCondition) => {
    setModel((m) => {
      const newConditions = [...m.conditions]
      newConditions[index] = updated
      return { ...m, conditions: newConditions }
    })
  }, [])

  const removeCondition = useCallback((index: number) => {
    setModel((m) => ({
      ...m,
      conditions: m.conditions.filter((_, i) => i !== index),
    }))
  }, [])

  const handleApply = useCallback(() => {
    onApply(model)
  }, [model, onApply])

  const handleClear = useCallback(() => {
    setModel({ logic: 'AND', conditions: [] })
    onClear()
  }, [onClear])

  const buttonStyle = (primary?: boolean): React.CSSProperties => ({
    padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', border: primary ? 'none' : `1px solid ${border}`,
    background: primary ? accent : 'transparent',
    color: primary ? '#fff' : text,
  })

  return (
    <div style={{
      background: panelBg, border: `1px solid ${border}`, borderRadius: 8,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
      fontSize: 13, color: text,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>🔧 Advanced Filter</span>
        <div style={{ flex: 1 }} />
        {/* Logic toggle */}
        <div style={{ display: 'flex', gap: 2, background: bg, borderRadius: 6, padding: 2, border: `1px solid ${border}` }}>
          {(['AND', 'OR'] as const).map((logic) => (
            <button
              key={logic}
              onClick={() => setModel((m) => ({ ...m, logic }))}
              style={{
                padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: model.logic === logic ? accent : 'transparent',
                color: model.logic === logic ? '#fff' : muted,
              }}
            >
              {logic}
            </button>
          ))}
        </div>
      </div>

      {/* Conditions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {model.conditions.length === 0 && (
          <div style={{ color: muted, fontSize: 12, textAlign: 'center', padding: '8px 0' }}>
            No conditions yet. Click "+ Add condition" to start.
          </div>
        )}

        {model.conditions.map((cond, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Logic badge (AND/OR) before each condition after the first */}
            <div style={{
              width: 36, textAlign: 'center', fontSize: 10, fontWeight: 700,
              color: accent, flexShrink: 0,
            }}>
              {i === 0 ? 'WHERE' : model.logic}
            </div>
            <ConditionRow
              condition={cond}
              columns={columns}
              onChange={(updated) => updateCondition(i, updated)}
              onRemove={() => removeCondition(i)}
              theme={theme}
            />
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={addCondition} style={{ ...buttonStyle(), fontSize: 12 }}>
          + Add condition
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={handleClear} style={buttonStyle()}>Clear</button>
        <button onClick={handleApply} style={buttonStyle(true)}>Apply Filter</button>
      </div>
    </div>
  )
}
