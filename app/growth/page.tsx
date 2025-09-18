"use client"
import { useEffect, useMemo, useState } from 'react'
import RadarChart from '@/components/radar-chart'

type AttributeStat = { key: string, xp: number }
type SkillStat = { id: string, title: string, xp: number }

type ProfileResponse = {
  total_xp: number
  level: number
  progress: number
  attributes: AttributeStat[]
  skills: SkillStat[]
}

const ATTRIBUTE_META: Record<string, { label: string, description: string }> = {
  C: { label: 'C · 探索/學習', description: '閱讀、研究、課程等知識吸收活動' },
  R: { label: 'R · 體能/恢復', description: '運動、睡眠、冥想與身體照護' },
  E: { label: 'E · 表達/共享', description: '溝通、敘事、錄製、對外分享' },
  A: { label: 'A · 實作/打造', description: '開發、設計、創作與系統建構' },
  T: { label: 'T · 結構/策略', description: '整理、規劃、架構與策略思考' },
  EV: { label: 'EV · 優化/進化', description: '調整、優化、迭代與自動化' }
}

const EMPTY_PROFILE: ProfileResponse = {
  total_xp: 0,
  level: 1,
  progress: 0,
  attributes: [],
  skills: []
}

export default function GrowthPage() {
  const [profile, setProfile] = useState<ProfileResponse>(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const r = await fetch('/api/xp/stats/profile', { cache: 'no-store' })
        if (r.ok) {
          const body = await r.json()
          setProfile({ ...EMPTY_PROFILE, ...body })
        }
      } catch {}
      setLoading(false)
    })()
  }, [])

  const radarData = useMemo(() => {
    if (!profile.attributes || profile.attributes.length === 0) return []
    return profile.attributes
      .filter(a => a.key in ATTRIBUTE_META)
      .map(a => ({ key: a.key, label: ATTRIBUTE_META[a.key].label, value: a.xp }))
  }, [profile.attributes])

  const maxAbilityXp = useMemo(() => radarData.reduce((max, item) => Math.max(max, item.value), 0), [radarData])

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">成長面板</h1>
        {loading && <div className="text-xs text-gray-500">載入中…</div>}
      </div>

      <div className="rounded-md border border-gray-200 dark:border-gray-800 p-4 space-y-2">
        <div className="text-sm">角色等級</div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-lg">Lv {profile.level}</span>
          <div className="w-40 h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
            <div className="h-full bg-green-500" style={{ width: `${Math.round((profile.progress||0)*100)}%` }} />
          </div>
          <span className="text-xs">{Math.round((profile.progress||0)*100)}%</span>
        </div>
        <div className="text-xs text-gray-500">累積 XP：{profile.total_xp}</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-gray-200 dark:border-gray-800 p-4 space-y-3">
          <div>
            <div className="text-sm font-medium">C.R.E.A.T.E 能力雷達</div>
            <div className="text-xs text-gray-500">依任務紀錄累計每個面向的 XP</div>
          </div>
          {radarData.length > 0 ? (
            <RadarChart data={radarData} maxValue={maxAbilityXp} />
          ) : (
            <div className="text-xs text-gray-500">尚未累積能力資料</div>
          )}
          <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
            {Object.entries(ATTRIBUTE_META).map(([key, meta]) => {
              const value = profile.attributes.find(a => a.key === key)?.xp || 0
              return (
                <li key={key} className="flex items-start justify-between gap-2">
                  <span>{meta.label}</span>
                  <span className="text-gray-500">{value} XP</span>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="rounded-md border border-gray-200 dark:border-gray-800 p-4 space-y-3">
          <div>
            <div className="text-sm font-medium">技能經驗</div>
            <div className="text-xs text-gray-500">依專案/技能累積 XP，排行由高到低</div>
          </div>
          {profile.skills && profile.skills.length > 0 ? (
            <div className="space-y-2">
              {profile.skills.map(skill => (
                <div key={skill.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">{skill.title}</span>
                    <span className="text-xs text-gray-500">ID：{skill.id}</span>
                  </div>
                  <span className="text-xs text-gray-500">{skill.xp} XP</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500">尚未累積任何技能 XP</div>
          )}
        </div>
      </div>
    </div>
  )
}
