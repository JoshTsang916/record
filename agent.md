# Agent Note

## 最新同步
- 分支：main（已與 origin/main 同步）
- 目前本地變更：
  - 成長頁面新增 C.R.E.A.T.E 雷達圖與技能 XP 清單
  - `/api/xp/stats/profile` 增加能力與技能統計輸出
  - 新增 `components/radar-chart.tsx` 作為雷達圖組件
  - 調整 `/api/tasks/save`，每日任務完成會更新 `completed_at`，重置為待做時清空
- 尚未推送

## 待辦與需求
1. 完成每日任務時自動獎勵 XP（目前只有詳情頁手動流程會呼叫 `/api/xp/award`）。
2. 視覺化成長面板（雷達圖與技能列表已完成第一版，後續可能需要進一步美化或加入更多統計）。
3. 持續觀察每日任務與行事曆、專案看板狀態同步是否符合預期。

