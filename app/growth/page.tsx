"use client"
import { useEffect, useState } from 'react'

export default function GrowthPage() {
  const [profile, setProfile] = useState<{ total_xp: number, level: number, progress: number }>({ total_xp: 0, level: 1, progress: 0 })
  useEffect(() => { (async () => { try { const r = await fetch('/api/xp/stats/profile', { cache: 'no-store' }); if (r.ok) setProfile(await r.json()) } catch {} })() }, [])
  return (
    <div className="container py-6 space-y-4">
      <h1 className="text-xl font-semibold">成長面板（MVP）</h1>
      <div className="rounded-md border border-gray-200 dark:border-gray-800 p-4">
        <div className="text-sm">角色等級</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-lg">Lv {profile.level}</span>
          <div className="w-40 h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${Math.round((profile.progress||0)*100)}%` }} /></div>
          <span className="text-xs">{Math.round((profile.progress||0)*100)}%</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">累積 XP：{profile.total_xp}</div>
      </div>
      <div className="text-sm text-gray-500">後續將在此加入 C.R.E.A.T.E 雷達圖與技能清單。</div>
    </div>
  )
}

