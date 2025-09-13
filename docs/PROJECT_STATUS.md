# Idea Vault — 專案進度與後續計畫（活文件）

更新時間：請以 Git 提交時間為準

— 目的：集中記錄目前狀況、功能清單、已知風險與 Roadmap，方便日後我（AI 助手）快速接手。

## 概覽
- 架構：Next.js 14（App Router，TypeScript，Tailwind），純前端 + Next API Routes，無資料庫。
- 儲存：Markdown + index.json 存在 GitHub 資料倉（`ideas/` 與 `ideas/_index/index.json`）。
- 轉寫：OpenAI Whisper（可選，`OPENAI_API_KEY`）。
- 模式：目前只存文字（`SAVE_AUDIO=false`）。

## 目前功能（已上線）
- 首頁列表（/）
  - 搜尋、標籤篩選、狀態篩選（草稿/整理中/待辦/完成）、排序（最新、重要性）。
  - 卡片顯示標題、時間、重要性、狀態、標籤 chips。
  - 點卡片進入詳情；點卡片上的 tag chip 會套用/取消該標籤篩選（可切換）。
- 詳情頁（/ideas/[id]）
  - 可編輯：標題、標籤（chips）、重要性、狀態、文字內容。
  - 儲存：寫回 GitHub；成功後自動回首頁。
  - 刪除：刪除 md 並更新 index.json。
- 新增
  - 錄音視窗（Record）：可選「重要性、狀態」，標籤用 chips；可勾選 Transcribe；失敗進 LocalStorage 佇列，Navbar 顯示 Retry。
  - 新增文字視窗（New text）：可選「重要性、狀態」，標籤用 chips。
- 看板視圖（/board，MVP）
  - 四欄：草稿/整理中/待辦/完成；可拖曳卡片到其他欄直接改狀態。
  - 欄內以「重要性降冪、同分依建立時間新到舊」排序。
  - 上方包含搜尋與標籤篩選（與首頁一致）。
- 夜間模式
  - Navbar 右側切換「夜間/亮色」，會記錄在 localStorage。
  - 深色樣式已套用到按鈕、輸入、textarea、select、卡片、Modal。
- 佇列與錯誤顯示
  - 錄音失敗會進 LocalStorage 佇列，Retry 會逐筆重送。
  - 前端對常見錯誤（如 GitHub 空 repo/權限）會顯示詳細訊息。

## 環境與部署
- App Repo（程式碼）：https://github.com/JoshTsang916/record（分支：main）
- Hosting：Vercel Project「record」。
- 資料 Repo：`JoshTsang916/idea-vault-data`（已有人為 README.md 初始 commit）。
- 主要環境變數（在 Vercel 設定）
  - `OPENAI_API_KEY`（需有額度）
  - `SAVE_AUDIO=false`
  - `GITHUB_REPO=JoshTsang916/idea-vault-data`
  - `GITHUB_TOKEN`＝fine‑grained PAT（Only this repo；Repository permissions → Contents: Read & write）
  - `N8N_WEBHOOK_URL`（可選）
  - `NEXT_PUBLIC_BASE_URL`（可選，webhook 需要絕對網址時再填）

## 已知事項 / 風險
- GitHub 422（Update is not a fast forward）：已在前端加入鎖定按鈕避免重複提交；仍建議之後在伺服器側加「重試/拉新 HEAD」保護。
- GitHub 分支保護：若設保護規則會擋提交，需要允許直接更新。
- 目前佇列只涵蓋「錄音新增」；若要也涵蓋「文字新增」與「詳情儲存」，需擴充佇列格式與 Retry 流程。
- Whisper 失敗：金鑰/額度或格式問題會導致空白轉寫；前端會顯示錯誤。

## Roadmap（建議順序）
1) 使用體驗
   - Toast 成功/失敗與 Retry 完成通知。
   - 詳情頁自動儲存（debounce 1–2s）＋ 儲存中狀態顯示。
   - URL 同步（搜尋/標籤/狀態/排序）便於分享與返回。
2) 看板視圖強化
   - 欄內手動排序持久化（在 index.json 增 `position` 或 per‑status order）。
   - 手機長按拖曳／點擊快速改狀態；快捷鍵（1..5 改重要性、S 循環狀態）。
   - WIP 限制與提示（每欄卡片上限）。
3) 可靠性與同步
   - /api/save 與 /api/capture 伺服器端加入 422 處理（拉取最新 HEAD 後重試一次）。
   - 將「文字新增、詳情儲存」也納入 LocalStorage 佇列；Retry 統一處理。
   - PWA/離線（背景同步，安裝圖示）。
4) 進階（可選）
   - 一鍵摘要（OpenAI）寫入 frontmatter.summary。
   - Webhook 自動化（n8n），NEXT_PUBLIC_BASE_URL 設定後啟用。
   - 匯出/匯入（CSV/Markdown zip）。

## 驗收清單（快速檢查）
- [ ] 錄音→Stop：可建立新想法（含 chips/重要性/狀態）。
- [ ] New text：可建立新想法（含 chips/重要性/狀態）。
- [ ] 首頁搜尋/標籤/狀態/排序運作；卡片點標籤可切換篩選。
- [ ] 詳情頁 chips 編輯→儲存，回首頁更新。
- [ ] 刪除成功且 GitHub index.json 同步。
- [ ] 看板視圖可拖曳改狀態（失敗會回退）。

## 常用路徑
- 首頁列表：`/`
- 詳情頁：`/ideas/[id]`
- 看板視圖：`/board`
- API：`/api/capture`、`/api/save`、`/api/list`、`/api/read`、`/api/delete`

— End —

