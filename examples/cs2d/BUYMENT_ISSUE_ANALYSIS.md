# Buy Menu 問題分析：測試 HTML vs 遊戲本體

## 問題描述
測試 HTML (`test_cs2d.html`) 的 Buy Menu 正常運作，但遊戲本體中的 Buy Menu 可能有問題。

## 關鍵差異分析

### 1. JavaScript 執行環境差異

#### 測試 HTML (✅ 正常)
```javascript
// 直接在 HTML 中定義和執行
<script>
    function toggleBuyMenu() {
        const menu = document.getElementById('buy-menu');
        buyMenuOpen = !buyMenuOpen;
        menu.style.display = buyMenuOpen ? 'block' : 'none';
    }
</script>
```
- **執行時機**：頁面加載時立即執行
- **DOM 狀態**：靜態 DOM，一次性載入
- **事件綁定**：直接綁定到 DOM 元素

#### 遊戲本體 (❌ 可能有問題)
```ruby
# Ruby 端通過 builder 生成 HTML
def render_javascript_integration(builder)
  builder.tag(:script, src: "/_static/cs16_classic_game.js")
  builder.tag(:script) do
    builder.raw(<<~JAVASCRIPT)
      document.addEventListener('DOMContentLoaded', function() {
        if (typeof window.CS16Classic !== 'undefined') {
          window.CS16Classic.initializeGame('#{@player_id}');
        }
      });
    JAVASCRIPT
  end
end
```
- **執行時機**：需等待外部 JS 載入 + DOMContentLoaded
- **DOM 狀態**：動態更新，通過 WebSocket/Live::View
- **事件綁定**：可能在 DOM 更新後失效

### 2. DOM 更新機制差異

#### 測試 HTML
- **靜態 DOM**：一次性載入，不會重新渲染
- **事件監聽器**：永久有效

#### 遊戲本體 (Lively Framework)
- **動態 DOM**：每次 `self.update!` 可能重新渲染
- **事件監聽器**：可能在 DOM 更新後丟失
- **WebSocket 更新**：可能覆蓋現有 DOM

### 3. 可能的根本原因

#### 問題 1：事件監聽器丟失
當 Lively 執行 `self.update!` 時，DOM 會重新渲染，導致：
- 原有的事件監聽器失效
- Buy Menu 的點擊事件不再觸發
- 鍵盤事件綁定丟失

#### 問題 2：DOM 元素 ID 衝突
- Buy Menu 的 DOM 在每次更新時可能被重新創建
- JavaScript 可能找不到正確的元素

#### 問題 3：JavaScript 初始化時序
```javascript
// cs16_classic_game.js
window.toggleBuyMenu = function() {
    const buyMenu = document.getElementById('buy-menu');
    // 如果 DOM 還沒載入，buyMenu 會是 null
}
```

### 4. 解決方案

#### 方案 A：使用事件委託 (推薦)
```javascript
// 不直接綁定到按鈕，而是綁定到父容器
document.addEventListener('click', function(e) {
    if (e.target.id === 'buy-button' || e.target.closest('#buy-button')) {
        toggleBuyMenu();
    }
});
```

#### 方案 B：確保 DOM 存在後再綁定
```javascript
function ensureBuyMenu() {
    const buyMenu = document.getElementById('buy-menu');
    if (!buyMenu) {
        console.error('Buy menu not found in DOM');
        return false;
    }
    return true;
}

window.toggleBuyMenu = function() {
    if (!ensureBuyMenu()) return;
    // ... 執行邏輯
}
```

#### 方案 C：監聽 Live::View 更新
```javascript
// 監聽 DOM 變化，重新綁定事件
const observer = new MutationObserver(function(mutations) {
    // 重新綁定 buy menu 事件
    rebindBuyMenuEvents();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
```

#### 方案 D：將 Buy Menu 邏輯完全移到 JavaScript
```javascript
// 動態創建 Buy Menu，不依賴 Ruby 端的 DOM
function createBuyMenu() {
    let buyMenu = document.getElementById('buy-menu');
    if (!buyMenu) {
        buyMenu = document.createElement('div');
        buyMenu.id = 'buy-menu';
        // ... 設置樣式和內容
        document.body.appendChild(buyMenu);
    }
    return buyMenu;
}
```

### 5. 調試步驟

1. **檢查 DOM 存在性**：
```javascript
console.log('Buy menu element:', document.getElementById('buy-menu'));
console.log('Buy button element:', document.getElementById('buy-button'));
```

2. **檢查事件綁定**：
```javascript
// 在 console 中測試
window.toggleBuyMenu();  // 看是否有反應
```

3. **監控 DOM 更新**：
```javascript
let updateCount = 0;
const originalUpdate = self.update;
self.update = function() {
    console.log('DOM Update #' + (++updateCount));
    originalUpdate.call(this);
};
```

### 6. 建議修復

#### 立即修復 (Quick Fix)
在 `cs16_classic_game.js` 中加入：
```javascript
// 確保 Buy Menu 始終可用
window.toggleBuyMenu = function() {
    let buyMenu = document.getElementById('buy-menu');
    
    // 如果找不到，等待並重試
    if (!buyMenu) {
        console.warn('Buy menu not found, retrying...');
        setTimeout(() => {
            buyMenu = document.getElementById('buy-menu');
            if (buyMenu) {
                const currentDisplay = window.getComputedStyle(buyMenu).display;
                buyMenu.style.display = currentDisplay === 'none' ? 'block' : 'none';
            }
        }, 100);
        return;
    }
    
    const currentDisplay = window.getComputedStyle(buyMenu).display;
    buyMenu.style.display = currentDisplay === 'none' ? 'block' : 'none';
    buyMenu.style.pointerEvents = 'auto';
    buyMenu.style.zIndex = '9999';  // 確保在最上層
};
```

#### 長期修復 (Proper Fix)
1. 將 Buy Menu 完全由 JavaScript 管理
2. 使用狀態管理來同步 Ruby 和 JavaScript
3. 避免在遊戲運行時頻繁調用 `self.update!`

### 7. 測試驗證

執行以下測試來確認問題：

```javascript
// 在瀏覽器 Console 中執行
// Test 1: DOM 存在性
console.log('Buy Menu exists:', !!document.getElementById('buy-menu'));

// Test 2: 直接調用函數
window.toggleBuyMenu();

// Test 3: 檢查 z-index
const buyMenu = document.getElementById('buy-menu');
console.log('Buy Menu z-index:', window.getComputedStyle(buyMenu).zIndex);

// Test 4: 檢查 pointer-events
console.log('Buy Menu pointer-events:', window.getComputedStyle(buyMenu).pointerEvents);
```

## 結論

主要問題在於 **Lively Framework 的動態 DOM 更新機制** 與 **靜態 HTML 的直接 DOM 操作** 之間的差異。解決方案是確保 JavaScript 能夠適應動態 DOM 環境。