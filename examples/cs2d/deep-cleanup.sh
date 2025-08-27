#!/bin/bash

# CS2D 深度清理腳本 - 僅保留核心 TypeScript SPA
# ⚠️ 警告：此腳本會進行激進的清理！

echo "🔥 深度清理模式 - 僅保留核心 TypeScript SPA 檔案"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  此操作將刪除所有非必要檔案！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "確定要執行深度清理嗎？(yes/no): " confirm

if [[ "$confirm" != "yes" ]]; then
    echo "❌ 操作已取消"
    exit 1
fi

cd "$(dirname "$0")"

# 備份關鍵配置
echo "💾 備份關鍵配置..."
mkdir -p .backup
cp -r frontend/src .backup/ 2>/dev/null
cp frontend/package.json .backup/ 2>/dev/null
cp frontend/tsconfig.json .backup/ 2>/dev/null

# 列出將要刪除的目錄
echo ""
echo "🗑️  將要刪除的目錄："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Ruby 相關
echo "Ruby 後端："
for dir in game progression lib src spec; do
    if [ -d "$dir" ]; then
        echo "  ✓ $dir/ ($(find "$dir" -type f | wc -l) 個檔案)"
    fi
done

# 舊版前端
echo ""
echo "舊版前端："
for dir in public static_pages; do
    if [ -d "$dir" ]; then
        echo "  ✓ $dir/ ($(find "$dir" -type f | wc -l) 個檔案)"
    fi
done

# 測試和腳本
echo ""
echo "測試和腳本："
for dir in tests scripts; do
    if [ -d "$dir" ]; then
        echo "  ✓ $dir/ ($(find "$dir" -type f 2>/dev/null | grep -v ".spec.ts" | wc -l) 個非 E2E 檔案)"
    fi
done

# 其他
echo ""
echo "其他："
for dir in data demos references cstrike bin config; do
    if [ -d "$dir" ]; then
        echo "  ✓ $dir/"
    fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "確認刪除以上所有目錄？(yes/no): " final_confirm

if [[ "$final_confirm" != "yes" ]]; then
    echo "❌ 操作已取消"
    exit 1
fi

# 執行深度清理
echo ""
echo "🧹 開始深度清理..."

# 批量刪除目錄
rm -rf game/ progression/ lib/ src/ spec/
rm -rf public/ static_pages/
rm -rf data/ demos/ references/ cstrike/ bin/ config/
rm -rf tests/*.rb tests/integration/*.rb tests/*.js
rm -rf scripts/

# 刪除所有 Ruby 檔案
find . -name "*.rb" -delete 2>/dev/null
find . -name "gems.*" -delete 2>/dev/null
find . -name "Gemfile*" -delete 2>/dev/null

# 刪除臨時和日誌檔案
rm -rf tmp/ log/ node_modules/.cache
find . -name "*.log" -delete 2>/dev/null
find . -name ".DS_Store" -delete 2>/dev/null

# 創建極簡配置
cat > package.json << 'EOF'
{
  "name": "cs2d-spa",
  "version": "1.0.0",
  "description": "CS2D TypeScript SPA",
  "scripts": {
    "dev": "cd frontend && npm run dev",
    "build": "cd frontend && npm run build",
    "test": "cd frontend && npm test"
  }
}
EOF

# 創建極簡 README
cat > README.md << 'EOF'
# CS2D TypeScript SPA

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## Tech Stack
- React 18 + TypeScript
- Vite + TailwindCSS  
- WebSocket for multiplayer
- Canvas for game rendering
EOF

# 創建 .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
*.log
.DS_Store
.backup/
frontend/node_modules/
frontend/dist/
EOF

# 統計結果
echo ""
echo "✨ 深度清理完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 清理統計："
echo "  保留目錄: $(find . -type d -maxdepth 1 | wc -l) 個"
echo "  保留檔案: $(find . -type f | wc -l) 個"
echo "  專案大小: $(du -sh . | cut -f1)"
echo ""
echo "📁 最終結構："
echo "cs2d/"
echo "├── frontend/     # TypeScript SPA"
echo "├── docker/       # Docker 配置 (可選)"
echo "├── docs/         # 文檔 (可選)"
echo "└── README.md     # 專案說明"
echo ""
echo "🎮 使用 'cd frontend && npm run dev' 啟動專案"