const ATTR_KEYWORDS: Record<string, string[]> = {
  C: ['閱讀','研究','學習','分析','提問','探索','課程','訪談','觀察','資料','好奇','聽','看','訪綱','問卷','使用者研究','勘查'],
  R: ['健身','運動','訓練','營養','睡眠','冥想','休息','復盤','反思','挑戰','日誌','週記','日記','心態','檢討','堅持'],
  E: ['分享','敘事','演說','溝通','錄製','發表','文案','草稿','演講','對話','回覆','社群','寫','剪輯'],
  A: ['建構','執行','實作','開發','程式','code','設計','製作','vibecoding','原型','prototype','部署','發佈','動手做'],
  T: ['整合','思考','規劃','大綱','整理','筆記','心智圖','框架','結構','策略','連結','分類','歸納','模型','假設','推演'],
  EV: ['適應','優化','迭代','重構','學習新工具','自動化','流程','升級','更新','實驗','測試','debug','效率']
}

const ATTR_COLORS: Record<string, string> = {
  C: '#3B82F6',
  R: '#22C55E',
  E: '#F97316',
  A: '#EF4444',
  T: '#8B5CF6',
  EV: '#14B8A6'
}

export function detectAttributes(text: string): string[] {
  const lower = (text || '').toLowerCase()
  const hit: string[] = []
  for (const [key, words] of Object.entries(ATTR_KEYWORDS)) {
    if (words.some(word => lower.includes(word.toLowerCase()))) hit.push(key)
  }
  return hit
}

export function attributeColor(key: string): string {
  return ATTR_COLORS[key] || '#6B7280'
}

export const ATTRIBUTE_ORDER = ['C','R','E','A','T','EV'] as const

export const ATTRIBUTE_LABEL: Record<string, string> = {
  C: 'Curiosity',
  R: 'Resilience',
  E: 'Expression',
  A: 'Action',
  T: 'Thinking',
  EV: 'Evolution'
}

