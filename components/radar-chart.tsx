"use client"

import { useId, useMemo } from 'react'

type RadarDataPoint = {
  key: string
  label: string
  value: number
}

type RadarChartProps = {
  data: RadarDataPoint[]
  maxValue?: number
  levels?: number
  className?: string
}

const SVG_SIZE = 220
const CENTER = SVG_SIZE / 2
const RADIUS = 90

type PreparedRadar = {
  max: number
  points: Array<{ x: number, y: number }>
  axisPoints: Array<{ x: number, y: number }>
  levelPolygons: string[]
  labels: Array<{
    key: string
    label: string
    x: number
    y: number
    textAnchor: string
    dominantBaseline: string
  }>
  polygonString: string
}

export default function RadarChart({ data, maxValue, levels = 4, className }: RadarChartProps) {
  const gradientId = useId().replace(/[:]/g, '')
  const prepared = useMemo<PreparedRadar>(() => {
    if (!data || data.length === 0) {
      return { max: 0, points: [], axisPoints: [], levelPolygons: [], labels: [], polygonString: '' }
    }
    const normalized = data.map(d => ({
      ...d,
      value: Math.max(0, Number.isFinite(d.value) ? d.value : 0)
    }))
    const max = Math.max(maxValue || 0, ...normalized.map(d => d.value), 1)
    const angleStep = (2 * Math.PI) / normalized.length

    const polarPoint = (value: number, index: number) => {
      const angle = -Math.PI / 2 + index * angleStep
      const radius = max === 0 ? 0 : (value / max) * RADIUS
      const x = CENTER + radius * Math.cos(angle)
      const y = CENTER + radius * Math.sin(angle)
      return { x, y }
    }

    const points = normalized.map((d, i) => polarPoint(d.value, i))
    const axisPoints = normalized.map((_, i) => polarPoint(max, i))
    const levelPolygons = Array.from({ length: levels }, (_, idx) => {
      const ratio = (idx + 1) / levels
      const layer = normalized.map((_, i) => polarPoint(max * ratio, i))
      return layer.map(p => `${p.x},${p.y}`).join(' ')
    })
    const labels = normalized.map((d, i) => {
      const position = polarPoint(max * 1.1, i)
      const dx = position.x - CENTER
      const textAnchor = Math.abs(dx) < 5 ? 'middle' : dx > 0 ? 'start' : 'end'
      return {
        ...d,
        ...position,
        textAnchor,
        dominantBaseline: position.y < CENTER - 5 ? 'auto' : position.y > CENTER + 5 ? 'hanging' : 'middle'
      }
    })
    return {
      max,
      points,
      axisPoints,
      levelPolygons,
      labels,
      polygonString: points.map(p => `${p.x},${p.y}`).join(' ')
    }
  }, [data, maxValue, levels])

  if (!prepared.points.length) {
    return <div className="text-xs text-gray-500">尚未累積能力資料</div>
  }

  return (
    <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} className={className || 'w-full max-w-md mx-auto'}>
      <defs>
        <linearGradient id={`radarGradient${gradientId}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(59 130 246)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <g stroke="currentColor" strokeOpacity="0.2" fill="none">
        {prepared.levelPolygons.map((points, idx) => (
          <polygon key={`grid-${idx}`} points={points} />
        ))}
        {prepared.axisPoints.map((p, idx) => (
          <line key={`axis-${idx}`} x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} />
        ))}
      </g>
      <polygon
        points={prepared.polygonString}
        fill={`url(#radarGradient${gradientId})`}
        stroke="rgb(59 130 246)"
        strokeWidth={1.5}
      />
      {prepared.points.map((p, idx) => (
        <circle key={`point-${idx}`} cx={p.x} cy={p.y} r={3} fill="rgb(59 130 246)" />
      ))}
      {prepared.labels.map(label => (
        <text
          key={label.key}
          x={label.x}
          y={label.y}
          textAnchor={label.textAnchor as any}
          dominantBaseline={label.dominantBaseline as any}
          className="text-[11px] fill-current"
        >
          {label.label}
        </text>
      ))}
    </svg>
  )
}
