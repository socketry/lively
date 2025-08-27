# CS2D 專案目錄結構

專案已重新整理，以下是更新後的目錄結構：

## 📁 主要目錄

### `/src` - 原始碼
- `lobby/` - 大廳相關程式碼
- `servers/` - 伺服器程式碼  
- `views/` - 視圖元件
- `types/` - TypeScript 類型定義
- `example/` - 範例程式碼

### `/game` - 遊戲邏輯
- 包含所有遊戲系統實作（武器、炸彈、經濟系統等）

### `/frontend` - 前端應用程式
- React/TypeScript 前端程式碼
- `src/` - 前端原始碼
- `tests/` - 前端測試

### `/docs` - 文件
- 所有 Markdown 文件已集中於此
- `alpha-beta/` - 版本規劃文件
- `reports/` - 各類報告

### `/config` - 設定檔
- 包含各種設定檔案
- Docker 設定保留在 `/docker` 目錄

### `/scripts` - 腳本檔案
- 自動化腳本
- 建置和部署腳本

### `/tests` - 測試檔案
- `e2e/` - 端對端測試
- `integration/` - 整合測試
- 單元測試檔案

### `/spec` - Ruby 測試規格
- RSpec 測試檔案
- 工廠模式和輔助工具

### `/public` - 靜態資源
- HTML 檔案
- `_static/` - 靜態資源（CSS、JS）

### `/docker` - Docker 相關
- Dockerfile 檔案
- docker-compose 設定

### `/progression` - 進度系統
- 成就、排行榜、等級系統

### `/cstrike` - CS 資源檔案
- 音效檔案
- 遊戲資源

## 🔧 整理內容

### 已完成的整理工作：
1. ✅ 將所有 Markdown 文件移至 `/docs` 目錄
2. ✅ 設定檔集中管理
3. ✅ 測試檔案統一整理
4. ✅ 清理備份和臨時檔案
5. ✅ 建立 `.gitignore` 檔案
6. ✅ 腳本檔案整理至 `/scripts`

### 檔案移動詳情：
- `*.md` → `/docs/`
- `multi-agent-config.js` → `/scripts/`
- `playwright.config.js` → `/config/`
- 測試檔案從 `/docs/testing/` → `/tests/integration/`
- 移除：`*.backup`、`*.bak`、重複設定檔

## 📝 注意事項

- `package.json`、`tsconfig.json` 等必要設定檔保留在根目錄
- `node_modules/` 已加入 `.gitignore`
- 測試結果和建置產物不再追蹤

## 🚀 快速開始

請參考 `/docs/QUICK_START.md` 了解如何開始使用專案。

---
整理完成時間：2025-08-17