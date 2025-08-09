# CS2D - 2D 版 Counter Strike 1.6 實作計畫

## 專案概述
使用 Lively 框架開發一個 2D 俯視角的 Counter Strike 遊戲，支援即時多人對戰。

## 核心功能需求

### 1. 遊戲機制
- **隊伍系統**：恐怖分子(T) vs 反恐小組(CT)
- **回合制**：每回合有時間限制，完成目標或消滅對方獲勝
- **遊戲模式**：
  - 炸彈拆除模式 (de_)
  - 人質救援模式 (cs_) 
  - 死鬥模式 (dm_)
- **復活機制**：回合開始時復活，死亡後觀戰

### 2. 玩家系統
- **移動**：WASD 控制，滑鼠瞄準
- **生命值**：100 HP，護甲系統
- **速度**：根據武器重量調整移動速度
- **碰撞檢測**：玩家、牆壁、子彈

### 3. 武器系統
- **武器類型**：
  - 手槍：USP, Glock, Desert Eagle
  - 步槍：AK-47, M4A1, AWP
  - 衝鋒槍：MP5, P90
  - 手榴彈：閃光彈、煙霧彈、高爆彈
- **彈道系統**：後座力、精準度、傷害衰減
- **彈藥管理**：彈匣與備用彈藥

### 4. 經濟系統
- **起始金錢**：$800
- **收入來源**：擊殺獎勵、回合獎勵、完成目標
- **購買時間**：回合開始 15 秒

## 技術架構

### 後端 (Ruby/Lively)
```ruby
# 核心類別結構
class CS2DApplication < Lively::Application
  # 遊戲主應用
end

class GameRoom < Live::View
  # 遊戲房間管理
  attr_accessor :players, :state, :round_timer
end

class Player
  attr_accessor :id, :name, :team, :position, :health, :armor
  attr_accessor :money, :weapons, :current_weapon
end

class GameState
  # 遊戲狀態管理：等待中、進行中、回合結束
end

class Physics
  # 碰撞檢測、移動計算
end
```

### 前端 (JavaScript/Canvas)
```javascript
// 遊戲渲染引擎
class GameRenderer {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d');
    this.sprites = {};
  }
  
  render(gameState) {
    // 渲染地圖、玩家、子彈、特效
  }
}

// 輸入控制
class InputController {
  handleMouseMove(e) { /* 瞄準 */ }
  handleKeyboard(keys) { /* 移動 */ }
  handleClick(e) { /* 射擊 */ }
}
```

### 網路同步
```ruby
class NetworkSync
  def broadcast_player_state(player)
    # 廣播玩家位置、狀態
  end
  
  def sync_bullet(bullet_data)
    # 同步子彈軌跡
  end
  
  def handle_lag_compensation
    # 延遲補償機制
  end
end
```

## 實作步驟

### 第一階段：基礎框架 (1-2 週)
1. 建立專案結構
2. 實作基本 WebSocket 連線
3. 建立遊戲畫布與渲染循環
4. 玩家連線與斷線處理

### 第二階段：核心遊戲機制 (2-3 週)
1. 玩家移動系統
2. 基本碰撞檢測
3. 簡單武器射擊
4. 生命值系統

### 第三階段：多人同步 (2 週)
1. 狀態同步協議
2. 延遲補償
3. 客戶端預測
4. 插值與外推

### 第四階段：遊戲模式 (2 週)
1. 回合制邏輯
2. 隊伍系統
3. 炸彈模式實作
4. 計分板

### 第五階段：進階功能 (2-3 週)
1. 完整武器系統
2. 經濟系統
3. 購買選單 UI
4. 地圖載入系統

### 第六階段：優化與完善 (1-2 週)
1. 效能優化
2. 音效系統
3. 視覺特效
4. Bug 修復

## 檔案結構
```
examples/cs2d/
├── application.rb          # 主應用程式
├── gems.rb                # 依賴管理
├── game/
│   ├── player.rb          # 玩家類別
│   ├── weapon.rb          # 武器系統
│   ├── physics.rb         # 物理引擎
│   ├── game_room.rb       # 房間管理
│   └── network_sync.rb    # 網路同步
├── maps/
│   ├── de_dust2.json      # 地圖資料
│   └── map_loader.rb      # 地圖載入器
└── public/
    ├── _static/
    │   ├── sprites/       # 遊戲圖片
    │   ├── sounds/        # 音效檔案
    │   ├── game.js        # 前端遊戲邏輯
    │   └── style.css      # 樣式
    └── index.html         # 遊戲頁面
```

## 關鍵技術挑戰

### 1. 網路延遲處理
- **客戶端預測**：本地立即執行動作，等待伺服器確認
- **延遲補償**：伺服器回溯時間驗證擊中
- **插值**：平滑顯示其他玩家動作

### 2. 防作弊機制
- 所有關鍵邏輯在伺服器執行
- 客戶端只負責顯示與輸入
- 驗證所有客戶端請求

### 3. 效能優化
- 使用 Object Pool 管理子彈物件
- 空間分割優化碰撞檢測
- 只同步視野內的物件

## 開發優先順序
1. **MVP 版本**：單一地圖、基本武器、死鬥模式
2. **Alpha 版本**：加入隊伍、回合制、經濟系統  
3. **Beta 版本**：多地圖、完整武器、所有模式
4. **正式版本**：優化、平衡性調整、排行榜

## 測試計畫
- 單元測試：遊戲邏輯、物理計算
- 整合測試：網路同步、狀態管理
- 壓力測試：多人同時連線
- 遊戲測試：平衡性、可玩性

## 預估時程
- **總時程**：10-12 週
- **MVP**：3-4 週
- **Alpha**：6-7 週
- **Beta**：9-10 週
- **正式版**：12 週