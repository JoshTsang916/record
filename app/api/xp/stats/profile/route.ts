import { NextRequest, NextResponse } from 'next/server'
import { getContent } from '@/lib/github'

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
    if (!hasGitHub) return NextResponse.json({ total_xp: 0, level: 1, progress: 0 })
    const today = new Date()
    const months = new Set<string>()
    for (let i=0;i<180;i++) { const d = new Date(today); d.setDate(today.getDate()-i); months.add(d.toISOString().slice(0,7)) }
    let total = 0
    for (const ym of months) {
      const arr = await readMonth(ym)
      total += arr.reduce((s: number, e: any) => s + (Number(e.xp)||0), 0)
    }
    const lv = levelFromXp(total)
    return NextResponse.json({ total_xp: total, ...lv })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

