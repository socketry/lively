# CS 1.6 完整規則 MVP 實作計畫

## 🎯 MVP 核心目標
實現一個具備 CS 1.6 核心玩法的 2D 網頁遊戲，支援 2v2 到 5v5 的多人對戰。

## 📋 必要功能清單

### 1. 核心遊戲規則 ✅ 必須實現

#### 回合制系統
```ruby
class RoundManager
  ROUND_TIME = 115        # 1:55 戰鬥時間
  BUY_TIME = 15          # 15秒購買時間
  FREEZE_TIME = 5        # 5秒凍結時間
  MAX_ROUNDS = 30        # 最多30回合
  HALF_TIME = 15         # 15回合換邊
  
  def round_flow
    # 1. 凍結時間 - 玩家重生，不能移動
    # 2. 購買時間 - 可以移動和購買
    # 3. 戰鬥時間 - 正常遊戲
    # 4. 回合結束 - 計算勝負，發放獎金
  end
end
```

#### 勝利條件
- **T 勝利**：
  - 炸彈爆炸
  - 消滅所有 CT
  - 時間結束且炸彈已安裝
  
- **CT 勝利**：
  - 拆除炸彈
  - 消滅所有 T
  - 時間結束（炸彈未安裝）

#### 死亡系統
- 死亡後變成觀察者模式
- 可以觀看隊友視角
- 下回合開始時復活

### 2. 炸彈機制 🔴 最重要

```ruby
class BombSystem
  PLANT_TIME = 3.0       # 安裝炸彈需要3秒
  DEFUSE_TIME = 10.0     # 拆彈需要10秒（有鉗子5秒）
  BOMB_TIMER = 45.0      # 炸彈倒數45秒
  EXPLOSION_RADIUS = 500  # 爆炸半徑
  
  def plant_bomb(player, bomb_site)
    # 只有T可以安裝
    # 必須在炸彈點A或B
    # 需要持續按住E鍵3秒
  end
  
  def defuse_bomb(player)
    # 只有CT可以拆除
    # 需要持續按住E鍵10秒（或5秒with鉗子）
  end
end
```

### 3. 經濟系統 💰

```ruby
class Economy
  # 起始金錢
  STARTING_MONEY = 800
  MAX_MONEY = 16000
  
  # 擊殺獎勵
  KILL_REWARD = {
    knife: 1500,
    pistol: 300,
    smg: 600,
    rifle: 300,
    awp: 100
  }
  
  # 回合獎勵
  ROUND_WIN_REWARD = 3250
  ROUND_LOSS_REWARD = 1400  # +500 per consecutive loss, max 3400
  BOMB_PLANT_REWARD = 800   # T 全隊
  BOMB_DEFUSE_REWARD = 3500 # CT 全隊
  
  # 武器價格
  WEAPONS = {
    # 手槍
    usp: 0,        # CT 預設
    glock: 0,      # T 預設
    deagle: 650,
    
    # 步槍
    ak47: 2700,    # T 專用
    m4a1: 3100,    # CT 專用
    awp: 4750,
    
    # 裝備
    kevlar: 650,
    helmet: 350,   # 需要先有kevlar
    defuse_kit: 400, # CT 專用
    
    # 投擲物
    flashbang: 200,
    hegrenade: 300,
    smoke: 300
  }
end
```

### 4. 簡化地圖設計

#### de_dust2_mini
```
[T Spawn]                    [CT Spawn]
    |                            |
    ├──────[Mid]───────────────┤
    |         |                 |
[Bomb A]    [X]            [Bomb B]
```

特點：
- 2個炸彈點（A/B）
- 3條主要路線
- 簡單的牆壁碰撞
- 明確的視線遮擋

### 5. 武器系統簡化

只實現核心武器：
- **手槍**：USP（CT）、Glock（T）
- **步槍**：AK-47（T）、M4A1（CT）
- **狙擊**：AWP（通用）
- **刀**：近戰武器

武器特性：
```javascript
const WEAPONS = {
  ak47: {
    damage: 36,
    firerate: 0.1,
    magazine: 30,
    recoil: 'high',
    price: 2700,
    moveSpeed: 0.85
  },
  m4a1: {
    damage: 33,
    firerate: 0.09,
    magazine: 30,
    recoil: 'medium',
    price: 3100,
    moveSpeed: 0.9
  }
}
```

### 6. 多人連線架構

```ruby
class GameServer
  def initialize
    @rooms = {}     # 遊戲房間
    @players = {}   # 在線玩家
  end
  
  def create_room(name, max_players = 10)
    @rooms[name] = GameRoom.new(name, max_players)
  end
  
  def join_room(player, room_name)
    room = @rooms[room_name]
    room.add_player(player)
    
    # 自動分配隊伍
    if room.ct_count <= room.t_count
      player.team = :ct
    else
      player.team = :t
    end
  end
end
```

## 🚀 實作優先順序

### Phase 1: 基礎對戰（1週）
1. ✅ 玩家移動與射擊
2. ✅ 基本 UI 與控制
3. 多人連線同步
4. 死亡與觀察者模式

### Phase 2: 回合制（3天）
1. 回合計時器
2. 購買階段
3. 重生系統
4. 隊伍切換

### Phase 3: 炸彈模式（4天）
1. 炸彈安裝/拆除
2. 炸彈點設置
3. 爆炸效果
4. 勝利判定

### Phase 4: 經濟系統（3天）
1. 金錢管理
2. 購買選單
3. 連敗獎勵
4. 武器掉落

### Phase 5: 優化（3天）
1. 地圖碰撞
2. 視線系統
3. 音效提示
4. 記分板

## 📊 成功指標

MVP 完成標準：
- [ ] 支援 2v2 對戰
- [ ] 完整回合流程
- [ ] 炸彈可安裝/拆除
- [ ] 經濟系統運作
- [ ] 基本武器差異
- [ ] 勝負判定正確

## 🎮 簡化決策

為了快速實現 MVP，以下功能暫不實作：
- ❌ 手榴彈系統
- ❌ 複雜地圖
- ❌ 語音通訊
- ❌ 皮膚系統
- ❌ 段位系統
- ❌ 觀戰模式切換

## 💻 技術實現要點

### 狀態同步
```javascript
// 每 tick 同步的數據
{
  players: {
    id: { x, y, angle, health, team, alive, money }
  },
  bomb: {
    planted: false,
    position: null,
    timer: 45,
    planting_progress: 0,
    defusing_progress: 0
  },
  round: {
    phase: 'buy|playing|ended',
    timer: 115,
    number: 1,
    score: { ct: 0, t: 0 }
  }
}
```

### 網路優化
- 使用 WebSocket 二進制格式
- 客戶端預測 + 伺服器調和
- 差異更新而非全量同步
- 20-30 tick rate

## 🔧 開發工具需求

- **Lively Framework**：基礎架構
- **WebSocket**：即時通訊
- **Canvas 2D**：渲染引擎
- **Web Audio API**：音效系統

## 📅 時間估算

**總開發時間**：2-3 週
- Week 1: 基礎系統 + 多人連線
- Week 2: 炸彈模式 + 經濟系統
- Week 3: 優化 + 測試 + 平衡調整

這個 MVP 將提供完整的 CS 1.6 核心體驗！