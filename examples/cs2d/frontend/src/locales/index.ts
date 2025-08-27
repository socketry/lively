import { createI18n } from 'vue-i18n'

// Import translation files
const messages = {
  en: {
    app: {
      title: 'CS2D - Counter-Strike 2D',
      loading: 'Loading...',
      error: 'An error occurred'
    },
    lobby: {
      title: 'Lobby',
      createRoom: 'Create Room',
      joinRoom: 'Join Room',
      players: 'Players',
      waiting: 'Waiting for players...'
    },
    game: {
      title: 'Game',
      score: 'Score',
      time: 'Time',
      round: 'Round'
    }
  },
  'zh-TW': {
    app: {
      title: 'CS2D - 反恐精英2D',
      loading: '載入中...',
      error: '發生錯誤'
    },
    lobby: {
      title: '大廳',
      createRoom: '建立房間',
      joinRoom: '加入房間',
      players: '玩家',
      waiting: '等待玩家中...'
    },
    game: {
      title: '遊戲',
      score: '分數',
      time: '時間',
      round: '回合'
    }
  }
}

// Setup i18n
export function setupI18n() {
  return createI18n({
    locale: 'en',
    fallbackLocale: 'en',
    messages,
    legacy: false,
    globalInjection: true
  })
}
