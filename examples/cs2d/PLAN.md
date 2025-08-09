# CS2D 實作計劃 (Implementation Plan)

## 📋 專案現況 (Current Status)

### ✅ 已完成功能 (Completed Features)
1. **基礎遊戲架構** - 專案結構與檔案組織
2. **玩家移動與物理系統** - WASD 控制、碰撞檢測
3. **Mac 觸控板優化** - 雙指手勢、精準控制
4. **基礎多人架構** - WebSocket 準備、房間系統設計
5. **觸控板精準控制** - 移除強制自動瞄準，改為選擇性輔助

### 🚧 進行中 (In Progress)
- 單機 AI 對戰模式（用於測試）

### 📝 待實作 (To Be Implemented)
以下功能需要依序完成以達成完整的 CS 1.6 體驗

---

## 🎯 Phase 1: 核心遊戲機制 (Core Mechanics)
**預計時間**: 3-4 天  
**優先級**: 🔴 Critical

### 1.1 炸彈系統 (Bomb System)
```ruby
# 需要實作的類別
class BombSystem
  - plant_bomb()      # 3秒安裝時間
  - defuse_bomb()     # 10秒拆除（5秒with kit）
  - bomb_countdown()  # 45秒倒數
  - explosion()       # 爆炸效果與傷害
end
```

**實作細節**:
- [ ] 炸彈點 A/B 區域判定
- [ ] 安裝/拆除進度條 UI
- [ ] 炸彈倒數計時器顯示
- [ ] 爆炸範圍傷害計算
- [ ] 音效提示（滴答聲）

### 1.2 回合制系統 (Round System)
```ruby
class RoundManager
  - freeze_time     # 5秒凍結
  - buy_time        # 15秒購買
  - round_time      # 1:55戰鬥
  - round_end       # 結算與重置
end
```

**實作細節**:
- [ ] 階段轉換邏輯
- [ ] 玩家重生機制
- [ ] 回合勝負判定
- [ ] 15回合換邊
- [ ] 最多30回合限制

### 1.3 死亡與觀戰 (Death & Spectator)
```javascript
class SpectatorSystem {
  - death_cam       // 死亡視角
  - free_look       // 自由觀戰
  - player_follow   // 跟隨隊友
  - info_display    // 顯示資訊
}
```

**實作細節**:
- [ ] 死亡後切換觀戰模式
- [ ] 觀戰視角切換（數字鍵1-5）
- [ ] 顯示被觀戰玩家資訊
- [ ] 禁止死亡玩家影響遊戲

---

## 💰 Phase 2: 經濟系統 (Economy System)
**預計時間**: 2-3 天  
**優先級**: 🟠 High

### 2.1 金錢管理 (Money Management)
```ruby
class Economy
  START_MONEY = 800
  MAX_MONEY = 16000
  
  - calculate_kill_reward()
  - calculate_round_bonus()
  - handle_loss_bonus()
  - track_team_economy()
end
```

**實作細節**:
- [ ] 擊殺獎勵系統（依武器類型）
- [ ] 回合獎勵（勝$3250/敗$1400+）
- [ ] 連敗獎勵遞增（最高$3400）
- [ ] 團隊經濟顯示

### 2.2 購買系統優化 (Buy System Enhancement)
```javascript
class BuyMenu {
  - category_tabs    // 分類標籤
  - quick_buy        // 快速購買
  - team_buy         // 團隊購買建議
  - rebuy            // 重複上次購買
}
```

**實作細節**:
- [ ] 購買選單 UI 重製
- [ ] 武器分類（手槍/步槍/裝備）
- [ ] 金額不足提示
- [ ] 購買歷史記錄

### 2.3 武器掉落 (Weapon Drop)
```ruby
class WeaponDrop
  - drop_on_death()
  - pickup_weapon()
  - swap_weapons()
  - weapon_persistence()
end
```

**實作細節**:
- [ ] 死亡時掉落武器
- [ ] G 鍵丟棄武器
- [ ] E 鍵撿起武器
- [ ] 武器保存到下回合

---

## 🗺️ Phase 3: 地圖系統 (Map System)
**預計時間**: 3-4 天  
**優先級**: 🟡 Medium

### 3.1 地圖結構 (Map Structure)
```javascript
class MapSystem {
  maps: {
    "de_dust2_mini": {
      layout: [...],
      spawns: { ct: [...], t: [...] },
      bombsites: { A: {...}, B: {...} },
      walls: [...],
      cover: [...]
    }
  }
}
```

**實作細節**:
- [ ] 簡化版 dust2 地圖
- [ ] 碰撞網格系統
- [ ] 視線遮擋計算
- [ ] 小地圖顯示

### 3.2 戰術點位 (Tactical Positions)
```ruby
class TacticalMap
  - choke_points    # 關鍵點位
  - sniper_spots    # 狙擊點
  - cover_spots     # 掩體位置
  - rotation_paths  # 轉點路線
end
```

**實作細節**:
- [ ] 預設戰術點位
- [ ] AI 路徑規劃
- [ ] 煙霧彈點位標記
- [ ] 聲音傳播範圍

---

## 🔫 Phase 4: 武器系統完善 (Weapon System)
**預計時間**: 2-3 天  
**優先級**: 🟡 Medium

### 4.1 武器特性 (Weapon Properties)
```javascript
const WeaponStats = {
  ak47: {
    damage: { close: 36, medium: 30, far: 24 },
    recoil: { pattern: [...], recovery: 0.5 },
    penetration: 2,
    accuracy: { standing: 0.7, moving: 0.3 }
  }
}
```

**實作細節**:
- [ ] 距離傷害衰減
- [ ] 後座力模式
- [ ] 穿透力系統
- [ ] 精準度影響

### 4.2 彈道系統 (Ballistics)
```ruby
class Ballistics
  - calculate_spread()
  - apply_recoil()
  - handle_penetration()
  - trace_bullet_path()
end
```

**實作細節**:
- [ ] 子彈散布計算
- [ ] 連發後座力累積
- [ ] 牆壁穿透傷害
- [ ] 曳光彈顯示

---

## 🌐 Phase 5: 多人連線 (Multiplayer)
**預計時間**: 4-5 天  
**優先級**: 🔵 Important

### 5.1 網路同步 (Network Sync)
```ruby
class NetworkManager
  - client_prediction()
  - server_reconciliation()
  - lag_compensation()
  - interpolation()
end
```

**實作細節**:
- [ ] 客戶端預測
- [ ] 伺服器調和
- [ ] 延遲補償（回溯）
- [ ] 實體插值

### 5.2 房間管理 (Room Management)
```javascript
class RoomManager {
  - create_room()
  - join_room()
  - room_settings()
  - kick_vote()
}
```

**實作細節**:
- [ ] 創建/加入房間
- [ ] 房間設定（地圖、人數）
- [ ] 踢人投票系統
- [ ] 自動平衡隊伍

### 5.3 狀態同步 (State Sync)
```ruby
class StateSync
  UPDATE_RATE = 30  # 30 ticks/sec
  
  - compress_state()
  - delta_compression()
  - priority_updates()
  - packet_loss_handling()
end
```

**實作細節**:
- [ ] 狀態壓縮
- [ ] 差異更新
- [ ] 優先級系統
- [ ] 丟包處理

---

## 🎨 Phase 6: 視覺與音效 (Visual & Audio)
**預計時間**: 2-3 天  
**優先級**: 🟢 Nice to Have

### 6.1 視覺效果 (Visual Effects)
```javascript
class VisualEffects {
  - muzzle_flash()
  - bullet_impacts()
  - blood_effects()
  - explosion_particles()
}
```

**實作細節**:
- [ ] 槍口火焰
- [ ] 彈孔效果
- [ ] 血液噴濺
- [ ] 爆炸粒子

### 6.2 音效系統 (Audio System)
```javascript
class AudioManager {
  - positional_audio()
  - footsteps()
  - weapon_sounds()
  - voice_lines()
}
```

**實作細節**:
- [ ] 3D 音效定位
- [ ] 腳步聲（材質區分）
- [ ] 武器音效
- [ ] 語音提示

### 6.3 UI 改進 (UI Enhancement)
```javascript
class UIEnhancement {
  - kill_feed()
  - damage_numbers()
  - hitmarkers()
  - minimap()
}
```

**實作細節**:
- [ ] 擊殺提示
- [ ] 傷害數字
- [ ] 命中標記
- [ ] 小地圖雷達

---

## 🔧 Phase 7: 優化與測試 (Optimization & Testing)
**預計時間**: 2-3 天  
**優先級**: 🟢 Final

### 7.1 性能優化 (Performance)
- [ ] Canvas 渲染優化
- [ ] 物件池（Object Pooling）
- [ ] 視錐裁剪（Frustum Culling）
- [ ] LOD 系統

### 7.2 平衡調整 (Balance)
- [ ] 武器傷害平衡
- [ ] 經濟系統調整
- [ ] 地圖平衡
- [ ] 移動速度調整

### 7.3 測試項目 (Testing)
- [ ] 單元測試
- [ ] 整合測試
- [ ] 壓力測試（10人同時）
- [ ] 跨瀏覽器測試

---

## 📅 時程規劃 (Timeline)

### Week 1 (第一週)
- Day 1-2: 炸彈系統
- Day 3-4: 回合制系統
- Day 5: 死亡與觀戰
- Weekend: 測試與修復

### Week 2 (第二週)
- Day 1-2: 經濟系統
- Day 3: 購買系統優化
- Day 4-5: 地圖系統
- Weekend: 武器系統完善

### Week 3 (第三週)
- Day 1-3: 多人連線
- Day 4: 視覺與音效
- Day 5: 優化與測試
- Weekend: 發布準備

---

## 🚀 MVP 里程碑 (MVP Milestones)

### Milestone 1: 可玩原型 ✅
- [x] 基本移動與射擊
- [x] 簡單 AI 敵人
- [x] 基礎 UI

### Milestone 2: 核心玩法 🚧
- [ ] 完整回合制
- [ ] 炸彈機制
- [ ] 經濟系統

### Milestone 3: 多人對戰 📅
- [ ] 2v2 連線對戰
- [ ] 狀態同步
- [ ] 房間系統

### Milestone 4: 完整體驗 📅
- [ ] 5v5 對戰
- [ ] 完整地圖
- [ ] 音效系統

---

## 🐛 已知問題 (Known Issues)

1. **觸控板靈敏度** - 需要提供設定選項
2. **AI 路徑** - 有時會卡在牆角
3. **子彈穿透** - 尚未實作
4. **音效缺失** - 需要加入音效檔案

---

## 📝 開發筆記 (Dev Notes)

### 技術債務 (Technical Debt)
- 需要重構 GameRoom 類別（太大）
- 網路協議需要優化（現在用 JSON）
- 物理系統可以改用 Matter.js

### 效能考量 (Performance Considerations)
- 考慮使用 WebGL 替代 Canvas 2D
- 實作 WebRTC 點對點連線
- 使用 Protocol Buffers 替代 JSON

### 未來功能 (Future Features)
- 排名系統
- 自訂地圖編輯器
- 重播系統
- 觀戰模式直播

---

## 📊 成功指標 (Success Metrics)

### 技術指標
- [ ] 60 FPS 穩定運行
- [ ] 延遲 < 50ms（本地）
- [ ] 支援 10 人同時遊戲
- [ ] 跨瀏覽器相容

### 遊戲性指標
- [ ] 回合時間合理（2-3分鐘）
- [ ] 經濟系統平衡
- [ ] 武器使用率平均
- [ ] 雙方勝率接近 50%

---

## 🔗 相關文件 (Related Documents)

- [CS16_MVP_PLAN.md](./CS16_MVP_PLAN.md) - 原始 MVP 計劃
- [GAMEPLAY_GUIDE.md](./docs/GAMEPLAY_GUIDE.md) - 遊戲指南
- [TECHNICAL.md](./docs/TECHNICAL.md) - 技術文件
- [README.md](./README.md) - 專案說明

---

**最後更新**: 2025-08-09  
**負責人**: Development Team  
**狀態**: 🚧 Active Development