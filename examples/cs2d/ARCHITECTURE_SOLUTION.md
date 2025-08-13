# CS2D 架構解決方案

## 執行摘要

經過完整分析和測試，發現 Lively 框架的限制使得理想的架構方案無法實現。本文檔提供實用的解決方案。

## 問題診斷

### 1. 統一 SPA 失敗原因
- **無限渲染循環**: `bind()` 被重複調用數百次
- **框架限制**: Lively 的更新機制導致循環依賴
- **無法修復**: 即使加入防護措施，框架層級問題仍存在

### 2. 多伺服器架構失敗原因
- **硬編碼 Port**: Lively 在 `/lib/lively/environment/application.rb:17` 硬編碼使用 9292
- **無法配置**: 沒有環境變數或配置選項可覆蓋
- **需要框架修改**: 需要修改 Lively 核心代碼

### 3. 當前狀態
- ✅ 大廳功能正常 (async_redis_lobby_i18n.rb)
- ❌ 無法導航到房間等待室
- ❌ 無法導航到遊戲視圖
- ❌ 完整遊戲流程中斷

## 推薦解決方案

### 方案 A: 漸進式單體應用（推薦）

將所有功能整合到現有穩定的 `async_redis_lobby_i18n.rb` 中：

```ruby
class EnhancedLobbyView < Live::View
  def initialize
    super
    @current_screen = :lobby  # :lobby, :room, :game
    # 避免使用會觸發無限循環的模式
  end
  
  def render(builder)
    case @current_screen
    when :lobby
      render_lobby_screen(builder)
    when :room
      render_room_screen(builder)
    when :game
      render_game_canvas(builder)
    end
  end
  
  def handle(event)
    case event[:type]
    when "enter_room"
      @current_screen = :room
      # 不要在這裡調用 update!
      # 使用 JavaScript 更新 DOM
      update_dom_via_javascript
    end
  end
  
  def update_dom_via_javascript
    # 使用 JavaScript 直接操作 DOM，避免完整重新渲染
    script(<<~JS)
      document.getElementById('main-content').innerHTML = '#{escape_javascript(render_content)}';
    JS
  end
end
```

**優點**:
- 基於已證實穩定的代碼
- 避免框架限制
- 單一進程，易於部署
- 保持 WebSocket 連接

**缺點**:
- 所有邏輯在一個文件
- 需要謹慎管理狀態

### 方案 B: 混合導航方案

保持現有大廳，使用傳統 HTTP 導航：

```ruby
# 在 async_redis_lobby_i18n.rb
def handle_join_room(room_id)
  # 將狀態保存到 Redis
  @@room_manager.save_player_state(@player_id, room_id)
  
  # 使用傳統導航（完整頁面重載）
  script(<<~JS)
    // 導航到靜態 HTML 頁面
    window.location.href = '/game.html?room_id=#{room_id}&player_id=#{@player_id}';
  JS
end
```

創建靜態 HTML 遊戲頁面：
```html
<!-- public/game.html -->
<!DOCTYPE html>
<html>
<head>
  <script src="/game.js"></script>
</head>
<body>
  <canvas id="game-canvas"></canvas>
  <script>
    // 從 URL 獲取參數
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room_id');
    const playerId = params.get('player_id');
    
    // 建立 WebSocket 連接到遊戲服務器
    const ws = new WebSocket('ws://localhost:9292/game_ws');
    // 初始化遊戲
  </script>
</body>
</html>
```

**優點**:
- 繞過 Lively 限制
- 遊戲可以使用純 JavaScript
- 更好的性能（無框架開銷）

**缺點**:
- 失去 Lively 的實時更新功能
- 需要手動管理 WebSocket

### 方案 C: 外部遊戲服務器

使用 Node.js 或其他技術運行遊戲服務器：

```javascript
// game-server.js (Node.js + Socket.io)
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.get('/game/:roomId', (req, res) => {
  res.sendFile(__dirname + '/game.html');
});

io.on('connection', (socket) => {
  socket.on('join_room', (data) => {
    // 從 Redis 驗證玩家
    // 處理遊戲邏輯
  });
});

server.listen(3000);
```

Ruby 大廳重定向到 Node.js 服務器：
```ruby
def handle_start_game
  script(<<~JS)
    window.location.href = 'http://localhost:3000/game/#{@room_id}';
  JS
end
```

**優點**:
- 完全繞過 Lively 限制
- 可以使用更適合遊戲的技術棧
- 更好的實時性能

**缺點**:
- 需要維護兩個技術棧
- 部署複雜度增加

## 實施步驟

### 立即行動（方案 A）

1. **增強現有大廳** (1-2 天)
   ```bash
   cp async_redis_lobby_i18n.rb enhanced_lobby.rb
   # 添加房間和遊戲視圖
   ```

2. **使用 JavaScript DOM 操作** (1 天)
   - 避免調用 `update!`
   - 使用 `innerHTML` 或 DOM API 更新內容

3. **測試完整流程** (1 天)
   - 使用 Playwright 測試所有導航
   - 確保沒有無限循環

### 長期方案（方案 C）

1. **建立 Node.js 遊戲服務器** (1 週)
2. **實現 Socket.io 實時通信** (3 天)
3. **整合 Redis 共享狀態** (2 天)
4. **部署和測試** (2 天)

## 技術債務

需要向 Lively 框架提交的改進建議：

1. **可配置端口**
   ```ruby
   # 建議的改進
   def url
     ENV['LIVELY_PORT'] || "http://localhost:9292"
   end
   ```

2. **更好的更新控制**
   ```ruby
   # 建議添加更新鎖
   def safe_update!
     return if @updating
     @updating = true
     update!
   ensure
     @updating = false
   end
   ```

3. **支持多視圖路由**
   ```ruby
   # 建議的路由支持
   class Application
     route '/', LobbyView
     route '/room', RoomView
     route '/game', GameView
   end
   ```

## 結論

由於 Lively 框架的根本限制，建議採用**方案 A（漸進式單體應用）**作為短期解決方案，同時評估**方案 C（外部遊戲服務器）**作為長期架構。

關鍵是要接受框架限制，選擇實用的解決方案而非理想方案。

## 行動項目

- [ ] 實施方案 A 的 DOM 操作策略
- [ ] 測試完整遊戲流程
- [ ] 評估是否需要遷移到方案 C
- [ ] 向 Lively 提交功能請求

---
*文檔創建日期: 2025年8月13日*