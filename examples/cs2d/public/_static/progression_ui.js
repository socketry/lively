// CS2D Progression UI Components
// Manages all progression-related UI elements

class ProgressionUI {
  constructor(gameClient) {
    this.gameClient = gameClient;
    this.isVisible = false;
    this.currentView = 'profile';
    
    this.playerData = null;
    this.leaderboardData = {};
    this.achievementData = null;
    
    // UI State
    this.animationQueue = [];
    this.notifications = [];
    
    // Initialize UI
    this.createProgressionInterface();
    this.bindEvents();
    
    console.log('🎮 Progression UI initialized');
  }
  
  createProgressionInterface() {
    // Remove existing interface
    const existing = document.getElementById('progressionUI');
    if (existing) {
      existing.remove();
    }
    
    // Create main progression interface
    const progressionUI = document.createElement('div');
    progressionUI.id = 'progressionUI';
    progressionUI.className = 'progression-ui hidden';
    progressionUI.innerHTML = `
      <div class="progression-overlay" onclick="progressionUI.hide()"></div>
      <div class="progression-panel">
        <div class="progression-header">
          <div class="progression-tabs">
            <button class="tab-button active" data-view="profile">Profile</button>
            <button class="tab-button" data-view="statistics">Statistics</button>
            <button class="tab-button" data-view="achievements">Achievements</button>
            <button class="tab-button" data-view="leaderboard">Leaderboards</button>
            <button class="tab-button" data-view="match-history">Match History</button>
          </div>
          <button class="close-button" onclick="progressionUI.hide()">✕</button>
        </div>
        
        <div class="progression-content">
          <div class="progression-view active" id="profile-view"></div>
          <div class="progression-view" id="statistics-view"></div>
          <div class="progression-view" id="achievements-view"></div>
          <div class="progression-view" id="leaderboard-view"></div>
          <div class="progression-view" id="match-history-view"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(progressionUI);
    
    // Create mini profile display
    this.createMiniProfile();
    
    // Create XP notification system
    this.createNotificationSystem();
    
    // Create level up overlay
    this.createLevelUpOverlay();
  }
  
  createMiniProfile() {
    const miniProfile = document.createElement('div');
    miniProfile.id = 'miniProfile';
    miniProfile.className = 'mini-profile';
    miniProfile.innerHTML = `
      <div class="profile-avatar">
        <div class="avatar-ring"></div>
        <span class="level-badge">1</span>
      </div>
      <div class="profile-info">
        <div class="player-name">Player</div>
        <div class="xp-bar">
          <div class="xp-fill" style="width: 0%"></div>
          <span class="xp-text">0 / 100 XP</span>
        </div>
        <div class="rank-info">
          <span class="rank-icon">🥉</span>
          <span class="rank-text">Unranked</span>
        </div>
      </div>
    `;
    
    miniProfile.onclick = () => this.show('profile');
    document.body.appendChild(miniProfile);
  }
  
  createNotificationSystem() {
    const notificationContainer = document.createElement('div');
    notificationContainer.id = 'notificationContainer';
    notificationContainer.className = 'notification-container';
    document.body.appendChild(notificationContainer);
  }
  
  createLevelUpOverlay() {
    const levelUpOverlay = document.createElement('div');
    levelUpOverlay.id = 'levelUpOverlay';
    levelUpOverlay.className = 'level-up-overlay hidden';
    levelUpOverlay.innerHTML = `
      <div class="level-up-content">
        <div class="level-up-animation">
          <div class="level-up-icon">⭐</div>
          <div class="level-up-text">LEVEL UP!</div>
          <div class="new-level">Level <span class="level-number">2</span></div>
          <div class="level-rewards"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(levelUpOverlay);
  }
  
  bindEvents() {
    // Tab switching
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-button')) {
        this.switchView(e.target.dataset.view);
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && e.ctrlKey) {
        e.preventDefault();
        this.toggle();
      } else if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }
  
  // Public API
  show(view = null) {
    this.isVisible = true;
    if (view) {
      this.switchView(view);
    }
    
    const ui = document.getElementById('progressionUI');
    ui.classList.remove('hidden');
    
    // Load current view data
    this.loadViewData(this.currentView);
  }
  
  hide() {
    this.isVisible = false;
    const ui = document.getElementById('progressionUI');
    ui.classList.add('hidden');
  }
  
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  switchView(view) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // Update view panels
    document.querySelectorAll('.progression-view').forEach(viewPanel => {
      viewPanel.classList.remove('active');
    });
    document.getElementById(`${view}-view`).classList.add('active');
    
    this.currentView = view;
    this.loadViewData(view);
  }
  
  // Data management
  updatePlayerData(data) {
    this.playerData = data;
    this.updateMiniProfile(data);
    
    if (this.isVisible && this.currentView === 'profile') {
      this.renderProfileView();
    }
  }
  
  updateMiniProfile(data) {
    const miniProfile = document.getElementById('miniProfile');
    if (!miniProfile || !data) return;
    
    const profile = data.profile || {};
    const progression = data.progression || {};
    
    // Update avatar and level
    const levelBadge = miniProfile.querySelector('.level-badge');
    const avatarRing = miniProfile.querySelector('.avatar-ring');
    const playerName = miniProfile.querySelector('.player-name');
    
    levelBadge.textContent = profile.level || 1;
    playerName.textContent = profile.username || 'Player';
    
    // Update XP bar
    const xpBar = miniProfile.querySelector('.xp-fill');
    const xpText = miniProfile.querySelector('.xp-text');
    const xpProgress = progression.xp_progress || { current: 0, required: 100, percentage: 0 };
    
    xpBar.style.width = `${xpProgress.percentage}%`;
    xpText.textContent = `${xpProgress.current} / ${xpProgress.required} XP`;
    
    // Update rank
    const rankIcon = miniProfile.querySelector('.rank-icon');
    const rankText = miniProfile.querySelector('.rank-text');
    const rankInfo = progression.rank_info || {};
    
    rankIcon.textContent = rankInfo.icon || '🥉';
    rankText.textContent = profile.rank || 'Unranked';
    
    // Update avatar ring color based on rank
    avatarRing.style.borderColor = rankInfo.color || '#808080';
  }
  
  // View rendering methods
  loadViewData(view) {
    switch (view) {
      case 'profile':
        this.renderProfileView();
        break;
      case 'statistics':
        this.renderStatisticsView();
        break;
      case 'achievements':
        this.renderAchievementsView();
        break;
      case 'leaderboard':
        this.renderLeaderboardView();
        break;
      case 'match-history':
        this.renderMatchHistoryView();
        break;
    }
  }
  
  renderProfileView() {
    const view = document.getElementById('profile-view');
    if (!this.playerData) {
      view.innerHTML = '<div class="loading">Loading profile...</div>';
      return;
    }
    
    const profile = this.playerData.profile || {};
    const progression = this.playerData.progression || {};
    const stats = this.playerData.detailed_stats || {};
    
    view.innerHTML = `
      <div class="profile-header">
        <div class="profile-avatar-large">
          <div class="avatar-ring-large" style="border-color: ${progression.rank_info?.color || '#808080'}">
            <div class="level-badge-large">${profile.level || 1}</div>
          </div>
        </div>
        <div class="profile-details">
          <h2 class="profile-name">${profile.username || 'Player'}</h2>
          <div class="profile-title">${profile.current_title || ''}</div>
          <div class="profile-rank">
            <span class="rank-icon-large">${progression.rank_info?.icon || '🥉'}</span>
            <span class="rank-name">${profile.rank || 'Unranked'}</span>
            <span class="rating">(${profile.rating || 1000})</span>
          </div>
        </div>
      </div>
      
      <div class="profile-stats">
        <div class="stat-card">
          <div class="stat-value">${profile.level || 1}</div>
          <div class="stat-label">Level</div>
          <div class="stat-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progression.xp_progress?.percentage || 0}%"></div>
            </div>
            <div class="progress-text">${progression.xp_progress?.current || 0} / ${progression.xp_progress?.required || 100} XP</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">${profile.matches_played || 0}</div>
          <div class="stat-label">Matches Played</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">${profile.win_rate || 0}%</div>
          <div class="stat-label">Win Rate</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">${profile.kd_ratio || 0}</div>
          <div class="stat-label">K/D Ratio</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">${profile.accuracy || 0}%</div>
          <div class="stat-label">Accuracy</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">${progression.total_playtime || '0h 0m'}</div>
          <div class="stat-label">Playtime</div>
        </div>
      </div>
      
      <div class="profile-progression">
        <h3>Progression</h3>
        <div class="progression-cards">
          <div class="progression-card">
            <h4>Next Rank</h4>
            <div class="next-rank">${progression.next_rank || 'Max Rank'}</div>
            <div class="rating-needed">${progression.rating_needed > 0 ? `${progression.rating_needed} rating needed` : 'Achieved!'}</div>
          </div>
          
          <div class="progression-card">
            <h4>Recent Performance</h4>
            <div class="performance-trend">
              <!-- Performance chart would go here -->
              <div class="trend-placeholder">Performance graph</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderStatisticsView() {
    const view = document.getElementById('statistics-view');
    if (!this.playerData) {
      view.innerHTML = '<div class="loading">Loading statistics...</div>';
      return;
    }
    
    const stats = this.playerData.detailed_stats || {};
    
    view.innerHTML = `
      <div class="stats-categories">
        <div class="stats-category">
          <h3>Combat Statistics</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-name">Kills</span>
              <span class="stat-value">${stats.combat?.kills || 0}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Deaths</span>
              <span class="stat-value">${stats.combat?.deaths || 0}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Assists</span>
              <span class="stat-value">${stats.combat?.assists || 0}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">K/D Ratio</span>
              <span class="stat-value">${stats.combat?.kd_ratio || 0}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Headshots</span>
              <span class="stat-value">${stats.combat?.headshots || 0}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Headshot Rate</span>
              <span class="stat-value">${stats.combat?.headshot_rate || 0}%</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Accuracy</span>
              <span class="stat-value">${stats.combat?.accuracy || 0}%</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Damage Dealt</span>
              <span class="stat-value">${stats.combat?.damage_dealt || 0}</span>
            </div>
          </div>
        </div>
        
        <div class="stats-category">
          <h3>Match Statistics</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-name">Matches Played</span>
              <span class="stat-value">${stats.matches?.played || 0}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Matches Won</span>
              <span class="stat-value">${stats.matches?.won || 0}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Matches Lost</span>
              <span class="stat-value">${stats.matches?.lost || 0}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Win Rate</span>
              <span class="stat-value">${stats.matches?.win_rate || 0}%</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Current Streak</span>
              <span class="stat-value">${stats.matches?.current_streak || 0}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Best Streak</span>
              <span class="stat-value">${stats.matches?.best_streak || 0}</span>
            </div>
          </div>
        </div>
        
        <div class="stats-category">
          <h3>Objective Statistics</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-name">Bomb Plants</span>
              <span class="stat-value">${stats.objectives?.bomb_plants || 0}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Bomb Defuses</span>
              <span class="stat-value">${stats.objectives?.bomb_defuses || 0}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Hostage Rescues</span>
              <span class="stat-value">${stats.objectives?.hostage_rescues || 0}</span>
            </div>
          </div>
        </div>
        
        <div class="stats-category">
          <h3>Progression Statistics</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-name">Level</span>
              <span class="stat-value">${stats.progression?.level || 1}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Total XP</span>
              <span class="stat-value">${stats.progression?.total_xp || 0}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Rating</span>
              <span class="stat-value">${stats.progression?.rating || 1000}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Rank</span>
              <span class="stat-value">${stats.progression?.rank || 'Unranked'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  renderAchievementsView() {
    const view = document.getElementById('achievements-view');
    
    // Request achievement data if not loaded
    if (!this.achievementData) {
      this.gameClient?.send({ type: 'get_achievements' });
      view.innerHTML = '<div class="loading">Loading achievements...</div>';
      return;
    }
    
    const categories = ['combat', 'objective', 'team', 'streak', 'weapon', 'map', 'milestone', 'special'];
    let categoryHTML = '';
    
    categories.forEach(category => {
      const categoryAchievements = this.achievementData.filter(a => a.category === category);
      if (categoryAchievements.length === 0) return;
      
      categoryHTML += `
        <div class="achievement-category">
          <h3>${category.charAt(0).toUpperCase() + category.slice(1)} Achievements</h3>
          <div class="achievements-grid">
            ${categoryAchievements.map(achievement => `
              <div class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                  <div class="achievement-name">${achievement.name}</div>
                  <div class="achievement-description">${achievement.description}</div>
                  ${achievement.progress ? `
                    <div class="achievement-progress">
                      <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(achievement.progress.current / achievement.progress.required * 100)}%"></div>
                      </div>
                      <div class="progress-text">${achievement.progress.current} / ${achievement.progress.required}</div>
                    </div>
                  ` : ''}
                  ${achievement.unlocked ? `<div class="unlock-date">Unlocked: ${new Date(achievement.unlock_timestamp).toLocaleDateString()}</div>` : ''}
                </div>
                <div class="achievement-rarity ${achievement.rarity}">${achievement.rarity}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });
    
    view.innerHTML = `
      <div class="achievements-header">
        <div class="achievement-stats">
          <div class="stat-card">
            <div class="stat-value">${this.achievementData.filter(a => a.unlocked).length}</div>
            <div class="stat-label">Unlocked</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${this.achievementData.length}</div>
            <div class="stat-label">Total</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${((this.achievementData.filter(a => a.unlocked).length / this.achievementData.length) * 100).toFixed(1)}%</div>
            <div class="stat-label">Progress</div>
          </div>
        </div>
      </div>
      
      <div class="achievements-content">
        ${categoryHTML}
      </div>
    `;
  }
  
  renderLeaderboardView() {
    const view = document.getElementById('leaderboard-view');
    
    view.innerHTML = `
      <div class="leaderboard-categories">
        <button class="category-button active" data-category="rating">Rating</button>
        <button class="category-button" data-category="level">Level</button>
        <button class="category-button" data-category="kd_ratio">K/D Ratio</button>
        <button class="category-button" data-category="wins">Wins</button>
        <button class="category-button" data-category="accuracy">Accuracy</button>
      </div>
      
      <div class="leaderboard-content">
        <div class="loading">Loading leaderboard...</div>
      </div>
    `;
    
    // Bind category switching
    view.addEventListener('click', (e) => {
      if (e.target.classList.contains('category-button')) {
        const category = e.target.dataset.category;
        this.switchLeaderboardCategory(category);
      }
    });
    
    // Load default category
    this.switchLeaderboardCategory('rating');
  }
  
  switchLeaderboardCategory(category) {
    // Update button states
    document.querySelectorAll('.category-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
    
    // Request leaderboard data
    this.gameClient?.send({ type: 'get_leaderboard', category: category });
    
    // Show loading
    const content = document.querySelector('.leaderboard-content');
    content.innerHTML = '<div class="loading">Loading leaderboard...</div>';
  }
  
  updateLeaderboard(data) {
    const content = document.querySelector('.leaderboard-content');
    if (!content || !data.players) return;
    
    content.innerHTML = `
      <div class="leaderboard-table">
        <div class="leaderboard-header">
          <span>Rank</span>
          <span>Player</span>
          <span>Level</span>
          <span>Rating</span>
          <span>Value</span>
        </div>
        ${data.players.map(player => `
          <div class="leaderboard-row">
            <div class="rank">#${player.rank}</div>
            <div class="player">
              <span class="player-name">${player.display_name}</span>
              <span class="player-title">${player.current_title || ''}</span>
            </div>
            <div class="level">${player.level}</div>
            <div class="rating">${player.rating}</div>
            <div class="value">${player[data.category_info.sort_key]}</div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  renderMatchHistoryView() {
    const view = document.getElementById('match-history-view');
    
    // Request match history if not loaded
    this.gameClient?.send({ type: 'get_match_history' });
    
    view.innerHTML = '<div class="loading">Loading match history...</div>';
  }
  
  updateMatchHistory(matches) {
    const view = document.getElementById('match-history-view');
    if (!view || !matches) return;
    
    view.innerHTML = `
      <div class="match-history">
        ${matches.map(match => `
          <div class="match-card ${match.result}">
            <div class="match-header">
              <span class="match-result ${match.result}">${match.result.toUpperCase()}</span>
              <span class="match-map">${match.map}</span>
              <span class="match-score">${match.score.join(' - ')}</span>
            </div>
            <div class="match-stats">
              <div class="stat">
                <span class="stat-label">K/D/A</span>
                <span class="stat-value">${match.player_stats.kills}/${match.player_stats.deaths}/${match.player_stats.assists}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Damage</span>
                <span class="stat-value">${match.player_stats.damage}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Duration</span>
                <span class="stat-value">${this.formatDuration(match.duration)}</span>
              </div>
            </div>
            <div class="match-date">${new Date(match.timestamp).toLocaleDateString()}</div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  // Notification and animation methods
  showXPGain(amount, reason) {
    this.showNotification(`+${amount} XP`, reason, 'xp-gain');
  }
  
  showLevelUp(newLevel, rewards = {}) {
    const overlay = document.getElementById('levelUpOverlay');
    const levelNumber = overlay.querySelector('.level-number');
    const rewardsContainer = overlay.querySelector('.level-rewards');
    
    levelNumber.textContent = newLevel;
    
    // Show rewards
    let rewardsHTML = '';
    if (rewards.title) rewardsHTML += `<div class="reward">🎭 Title: ${rewards.title}</div>`;
    if (rewards.color) rewardsHTML += `<div class="reward">🎨 Color: ${rewards.color}</div>`;
    if (rewards.xp) rewardsHTML += `<div class="reward">⭐ Bonus XP: ${rewards.xp}</div>`;
    
    rewardsContainer.innerHTML = rewardsHTML;
    
    // Show overlay
    overlay.classList.remove('hidden');
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
      overlay.classList.add('hidden');
    }, 4000);
  }
  
  showAchievementUnlock(achievement) {
    this.showNotification(
      `🏆 ${achievement.name}`,
      achievement.description,
      'achievement-unlock'
    );
  }
  
  showNotification(title, message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-title">${title}</div>
      <div class="notification-message">${message}</div>
    `;
    
    container.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }
  
  // Utility methods
  formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  // WebSocket message handlers
  handleProgressionMessage(message) {
    switch (message.type) {
      case 'player_data':
        this.updatePlayerData(message.data);
        break;
      case 'xp_gain':
        this.showXPGain(message.amount, message.reason);
        break;
      case 'level_up':
        this.showLevelUp(message.level, message.rewards);
        break;
      case 'achievement_unlock':
        this.showAchievementUnlock(message.achievement);
        break;
      case 'leaderboard_data':
        this.updateLeaderboard(message.data);
        break;
      case 'match_history':
        this.updateMatchHistory(message.matches);
        break;
      case 'achievement_data':
        this.achievementData = message.achievements;
        if (this.currentView === 'achievements') {
          this.renderAchievementsView();
        }
        break;
    }
  }
}

// Global instance
let progressionUI = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Wait for game client to be available
  const checkForGameClient = () => {
    if (window.gameClient) {
      progressionUI = new ProgressionUI(window.gameClient);
      window.progressionUI = progressionUI;
    } else {
      setTimeout(checkForGameClient, 100);
    }
  };
  
  checkForGameClient();
});