import { NextRequest, NextResponse } from 'next/server'
import { commitFiles, getContent } from '@/lib/github'

const ATTR: Record<string,string[]> = {
  C: ['閱讀','研究','學習','分析','提問','探索','課程','訪談','觀察','資料'],
  R: ['健身','運動','訓練','營養','睡眠','冥想','休息','復盤','反思','挑戰'],
  E: ['分享','敘事','演說','溝通','錄製','podcast','影片','直播','剪輯','發表'],
  A: ['建構','執行','實作','開發','程式','code','設計','製作','vibecoding'],
  T: ['整合','思考','規劃','大綱','整理','筆記','心智圖','框架','結構','策略'],
  EV: ['適應','優化','迭代','重構','學習新工具','自動化','流程','升級']
}

function detectAttributes(title: string) {
  const t = (title||'').toLowerCase()
  const hit: string[] = []
  for (const [k, words] of Object.entries(ATTR)) {
    if (words.some(w => t.includes(w.toLowerCase()))) hit.push(k)
  }
  return hit
}

function ymdLocal(d: Date) {
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${dd}`
}

export async function POST(req: NextRequest) {
  try {
    const hasGitHub = !!process.env.GITHUB_REPO && !!process.env.GITHUB_TOKEN
    if (!hasGitHub) return NextResponse.json({ ok: false, skipped: true, reason: 'missing github env' })

    const body = await req.json()
    const source: 'focus'|'manual'|'task_done' = (body.source || 'manual')
    const task_id: string = String(body.task_id || '')
    const task_title: string = String(body.task_title || '')
    const project_id: string = String(body.project_id || '')
    const minutes: number = Number(body.minutes || 0)
    const dateStr: string = body.date || ymdLocal(new Date())
    const idempotency = `${source}:${task_id}:${dateStr}`

    // compute XP and attributes (parallel add)
    const xp = Math.max(0, Math.round(minutes))
    const attrs = detectAttributes(task_title)

    const ym = dateStr.slice(0,7)
    const path = `game/xp/${ym}.jsonl`
    let prev = ''
    try { prev = (await getContent(path)) || '' } catch {}
    // idempotency check
    if (prev) {
      const exists = prev.split(/\r?\n/).some(line => { try { const j = JSON.parse(line); return j.idempotency_key === idempotency } catch { return false } })
      if (exists) return NextResponse.json({ ok: true, skipped: true })
    }
    const record = {
      date: dateStr,
      ts: new Date().toISOString(),
      source,
      task_id,
      task_title,
      project_id,
      minutes: xp,
      xp,
      attributes: attrs,
      skill_key: project_id,
      idempotency_key: idempotency
    }
    const next = prev ? `${prev}\n${JSON.stringify(record)}` : JSON.stringify(record)
    await commitFiles({ message: `chore(xp): ${source} ${task_title||task_id} +${xp}`, files: [{ path, content: next }] })
    return NextResponse.json({ ok: true, xp, attributes: attrs, project_id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

