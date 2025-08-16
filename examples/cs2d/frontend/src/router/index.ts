import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    redirect: '/lobby'
  },
  {
    path: '/lobby',
    name: 'lobby',
    component: () => import('@/views/LobbyView.vue'),
    meta: {
      title: 'Lobby',
      requiresAuth: false
    }
  },
  {
    path: '/room/:roomId',
    name: 'room',
    component: () => import('@/views/RoomView.vue'),
    meta: {
      title: 'Room',
      requiresAuth: true
    }
  },
  {
    path: '/game/:roomId',
    name: 'game',
    component: () => import('@/views/GameView.vue'),
    meta: {
      title: 'Game',
      requiresAuth: true,
      fullscreen: true
    }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: {
      title: 'Settings',
      requiresAuth: false
    }
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/AboutView.vue'),
    meta: {
      title: 'About',
      requiresAuth: false
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: {
      title: '404'
    }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth'
      }
    } else {
      return { top: 0 }
    }
  }
})

// Navigation guards
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  const appStore = useAppStore()

  // Update page title
  const title = to.meta.title ? `${to.meta.title} - CS2D` : 'CS2D'
  document.title = title

  // Start loading
  appStore.setLoading(true)

  // Check authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // Initialize player if needed
    await authStore.initializePlayer()

    if (!authStore.isAuthenticated) {
      next({ name: 'lobby', query: { redirect: to.fullPath } })
      return
    }
  }

  // Handle fullscreen routes
  if (to.meta.fullscreen) {
    document.body.classList.add('fullscreen')
  } else {
    document.body.classList.remove('fullscreen')
  }

  next()
})

router.afterEach(() => {
  const appStore = useAppStore()
  appStore.setLoading(false)
})

// Handle router errors
router.onError((error) => {
  console.error('Router error:', error)
  const appStore = useAppStore()
  appStore.addNotification({
    type: 'error',
    message: 'Navigation error occurred'
  })
})

export default router
