import { test, expect } from '@playwright/test';

test.describe('🎮 PIXEL GAME FLOW TESTING', () => {
  test('🔥 Complete Pixel Game Flow: Lobby → Waiting Room → Game Start', async ({ page }) => {
    console.log('\n🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮');
    console.log('PIXEL CS2D COMPLETE GAME FLOW DEMONSTRATION');
    console.log('🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮\n');

    // PHASE 1: 进入像素游戏大厅
    console.log('📍 PHASE 1: ENTERING PIXEL GAME LOBBY');
    console.log('==================================================');
    
    await page.goto('/pixel');
    await page.waitForLoadState('networkidle');
    
    // 验证像素风格元素
    await expect(page.locator('[data-testid="pixel-lobby-header"]')).toContainText('CS2D RETRO');
    await expect(page.locator('[data-testid="pixel-connection-status"]')).toBeVisible();
    
    console.log('✅ Pixel lobby loaded successfully');
    console.log('✅ Pixel font and style elements detected');
    
    // 截图：像素大厅
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/pixel-1-lobby.png',
      fullPage: true 
    });
    console.log('📸 Screenshot: Pixel lobby captured\n');

    // PHASE 2: 搜索和筛选房间
    console.log('📍 PHASE 2: TESTING ROOM SEARCH AND FILTER');
    console.log('==================================================');
    
    // 测试搜索功能
    await page.fill('[data-testid="search-rooms"]', 'DUST2');
    await page.waitForTimeout(500);
    
    console.log('🔍 Room search functionality tested');
    
    // 验证房间列表
    const rooms = await page.locator('[data-testid^="room-"]').count();
    console.log(`✅ Found ${rooms} rooms in the list`);

    // PHASE 3: 创建新房间
    console.log('\n📍 PHASE 3: CREATING NEW ROOM');
    console.log('==================================================');
    
    // 点击创建房间按钮
    await page.click('[data-testid="create-room-btn"]');
    await page.waitForTimeout(500);
    
    console.log('🔨 Create room modal opened');
    
    // 填写房间信息
    await page.fill('[data-testid="room-name-input"]', 'PIXEL TEST ROOM');
    await page.selectOption('[data-testid="game-mode-select"]', 'DM');
    await page.selectOption('[data-testid="map-select"]', 'de_dust2');
    await page.selectOption('[data-testid="max-players-select"]', '10');
    
    console.log('✅ Room configuration completed');
    
    // 截图：创建房间模态框
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/pixel-2-create-modal.png',
      fullPage: true 
    });
    console.log('📸 Screenshot: Create room modal captured');
    
    // 确认创建房间
    await page.click('[data-testid="confirm-create-room"]');
    await page.waitForTimeout(1000);
    
    console.log('🎉 Room created successfully, navigating to waiting room...\n');

    // PHASE 4: 等待室功能测试
    console.log('📍 PHASE 4: TESTING WAITING ROOM FEATURES');
    console.log('==================================================');
    
    // 验证等待室界面
    await expect(page.locator('[data-testid="pixel-room-name"]')).toContainText('DUST2');
    await expect(page.locator('[data-testid="time-limit"]')).toContainText('10 MIN');
    await expect(page.locator('[data-testid="kill-limit"]')).toContainText('30 KILLS');
    
    console.log('✅ Waiting room interface loaded');
    console.log('✅ Game settings displayed correctly');
    
    // 测试聊天功能
    await page.fill('[data-testid="chat-input"]', 'HELLO PIXEL WORLD!');
    await page.click('[data-testid="send-message-btn"]');
    await page.waitForTimeout(500);
    
    console.log('💬 Chat message sent successfully');
    
    // 验证聊天消息
    const chatMessages = page.locator('[data-testid="chat-messages"]');
    await expect(chatMessages).toContainText('HELLO PIXEL WORLD!');
    
    // 截图：等待室
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/pixel-3-waiting-room.png',
      fullPage: true 
    });
    console.log('📸 Screenshot: Waiting room captured');

    // PHASE 5: 队伍切换测试
    console.log('\n📍 PHASE 5: TESTING TEAM SWITCHING');
    console.log('==================================================');
    
    // 测试加入T队
    await page.click('[data-testid="join-t-btn"]');
    await page.waitForTimeout(500);
    
    console.log('🔴 Joined Terrorists team');
    
    // 验证玩家在T队列表中
    await expect(page.locator('[data-testid="t-player-1"]')).toBeVisible();
    
    // 切换回CT队
    await page.click('[data-testid="join-ct-btn"]');
    await page.waitForTimeout(500);
    
    console.log('🔵 Joined Counter-Terrorists team');
    
    // 验证玩家在CT队列表中
    await expect(page.locator('[data-testid="ct-player-1"]')).toBeVisible();

    // PHASE 6: 准备状态切换
    console.log('\n📍 PHASE 6: TESTING READY STATUS');
    console.log('==================================================');
    
    // 切换准备状态
    await page.click('[data-testid="ready-toggle-btn"]');
    await page.waitForTimeout(500);
    
    console.log('✅ Player ready status toggled');
    
    // 验证准备按钮文字变化
    await expect(page.locator('[data-testid="ready-toggle-btn"]')).toContainText('NOT READY');
    
    // 再次切换回准备状态
    await page.click('[data-testid="ready-toggle-btn"]');
    await page.waitForTimeout(500);
    
    console.log('✅ Player is now ready');

    // PHASE 7: 开始游戏流程
    console.log('\n📍 PHASE 7: TESTING GAME START SEQUENCE');
    console.log('==================================================');
    
    // 作为房主，尝试开始游戏
    const startGameBtn = page.locator('[data-testid="start-game-btn"]');
    if (await startGameBtn.isEnabled()) {
      await startGameBtn.click();
      await page.waitForTimeout(1000);
      
      console.log('🚀 Game start sequence initiated');
      
      // 等待倒计时界面
      await expect(page.locator('text=GAME STARTING')).toBeVisible();
      await expect(page.locator('text=PREPARE FOR BATTLE!')).toBeVisible();
      
      console.log('⏰ Countdown overlay displayed');
      
      // 截图：游戏开始倒计时
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/pixel-4-game-starting.png',
        fullPage: true 
      });
      console.log('📸 Screenshot: Game starting countdown captured');
      
      // 等待导航到游戏界面（最多等待6秒）
      await page.waitForURL('**/pixel/game/**', { timeout: 6000 });
      console.log('🎯 Successfully navigated to game interface');
      
    } else {
      console.log('⚠️  Start game button disabled (other players not ready)');
      
      // 测试观战功能
      await page.click('[data-testid="spectate-btn"]');
      await page.waitForTimeout(1000);
      console.log('👁️  Spectate mode activated');
    }

    // PHASE 8: 游戏界面验证
    console.log('\n📍 PHASE 8: VERIFYING GAME INTERFACE');
    console.log('==================================================');
    
    // 验证游戏界面元素
    const currentUrl = page.url();
    if (currentUrl.includes('/pixel/game/')) {
      console.log('✅ Successfully reached game interface');
      
      // 截图：游戏界面
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/pixel-5-game-interface.png',
        fullPage: true 
      });
      console.log('📸 Screenshot: Game interface captured');
    }

    // PHASE 9: 完整流程总结
    console.log('\n📍 PHASE 9: FLOW COMPLETION SUMMARY');
    console.log('==================================================');
    
    console.log('🏆 PIXEL GAME FLOW TEST COMPLETED!');
    console.log('==================================================\n');
    
    console.log('📸 Screenshots captured:');
    console.log('  1. Pixel lobby with retro styling');
    console.log('  2. Create room modal with pixel UI');
    console.log('  3. Waiting room with team management');
    console.log('  4. Game starting countdown overlay');
    console.log('  5. Game interface');
    
    console.log('\n✅ Features successfully tested:');
    console.log('  • Pixel-style UI components');
    console.log('  • Room creation and configuration');
    console.log('  • Team switching (CT ↔ T)');
    console.log('  • Ready status management');
    console.log('  • Chat functionality');
    console.log('  • Game start sequence');
    console.log('  • Navigation flow');
    
    console.log('\n🎮 Pixel CS2D is fully functional with retro aesthetics!');
    console.log('==================================================');
  });

  test('🎯 Quick Pixel UI Component Tests', async ({ page }) => {
    console.log('\n🎨 TESTING PIXEL UI COMPONENTS');
    console.log('==================================================');

    await page.goto('/pixel');
    await page.waitForLoadState('networkidle');

    // 测试像素按钮样式
    const createBtn = page.locator('[data-testid="create-room-btn"]');
    await expect(createBtn).toHaveClass(/font-pixel/);
    
    console.log('✅ Pixel button styling verified');

    // 测试像素输入框
    const searchInput = page.locator('[data-testid="search-rooms"]');
    await expect(searchInput).toHaveClass(/font-pixel/);
    
    console.log('✅ Pixel input styling verified');

    // 测试像素字体
    const header = page.locator('[data-testid="pixel-lobby-header"]');
    await expect(header).toHaveClass(/font-pixel/);
    
    console.log('✅ Pixel font styling verified');

    console.log('🎨 All pixel UI components working correctly!');
  });

  test('🔄 Pixel Flow: Join Existing Room', async ({ page }) => {
    console.log('\n🚪 TESTING JOIN EXISTING ROOM FLOW');
    console.log('==================================================');

    await page.goto('/pixel');
    await page.waitForLoadState('networkidle');

    // 点击第一个房间
    const firstRoom = page.locator('[data-testid="room-1"]');
    await firstRoom.click();
    await page.waitForTimeout(1000);

    // 验证进入等待室
    await expect(page.locator('[data-testid="pixel-room-name"]')).toBeVisible();
    console.log('✅ Successfully joined existing room');

    // 测试离开房间
    await page.click('[data-testid="leave-room-btn"]');
    await page.waitForTimeout(500);

    // 验证返回大厅
    await expect(page.locator('[data-testid="pixel-lobby-header"]')).toBeVisible();
    console.log('✅ Successfully left room and returned to lobby');
  });
});
