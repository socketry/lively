# 🔧 無限渲染循環修復實施指南

## 📋 實施優先級

### 🚨 Phase 0: 緊急修復 (立即執行)

**目標**: 穩定現有系統，防止崩潰

```ruby
# lib/emergency_patch.rb
module EmergencyPatch
  def self.apply_to_view(view_class)
    view_class.class_eval do
      alias_method :original_update!, :update!

      def update!
        @update_count ||= 0
        @last_update ||= Time.now

        # 緊急斷路器：每秒最多5次更新
        if @update_count > 5 && (Time.now - @last_update) < 1
          Console.warn(self, "Update throttled: #{@update_count} updates/sec")
          return
        end

        if Time.now - @last_update > 1
          @update_count = 0
          @last_update = Time.now
        end

        @update_count += 1
        original_update!
      end
    end
  end
end

# 應用到所有視圖
EmergencyPatch.apply_to_view(AsyncRedisLobbyI18nView)
EmergencyPatch.apply_to_view(EnhancedLobbyProgressiveView)
```

### 📐 Phase 1: 架構重構 (第1週)

#### 1.1 創建統一渲染管理器

```ruby
# lib/render_manager.rb
require 'concurrent'

class RenderManager
  include Singleton

  def initialize
    @render_queue = Concurrent::Array.new
    @render_lock = Mutex.new
    @render_thread = nil
    @views = {}
    @config = {
      min_interval: 0.1,      # 最小渲染間隔
      max_batch_size: 10,     # 批次大小
      priority_levels: 3      # 優先級層數
    }
  end

  def register_view(view_id, view_instance)
    @views[view_id] = {
      instance: view_instance,
      last_render: Time.now,
      render_count: 0,
      state_hash: nil
    }
    start_render_thread if @render_thread.nil?
  end

  def request_update(view_id, priority: :normal, data: {})
    return unless @views[view_id]

    # 計算狀態哈希，避免重複渲染相同狀態
    state_hash = calculate_state_hash(data)

    if @views[view_id][:state_hash] != state_hash
      @render_queue << {
        view_id: view_id,
        priority: priority,
        data: data,
        timestamp: Time.now,
        state_hash: state_hash
      }
    end
  end

  private

  def start_render_thread
    @render_thread = Thread.new do
      loop do
        process_render_queue
        sleep 0.05 # 20 FPS max
      end
    end
  end

  def process_render_queue
    return if @render_queue.empty?

    @render_lock.synchronize do
      # 按優先級排序
      sorted_queue = @render_queue.sort_by { |r|
        [priority_value(r[:priority]), r[:timestamp]]
      }

      # 批處理更新
      batch = sorted_queue.first(@config[:max_batch_size])

      batch.each do |render_request|
        view_info = @views[render_request[:view_id]]
        next unless view_info

        # 檢查最小間隔
        if Time.now - view_info[:last_render] >= @config[:min_interval]
          begin
            view_info[:instance].safe_render(render_request[:data])
            view_info[:last_render] = Time.now
            view_info[:render_count] += 1
            view_info[:state_hash] = render_request[:state_hash]
          rescue => e
            Console.error(self, "Render failed: #{e.message}")
          end
        end
      end

      # 清理已處理的請求
      @render_queue.delete_if { |r| batch.include?(r) }
    end
  end

  def calculate_state_hash(data)
    Digest::SHA256.hexdigest(data.to_json)
  end

  def priority_value(priority)
    case priority
    when :critical then 0
    when :high then 1
    when :normal then 2
    when :low then 3
    else 2
    end
  end
end
```

#### 1.2 視圖基類改造

```ruby
# lib/managed_view.rb
class ManagedView < Live::View
  def initialize(...)
    super
    @view_id = SecureRandom.uuid
    @render_manager = RenderManager.instance
    @local_state = {}
    @event_buffer = []
    @updating = false
  end

  def bind(page)
    return if @bound
    super
    @bound = true
    @render_manager.register_view(@view_id, self)
  end

  # 覆寫原始 update! 方法
  def update!
    # 不直接渲染，而是請求渲染
    request_render(priority: :normal)
  end

  def request_render(priority: :normal, partial: false)
    @render_manager.request_update(
      @view_id,
      priority: priority,
      data: @local_state.dup
    )
  end

  # 安全渲染方法
  def safe_render(data)
    return if @updating

    @updating = true
    begin
      @local_state = data
      super() # 調用原始 render
    ensure
      @updating = false
    end
  end

  # 事件處理優化
  def handle(event)
    # 緩衝事件，批次處理
    @event_buffer << event

    if @event_buffer.size >= 5 || high_priority_event?(event)
      process_event_buffer
    end
  end

  private

  def process_event_buffer
    events = @event_buffer.dup
    @event_buffer.clear

    # 合併相似事件
    merged_events = merge_similar_events(events)

    # 批次處理
    merged_events.each do |event|
      handle_single_event(event)
    end

    # 請求一次渲染
    request_render(priority: determine_priority(merged_events))
  end

  def merge_similar_events(events)
    # 合併相同類型的連續事件
    events.chunk { |e| e[:type] }.map { |type, group|
      group.last # 保留最後一個
    }
  end

  def high_priority_event?(event)
    %w[create_room join_room start_game].include?(event[:type])
  end

  def determine_priority(events)
    return :critical if events.any? { |e| critical_event?(e) }
    return :high if events.any? { |e| high_priority_event?(e) }
    :normal
  end

  def critical_event?(event)
    %w[error emergency_stop].include?(event[:type])
  end
end
```

### 🎯 Phase 2: 前端優化 (第2週)

#### 2.1 虛擬 DOM 差異渲染

```ruby
# lib/virtual_dom.rb
class VirtualDOM
  attr_reader :root

  def initialize
    @root = VNode.new(:root)
    @previous_tree = nil
  end

  def render(builder, &block)
    new_tree = build_tree(&block)

    if @previous_tree
      patches = diff(@previous_tree, new_tree)
      apply_patches(builder, patches)
    else
      render_tree(builder, new_tree)
    end

    @previous_tree = new_tree
  end

  private

  def diff(old_tree, new_tree)
    patches = []

    # 深度優先遍歷，找出差異
    walk_tree(old_tree, new_tree) do |old_node, new_node, path|
      if old_node.nil?
        patches << { type: :add, path: path, node: new_node }
      elsif new_node.nil?
        patches << { type: :remove, path: path }
      elsif old_node != new_node
        patches << { type: :replace, path: path, node: new_node }
      end
    end

    patches
  end

  def apply_patches(builder, patches)
    patches.each do |patch|
      case patch[:type]
      when :add
        add_node(builder, patch[:path], patch[:node])
      when :remove
        remove_node(builder, patch[:path])
      when :replace
        replace_node(builder, patch[:path], patch[:node])
      end
    end
  end
end

class VNode
  attr_accessor :tag, :attributes, :children, :content

  def initialize(tag, attributes = {}, children = [], content = nil)
    @tag = tag
    @attributes = attributes
    @children = children
    @content = content
    @hash = calculate_hash
  end

  def ==(other)
    @hash == other.hash if other.is_a?(VNode)
  end

  def hash
    @hash
  end

  private

  def calculate_hash
    data = {
      tag: @tag,
      attributes: @attributes,
      content: @content,
      children_count: @children.size
    }
    Digest::SHA256.hexdigest(data.to_json)
  end
end
```

#### 2.2 客戶端狀態管理

```javascript
// public/_static/state_manager.js
class StateManager {
  constructor() {
    this.state = {};
    this.subscribers = new Map();
    this.updateQueue = [];
    this.isProcessing = false;
    this.lastUpdate = Date.now();
    this.minUpdateInterval = 100; // ms
  }

  setState(path, value, immediate = false) {
    const oldValue = this.getState(path);

    if (JSON.stringify(oldValue) === JSON.stringify(value)) {
      return; // 無變化，不更新
    }

    this.setNestedValue(path, value);

    if (immediate) {
      this.processUpdate(path);
    } else {
      this.queueUpdate(path);
    }
  }

  queueUpdate(path) {
    if (!this.updateQueue.includes(path)) {
      this.updateQueue.push(path);
    }

    if (!this.isProcessing) {
      this.scheduleProcessing();
    }
  }

  scheduleProcessing() {
    const timeSinceLastUpdate = Date.now() - this.lastUpdate;
    const delay = Math.max(0, this.minUpdateInterval - timeSinceLastUpdate);

    setTimeout(() => this.processUpdateQueue(), delay);
  }

  processUpdateQueue() {
    if (this.updateQueue.length === 0) return;

    this.isProcessing = true;
    const updates = [...this.updateQueue];
    this.updateQueue = [];

    // 批次處理更新
    const affectedComponents = new Set();

    updates.forEach((path) => {
      const subscribers = this.subscribers.get(path) || [];
      subscribers.forEach((callback) => affectedComponents.add(callback));
    });

    // 執行所有受影響的回調
    affectedComponents.forEach((callback) => callback());

    this.lastUpdate = Date.now();
    this.isProcessing = false;

    // 如果有新的更新，繼續處理
    if (this.updateQueue.length > 0) {
      this.scheduleProcessing();
    }
  }

  subscribe(path, callback) {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, []);
    }
    this.subscribers.get(path).push(callback);

    // 返回取消訂閱函數
    return () => {
      const subs = this.subscribers.get(path);
      const index = subs.indexOf(callback);
      if (index > -1) {
        subs.splice(index, 1);
      }
    };
  }

  getState(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.state);
  }

  setNestedValue(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.state);
    target[lastKey] = value;
  }
}

// 全局狀態管理實例
window.StateManager = new StateManager();
```

### 🔄 Phase 3: 整合測試 (第3週)

#### 3.1 渲染循環測試

```ruby
# spec/render_loop_spec.rb
require 'rspec'
require_relative '../lib/render_manager'
require_relative '../lib/managed_view'

RSpec.describe 'Render Loop Prevention' do
  let(:view) { ManagedView.new }
  let(:manager) { RenderManager.instance }

  describe 'infinite loop prevention' do
    it 'throttles rapid update requests' do
      start_count = view.render_count

      # 嘗試觸發無限循環
      100.times do
        view.update!
      end

      sleep 0.2 # 等待渲染線程處理

      end_count = view.render_count

      # 應該被節流到合理次數
      expect(end_count - start_count).to be < 10
    end

    it 'prevents recursive updates' do
      # 設置會導致遞歸的事件處理
      view.on_render do
        view.update! # 渲染時觸發更新
      end

      expect { view.update! }.not_to raise_error
      expect(view.render_count).to eq(1)
    end

    it 'batches multiple updates' do
      updates = []

      view.on_render do |data|
        updates << data
      end

      # 快速發送多個更新
      10.times do |i|
        view.request_render(data: { count: i })
      end

      sleep 0.2

      # 應該批次處理，而不是每個都渲染
      expect(updates.size).to be < 10
    end
  end

  describe 'state hash optimization' do
    it 'skips rendering for identical states' do
      initial_count = view.render_count

      # 相同狀態多次更新
      5.times do
        view.set_state({ value: 'same' })
        view.update!
      end

      sleep 0.2

      # 只應該渲染一次
      expect(view.render_count - initial_count).to eq(1)
    end
  end
end
```

#### 3.2 性能基準測試

```ruby
# spec/performance_spec.rb
require 'benchmark'

RSpec.describe 'Performance Benchmarks' do
  describe 'render performance' do
    it 'maintains 60 FPS under load' do
      view = ManagedView.new
      frame_times = []

      100.times do
        time = Benchmark.realtime do
          view.render_frame
        end
        frame_times << time
      end

      average_frame_time = frame_times.sum / frame_times.size
      fps = 1.0 / average_frame_time

      expect(fps).to be > 60
    end

    it 'handles 100 concurrent updates' do
      view = ManagedView.new
      threads = []

      time = Benchmark.realtime do
        100.times do |i|
          threads << Thread.new do
            view.update_state(player: i, action: 'move')
          end
        end

        threads.each(&:join)
      end

      expect(time).to be < 1.0 # 應在1秒內完成
    end
  end
end
```

### 📊 監控和調試

#### 4.1 渲染性能監控

```ruby
# lib/render_monitor.rb
class RenderMonitor
  include Singleton

  def initialize
    @metrics = {
      render_count: 0,
      total_time: 0,
      error_count: 0,
      throttle_count: 0,
      queue_size: [],
      memory_usage: []
    }
    @start_time = Time.now
  end

  def record_render(duration, view_id)
    @metrics[:render_count] += 1
    @metrics[:total_time] += duration

    log_if_slow(duration, view_id)
  end

  def record_throttle
    @metrics[:throttle_count] += 1
    Console.warn("Render throttled. Total: #{@metrics[:throttle_count]}")
  end

  def record_error(error, view_id)
    @metrics[:error_count] += 1
    Console.error("Render error in #{view_id}: #{error.message}")
  end

  def report
    uptime = Time.now - @start_time
    avg_render_time = @metrics[:total_time] / @metrics[:render_count].to_f
    renders_per_second = @metrics[:render_count] / uptime

    {
      uptime: uptime,
      total_renders: @metrics[:render_count],
      average_render_time: avg_render_time,
      renders_per_second: renders_per_second,
      error_rate: @metrics[:error_count] / @metrics[:render_count].to_f,
      throttle_rate: @metrics[:throttle_count] / @metrics[:render_count].to_f
    }
  end

  private

  def log_if_slow(duration, view_id)
    if duration > 0.1 # 100ms
      Console.warn("Slow render detected: #{duration}s for view #{view_id}")
    end
  end
end
```

#### 4.2 調試工具

```javascript
// public/_static/debug_panel.js
class DebugPanel {
  constructor() {
    this.metrics = {
      updates: [],
      renders: [],
      errors: [],
    };
    this.createPanel();
    this.attachHooks();
  }

  createPanel() {
    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      width: 300px;
      background: rgba(0,0,0,0.8);
      color: #0f0;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      border: 1px solid #0f0;
    `;

    panel.innerHTML = `
      <h3>🔍 Debug Panel</h3>
      <div id="debug-metrics"></div>
      <button onclick="debugPanel.clearMetrics()">Clear</button>
      <button onclick="debugPanel.exportMetrics()">Export</button>
    `;

    document.body.appendChild(panel);
    this.panel = panel;
  }

  attachHooks() {
    // 攔截更新調用
    const originalUpdate = window.live?.update;
    if (originalUpdate) {
      window.live.update = (...args) => {
        this.recordUpdate(args);
        return originalUpdate.apply(window.live, args);
      };
    }

    // 監控渲染
    const observer = new MutationObserver((mutations) => {
      this.recordRender(mutations);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  recordUpdate(args) {
    this.metrics.updates.push({
      timestamp: Date.now(),
      args: args,
    });
    this.updateDisplay();
  }

  recordRender(mutations) {
    this.metrics.renders.push({
      timestamp: Date.now(),
      mutations: mutations.length,
    });
    this.updateDisplay();
  }

  updateDisplay() {
    const metricsDiv = document.getElementById('debug-metrics');
    const now = Date.now();
    const recentUpdates = this.metrics.updates.filter((u) => now - u.timestamp < 1000).length;
    const recentRenders = this.metrics.renders.filter((r) => now - r.timestamp < 1000).length;

    metricsDiv.innerHTML = `
      <div>Updates/sec: ${recentUpdates}</div>
      <div>Renders/sec: ${recentRenders}</div>
      <div>Total Updates: ${this.metrics.updates.length}</div>
      <div>Total Renders: ${this.metrics.renders.length}</div>
      <div>Errors: ${this.metrics.errors.length}</div>
    `;

    // 警告顏色
    if (recentUpdates > 10 || recentRenders > 10) {
      metricsDiv.style.color = '#f00';
    } else {
      metricsDiv.style.color = '#0f0';
    }
  }

  clearMetrics() {
    this.metrics = {
      updates: [],
      renders: [],
      errors: [],
    };
    this.updateDisplay();
  }

  exportMetrics() {
    const blob = new Blob([JSON.stringify(this.metrics, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-metrics-${Date.now()}.json`;
    a.click();
  }
}

// 自動啟動調試面板（開發環境）
if (window.location.hostname === 'localhost') {
  window.debugPanel = new DebugPanel();
}
```

## 📈 成功指標

### 階段性驗收標準

#### Phase 0 完成標準

- [ ] 無限循環完全停止
- [ ] 系統保持穩定運行 1 小時
- [ ] CPU 使用率 < 20%

#### Phase 1 完成標準

- [ ] 渲染管理器正常工作
- [ ] 批次更新功能正常
- [ ] 優先級隊列正常

#### Phase 2 完成標準

- [ ] 虛擬 DOM 差異渲染工作
- [ ] 客戶端狀態管理正常
- [ ] 性能提升 > 50%

#### Phase 3 完成標準

- [ ] 所有測試通過
- [ ] 性能基準達標
- [ ] 監控系統運行

## 🚀 部署計劃

```bash
# 1. 備份當前版本
git tag -a v0.1.0-backup -m "Backup before render fix"
git push origin v0.1.0-backup

# 2. 創建修復分支
git checkout -b fix/infinite-render-loop

# 3. 應用緊急修復
ruby -r ./lib/emergency_patch.rb -e "EmergencyPatch.apply_all"

# 4. 測試修復
bundle exec rspec spec/render_loop_spec.rb

# 5. 部署到測試環境
docker-compose -f docker-compose.test.yml up -d

# 6. 監控 24 小時

# 7. 合併到主分支
git checkout main
git merge fix/infinite-render-loop

# 8. 部署到生產環境
make prod-deploy
```

---

_實施指南版本：1.0_
_最後更新：2025年8月16日_
_執行優先級：🔴 緊急_

**立即行動：應用 Phase 0 緊急修復**
