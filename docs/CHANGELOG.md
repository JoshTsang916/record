# Changelog — Idea Vault

此文件用來記錄可觀察到的功能與行為變更，方便回顧演進。建議遵循「Added/Changed/Fixed/Performance/Docs」分類，日期以部署時間為準。

## 2025-09-16

### Added
- Task 詳情頁 `/tasks/[id]`：可編輯標題、描述、標籤、優先度、狀態、截止日、專案；支援刪除。
- Tasks API：新增 `POST /api/tasks/delete`；既有 `create/read/save` 配合詳情頁使用。
- 首頁視圖切換（Ideas/Tasks/All）：支援任務卡片顯示與篩選、排序。
- Idea 卡片「轉為任務」快速動作：一鍵建立 Task（可選封存 Idea）。
- 日曆視圖 `/calendar`（MVP）：月視圖、專案篩選、包含已完成切換、拖曳改期、到期顏色提示。
- 日曆增強：狀態/標籤篩選、「無日期」面板（拖曳清除截止日）、每格「+ 任務（當日）」快捷。
- 專案/任務（MVP）：
  - 專案清單 `/projects` 與詳情 `/projects/[id]` + 看板（拖曳改狀態）。
  - APIs：`/api/projects (list/create/read/save)`、`/api/tasks (list/create/read/save)`。
  - Idea 詳情可指定 `project_id`。
- 首頁卡片快速操作：封存、刪除；新增封存狀態（archived）。

### Changed
- 首頁支援任務卡片導向任務詳情 `/tasks/[id]`；日曆與專案看板上的任務也可點擊進入詳情。
- Idea 詳情頁新增「返回」按鈕；錄音/新文字建立時可直接選擇對應專案。

### Performance
- 列表快取：`ideas-index` / `tasks-index` 使用短 revalidate + tag；寫入（新增/更新/刪除）後自動失效。
- 快速路徑：`/api/read`、`/api/delete` 支援 `file_path`，減少一次索引讀取。

### Fixed
- 修正日曆頁重複匯入 `Link` 導致 Vercel build 失敗。

### Changed
- 將 Navbar 提升至全域佈局，並加入首屏主題初始化腳本（避免深色模式閃爍/失效）。
- 首頁 Tasks 視圖新增「完成」快速按鈕（樂觀更新）。
- 專案看板的任務卡片：完成後樣式弱化（`opacity-60`）。
- 日曆視圖拖曳任務：從「無日期」拖到某日時也做樂觀移除無日期列表（減少體感延遲）。
- 專案看板：任務卡片可整卡點擊進入詳情；新增「包含已完成」開關（預設開啟），看板載入帶 `include_done=true`。

## 2025-09-15（基線）

### Added
- 核心 Idea Vault（Next.js 14 + App Router）：錄音（Whisper 可選）、純文字新增、首頁清單（搜尋/標籤/狀態/排序）、詳情編輯、刪除、看板視圖、深色模式、失敗佇列重試。
- GitHub 作為資料儲存：Markdown + `ideas/_index/index.json`；無 DB。Vercel 部署。

---

維護說明
- 每次功能變更後，請在最上方新增一段版本紀錄，建議格式：
  - 日期（YYYY-MM-DD）
  - 分類（Added/Changed/Fixed/Performance/Docs）簡述重點
- 若有對外行為改變（API、路由、資料格式），務必標註於 Changed。
- 若只是內部重構或文件更新，可寫在 Docs 或省略。
