"use client"

import { useMemo } from 'react'

type RadarDataPoint = {
  key: string
  label: string
  value: number
}

type RadarChartProps = {
  data: RadarDataPoint[]
  maxValue?: number
  levels?: number
}

export default function RadarChart({ data, maxValue, levels = 4 }: RadarChartProps) {
  const prepared = useMemo(() => {
    const filtered = data.filter(d => Number.isFinite(d.value))
    const max = Math.max(maxValue || 0, ...filtered.map(d => d.value), 1)
    const center = 100
    const radius = 80
    const angleStep = (2 * Math.PI) / filtered.length
    const pointFor = (value: number, index: number) => {
      const angle = -Math.PI / 2 + index * angleStep
      const r = max === 0 ? 0 : (value / max) * radius
      const x = center + r * Math.cos(angle)
      const y = center + r * Math.sin(angle)
      return `${x},${y}`
    }
    const polygonPoints = filtered.map((d, i) => pointFor(d.value, i)).join(' ')
    const levelPolygons = Array.from({ length: levels }, (_, levelIndex) => {
      const ratio = (levelIndex + 1) / levels
      const points = filtered.map((_, i) => pointFor(max * ratio, i)).join(' ')
      return points
    })
    const labelPositions = filtered.map((d, i) => {
      const angle = -Math.PI / 2 + i * angleStep
      const r = radius + 12
      const x = center + r * Math.cos(angle)
      const y = center + r * Math.sin(angle)
      return { ...d, x, y }
    })
    return { filtered, max, polygonPoints, levelPolygons, labelPositions }
  }, [data, maxValue, levels])

  if (prepared.filtered.length === 0) return <div className="text-xs text-gray-500">No ability data yet</div>

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-sm mx-auto">
      <g className="text-gray-300 dark:text-gray-600" stroke="currentColor" strokeWidth="0.5" fill="none">
        {prepared.levelPolygons.map((points, idx) => (
          <polygon key={idx} points={points} />
        ))}
      </g>
      <polygon
        points={prepared.polygonPoints}
        fill="url(#radarGradient)"
        stroke="rgb(59 130 246)"
        strokeWidth="1.5"
      />
      <defs>
        <linearGradient id="radarGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(59 130 246)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {prepared.labelPositions.map(d => (
        <g key={d.key} transform={`translate(${d.x},${d.y})`}>
          <circle r={2} fill="rgb(59 130 246)" />
          <text x={4} y={4} className="text-[10px] fill-current" >{d.label}</text>
        </g>
      ))}
    </svg>
  )
}
