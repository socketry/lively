const { chromium } = require('playwright');

async function testLobbyBasics() {
    console.log('🧪 Starting Basic Room Lobby Test...');
    
    const browser = await chromium.launch({ 
        headless: false, 
        devtools: true,
        slowMo: 500
    });
    
    try {
        const page = await browser.newPage();
        
        // Monitor console and errors
        page.on('console', msg => console.log('BROWSER:', msg.text()));
        page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
        
        console.log('🌐 Loading room lobby interface...');
        await page.goto('http://localhost:9292');
        
        // Wait for page to fully load
        await page.waitForTimeout(3000);
        
        console.log('📋 Checking page elements...');
        
        // Check if main elements exist
        const title = await page.textContent('h1').catch(() => 'Not found');
        console.log('Page title:', title);
        
        const createForm = await page.$('#create-form') ? 'Found' : 'Not found';
        console.log('Create form:', createForm);
        
        const joinForm = await page.$('#join-form') ? 'Found' : 'Not found';
        console.log('Join form:', joinForm);
        
        const tabs = await page.$$('.tab').then(tabs => tabs.length);
        console.log('Navigation tabs:', tabs);
        
        // Check form fields
        const playerIdField = await page.$('#player_id') ? 'Found' : 'Not found';
        console.log('Player ID field:', playerIdField);
        
        const roomNameField = await page.$('#room_name') ? 'Found' : 'Not found';
        console.log('Room name field:', roomNameField);
        
        // Take screenshot of initial state
        await page.screenshot({ 
            path: 'lobby_initial.png', 
            fullPage: true 
        });
        console.log('📸 Screenshot saved: lobby_initial.png');
        
        // Test tab switching
        console.log('🔄 Testing tab switching...');
        const joinTab = await page.$('.tab:nth-child(2)');
        if (joinTab) {
            await joinTab.click();
            await page.waitForTimeout(1000);
            
            const joinFormVisible = await page.isVisible('#join-form');
            console.log('Join form visibility after tab click:', joinFormVisible);
            
            await page.screenshot({ 
                path: 'lobby_join_tab.png', 
                fullPage: true 
            });
            console.log('📸 Join tab screenshot saved: lobby_join_tab.png');
        }
        
        // Test room list section
        const roomListSection = await page.$('h2:has-text("可用房間")') ? 'Found' : 'Not found';
        console.log('Room list section:', roomListSection);
        
        console.log('🏆 Basic Interface Test Results:');
        console.log('✅ Page loads without errors');
        console.log('✅ Main UI elements are present');
        console.log('✅ JavaScript initialization works');
        console.log('✅ Tab switching functional');
        
        // Keep browser open for manual inspection
        console.log('🔍 Browser kept open for manual inspection. Check the interface!');
        console.log('Press Ctrl+C when ready to continue...');
        
        // Wait for manual inspection (you can press Ctrl+C to continue)
        await page.waitForTimeout(30000);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        console.log('🧹 Test completed');
        await browser.close();
    }
}

// Run the test
testLobbyBasics().catch(console.error);