import { NextRequest, NextResponse } from 'next/server'
import { getContent, readProjectsIndex } from '@/lib/github'

function levelFromXp(total: number) {
  // progressive requirement: base 100, growth 1.2 per level
  let lvl = 1
  let need = 100
  let remain = total
  while (remain >= need) {
    remain -= need
    lvl += 1
    need = Math.round(need * 1.2)
  }
  const progress = need > 0 ? remain / need : 0
  return { level: lvl, progress, next_req: need }
}

async function readMonth(ym: string) {
  try { const c = await getContent(`game/xp/${ym}.jsonl`); if (!c) return []; return c.split(/\r?\n/).filter(Boolean).map((s: string)=>JSON.parse(s)) } catch { return [] }
}

export async function GET(req: NextRequest) {
  try {
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    if (!hasGitHub) {
      return NextResponse.json({ total_xp: 0, level: 1, progress: 0, attributes: [], skills: [] })
    }
    const today = new Date()
    const months = new Set<string>()
    for (let i=0;i<180;i++) { const d = new Date(today); d.setDate(today.getDate()-i); months.add(d.toISOString().slice(0,7)) }
    let total = 0
    const attributeTotals: Record<string, number> = { C: 0, R: 0, E: 0, A: 0, T: 0, EV: 0 }
    const skillTotals = new Map<string, number>()
    for (const ym of months) {
      const arr = await readMonth(ym)
      for (const entry of arr) {
        const xp = Number(entry?.xp) || 0
        total += xp
        const attrs: string[] = Array.isArray(entry?.attributes) ? entry.attributes : []
        for (const attr of attrs) {
          if (attr in attributeTotals) attributeTotals[attr] += xp
        }
        const skillKey = typeof entry?.skill_key === 'string' ? entry.skill_key.trim() : ''
        if (skillKey) {
          skillTotals.set(skillKey, (skillTotals.get(skillKey) || 0) + xp)
        }
      }
    }
    let projectMap: Record<string, string> = {}
    try {
      const projects = await readProjectsIndex()
      projectMap = Object.fromEntries(projects.map(p => [p.id, p.title || p.id]))
    } catch {}
    const lv = levelFromXp(total)
    const attributeOrder = ['C','R','E','A','T','EV']
    const attributeList = attributeOrder.map(key => ({ key, xp: attributeTotals[key] || 0 }))
    const skills = Array.from(skillTotals.entries()).map(([id, xp]) => ({ id, title: projectMap[id] || id, xp }))
    skills.sort((a, b) => b.xp - a.xp)
    return NextResponse.json({ total_xp: total, ...lv, attributes: attributeList, skills })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
