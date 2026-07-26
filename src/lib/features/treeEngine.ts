import type { RowData, RowNode, FlatItem } from '../types'

// ─── Tree Data Engine ─────────────────────────────────────────────────────────

interface TreeNodeInternal<T> {
  id: string
  key: string
  level: number
  data: T | null   // null for synthetic internal nodes
  isLeaf: boolean
  isExpanded: boolean
  children: Map<string, TreeNodeInternal<T>>
  rowNode?: RowNode<T>
}

/**
 * Builds a hierarchical tree from flat row data using getDataPath.
 *
 * getDataPath returns path segments, e.g.:
 *   data: { name: "Alice", org: ["Acme", "Engineering", "Frontend"] }
 *   getDataPath: (d) => d.org
 *   → builds: Acme → Engineering → Frontend → Alice
 */
export function buildTreeFromData<T extends RowData>(
  nodes: RowNode<T>[],
  getDataPath: (data: T) => string[],
  expandedIds: Set<string>,
  autoExpandAll: boolean
): FlatItem<T>[] {
  // Build internal tree
  const root = new Map<string, TreeNodeInternal<T>>()

  for (const node of nodes) {
    const path = getDataPath(node.data)
    if (!path || path.length === 0) continue

    let currentMap = root
    let currentPath = ''

    for (let i = 0; i < path.length; i++) {
      const segment = path[i]
      currentPath = currentPath ? `${currentPath}/${segment}` : segment
      const isLast = i === path.length - 1

      if (!currentMap.has(segment)) {
        const id = `tree:${currentPath}`
        currentMap.set(segment, {
          id,
          key: segment,
          level: i,
          data: isLast ? node.data : null,
          isLeaf: isLast,
          isExpanded: autoExpandAll || expandedIds.has(id),
          children: new Map(),
          rowNode: isLast ? node : undefined,
        })
      } else if (isLast) {
        // Update leaf with actual data
        const existing = currentMap.get(segment)!
        existing.data = node.data
        existing.isLeaf = true
        existing.rowNode = node
      }

      currentMap = currentMap.get(segment)!.children
    }
  }

  // Flatten the tree
  return flattenTree(root, 0, nodes)
}

function flattenTree<T extends RowData>(
  nodeMap: Map<string, TreeNodeInternal<T>>,
  level: number,
  allNodes: RowNode<T>[]
): FlatItem<T>[] {
  const flat: FlatItem<T>[] = []

  for (const [, treeNode] of nodeMap) {
    if (treeNode.isLeaf && treeNode.rowNode) {
      // Leaf node = actual data row
      flat.push({ kind: 'row', node: treeNode.rowNode, level })
    } else {
      // Internal node = synthetic group-like row
      // Create a synthetic GroupNode for display
      const groupNodeData: import('../types').GroupNode<T> = {
        type: 'group',
        id: treeNode.id,
        key: treeNode.key,
        field: '_tree',
        headerName: treeNode.key,
        level,
        isExpanded: treeNode.isExpanded,
        leafCount: countLeaves(treeNode),
        aggregations: {},
        children: [],
      }
      flat.push({ kind: 'group', group: groupNodeData })

      if (treeNode.isExpanded) {
        flat.push(...flattenTree(treeNode.children, level + 1, allNodes))
        // If this internal node also has leaf data, add it too
        if (treeNode.data && treeNode.rowNode) {
          flat.push({ kind: 'row', node: treeNode.rowNode, level: level + 1 })
        }
      }
    }
  }

  return flat
}

function countLeaves<T>(node: TreeNodeInternal<T>): number {
  if (node.isLeaf) return 1
  let count = 0
  for (const [, child] of node.children) count += countLeaves(child)
  return count
}
