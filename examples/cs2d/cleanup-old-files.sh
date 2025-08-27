#!/bin/bash

# CS2D 檔案清理腳本 - 保留 TypeScript SPA 版本
# 執行前請先備份重要檔案！

echo "🧹 開始清理舊版檔案，保留 TypeScript SPA 版本..."
echo "⚠️  此操作將刪除大量檔案，請確認已備份重要資料"
read -p "確定要繼續嗎？(y/N): " confirm

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "❌ 操作已取消"
    exit 1
fi

# 設定工作目錄
cd "$(dirname "$0")"

echo "📁 刪除舊版 Ruby 後端檔案..."

# 刪除 Ruby 遊戲邏輯檔案
rm -rf game/
rm -rf progression/
rm -rf lib/
rm -rf src/
rm -rf spec/

# 刪除舊版靜態檔案
echo "📁 刪除舊版靜態檔案..."
rm -rf public/_static/*.js
rm -rf public/*.html
rm -rf static_pages/

# 刪除 Ruby 應用程式入口
rm -f application.rb
rm -f *.rb

# 刪除 Ruby 相關配置
rm -f gems.rb gems.locked
rm -f Gemfile Gemfile.lock

# 刪除舊版測試檔案
echo "📁 刪除舊版測試檔案..."
rm -rf tests/*.rb
rm -rf tests/integration/*.rb
rm -rf tests/*.js  # 保留 e2e 測試

# 清理不需要的腳本
echo "📁 清理過時的腳本..."
rm -f scripts/multi-agent-*.js
rm -f scripts/claude-agent-*.js
rm -f scripts/vue-to-react-*.js
rm -f scripts/react-migration-*.js
rm -f scripts/test_static_health.rb

# 清理臨時檔案和日誌
echo "📁 清理臨時檔案..."
rm -rf tmp/
rm -rf log/
rm -rf data/
rm -rf demos/
rm -f *.log

# 保留必要的檔案結構
echo "✅ 保留以下重要檔案："
echo "  - frontend/ (TypeScript SPA)"
echo "  - docker/ (Docker 配置)"
echo "  - docs/ (文檔)"
echo "  - package.json, tsconfig.json (前端配置)"
echo "  - tests/e2e/ (E2E 測試)"
echo "  - README.md, LICENSE"

# 創建新的簡化啟動腳本
cat > start.sh << 'EOF'
#!/bin/bash
# CS2D TypeScript SPA 啟動腳本

echo "🎮 啟動 CS2D TypeScript SPA..."
cd frontend
npm install
npm run dev
EOF
chmod +x start.sh

# 更新 README
cat > README_CLEANUP.md << 'EOF'
# CS2D TypeScript SPA 版本

## 🚀 快速開始

```bash
cd frontend
npm install
npm run dev
```

## 📁 專案結構

```
cs2d/
├── frontend/          # TypeScript/React SPA
│   ├── src/          # 源代碼
│   ├── tests/        # 測試
│   └── public/       # 靜態資源
├── docker/           # Docker 配置
├── docs/             # 文檔
└── tests/e2e/        # E2E 測試
```

## 🧹 清理說明

已移除所有舊版 Ruby 後端檔案，僅保留現代化的 TypeScript SPA 版本。

### 已刪除：
- Ruby 後端 (game/, src/, lib/)
- 舊版靜態檔案 (public/_static/)
- Ruby 測試 (spec/, tests/*.rb)
- 過時的遷移腳本

### 保留：
- 完整的 TypeScript/React SPA
- Docker 部署配置
- E2E 測試套件
- 專案文檔
EOF

echo ""
echo "✨ 清理完成！"
echo "📊 清理統計："
echo "  已刪除 Ruby 檔案: $(find . -name "*.rb" 2>/dev/null | wc -l) 個"
echo "  保留 TypeScript 檔案: $(find frontend -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l) 個"
echo ""
echo "🎮 現在可以使用 ./start.sh 啟動 TypeScript SPA 版本"