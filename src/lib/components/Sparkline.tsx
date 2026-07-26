import React, { memo } from 'react'
import type { SparklineOptions } from '../types'

interface SparklineProps {
  data: number[]
  options?: SparklineOptions
  width?: number
  height?: number
}

/**
 * Pure SVG sparkline — line, bar, or area charts in a cell.
 * Zero dependencies, no canvas, works in any browser.
 */
export const Sparkline = memo(({ data, options = {}, width = 100, height }: SparklineProps) => {
  const {
    type = 'line',
    color = 'var(--vg-accent)',
    fillColor,
    strokeWidth = 1.5,
    height: optHeight,
    min: optMin,
    max: optMax,
    showPoints = false,
  } = options

  const h = optHeight ?? height ?? 28
  const w = width
  const pad = 2

  if (!data || data.length === 0) return <svg width={w} height={h} />

  const dataMin = optMin ?? Math.min(...data)
  const dataMax = optMax ?? Math.max(...data)
  const range = dataMax - dataMin || 1

  const scaleX = (i: number) => pad + (i / (data.length - 1 || 1)) * (w - pad * 2)
  const scaleY = (v: number) => h - pad - ((v - dataMin) / range) * (h - pad * 2)

  const fill = fillColor ?? (type === 'area' ? `${color}30` : 'none')

  if (type === 'bar') {
    const barW = Math.max(1, (w - pad * 2) / data.length - 1)
    return (
      <svg width={w} height={h} style={{ overflow: 'visible' }}>
        {data.map((v, i) => {
          const barH = Math.max(1, ((v - dataMin) / range) * (h - pad * 2))
          return (
            <rect
              key={i}
              x={pad + (i / data.length) * (w - pad * 2)}
              y={h - pad - barH}
              width={barW}
              height={barH}
              fill={color}
              rx={1}
              opacity={0.85}
            />
          )
        })}
      </svg>
    )
  }

  // Line or Area
  const points = data.map((v, i) => `${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`).join(' ')
  const polyline = `${points}`

  let areaPath = ''
  if (type === 'area') {
    const coords = data.map((v, i) => `${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
    areaPath = [
      `M ${scaleX(0).toFixed(1)},${(h - pad).toFixed(1)}`,
      ...coords.map((c) => `L ${c}`),
      `L ${scaleX(data.length - 1).toFixed(1)},${(h - pad).toFixed(1)}`,
      'Z',
    ].join(' ')
  }

  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }} aria-hidden>
      {type === 'area' && (
        <path d={areaPath} fill={fill} stroke="none" />
      )}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {showPoints && data.map((v, i) => (
        <circle
          key={i}
          cx={scaleX(i)}
          cy={scaleY(v)}
          r={2}
          fill={color}
        />
      ))}
    </svg>
  )
})

Sparkline.displayName = 'Sparkline'

/**
 * Creates a cellRenderer that renders a sparkline from an array field.
 * 
 * Usage:
 *   { field: 'history', cellRenderer: createSparklineCellRenderer({ type: 'line', color: '#4a6cf7' }) }
 */
export function createSparklineCellRenderer(options?: SparklineOptions) {
  return function SparklineCellRenderer({ value }: { value: unknown }) {
    const data = Array.isArray(value) ? value.filter((v) => typeof v === 'number') : []
    return <Sparkline data={data} options={options} />
  }
}
