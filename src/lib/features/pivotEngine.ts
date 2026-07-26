/**
 * pivotEngine.ts — Transform flat row data into a cross-tabulation
 *
 * Given:
 *   rows = [{ country: 'USA', dept: 'Eng', salary: 100 }, ...]
 *   config = { rowField: 'country', colField: 'dept', valueField: 'salary', aggFunc: 'sum' }
 *
 * Produces dynamic ColDefs + pivoted row data:
 *   columns: [country, Eng, Product, Design, Total]
 *   rows:    [{ country: 'USA', Eng: 500, Product: 200, Total: 700 }, ...]
 */

import type { RowNode, RowData, ColDef, PivotConfig, AggregationFunction } from '../types'
import { getFieldValue } from '../store/createGridStore'
import { computeAggregation } from './groupEngine'

export interface PivotResult {
  columnDefs: ColDef[]
  rowData: Record<string, unknown>[]
}

export function computePivot<T extends RowData>(
  rows: RowNode<T>[],
  config: PivotConfig
): PivotResult {
  const { rowField, colField, valueField, aggFunc = 'sum' } = config

  // Collect unique pivot column values (sorted)
  const pivotCols = Array.from(
    new Set(rows.map((n) => String(getFieldValue(n.data as RowData, colField) ?? '')))
  ).sort()

  // Collect unique pivot row values (sorted)
  const pivotRows = Array.from(
    new Set(rows.map((n) => String(getFieldValue(n.data as RowData, rowField) ?? '')))
  ).sort()

  // Group raw rows by [rowVal][colVal]
  const matrix = new Map<string, Map<string, RowNode<T>[]>>()
  for (const node of rows) {
    const rv = String(getFieldValue(node.data as RowData, rowField) ?? '')
    const cv = String(getFieldValue(node.data as RowData, colField) ?? '')
    if (!matrix.has(rv)) matrix.set(rv, new Map())
    const inner = matrix.get(rv)!
    const bucket = inner.get(cv) ?? []
    bucket.push(node)
    inner.set(cv, bucket)
  }

  // Build pivot row data
  const rowData: Record<string, unknown>[] = pivotRows.map((rv) => {
    const result: Record<string, unknown> = { [rowField]: rv }
    let rowTotal = 0
    const inner = matrix.get(rv) ?? new Map<string, RowNode<T>[]>()

    for (const cv of pivotCols) {
      const nodes = inner.get(cv) ?? []
      const values = nodes.map((n) => {
        const v = getFieldValue(n.data as RowData, valueField)
        return v != null ? Number(v) : 0
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agg = computeAggregation(aggFunc as AggregationFunction, values, nodes as any) as number
      result[cv] = isNaN(agg) ? null : agg
      rowTotal += isNaN(agg) ? 0 : agg
    }
    result['__total__'] = parseFloat(rowTotal.toFixed(2))
    return result
  })

  // Build column defs
  const formatNum = (v: unknown) =>
    v == null ? '' : typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(v)

  const columnDefs: ColDef[] = [
    {
      field: rowField,
      headerName: rowField.charAt(0).toUpperCase() + rowField.slice(1),
      pinned: 'left',
      width: 150,
      sortable: true,
    },
    ...pivotCols.map((cv) => ({
      field: cv,
      headerName: cv,
      width: 120,
      sortable: true,
      valueFormatter: ({ value }: { value: unknown }) => formatNum(value),
      cellStyle: { textAlign: 'right', fontFamily: 'monospace' } as React.CSSProperties,
    })),
    {
      field: '__total__',
      headerName: 'Total',
      pinned: 'right',
      width: 120,
      sortable: true,
      cellStyle: { fontWeight: 700, background: 'var(--vg-bg-row-alt)', textAlign: 'right' } as React.CSSProperties,
      valueFormatter: ({ value }: { value: unknown }) => formatNum(value),
    },
  ]

  return { columnDefs, rowData }
}

// Need React for CSSProperties type
import type React from 'react'
