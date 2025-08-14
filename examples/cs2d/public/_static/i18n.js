// i18n system for static pages
const i18n = {
    currentLocale: 'zh_TW',
    
    translations: {
        en: {
            // Room page
            room: {
                title: 'CS2D - Room Waiting',
                heading: 'CS2D Room',
                roomInfo: 'Room Information',
                roomName: 'Room Name',
                roomId: 'Room ID',
                gameMode: 'Game Mode',
                classic: 'Classic',
                maxPlayers: 'Max Players',
                playersList: 'Players List',
                host: 'Host',
                waitingForPlayers: 'Waiting for players...',
                startGame: 'Start Game',
                leaveRoom: 'Leave Room',
                addBot: 'Add Bot',
                botDifficulty: 'Bot Difficulty',
                easy: 'Easy',
                normal: 'Normal',
                hard: 'Hard',
                botSettings: 'Bot Settings',
                backToLobby: 'Back to Lobby',
                startGameHint: 'Click Start Game to begin',
                gameStarting: 'Game starting...'
            },
            // Game page
            game: {
                title: 'CS2D - In Game',
                health: 'Health',
                armor: 'Armor',
                ammo: 'Ammo',
                money: 'Money',
                score: 'Score',
                round: 'Round',
                time: 'Time',
                reloading: 'Reloading...',
                respawnIn: 'Respawn in',
                win: 'Victory!',
                lose: 'Defeat',
                draw: 'Draw',
                exitGame: 'Exit Game',
                teamT: 'Terrorists',
                teamCT: 'Counter-Terrorists',
                buyMenu: 'Buy Menu',
                spectating: 'Spectating',
                dead: 'Dead',
                help: 'Help',
                returnToRoom: 'Return to Room',
                gameControls: 'Game Controls',
                move: 'Move',
                shoot: 'Shoot',
                aim: 'Aim',
                reload: 'Reload',
                jump: 'Jump',
                crouch: 'Crouch',
                chat: 'Chat',
                mouseLeft: 'Left Click',
                mouseRight: 'Right Click',
                spaceKey: 'Space',
                loadingGame: 'Loading Game...',
                connectingServer: 'Connecting to game server...',
                seconds: 'seconds',
                chatPlaceholder: 'Press Enter to send message...'
            },
            common: {
                loading: 'Loading...',
                error: 'Error',
                yes: 'Yes',
                no: 'No',
                confirm: 'Confirm',
                cancel: 'Cancel',
                settings: 'Settings',
                language: 'Language',
                remove: 'Remove',
                close: 'Close'
            }
        },
        zh_TW: {
            // Room page
            room: {
                title: 'CS2D - 房間等待',
                heading: 'CS2D 房間',
                roomInfo: '房間資訊',
                roomName: '房間名稱',
                roomId: '房間 ID',
                gameMode: '遊戲模式',
                classic: '經典模式',
                maxPlayers: '最大玩家數',
                playersList: '玩家列表',
                host: '房主',
                waitingForPlayers: '等待玩家中...',
                startGame: '開始遊戲',
                leaveRoom: '離開房間',
                addBot: '添加機器人',
                botDifficulty: '機器人難度',
                easy: '簡單',
                normal: '普通',
                hard: '困難',
                botSettings: '機器人設定',
                backToLobby: '返回大廳',
                startGameHint: '點擊開始遊戲按鈕開始遊戲',
                gameStarting: '遊戲即將開始...'
            },
            // Game page
            game: {
                title: 'CS2D - 遊戲中',
                health: '生命值',
                armor: '護甲',
                ammo: '彈藥',
                money: '金錢',
                score: '分數',
                round: '回合',
                time: '時間',
                reloading: '裝彈中...',
                respawnIn: '重生倒數',
                win: '勝利！',
                lose: '失敗',
                draw: '平手',
                exitGame: '退出遊戲',
                teamT: '恐怖份子',
                teamCT: '反恐精英',
                buyMenu: '購買選單',
                spectating: '觀戰中',
                dead: '已陣亡',
                help: '幫助',
                returnToRoom: '返回房間',
                gameControls: '遊戲控制',
                move: '移動',
                shoot: '射擊',
                aim: '瞄準',
                reload: '重新裝彈',
                jump: '跳躍',
                crouch: '蹲下',
                chat: '聊天',
                mouseLeft: '滑鼠左鍵',
                mouseRight: '滑鼠右鍵',
                spaceKey: '空格',
                loadingGame: '正在載入遊戲...',
                connectingServer: '連接到遊戲伺服器...',
                seconds: '秒',
                chatPlaceholder: '按 Enter 發送訊息...'
            },
            common: {
                loading: '載入中...',
                error: '錯誤',
                yes: '是',
                no: '否',
                confirm: '確認',
                cancel: '取消',
                settings: '設定',
                language: '語言',
                remove: '移除',
                close: '關閉'
            }
        }
    },
    
    // Get translation for key
    t(key) {
        const keys = key.split('.');
        let translation = this.translations[this.currentLocale];
        
        for (const k of keys) {
            if (translation && translation[k]) {
                translation = translation[k];
            } else {
                console.warn(`Translation not found for key: ${key}`);
                return key;
            }
        }
        
        return translation;
    },
    
    // Set locale
    setLocale(locale) {
        if (this.translations[locale]) {
            this.currentLocale = locale;
            localStorage.setItem('cs2d_locale', locale);
            this.updatePageTranslations();
            document.documentElement.lang = locale === 'zh_TW' ? 'zh-TW' : locale;
        }
    },
    
    // Get current locale
    getLocale() {
        return this.currentLocale;
    },
    
    // Initialize i18n
    init() {
        // Load locale from localStorage or default
        const savedLocale = localStorage.getItem('cs2d_locale');
        if (savedLocale && this.translations[savedLocale]) {
            this.currentLocale = savedLocale;
        }
        
        // Update page on load
        document.addEventListener('DOMContentLoaded', () => {
            this.updatePageTranslations();
            this.createLanguageSwitcher();
        });
    },
    
    // Update all elements with data-i18n attribute
    updatePageTranslations() {
        // Update text content
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            // Check if it's a placeholder or text content
            if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
                element.placeholder = translation;
            } else if (element.tagName === 'TITLE') {
                document.title = translation;
            } else {
                element.textContent = translation;
            }
        });
        
        // Update placeholders with data-i18n-placeholder attribute
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            element.placeholder = translation;
        });
        
        // Update any dynamic content
        if (typeof updateDynamicTranslations === 'function') {
            updateDynamicTranslations();
        }
    },
    
    // Create language switcher UI
    createLanguageSwitcher() {
        const existingSwitcher = document.getElementById('language-switcher');
        if (existingSwitcher) {
            existingSwitcher.remove();
        }
        
        const switcher = document.createElement('div');
        switcher.id = 'language-switcher';
        switcher.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            gap: 10px;
            background: rgba(0, 0, 0, 0.8);
            padding: 10px;
            border-radius: 8px;
            border: 1px solid rgba(102, 126, 234, 0.3);
        `;
        
        const languages = [
            { code: 'en', name: 'English' },
            { code: 'zh_TW', name: '繁體中文' }
        ];
        
        languages.forEach(lang => {
            const button = document.createElement('button');
            button.textContent = lang.name;
            button.style.cssText = `
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.3s;
                ${this.currentLocale === lang.code ? 
                    'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;' : 
                    'background: rgba(255, 255, 255, 0.1); color: #ccc;'}
            `;
            
            button.onmouseover = () => {
                if (this.currentLocale !== lang.code) {
                    button.style.background = 'rgba(255, 255, 255, 0.2)';
                }
            };
            
            button.onmouseout = () => {
                if (this.currentLocale !== lang.code) {
                    button.style.background = 'rgba(255, 255, 255, 0.1)';
                }
            };
            
            button.onclick = () => {
                this.setLocale(lang.code);
                // Update all buttons' styles
                this.createLanguageSwitcher();
            };
            
            switcher.appendChild(button);
        });
        
        document.body.appendChild(switcher);
    }
};

// Initialize i18n system
i18n.init();