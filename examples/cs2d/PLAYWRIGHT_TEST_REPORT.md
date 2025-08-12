# CS2D Playwright 測試報告與修復計劃

## 測試執行時間
**日期**: 2025-08-12  
**測試範圍**: 從加入遊戲到進入遊戲的完整流程

## ✅ 測試成功項目

### 1. 基礎架構
- [x] Redis 服務器正常運行 (端口 6379)
- [x] Lively 應用程序成功啟動 (`async_redis_lobby_i18n.rb`)
- [x] 瀏覽器成功導航至 `http://localhost:9292`

### 2. 用戶界面
- [x] i18n 繁體中文界面正確顯示
- [x] 房間列表自動更新機制正常
- [x] 表單元素 (輸入框、下拉選單) 功能正常

### 3. Cookie 管理
- [x] 玩家 ID Cookie 正確存儲: `cs2d_player_id=68ff5055-9daa-483f-95ab-fee7ef01eb34`
- [x] 30天持久化設置正常
- [x] 手動修復後玩家 ID 顯示正常

### 4. WebSocket 通信
- [x] Live.js 框架正常載入
- [x] 事件轉發機制 (`window.live.forwardEvent`) 功能正常

## 🐛 發現的問題

### 🔴 高優先級問題

#### 1. 房間創建表單 JavaScript ID 不匹配
**問題描述**: 
- JavaScript onclick 處理器使用硬編碼 ID
- HTML 元素使用動態生成的 ref ID
- 導致房間創建功能完全失效

**錯誤代碼**:
```javascript
// 在 async_redis_lobby_i18n.rb 中
const detail = {
    player_id: document.getElementById('player_id').value,      // ❌ 錯誤
    room_name: document.getElementById('room_name').value,      // ❌ 錯誤  
    max_players: document.getElementById('max_players').value,  // ❌ 錯誤
    map: document.getElementById('map').value                   // ❌ 錯誤
};
```

**實際 HTML**:
```html
<input type="text" id="隨機生成的ID" placeholder="玩家 ID (選填)">
<input type="text" id="隨機生成的ID" placeholder="房間名稱">
```

#### 2. 玩家 ID 編輯功能未渲染
**問題描述**:
- 玩家 ID 顯示為空 (雖然 Cookie 存在)
- 編輯按鈕未渲染到頁面
- 編輯模態框缺失
- `togglePlayerIdEdit()` 函數未載入

**影響**: 用戶無法編輯玩家 ID，影響用戶體驗

### 🟡 中優先級問題

#### 3. 開始遊戲功能無用戶反饋
**問題描述**:
- 點擊"開始遊戲"按鈕後無任何視覺反饋
- 預期的成功消息未顯示
- 用戶不知道操作是否成功

**預期行為**: 顯示 "遊戲開始成功！房間 ID: xxx。多人遊戲功能開發中，敬請期待！"

#### 4. 服務器端初始化時序問題
**問題描述**:
- `initialize_player_from_cookie()` 函數未在適當時機執行
- 0.5秒延遲可能不足夠
- 導致 Cookie 讀取失效

## 🔧 修復計劃

### Phase 1: 修復核心功能 (高優先級)

1. **修復房間創建表單**
   - 將硬編碼 ID 改為動態選擇器
   - 使用 CSS 類或屬性選擇器
   - 測試所有表單提交功能

2. **修復玩家 ID 初始化和編輯功能**
   - 確保 `initialize_player_from_cookie()` 正確執行
   - 修復編輯按鈕渲染邏輯
   - 恢復模態框和相關 JavaScript 函數

### Phase 2: 改善用戶體驗 (中優先級)

3. **添加用戶反饋機制**
   - 實現開始遊戲成功提示
   - 添加房間創建成功/失敗提示
   - 改善錯誤處理和用戶通知

4. **優化初始化時序**
   - 調整 JavaScript 載入順序
   - 改善異步初始化邏輯

## 🛠️ 技術實現細節

### 建議的修復方法

#### 1. 表單 ID 修復
```ruby
# 替換硬編碼 ID 為動態選擇器
def forward_create_room
    <<~JAVASCRIPT
        (function() {
            const detail = {
                player_id: document.querySelector('input[placeholder*="玩家 ID"]').value,
                room_name: document.querySelector('input[placeholder*="房間名稱"]').value,
                max_players: document.querySelector('select[aria-label*="最大玩家數"]').value,
                map: document.querySelector('select[aria-label*="地圖"]').value
            };
            window.live.forwardEvent('#{@id}', {type: 'create_room'}, detail);
        })()
    JAVASCRIPT
end
```

#### 2. 玩家 ID 初始化修復
```ruby
def initialize_player_from_cookie
    return unless @page
    
    # 增加延遲確保頁面完全載入
    Async do
        sleep 1.0  # 增加到 1 秒
        
        self.script(<<~JAVASCRIPT)
            // 確保元素存在後再執行
            function initializeWhenReady() {
                const playerIdElement = document.getElementById('current-player-id');
                if (!playerIdElement) {
                    setTimeout(initializeWhenReady, 100);
                    return;
                }
                
                // Cookie 處理邏輯...
                const existingPlayerId = getCookie('cs2d_player_id');
                if (existingPlayerId && existingPlayerId.trim() !== '') {
                    window.live.forwardEvent('#{@id}', {type: 'set_player_id_from_cookie'}, {player_id: existingPlayerId});
                }
            }
            initializeWhenReady();
        JAVASCRIPT
    end
end
```

## 📋 測試檢查清單

修復完成後需要驗證的功能：

- [ ] 玩家 ID 正確顯示和持久化
- [ ] 編輯玩家 ID 功能正常
- [ ] 房間創建功能正常工作
- [ ] 房間加入功能正常工作
- [ ] 開始遊戲顯示正確反饋
- [ ] 所有 JavaScript 函數正確載入
- [ ] Cookie 初始化在頁面載入時正確執行

## 📊 影響評估

### 修復前
- 房間創建: ❌ 完全失效
- 玩家 ID 編輯: ❌ 功能缺失
- 用戶反饋: ⚠️ 不完整

### 修復後 (預期)
- 房間創建: ✅ 完全正常
- 玩家 ID 編輯: ✅ 功能完整
- 用戶反饋: ✅ 完善的提示系統

---
**備註**: 這些問題主要集中在前端 JavaScript 和 HTML 元素協調上，不涉及複雜的後端邏輯修改，修復相對直接。