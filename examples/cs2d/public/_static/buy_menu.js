// CS 1.6 Buy Menu System
class BuyMenuUI {
    constructor(game) {
        this.game = game;
        this.isOpen = false;
        this.currentMenu = 'main';
        this.menuHistory = [];
        this.playerMoney = 800;
        this.playerTeam = 'ct'; // Will be set from game state
        
        // Menu structure matching backend BuyMenuSystem
        this.menuStructure = {
            main: {
                '1': { label: '手槍', submenu: 'pistols' },
                '2': { label: '霰彈槍', submenu: 'shotguns' },
                '3': { label: '衝鋒槍', submenu: 'smgs' },
                '4': { label: '步槍', submenu: 'rifles' },
                '5': { label: '機槍', submenu: 'machine_guns' },
                '6': { label: '主要彈藥', action: 'buy_primary_ammo' },
                '7': { label: '次要彈藥', action: 'buy_secondary_ammo' },
                '8': { label: '裝備', submenu: 'equipment' },
                '0': { label: '退出', action: 'close' }
            },
            pistols: {
                '1': { label: 'USP 45 - $500', weapon: 'usp45', cost: 500, team: 'ct' },
                '2': { label: 'Glock 18 - $400', weapon: 'glock18', cost: 400, team: 't' },
                '3': { label: 'Desert Eagle - $650', weapon: 'deagle', cost: 650 },
                '4': { label: 'P228 - $600', weapon: 'p228', cost: 600 },
                '5': { label: 'Dual Berettas - $800', weapon: 'elite', cost: 800, team: 't' },
                '6': { label: 'Five-SeveN - $750', weapon: 'fiveseven', cost: 750, team: 'ct' },
                '0': { label: '返回', action: 'back' }
            },
            shotguns: {
                '1': { label: 'Benelli M3 - $1700', weapon: 'm3', cost: 1700 },
                '2': { label: 'Benelli XM1014 - $3000', weapon: 'xm1014', cost: 3000 },
                '0': { label: '返回', action: 'back' }
            },
            smgs: {
                '1': { label: 'MAC-10 - $1400', weapon: 'mac10', cost: 1400, team: 't' },
                '2': { label: 'TMP - $1250', weapon: 'tmp', cost: 1250, team: 'ct' },
                '3': { label: 'MP5 Navy - $1500', weapon: 'mp5navy', cost: 1500 },
                '4': { label: 'UMP 45 - $1700', weapon: 'ump45', cost: 1700 },
                '5': { label: 'P90 - $2350', weapon: 'p90', cost: 2350 },
                '0': { label: '返回', action: 'back' }
            },
            rifles: {
                '1': { label: 'Galil - $2000', weapon: 'galil', cost: 2000, team: 't' },
                '2': { label: 'Famas - $2250', weapon: 'famas', cost: 2250, team: 'ct' },
                '3': { label: 'AK-47 - $2500', weapon: 'ak47', cost: 2500, team: 't' },
                '4': { label: 'M4A1 - $3100', weapon: 'm4a1', cost: 3100, team: 'ct' },
                '5': { label: 'Scout - $2750', weapon: 'scout', cost: 2750 },
                '6': { label: 'SG 552 - $3500', weapon: 'sg552', cost: 3500, team: 't' },
                '7': { label: 'AUG - $3500', weapon: 'aug', cost: 3500, team: 'ct' },
                '8': { label: 'AWP - $4750', weapon: 'awp', cost: 4750 },
                '9': { label: 'G3SG1 - $5000', weapon: 'g3sg1', cost: 5000, team: 't' },
                'a': { label: 'SG 550 - $4200', weapon: 'sg550', cost: 4200, team: 'ct' },
                '0': { label: '返回', action: 'back' }
            },
            machine_guns: {
                '1': { label: 'M249 - $5750', weapon: 'm249', cost: 5750 },
                '0': { label: '返回', action: 'back' }
            },
            equipment: {
                '1': { label: '防彈衣 - $650', item: 'kevlar', cost: 650 },
                '2': { label: '防彈衣+頭盔 - $1000', item: 'kevlar_helmet', cost: 1000 },
                '3': { label: '閃光彈 - $200', item: 'flashbang', cost: 200 },
                '4': { label: 'HE手榴彈 - $300', item: 'hegrenade', cost: 300 },
                '5': { label: '煙霧彈 - $300', item: 'smokegrenade', cost: 300 },
                '6': { label: '拆彈鉗 - $200', item: 'defuser', cost: 200, team: 'ct' },
                '7': { label: '夜視鏡 - $1250', item: 'nvg', cost: 1250 },
                '0': { label: '返回', action: 'back' }
            }
        };

        // Quick buy presets
        this.quickBuyPresets = {
            'eco': [
                { item: 'kevlar', cost: 650 },
                { weapon: 'p228', cost: 600 }
            ],
            'force': [
                { item: 'kevlar_helmet', cost: 1000 },
                { weapon: 'galil', cost: 2000, team: 't' },
                { weapon: 'famas', cost: 2250, team: 'ct' }
            ],
            'full': [
                { item: 'kevlar_helmet', cost: 1000 },
                { weapon: 'ak47', cost: 2500, team: 't' },
                { weapon: 'm4a1', cost: 3100, team: 'ct' },
                { item: 'hegrenade', cost: 300 },
                { item: 'flashbang', cost: 200 },
                { item: 'smokegrenade', cost: 300 }
            ],
            'awp': [
                { item: 'kevlar_helmet', cost: 1000 },
                { weapon: 'awp', cost: 4750 },
                { weapon: 'deagle', cost: 650 },
                { item: 'hegrenade', cost: 300 },
                { item: 'flashbang', cost: 200 }
            ]
        };

        this.createMenuDOM();
        this.setupKeyboardListeners();
    }

    createMenuDOM() {
        // Create buy menu container
        const container = document.createElement('div');
        container.id = 'buy-menu';
        container.className = 'buy-menu';
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid #3498db;
            border-radius: 10px;
            padding: 20px;
            display: none;
            z-index: 1000;
            min-width: 400px;
            color: white;
            font-family: 'Courier New', monospace;
        `;

        // Menu header
        const header = document.createElement('div');
        header.className = 'buy-menu-header';
        header.style.cssText = `
            border-bottom: 1px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 15px;
        `;
        header.innerHTML = `
            <h2 style="margin: 0; color: #3498db;">購買選單</h2>
            <div style="margin-top: 5px;">
                <span style="color: #27ae60;">金錢: $<span id="buy-menu-money">800</span></span>
                <span style="margin-left: 20px; color: #95a5a6;">隊伍: <span id="buy-menu-team">CT</span></span>
            </div>
        `;

        // Menu content
        const content = document.createElement('div');
        content.id = 'buy-menu-content';
        content.className = 'buy-menu-content';
        content.style.cssText = `
            min-height: 300px;
            max-height: 500px;
            overflow-y: auto;
        `;

        // Quick buy section
        const quickBuy = document.createElement('div');
        quickBuy.className = 'buy-menu-quickbuy';
        quickBuy.style.cssText = `
            border-top: 1px solid #3498db;
            padding-top: 10px;
            margin-top: 15px;
        `;
        quickBuy.innerHTML = `
            <div style="color: #95a5a6; margin-bottom: 5px;">快速購買:</div>
            <div>
                <span style="color: #3498db;">F1</span> - Eco ($1250) |
                <span style="color: #3498db;">F2</span> - Force Buy ($3000) |
                <span style="color: #3498db;">F3</span> - Full Buy ($5000) |
                <span style="color: #3498db;">F4</span> - AWP ($6400)
            </div>
        `;

        // Footer
        const footer = document.createElement('div');
        footer.className = 'buy-menu-footer';
        footer.style.cssText = `
            border-top: 1px solid #3498db;
            padding-top: 10px;
            margin-top: 15px;
            color: #95a5a6;
            font-size: 0.9em;
        `;
        footer.innerHTML = `按 <span style="color: #e74c3c;">ESC</span> 或 <span style="color: #e74c3c;">B</span> 關閉選單`;

        container.appendChild(header);
        container.appendChild(content);
        container.appendChild(quickBuy);
        container.appendChild(footer);
        document.body.appendChild(container);

        this.menuContainer = container;
        this.menuContent = content;
    }

    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            // B key toggles the menu
            if (e.key.toLowerCase() === 'b') {
                if (this.isOpen) {
                    this.close();
                } else {
                    this.open();
                }
                e.preventDefault();
                return;
            }
            
            // ESC key closes the menu
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
                e.preventDefault();
                return;
            }

            if (!this.isOpen) return;

            // Handle menu navigation
            if (e.key >= '0' && e.key <= '9') {
                this.handleMenuSelection(e.key);
                e.preventDefault();
            } else if (e.key.toLowerCase() >= 'a' && e.key.toLowerCase() <= 'z') {
                this.handleMenuSelection(e.key.toLowerCase());
                e.preventDefault();
            } else if (e.key === 'F1') {
                this.quickBuy('eco');
                e.preventDefault();
            } else if (e.key === 'F2') {
                this.quickBuy('force');
                e.preventDefault();
            } else if (e.key === 'F3') {
                this.quickBuy('full');
                e.preventDefault();
            } else if (e.key === 'F4') {
                this.quickBuy('awp');
                e.preventDefault();
            }
        });
        
        // Add click listener to close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen) {
                // Check if click was outside the menu
                if (!this.menuContainer.contains(e.target)) {
                    this.close();
                }
            }
        });
        
        // Prevent clicks inside the menu from closing it
        this.menuContainer.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    open() {
        // Check if in buy time
        if (this.game && !this.game.canBuy) {
            this.game.addChatMessage('系統', '購買時間已結束', 'error');
            return;
        }

        this.isOpen = true;
        this.currentMenu = 'main';
        this.menuHistory = [];
        this.updateMoney();
        this.renderMenu();
        this.menuContainer.style.display = 'block';
    }

    close() {
        this.isOpen = false;
        this.menuContainer.style.display = 'none';
    }

    updateMoney() {
        if (this.game) {
            this.playerMoney = this.game.player.money || 800;
            this.playerTeam = this.game.player.team || 'ct';
        }
        document.getElementById('buy-menu-money').textContent = this.playerMoney;
        document.getElementById('buy-menu-team').textContent = this.playerTeam.toUpperCase();
    }

    renderMenu() {
        const menu = this.menuStructure[this.currentMenu];
        if (!menu) return;

        let html = '<div style="line-height: 1.8;">';
        
        for (const [key, item] of Object.entries(menu)) {
            // Check team restrictions
            if (item.team && item.team !== this.playerTeam) continue;
            
            // Check if can afford
            const canAfford = !item.cost || item.cost <= this.playerMoney;
            const color = canAfford ? '#3498db' : '#e74c3c';
            const prefix = canAfford ? '' : '[無法負擔] ';
            
            html += `<div style="color: ${canAfford ? 'white' : '#95a5a6'};">`;
            html += `<span style="color: ${color}; font-weight: bold;">${key}.</span> `;
            html += `${prefix}${item.label}`;
            html += '</div>';
        }
        
        html += '</div>';
        this.menuContent.innerHTML = html;
    }

    handleMenuSelection(key) {
        const menu = this.menuStructure[this.currentMenu];
        const item = menu[key];
        
        if (!item) return;

        // Check team restriction
        if (item.team && item.team !== this.playerTeam) {
            this.showNotification('此物品僅限另一隊伍購買');
            return;
        }

        // Check money
        if (item.cost && item.cost > this.playerMoney) {
            this.showNotification('金錢不足');
            return;
        }

        if (item.submenu) {
            // Navigate to submenu
            this.menuHistory.push(this.currentMenu);
            this.currentMenu = item.submenu;
            this.renderMenu();
        } else if (item.action) {
            // Handle action
            this.handleAction(item.action);
        } else if (item.weapon || item.item) {
            // Purchase item
            this.purchaseItem(item);
        }
    }

    handleAction(action) {
        switch (action) {
            case 'close':
                this.close();
                break;
            case 'back':
                if (this.menuHistory.length > 0) {
                    this.currentMenu = this.menuHistory.pop();
                    this.renderMenu();
                }
                break;
            case 'buy_primary_ammo':
                this.purchaseAmmo('primary');
                break;
            case 'buy_secondary_ammo':
                this.purchaseAmmo('secondary');
                break;
        }
    }

    purchaseItem(item) {
        // Send purchase request to game
        if (this.game) {
            const success = this.game.purchaseItem(item.weapon || item.item, item.cost);
            if (success) {
                this.playerMoney -= item.cost;
                this.updateMoney();
                this.showNotification(`已購買: ${item.label}`);
                
                // Auto-close after purchase (optional)
                if (item.weapon) {
                    this.close();
                } else {
                    // Stay open for equipment purchases
                    this.renderMenu();
                }
            }
        }
    }

    purchaseAmmo(type) {
        const cost = type === 'primary' ? 60 : 50;
        if (this.playerMoney >= cost) {
            if (this.game) {
                this.game.purchaseAmmo(type, cost);
                this.playerMoney -= cost;
                this.updateMoney();
                this.showNotification(`已購買${type === 'primary' ? '主要' : '次要'}彈藥`);
            }
        } else {
            this.showNotification('金錢不足');
        }
    }

    quickBuy(preset) {
        const items = this.quickBuyPresets[preset];
        let totalCost = 0;
        let purchased = [];

        for (const item of items) {
            // Check team restriction
            if (item.team && item.team !== this.playerTeam) continue;
            
            // Check if can afford
            if (this.playerMoney >= item.cost) {
                if (this.game) {
                    const success = this.game.purchaseItem(item.weapon || item.item, item.cost);
                    if (success) {
                        this.playerMoney -= item.cost;
                        totalCost += item.cost;
                        purchased.push(item.weapon || item.item);
                    }
                }
            }
        }

        if (purchased.length > 0) {
            this.updateMoney();
            this.showNotification(`快速購買完成 (花費: $${totalCost})`);
            this.close();
        } else {
            this.showNotification('金錢不足或無可購買物品');
        }
    }

    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: #3498db;
            padding: 10px 20px;
            border-radius: 5px;
            border: 1px solid #3498db;
            z-index: 2000;
            animation: fadeInOut 2s ease;
        `;
        notification.textContent = message;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; }
                20% { opacity: 1; }
                80% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }
}

// Export for use in game
window.BuyMenuUI = BuyMenuUI;