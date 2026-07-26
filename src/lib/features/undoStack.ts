import type { EditAction } from '../types'

/**
 * Undo/Redo Stack — class-based, stored in a ref outside React state.
 * 
 * This intentionally does NOT live in the Zustand store so that
 * undo/redo operations don't trigger unnecessary re-renders for
 * all subscribers.
 */
export class UndoStack {
  private stack: EditAction[] = []
  private pointer = -1
  private maxSize: number

  constructor(maxSize = 50) {
    this.maxSize = maxSize
  }

  /** Push a new edit action. Clears any "future" history (redo stack). */
  push(action: EditAction): void {
    // Truncate any redo history
    this.stack = this.stack.slice(0, this.pointer + 1)
    this.stack.push(action)

    // Enforce max size (drop oldest entries)
    if (this.stack.length > this.maxSize) {
      this.stack.shift()
    } else {
      this.pointer++
    }
  }

  /** Returns the action to undo, or null if nothing to undo. */
  undo(): EditAction | null {
    if (!this.canUndo()) return null
    const action = this.stack[this.pointer]
    this.pointer--
    return action
  }

  /** Returns the action to redo, or null if nothing to redo. */
  redo(): EditAction | null {
    if (!this.canRedo()) return null
    this.pointer++
    return this.stack[this.pointer]
  }

  canUndo(): boolean {
    return this.pointer >= 0
  }

  canRedo(): boolean {
    return this.pointer < this.stack.length - 1
  }

  clear(): void {
    this.stack = []
    this.pointer = -1
  }

  get size(): number {
    return this.stack.length
  }

  get undoCount(): number {
    return this.pointer + 1
  }

  get redoCount(): number {
    return this.stack.length - this.pointer - 1
  }
}
