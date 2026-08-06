import type { RowNode, RowData, GroupNode, FlatItem, AggregationFunction } from '../types'
import type { InternalColDef } from '../store/createGridStore'
import { getFieldValue } from '../utils/valueGetter'

// ─── Aggregation Engine ───────────────────────────────────────────────────────

export function computeAggregation(
  fn: AggregationFunction | ((values: unknown[], nodes: RowNode[]) => unknown),
  values: unknown[],
  nodes: RowNode[]
): unknown {
  if (typeof fn === 'function') return fn(values, nodes)
  const nums = values.filter((v) => typeof v === 'number' && !isNaN(v)) as number[]
  switch (fn) {
    case 'sum':   return nums.reduce((a, b) => a + b, 0)
    case 'avg':   return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null
    case 'min':   return nums.length > 0 ? Math.min(...nums) : null
    case 'max':   return nums.length > 0 ? Math.max(...nums) : null
    case 'count': return values.length
    case 'first': return values[0] ?? null
    case 'last':  return values[values.length - 1] ?? null
    default:      return null
  }
}

// ─── Group Engine ─────────────────────────────────────────────────────────────

/**
 * Groups a flat list of RowNodes by the given column fields.
 * Returns a tree of GroupNodes, each containing child groups or leaf RowNodes.
 *
 * Pure function — no side effects. O(n * levels) time complexity.
 */
export function buildGroupTree<T extends RowData>(
  nodes: RowNode<T>[],
  groupByColIds: string[],
  columns: InternalColDef<T>[],
  expandedGroupIds: Set<string>
): GroupNode<T>[] {
  if (groupByColIds.length === 0) return []

  const colMap = new Map(columns.map((c) => [c._colId, c]))

  function groupAt(
    items: RowNode<T>[],
    levelColIds: string[],
    level: number,
    parentId: string
  ): GroupNode<T>[] {
    if (levelColIds.length === 0) return []
    const colId = levelColIds[0]
    const col = colMap.get(colId)
    const headerName = col?.headerName ?? col?.field ?? colId

    // Group items by value
    const buckets = new Map<string, RowNode<T>[]>()
    for (const node of items) {
      let val: unknown
      if (col?.valueGetter) val = col.valueGetter({ data: node.data, colDef: col, rowIndex: node.rowIndex })
      else if (col?.field) val = getFieldValue(node.data as RowData, col.field)
      const key = val == null ? '(Blanks)' : String(val)
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key)!.push(node)
    }

    const groups: GroupNode<T>[] = []
    for (const [key, groupItems] of buckets) {
      const groupId = `${parentId}:${colId}:${key}`
      const isExpanded = expandedGroupIds.has(groupId)

      // Recursively build sub-groups
      const subGroups = levelColIds.length > 1
        ? groupAt(groupItems, levelColIds.slice(1), level + 1, groupId)
        : []

      // Compute aggregations from leaf nodes
      const aggregations = computeGroupAggregations(groupItems, columns)

      groups.push({
        type: 'group',
        id: groupId,
        key,
        field: colId,
        headerName,
        level,
        isExpanded,
        leafCount: groupItems.length,
        aggregations,
        children: subGroups.length > 0
          ? subGroups
          : groupItems,
      })
    }
    return groups
  }

  return groupAt(nodes, groupByColIds, 0, 'root')
}

function computeGroupAggregations<T extends RowData>(
  leafNodes: RowNode<T>[],
  columns: InternalColDef<T>[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const col of columns) {
    if (!col.aggFunc) continue
    const values = leafNodes.map((n) => {
      if (col.valueGetter) return col.valueGetter({ data: n.data, colDef: col, rowIndex: n.rowIndex })
      if (col.field) return getFieldValue(n.data as RowData, col.field)
      return undefined
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result[col._colId] = computeAggregation(col.aggFunc as any, values, leafNodes as any)
  }
  return result
}

/**
 * Flattens a group tree into a linear array for the virtualizer.
 * Respects isExpanded on each GroupNode.
 */
export function flattenGroupTree<T extends RowData>(
  groups: GroupNode<T>[],
  indentLevel = 0
): FlatItem<T>[] {
  const flat: FlatItem<T>[] = []

  for (const group of groups) {
    flat.push({ kind: 'group', group })

    if (group.isExpanded) {
      for (const child of group.children) {
        if ('type' in child && child.type === 'group') {
          // Nested group
          flat.push(...flattenGroupTree([child as GroupNode<T>], indentLevel + 1))
        } else {
          // Leaf row node
          flat.push({ kind: 'row', node: child as RowNode<T>, level: group.level + 1 })
        }
      }
    }
  }

  return flat
}

/**
 * When grouping is NOT active, wraps all row nodes as FlatItems at level 0.
 */
export function wrapRowNodesAsFlatItems<T extends RowData>(
  nodes: RowNode<T>[]
): FlatItem<T>[] {
  return nodes.map((node) => ({ kind: 'row', node, level: 0 }))
}

/**
 * Computes grand total aggregations over all displayed rows.
 * Used for the "Total" summary row when showGroupTotals = true.
 */
export function computeGrandTotals<T extends RowData>(
  nodes: RowNode<T>[],
  columns: InternalColDef<T>[]
): Record<string, unknown> {
  return computeGroupAggregations(nodes, columns)
}
