/**
 * formulaEngine.ts — Excel-style cell formula parser & evaluator
 *
 * Supported syntax:
 *   =SUM(salary)           → sum of entire column named 'salary'
 *   =AVG(score[0],score[1])→ average of specific cells
 *   =IF(score[0]>4,"A","B")→ conditional
 *   =CONCAT(first[0]," ",last[0])
 *   =salary[0]*0.1+bonus[0]
 *   =ROUND(AVG(salary),2)
 */

// ─── Cell reference resolver ──────────────────────────────────────────────────

type CellResolver = (colId: string, rowIndex?: number) => unknown

// ─── Tokeniser ────────────────────────────────────────────────────────────────

type TokenType =
  | 'NUMBER' | 'STRING' | 'IDENT' | 'LPAREN' | 'RPAREN'
  | 'COMMA'  | 'LBRACKET' | 'RBRACKET'
  | 'PLUS' | 'MINUS' | 'MUL' | 'DIV'
  | 'GT' | 'LT' | 'GTE' | 'LTE' | 'EQ' | 'NEQ'
  | 'AND' | 'OR' | 'EOF'

interface Token { type: TokenType; value: string; pos: number }

function tokenise(expr: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < expr.length) {
    const ch = expr[i]
    if (/\s/.test(ch)) { i++; continue }
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(expr[i + 1] ?? ''))) {
      let num = ''
      while (i < expr.length && /[\d.]/.test(expr[i])) num += expr[i++]
      tokens.push({ type: 'NUMBER', value: num, pos: i })
      continue
    }
    if (ch === '"') {
      let str = ''
      i++ // skip opening quote
      while (i < expr.length && expr[i] !== '"') str += expr[i++]
      i++ // skip closing quote
      tokens.push({ type: 'STRING', value: str, pos: i })
      continue
    }
    if (/[A-Za-z_]/.test(ch)) {
      let id = ''
      while (i < expr.length && /[A-Za-z0-9_]/.test(expr[i])) id += expr[i++]
      tokens.push({ type: 'IDENT', value: id, pos: i })
      continue
    }
    if (ch === '>' && expr[i + 1] === '=') { tokens.push({ type: 'GTE',      value: '>=', pos: i }); i += 2; continue }
    if (ch === '<' && expr[i + 1] === '=') { tokens.push({ type: 'LTE',      value: '<=', pos: i }); i += 2; continue }
    if (ch === '!' && expr[i + 1] === '=') { tokens.push({ type: 'NEQ',      value: '!=', pos: i }); i += 2; continue }
    if (ch === '&' && expr[i + 1] === '&') { tokens.push({ type: 'AND',      value: '&&', pos: i }); i += 2; continue }
    if (ch === '|' && expr[i + 1] === '|') { tokens.push({ type: 'OR',       value: '||', pos: i }); i += 2; continue }
    const single: Record<string, TokenType> = {
      '(': 'LPAREN', ')': 'RPAREN', ',': 'COMMA',
      '[': 'LBRACKET', ']': 'RBRACKET',
      '+': 'PLUS', '-': 'MINUS', '*': 'MUL', '/': 'DIV',
      '>': 'GT', '<': 'LT', '=': 'EQ',
    }
    if (single[ch]) { tokens.push({ type: single[ch], value: ch, pos: i }); i++; continue }
    i++ // skip unknown
  }
  tokens.push({ type: 'EOF', value: '', pos: i })
  return tokens
}

// ─── Recursive descent parser + evaluator ────────────────────────────────────

class FormulaEvaluator {
  private tokens: Token[]
  private pos = 0
  private resolve: CellResolver

  constructor(tokens: Token[], resolve: CellResolver) {
    this.tokens = tokens
    this.resolve = resolve
  }

  private peek(): Token { return this.tokens[this.pos] }
  private eat(type?: TokenType): Token {
    const t = this.tokens[this.pos++]
    if (type && t.type !== type) throw new Error(`Expected ${type} got ${t.type}`)
    return t
  }
  private check(type: TokenType): boolean { return this.peek().type === type }

  evaluate(): unknown { return this.parseOr() }

  private parseOr(): unknown {
    let left = this.parseAnd()
    while (this.check('OR')) { this.eat(); const right = this.parseAnd(); left = (left as boolean) || (right as boolean) }
    return left
  }
  private parseAnd(): unknown {
    let left = this.parseComparison()
    while (this.check('AND')) { this.eat(); const right = this.parseComparison(); left = (left as boolean) && (right as boolean) }
    return left
  }
  private parseComparison(): unknown {
    let left = this.parseAddSub()
    while (['GT','LT','GTE','LTE','EQ','NEQ'].includes(this.peek().type)) {
      const op = this.eat().type
      const right = this.parseAddSub()
      if (op === 'GT')  left = (left as number) > (right as number)
      if (op === 'LT')  left = (left as number) < (right as number)
      if (op === 'GTE') left = (left as number) >= (right as number)
      if (op === 'LTE') left = (left as number) <= (right as number)
      if (op === 'EQ')  left = left == right  // eslint-disable-line eqeqeq
      if (op === 'NEQ') left = left != right  // eslint-disable-line eqeqeq
    }
    return left
  }
  private parseAddSub(): unknown {
    let left = this.parseMulDiv()
    while (this.check('PLUS') || this.check('MINUS')) {
      const op = this.eat().type
      const right = this.parseMulDiv()
      left = op === 'PLUS' ? (left as number) + (right as number) : (left as number) - (right as number)
    }
    return left
  }
  private parseMulDiv(): unknown {
    let left = this.parseUnary()
    while (this.check('MUL') || this.check('DIV')) {
      const op = this.eat().type
      const right = this.parseUnary()
      left = op === 'MUL' ? (left as number) * (right as number) : (right as number) !== 0 ? (left as number) / (right as number) : '#DIV/0!'
    }
    return left
  }
  private parseUnary(): unknown {
    if (this.check('MINUS')) { this.eat(); return -(this.parsePrimary() as number) }
    return this.parsePrimary()
  }

  private parsePrimary(): unknown {
    const t = this.peek()

    // Number literal
    if (t.type === 'NUMBER') { this.eat(); return parseFloat(t.value) }
    // String literal
    if (t.type === 'STRING') { this.eat(); return t.value }
    // Grouped expression
    if (t.type === 'LPAREN') { this.eat(); const v = this.evaluate(); this.eat('RPAREN'); return v }

    // Identifier — could be function call or column reference
    if (t.type === 'IDENT') {
      this.eat()
      const name = t.value.toUpperCase()

      // Function call
      if (this.check('LPAREN')) {
        this.eat('LPAREN')
        const args: unknown[] = []
        while (!this.check('RPAREN') && !this.check('EOF')) {
          args.push(this.evaluate())
          if (this.check('COMMA')) this.eat()
        }
        this.eat('RPAREN')
        return this.callFunction(name, args)
      }

      // Column reference: colId[rowIndex] or colId (entire column)
      const colId = t.value
      if (this.check('LBRACKET')) {
        this.eat('LBRACKET')
        const idx = this.evaluate() as number
        this.eat('RBRACKET')
        return this.resolve(colId, idx)
      }
      // Entire column as array
      return this.resolve(colId)
    }

    return undefined
  }

  private callFunction(name: string, args: unknown[]): unknown {
    const nums = (arr: unknown[]): number[] =>
      arr.flatMap((a) => Array.isArray(a) ? a.map(Number).filter((n) => !isNaN(n)) : [Number(a)]).filter((n) => !isNaN(n))

    switch (name) {
      case 'SUM':    return nums(args).reduce((s, v) => s + v, 0)
      case 'AVG': { const n = nums(args); return n.length ? n.reduce((s, v) => s + v, 0) / n.length : 0 }
      case 'MIN':    return Math.min(...nums(args))
      case 'MAX':    return Math.max(...nums(args))
      case 'COUNT':  return nums(args).length
      case 'ROUND': { const [val, dec] = args; return parseFloat(Number(val).toFixed(Number(dec ?? 0))) }
      case 'ABS':    return Math.abs(Number(args[0]))
      case 'UPPER':  return String(args[0] ?? '').toUpperCase()
      case 'LOWER':  return String(args[0] ?? '').toLowerCase()
      case 'LEN':    return String(args[0] ?? '').length
      case 'TRIM':   return String(args[0] ?? '').trim()
      case 'CONCAT': return args.map((a) => String(a ?? '')).join('')
      case 'IF': {
        const [cond, ifTrue, ifFalse] = args
        return cond ? ifTrue : ifFalse
      }
      case 'ISNUMBER': return typeof args[0] === 'number' || !isNaN(Number(args[0]))
      case 'ISBLANK':  return args[0] == null || args[0] === ''
      case 'AND':      return args.every(Boolean)
      case 'OR':       return args.some(Boolean)
      case 'NOT':      return !args[0]
      case 'MOD':      return Number(args[0]) % Number(args[1])
      case 'POWER':    return Math.pow(Number(args[0]), Number(args[1]))
      case 'SQRT':     return Math.sqrt(Number(args[0]))
      default:         return `#NAME?:${name}`
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface FormulaContext {
  /** Resolve colId → all values in column, or colId + rowIndex → single cell */
  getColumnValues: (colId: string) => unknown[]
  getCellValue: (colId: string, rowIndex: number) => unknown
}

export function evaluateFormula(formula: string, ctx: FormulaContext): { result: unknown; error?: string } {
  const raw = formula.startsWith('=') ? formula.slice(1) : formula
  try {
    const tokens = tokenise(raw)
    const resolver: CellResolver = (colId, rowIndex?) => {
      if (rowIndex !== undefined) return ctx.getCellValue(colId, rowIndex)
      return ctx.getColumnValues(colId)
    }
    const evaluator = new FormulaEvaluator(tokens, resolver)
    const result = evaluator.evaluate()
    return { result }
  } catch (e) {
    return { result: '#ERROR!', error: String(e) }
  }
}

export function isFormula(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('=')
}
