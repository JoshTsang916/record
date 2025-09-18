"use client"
import { useEffect, useMemo, useState } from 'react'
import RadarChart from '@/components/radar-chart'

type AttributeStat = { key: string, xp: number }
type SkillStat = { id: string, title: string, xp: number }
type HistoryEntry = {
  date: string
  ts: string
  xp: number
  source: string
  task_title: string
  project_id: string
  project_title: string
  attributes: string[]
  idempotency_key?: string
}

type ProfileResponse = {
  total_xp: number
  level: number
  progress: number
  attributes: AttributeStat[]
  skills: SkillStat[]
  history: HistoryEntry[]
}

const ATTRIBUTE_ORDER = ['C','R','E','A','T','EV'] as const
const ATTRIBUTE_META: Record<string, {
  short: string
  title: string
  description: string
}> = {
  C: {
    short: 'C · 好奇心',
    title: 'Curiosity（好奇心）',
    description: '以強大的提問驅動深度學習，是探索者的啟動引擎。關鍵詞：閱讀、研究、學習、分析、提問、探索、課程、訪談、觀察、資料。'
  },
  R: {
    short: 'R · 韌性',
    title: 'Resilience（韌性）',
    description: '建立可持續的身心基礎，是自我成長的穩定器。關鍵詞：健身、運動、訓練、營養、睡眠、冥想、休息、復盤、反思、挑戰。'
  },
  E: {
    short: 'E · 表達力',
    title: 'Expression（表達力）',
    description: '把內在價值與世界連結，是思想與受眾的溝通橋樑。關鍵詞：分享、敘事、演說、溝通、錄製、Podcast、影片、直播、剪輯、發表。'
  },
  A: {
    short: 'A · 行動力',
    title: 'Action（行動力）',
    description: '將抽象想法化成產出，是理想世界的建造者。關鍵詞：建構、執行、實作、開發、程式、Code、設計、製作、VibeCoding。'
  },
  T: {
    short: 'T · 思考力',
    title: 'Thinking（思考力）',
    description: '連結跨域知識並創造框架，是知識的煉金術士。關鍵詞：整合、思考、規劃、大綱、整理、筆記、心智圖、框架、結構、策略。'
  },
  EV: {
    short: 'EV · 進化力',
    title: 'Evolution（進化力）',
    description: '擁抱變化與迭代，是系統升級的首席架構師。關鍵詞：適應、優化、迭代、重構、學習新工具、自動化、流程、升級。'
  }
}

const EMPTY_PROFILE: ProfileResponse = {
  total_xp: 0,
  level: 1,
  progress: 0,
  attributes: [],
  skills: [],
  history: []
}

function calcLevel(xp: number) {
  let lvl = 1
  let need = 100
  let remain = xp
  while (remain >= need) {
    remain -= need
    lvl += 1
    need = Math.round(need * 1.2)
  }
  const progress = need > 0 ? remain / need : 0
  return { level: lvl, progress }
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

  const attributeStats = useMemo(() => {
    const map = new Map(profile.attributes.map(item => [item.key, item.xp]))
    return ATTRIBUTE_ORDER.map(key => ({
      key,
      xp: map.get(key) || 0,
      meta: ATTRIBUTE_META[key],
      ...calcLevel(map.get(key) || 0)
    }))
  }, [profile.attributes])

  const radarData = useMemo(() => attributeStats.map(stat => ({ key: stat.key, label: stat.meta.short, value: stat.xp })), [attributeStats])
  const hasAbilityData = radarData.some(item => item.value > 0)
  const maxAbilityXp = useMemo(() => radarData.reduce((max, item) => Math.max(max, item.value), 0), [radarData])

  const skillStats = useMemo(() => (profile.skills || []).map(skill => ({
    ...skill,
    ...calcLevel(skill.xp || 0)
  })), [profile.skills])

  const historyList = useMemo(() => (profile.history || []).map((entry, index) => ({
    ...entry,
    idx: index,
    datetime: entry.ts ? new Date(entry.ts) : (entry.date ? new Date(`${entry.date}T00:00:00`) : null)
  })), [profile.history])

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
          {hasAbilityData ? (
            <RadarChart data={radarData} maxValue={maxAbilityXp} className="w-full max-w-lg mx-auto" />
          ) : (
            <div className="text-xs text-gray-500">尚未累積能力資料</div>
          )}
          <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
            {attributeStats.map(stat => (
              <li key={stat.key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <div className="font-medium text-sm text-gray-800 dark:text-gray-100">{stat.meta.title}</div>
                  <div className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{stat.meta.description}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-[11px] text-gray-500">
                    <span>Lv {stat.level}</span>
                    <span>{Math.round(stat.progress * 100)}%</span>
                  </div>
                  <div className="w-28 h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${Math.round(stat.progress * 100)}%` }} />
                  </div>
                  <span className="text-[11px] text-gray-400">{stat.xp} XP</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-md border border-gray-200 dark:border-gray-800 p-4 space-y-3">
          <div>
            <div className="text-sm font-medium">技能經驗</div>
            <div className="text-xs text-gray-500">依專案/技能累積 XP，排行由高到低</div>
          </div>
          {skillStats.length > 0 ? (
            <div className="space-y-2">
              {skillStats.map(skill => (
                <div key={skill.id} className="flex flex-col gap-2 rounded-md border border-dashed border-gray-200 dark:border-gray-800 p-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium truncate" title={skill.title}>{skill.title}</span>
                    <span className="text-xs text-gray-500">{skill.xp} XP</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500">
                    <span>Lv {skill.level}</span>
                    <span>{Math.round(skill.progress * 100)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${Math.round(skill.progress * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500">尚未累積任何技能 XP</div>
          )}
        </div>
      </div>

      <div className="rounded-md border border-gray-200 dark:border-gray-800 p-4 space-y-3">
        <div>
          <div className="text-sm font-medium">XP 獲取紀錄</div>
          <div className="text-xs text-gray-500">最新 10 筆 XP 來源，可滑動檢視。</div>
        </div>
        {historyList.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-3">
            {historyList.map(entry => (
              <div key={`${entry.idempotency_key || entry.idx}`}
                className="min-w-[220px] rounded-md border border-dashed border-gray-200 dark:border-gray-800 px-3 py-2 text-xs sm:text-sm flex flex-col gap-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-gray-800 dark:text-gray-100 truncate">{entry.task_title || '未命名任務'}</span>
                  <span className="text-[11px] text-gray-500">+{entry.xp} XP</span>
                </div>
                <div className="text-[11px] text-gray-500 flex flex-wrap gap-2">
                  <span>{entry.source}</span>
                  {entry.project_title && <span>專案：{entry.project_title}</span>}
                  {entry.datetime && <span>{entry.datetime.toLocaleString()}</span>}
                </div>
                {entry.attributes && entry.attributes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.attributes.map(attr => (
                      <span key={attr} className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] bg-blue-500/10 text-blue-500 dark:bg-blue-400/10 dark:text-blue-300">
                        {ATTRIBUTE_META[attr]?.short || attr}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-500">目前沒有 XP 紀錄。</div>
        )}
      </div>
    </div>
  )
}
