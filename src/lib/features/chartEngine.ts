/**
 * chartEngine.ts — Aggregate grid data into chart-ready format
 */

import type { RowNode, RowData, ChartConfig, ChartDataset, AggregationFunction } from '../types'
import { getFieldValue } from '../store/createGridStore'
import { computeAggregation } from './groupEngine'

export interface ChartData {
  labels: string[]      // X-axis labels (unique values of xField)
  datasets: ChartDataset[]
  title: string
  type: ChartConfig['type']
}

const DEFAULT_COLORS = [
  '#648bff', '#10b981', '#f59e0b', '#ef4444', '#a78bfa',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#8b5cf6',
]

export function buildChartData<T extends RowData>(
  rows: RowNode<T>[],
  config: ChartConfig
): ChartData {
  const { xField, yField, aggFunc = 'sum', title = '', type = 'bar', colors = DEFAULT_COLORS } = config

  // Group rows by xField value
  const groups = new Map<string, RowNode<T>[]>()
  for (const node of rows) {
    const key = String(getFieldValue(node.data as RowData, xField) ?? '(blank)')
    const bucket = groups.get(key) ?? []
    bucket.push(node)
    groups.set(key, bucket)
  }

  const labels: string[] = []
  const datasets: ChartDataset[] = []

  let colorIdx = 0
  groups.forEach((nodes, label) => {
    const values = nodes.map((n) => {
      const v = getFieldValue(n.data as RowData, yField)
      return v != null ? Number(v) : 0
    })
    const value = computeAggregation(aggFunc as AggregationFunction, values, nodes) as number
    labels.push(label)
    datasets.push({ label, value: isNaN(value) ? 0 : value, color: colors[colorIdx % colors.length] })
    colorIdx++
  })

  return { labels, datasets, title: title || `${yField} by ${xField}`, type }
}
